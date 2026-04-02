import { db } from './firebase';
import { 
  collection, addDoc, updateDoc, doc, getDocs, getDoc,
  deleteDoc, query, orderBy, limit, increment, writeBatch, where
} from "firebase/firestore";

// Colecciones
const COL_BOTELLAS = 'botellas';
const COL_INGREDIENTES = 'ingrediente';
const COL_MOVIMIENTOS = 'movements';
const COL_ALERTAS = 'alerts';

// --- 1. OBTENER TODO EL INVENTARIO ---
export async function getBottles(): Promise<any[]> {
  try {
    const [snapBotellas, snapIngredientes] = await Promise.all([
      getDocs(collection(db, COL_BOTELLAS)),
      getDocs(collection(db, COL_INGREDIENTES))
    ]);

    const botellas = snapBotellas.docs.map(d => ({ id: d.id, ...d.data() }));
    const ingredientes = snapIngredientes.docs.map(d => ({ id: d.id, ...d.data() }));

    return [...botellas, ...ingredientes];
  } catch (error) {
    console.error("Error al obtener inventario:", error);
    return [];
  }
}

// --- 2. REGISTRAR VENTA / ENTRADA ---
export async function addMovement(
  productId: string,
  type: 'Venta' | 'Entrada',
  quantity: number,
  userId: string,
  userName: string,
  notes: string = ""
): Promise<any> {
  const batch = writeBatch(db);
  
  try {
    const allItems = await getBottles();
    const item = allItems.find(i => i.id === productId);
    if (!item) return null;

    if (item.isCombo && item.receta) {
      for (const ing of item.receta) {
        const idFinal = ing.productID || ing.productId;
        const botRef = doc(db, COL_BOTELLAS, idFinal);
        const ingRef = doc(db, COL_INGREDIENTES, idFinal);
        
        const botSnap = await getDoc(botRef);
        const targetRef = botSnap.exists() ? botRef : ingRef;
        const targetSnap = botSnap.exists() ? botSnap : await getDoc(ingRef);

        if (targetSnap.exists()) {
          const currentStock = Number(targetSnap.data()?.stock || 0);
          const newStock = currentStock - (Number(ing.cantidad) * quantity);
          batch.update(targetRef, { stock: newStock });
          await checkAndCreateAlerts(idFinal, { ...targetSnap.data(), stock: newStock });
        }
      }
    } else {
      const botRef = doc(db, COL_BOTELLAS, productId);
      const ingRef = doc(db, COL_INGREDIENTES, productId);
      const botSnap = await getDoc(botRef);
      const targetRef = botSnap.exists() ? botRef : ingRef;
      const adjustment = type === 'Entrada' ? quantity : -quantity;
      batch.update(targetRef, { stock: increment(adjustment) });
    }

    const movementRef = doc(collection(db, COL_MOVIMIENTOS));
    const movementData = {
      botellaID: productId,
      idBotella: productId, 
      nombreBotella: item.nombre,
      type: type,
      cantidad: Number(quantity),
      nombreUsuario: userName || 'Sistema',
      descripcion: notes,
      precioVenta: Number(item.precio || 0), 
      precioCosto: Number(item.precioCosto || item.costo || 0),
      createdAt: new Date()
    };
    
    batch.set(movementRef, movementData);
    await batch.commit();

    if (!item.isCombo) await checkAndCreateAlerts(productId, { ...item, stock: (Number(item.stock) || 0) + (type === 'Entrada' ? quantity : -quantity) });
    
    return { id: movementRef.id, ...movementData };

  } catch (error) {
    console.error("Error en addMovement:", error);
    return null;
  }
}

// --- 4. REPORTE CLOUD OPTIMIZADO (Corregido para Inversión) ---
export async function getReportDataCloud(start: Date, end: Date) {
  try {
    const [botellas, movimientosRaw] = await Promise.all([
      getBottles(),
      getMovements(start, end) 
    ]);

    const salesByBottleMap: Record<string, any> = {};
    const salesByCategory: Record<string, number> = {};
    let totalRevenue = 0;
    let totalCost = 0; // <--- AGREGAMOS ESTO
    let totalSalesUnits = 0;
    let totalEntriesUnits = 0;

    movimientosRaw.forEach((m: any) => {
      const cantidad = Number(m.cantidad || 0);
      const bID = m.botellaID || m.idBotella;

      if (m.type === 'Venta') {
        totalSalesUnits += cantidad;
        const itemOriginal = botellas.find(b => b.id === bID);
        
        // Precios
        const precioVenta = Number(m.precioVenta || itemOriginal?.precio || 0);
        const precioCosto = Number(m.precioCosto || itemOriginal?.precioCosto || itemOriginal?.costo || 0);
        
        // Sumamos a los totales
        totalRevenue += cantidad * precioVenta;
        totalCost += cantidad * precioCosto; // <--- CÁLCULO DE INVERSIÓN REAL

        if (bID) {
          if (!salesByBottleMap[bID]) {
            salesByBottleMap[bID] = { name: m.nombreBotella || 'Producto', quantity: 0, revenue: 0 };
          }
          salesByBottleMap[bID].quantity += cantidad;
          salesByBottleMap[bID].revenue += (cantidad * precioVenta);

          const cat = itemOriginal?.categoria || 'otros';
          salesByCategory[cat] = (salesByCategory[cat] || 0) + cantidad;
        }
      } else {
        totalEntriesUnits += cantidad;
      }
    });

    return {
      movements: movimientosRaw,
      totalSales: totalSalesUnits,
      totalEntries: totalEntriesUnits,
      totalRevenue: totalRevenue,
      totalCost: totalCost, // <--- AHORA EL REPORTE ENVÍA LA INVERSIÓN
      salesByCategory,
      salesByBottle: Object.values(salesByBottleMap).sort((a: any, b: any) => b.revenue - a.revenue),
      ticketPromedio: totalSalesUnits > 0 ? totalRevenue / totalSalesUnits : 0
    };
  } catch (error) {
    console.error("Error en reporte:", error);
    return null;
  }
}

// --- 7. STATS DASHBOARD (Solución definitiva a Valorización $0) ---
export async function getDashboardStats() {
  try {
    const items = await getBottles();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayMovements = await getMovements(startOfToday, new Date());
    const salesToday = todayMovements
      .filter((m: any) => m.type === 'Venta')
      .reduce((sum: number, m: any) => sum + (Number(m.cantidad) || 0), 0);

    const stats = {
      totalBotellas: items.reduce((sum, i) => sum + (Number(i.stock) || 0), 0),
      // Valorización: Chequeamos múltiples nombres de campo para el costo
      valorTotal: items.reduce((sum, i) => {
        const stock = Number(i.stock) || 0;
        const costo = Number(i.precioCosto || i.costo || i.precio_costo || 0);
        return sum + (stock * costo);
      }, 0),
      conteoStockBajo: items.filter(i => !i.isCombo && (Number(i.stock) || 0) <= (Number(i.stockMin) || 5) && (Number(i.stock) || 0) > 0).length,
      conteoSinStock: items.filter(i => !i.isCombo && (Number(i.stock) || 0) <= 0).length,
      ventasHoy: salesToday 
    };

    return stats;
  } catch (error) {
    return { totalBotellas: 0, valorTotal: 0, conteoStockBajo: 0, conteoSinStock: 0, ventasHoy: 0 };
  }
}

// --- RESTO DE FUNCIONES (Get Movements, Alerts, Inventory Management) ---

export async function getMovements(start?: Date, end?: Date) {
  try {
    let q;
    if (start && end) {
      q = query(collection(db, COL_MOVIMIENTOS), where("createdAt", ">=", start), where("createdAt", "<=", end), orderBy("createdAt", "desc"));
    } else {
      q = query(collection(db, COL_MOVIMIENTOS), orderBy("createdAt", "desc"), limit(200));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) { return []; }
}

export async function getAlerts() {
  try {
    const q = query(collection(db, COL_ALERTAS), orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) { return []; }
}

export async function markAlertAsRead(alertId: string) {
  try {
    await updateDoc(doc(db, COL_ALERTAS, alertId), { isRead: true });
    return true;
  } catch (error) { return false; }
}

export async function addBottle(datos: any) {
  const coleccion = datos.categoria === 'Gaseosa' ? COL_INGREDIENTES : COL_BOTELLAS;
  const docRef = await addDoc(collection(db, coleccion), {
    ...datos,
    stock: Number(datos.stock || 0),
    stockMin: Number(datos.stockMin || 5),
    precio: Number(datos.precio || 0),
    precioCosto: Number(datos.precioCosto || datos.costo || 0),
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return { id: docRef.id, ...datos };
}

export async function updateBottle(id: string, updates: any) {
  const botRef = doc(db, COL_BOTELLAS, id);
  const ingRef = doc(db, COL_INGREDIENTES, id);
  const botSnap = await getDoc(botRef);
  const targetRef = botSnap.exists() ? botRef : ingRef;
  await updateDoc(targetRef, { ...updates, updatedAt: new Date() });
  return true;
}

export async function deleteBottle(id: string) {
  const botRef = doc(db, COL_BOTELLAS, id);
  const ingRef = doc(db, COL_INGREDIENTES, id);
  const botSnap = await getDoc(botRef);
  const targetRef = botSnap.exists() ? botRef : ingRef;
  await deleteDoc(targetRef);
  return true;
}

async function checkAndCreateAlerts(id: string, item: any) {
  const currentStock = Number(item.stock || 0);
  const minStock = Number(item.stockMin || 5);
  if (currentStock <= minStock) {
    await addDoc(collection(db, COL_ALERTAS), {
      botellaID: id,
      nombreBotella: item.nombre || 'Producto',
      isRead: false,
      type: currentStock <= 0 ? "out_of_stock" : "low_stock",
      createdAt: new Date()
    });
  }
}