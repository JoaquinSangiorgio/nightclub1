import { db } from './firebase'; 
export { db }; 

import { 
  collection, addDoc, updateDoc, doc, getDocs, getDoc,
  deleteDoc, query, orderBy, limit, writeBatch, where
} from "firebase/firestore";
import { Botella, MovimientoStock, Alerta } from './types';

const COL_BOTELLAS = 'botellas';
const COL_MOVIMIENTOS = 'movements';
const COL_ALERTAS = 'alerts';

// --- 1. OBTENER TODO EL INVENTARIO ---
export async function getBottles(): Promise<Botella[]> {
  try {
    const snap = await getDocs(collection(db, COL_BOTELLAS));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Botella));
  } catch (error) {
    console.error("Error al obtener inventario:", error);
    return [];
  }
}

// --- 2. REGISTRAR MOVIMIENTO (Lógica Blindada) ---
export async function addMovement(
  productId: string,
  type: 'venta' | 'entrada' | 'ajuste',
  quantity: number, 
  userId: string,
  userName: string,
  notes: string = ""
): Promise<any> {
  const batch = writeBatch(db);
  const normalizedType = type.toLowerCase();
  
  try {
    const botRef = doc(db, COL_BOTELLAS, productId);
    const botSnap = await getDoc(botRef);
    
    if (!botSnap.exists()) return null;
    const item = { id: botSnap.id, ...botSnap.data() } as Botella;

    // CASO A: RECETA/COMBO (Descontar ingredientes)
    if (item.tipo === 'receta' || item.tipo === 'combo') {
      if (item.receta) {
        for (const ing of item.receta) {
          const insumoRef = doc(db, COL_BOTELLAS, ing.productId);
          const insumoSnap = await getDoc(insumoRef);
          if (insumoSnap.exists()) {
            const dataInsumo = insumoSnap.data();
            const desc = Number(ing.cantidadMl) * quantity;
            const nuevoStock = Math.max(0, Number(dataInsumo.stockMl || 0) - desc);
            batch.update(insumoRef, { stockMl: nuevoStock, updatedAt: new Date().toISOString() });
            await checkAndCreateAlerts(ing.productId, { ...dataInsumo, stockMl: nuevoStock });
          }
        }
      }
    } 
    // CASO B: INSUMO DIRECTO
    else {
      const mlPorU = Number(item.mlPorUnidad || 0);
      const totalConsumoMl = mlPorU * quantity;
      const ajuste = normalizedType === 'entrada' ? totalConsumoMl : -totalConsumoMl;
      const nuevoStock = Math.max(0, Number(item.stockMl || 0) + ajuste);
      batch.update(botRef, { stockMl: nuevoStock, updatedAt: new Date().toISOString() });
      await checkAndCreateAlerts(productId, { ...item, stockMl: nuevoStock });
    }

    const movementRef = doc(collection(db, COL_MOVIMIENTOS));
    const movementData = {
      botellaId: productId,
      nombreBotella: item.nombre,
      tipo: normalizedType,
      cantidad: quantity,
      monto: (item.precio || 0) * quantity,
      costo: (item.precioCosto || 0) * quantity,
      usuarioId: userId,
      nombreUsuario: userName,
      notas: notes,
      createdAt: new Date().toISOString()
    };
    
    batch.set(movementRef, movementData);
    await batch.commit();
    return { id: movementRef.id, ...movementData };

  } catch (error) {
    console.error("Error en addMovement:", error);
    return null;
  }
}

// --- 3. FUNCIONES ABM ---
export async function addBottle(datos: Partial<Botella>) {
  const docRef = await addDoc(collection(db, COL_BOTELLAS), {
    ...datos,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return { id: docRef.id, ...datos };
}

export async function updateBottle(id: string, updates: Partial<Botella>) {
  const botRef = doc(db, COL_BOTELLAS, id);
  await updateDoc(botRef, { ...updates, updatedAt: new Date().toISOString() });
  return true;
}

export async function deleteBottle(id: string) {
  await deleteDoc(doc(db, COL_BOTELLAS, id));
  return true;
}

// --- 4. ALERTAS ---
async function checkAndCreateAlerts(id: string, item: any) {
  const currentMl = Number(item.stockMl || 0);
  const minMl = Number(item.stockMinMl || 0);
  if (currentMl <= minMl) {
    const q = query(collection(db, COL_ALERTAS), where("botellaId", "==", id), where("leida", "==", false));
    const snap = await getDocs(q);
    if (snap.empty) {
      await addDoc(collection(db, COL_ALERTAS), {
        botellaId: id,
        nombreBotella: item.nombre || 'Producto',
        leida: false,
        tipo: currentMl <= 0 ? "out_of_stock" : "low_stock",
        createdAt: new Date().toISOString()
      });
    }
  }
}

export async function markAlertAsRead(alertId: string) {
  const alertRef = doc(db, COL_ALERTAS, alertId);
  await updateDoc(alertRef, { leida: true, updatedAt: new Date().toISOString() });
  return true;
}

export async function getAlerts() {
  const q = query(collection(db, COL_ALERTAS), orderBy("createdAt", "desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- 5. OBTENER MOVIMIENTOS ---
export async function getMovements(start?: Date, end?: Date) {
  try {
    let q;
    if (start && end) {
      q = query(
        collection(db, COL_MOVIMIENTOS),
        where("createdAt", ">=", start.toISOString()),
        where("createdAt", "<=", end.toISOString()),
        orderBy("createdAt", "asc")
      );
    } else {
      q = query(collection(db, COL_MOVIMIENTOS), orderBy("createdAt", "desc"), limit(200));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error(error);
    return [];
  }
}

// --- 6. DASHBOARD STATS ---
export async function getDashboardStats() {
  try {
    const items = await getBottles();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMovements = await getMovements(startOfToday, new Date());
    
    const revenueToday = todayMovements
      .filter((m: any) => m.tipo === 'venta')
      .reduce((sum: number, m: any) => sum + (Number(m.monto) || 0), 0);

    return {
      totalBotellas: Number(items.reduce((sum, i) => i.tipo === 'botella' ? sum + (Number(i.stockMl || 0) / Number(i.mlPorUnidad || 1)) : sum, 0).toFixed(1)),
      valorTotal: Number(items.reduce((sum, i) => i.tipo === 'botella' ? sum + ((Number(i.stockMl || 0) / Number(i.mlPorUnidad || 1)) * Number(i.precioCosto || 0)) : sum, 0).toFixed(2)),
      conteoStockBajo: items.filter(i => i.tipo === 'botella' && Number(i.stockMl) <= Number(i.stockMinMl) && Number(i.stockMl) > 0).length,
      conteoSinStock: items.filter(i => i.tipo === 'botella' && Number(i.stockMl) <= 0).length,
      revenueToday: Number(revenueToday)
    };
  } catch (error) {
    return { totalBotellas: 0, valorTotal: 0, conteoStockBajo: 0, conteoSinStock: 0, revenueToday: 0 };
  }
}

// --- 7. REPORTE CLOUD ---
export async function getReportDataCloud(start: Date, end: Date) {
  try {
    const [botellas, movimientos] = await Promise.all([ getBottles(), getMovements(start, end) ]);
    const salesByBottleMap: Record<string, any> = {};
    const salesByCategory: Record<string, number> = {};
    let totalRevenue = 0;
    let totalCostOfSales = 0;
    let totalInvestment = 0;

    movimientos.forEach((m: any) => {
      const tipo = m.tipo?.toLowerCase();
      const monto = Number(m.monto || 0);
      const costo = Number(m.costo || 0);
      const cant = Number(m.cantidad || 0);

      if (tipo === 'venta') {
        totalRevenue += monto;
        totalCostOfSales += costo;
        const bID = m.botellaId;
        if (bID) {
          if (!salesByBottleMap[bID]) {
            const itemOriginal = botellas.find(b => b.id === bID);
            salesByBottleMap[bID] = { name: m.nombreBotella || itemOriginal?.nombre || 'Producto', quantity: 0, revenue: 0 };
          }
          salesByBottleMap[bID].quantity += cant;
          salesByBottleMap[bID].revenue += monto;
          const item = botellas.find(b => b.id === bID);
          const cat = item?.categoria || 'otros';
          salesByCategory[cat] = (salesByCategory[cat] || 0) + monto;
        }
      } else if (tipo === 'entrada') {
        totalInvestment += costo;
      }
    });

    return {
      movements: movimientos,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalCost: Number(totalCostOfSales.toFixed(2)),
      totalInvestment: Number(totalInvestment.toFixed(2)),
      salesByCategory,
      salesByBottle: Object.values(salesByBottleMap).sort((a: any, b: any) => b.revenue - a.revenue)
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

// --- OFFLINE SYNC ---
export function savePendingMovement(movement: any) {
  const pending = JSON.parse(localStorage.getItem('pending_movements') || '[]');
  pending.push(movement);
  localStorage.setItem('pending_movements', JSON.stringify(pending));
}

export async function syncPendingMovements() {
  const pending = JSON.parse(localStorage.getItem('pending_movements') || '[]');
  if (pending.length === 0) return;
  const batch = writeBatch(db);
  try {
    pending.forEach((m: any) => {
      const ref = doc(collection(db, 'movements'));
      batch.set(ref, m);
    });
    await batch.commit();
    localStorage.removeItem('pending_movements');
    return true;
  } catch (e) {
    return false;
  }
}

// --- GUARDAR ARQUEO DE CAJA ---
export async function saveCashAudit(auditData: any) {
  try {
    const docRef = await addDoc(collection(db, 'cash_audits'), {
      ...auditData,
      createdAt: new Date().toISOString()
    });
    return { id: docRef.id, ...auditData };
  } catch (error) {
    console.error("Error al guardar arqueo:", error);
    return null;
  }
}