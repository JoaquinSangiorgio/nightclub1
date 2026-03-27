import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  getDoc,
  deleteDoc,
  query, 
  orderBy, 
  limit, 
  increment,
  writeBatch,
  where,WriteBatch
} from "firebase/firestore";
import { Botella, MovimientoStock, EstadisticasDashboard } from './types';

// Colecciones según tu Firebase
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

// --- 2. REGISTRAR VENTA / ENTRADA (ATÓMICO) ---
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
        const botRef = doc(db, COL_BOTELLAS, ing.productID);
        const ingRef = doc(db, COL_INGREDIENTES, ing.productID);
        const botSnap = await getDoc(botRef);
        const targetRef = botSnap.exists() ? botRef : ingRef;

        // Obtenemos el stock actual para calcular el nuevo
        const currentItem = botSnap.exists() ? botSnap.data() : (await getDoc(ingRef)).data();
        const newStock = (currentItem?.stock || 0) - (ing.cantidad * quantity);

        batch.update(targetRef, { stock: newStock });

        // ¡IMPORTANTE! Disparar alerta para este ingrediente específico
        await checkAndCreateAlerts(ing.productID, { ...currentItem, stock: newStock });
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
      nombreBotella: item.nombre,
      type: type,
      cantidad: quantity,
      nombreUsuario: userName,
      notas: notes,
      createdAt: new Date()
    };
    
    batch.set(movementRef, movementData);
    await batch.commit();

    await checkAndCreateAlerts(productId, item);
    return { id: movementRef.id, ...movementData };

  } catch (error) {
    console.error("Error en addMovement:", error);
    return null;
  }
  
}

// --- 3. LÓGICA DE ALERTAS ---
async function checkAndCreateAlerts(id: string, item: any) {
  if (item.isCombo) return;
  const currentStock = item.stock;
  const minStock = item.stockMin || 5;

  if (currentStock <= minStock) {
    await addDoc(collection(db, COL_ALERTAS), {
      botellaID: id,
      nombreBotella: item.nombre,
      isRead: false,
      type: currentStock <= 0 ? "out_of_stock" : "low_stock",
      createdAt: new Date()
    });
  }
}

// NUEVA: Obtener alertas para el Dashboard
export async function getAlerts(): Promise<any[]> {
  try {
    const q = query(collection(db, COL_ALERTAS), orderBy("createdAt", "desc"), limit(10));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    return [];
  }
}

// --- 4. STATS DASHBOARD ---
export async function getDashboardStats(): Promise<any> {
  const items = await getBottles();
  const today = new Date().toISOString().split('T')[0];
  
  return {
    totalBotellas: items.reduce((sum, i) => sum + (Number(i.stock) || 0), 0),
    valorTotal: items.reduce((sum, i) => sum + ((Number(i.stock) || 0) * (Number(i.precioCosto) || 0)), 0),
    conteoStockBajo: items.filter(i => !i.isCombo && i.stock <= i.stockMin && i.stock > 0).length,
    conteoSinStock: items.filter(i => !i.isCombo && i.stock <= 0).length,
    todaySales: 0, 
    todayEntries: 0
  };
}

// NUEVA: Obtener movimientos para cálculos del dueño
export async function getMovements() {
  const q = query(collection(db, COL_MOVIMIENTOS), orderBy("createdAt", "desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- GESTIÓN DE BOTELLAS (InventoryView) ---
export async function addBottle(datos: any): Promise<any> {
  try {
    const coleccion = datos.categoria === 'Gaseosa' ? COL_INGREDIENTES : COL_BOTELLAS;
    const docRef = await addDoc(collection(db, coleccion), {
      ...datos,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { id: docRef.id, ...datos };
  } catch (error) {
    return null;
  }
}

export async function updateBottle(id: string, updates: any): Promise<boolean> {
  try {
    const botRef = doc(db, COL_BOTELLAS, id);
    const ingRef = doc(db, COL_INGREDIENTES, id);
    const botSnap = await getDoc(botRef);
    const targetRef = botSnap.exists() ? botRef : ingRef;
    await updateDoc(targetRef, { ...updates, updatedAt: new Date() });
    return true;
  } catch (error) {
    return false;
  }
}

export async function deleteBottle(id: string): Promise<boolean> {
  try {
    const botRef = doc(db, COL_BOTELLAS, id);
    const ingRef = doc(db, COL_INGREDIENTES, id);
    const botSnap = await getDoc(botRef);
    const targetRef = botSnap.exists() ? botRef : ingRef;
    await deleteDoc(targetRef);
    return true;
  } catch (error) {
    return false;
  }
}

// --- ANULAR ÚLTIMO MOVIMIENTO (Undo) ---
export async function deleteLastMovement(movementId: string, productId: string): Promise<boolean> {
  try {
    const movementRef = doc(db, COL_MOVIMIENTOS, movementId);
    const movementSnap = await getDoc(movementRef);
    
    if (!movementSnap.exists()) return false;

    const data = movementSnap.data();
    const batch = writeBatch(db);

    // 1. Determinar cuánto hay que ajustar (Si fue Venta, sumamos para devolver)
    const adjustment = data.type === 'Venta' || data.type === 'Venta Combo' ? data.cantidad : -data.cantidad;

    // 2. IMPORTANTE: Usar el ID que está guardado DENTRO del movimiento
    // En tu addMovement guardas 'botellaID'. Ese es el ID real del ingrediente (ej: id de la coca)
    const realProductId = data.botellaID; 

    // 3. Buscar si el producto es una Botella o un Ingrediente (Gaseosa)
    const botRef = doc(db, COL_BOTELLAS, realProductId);
    const ingRef = doc(db, COL_INGREDIENTES, realProductId);
    
    const [botSnap, ingSnap] = await Promise.all([
      getDoc(botRef),
      getDoc(ingRef)
    ]);

    const targetRef = botSnap.exists() ? botRef : (ingSnap.exists() ? ingRef : null);

    if (targetRef) {
      // 4. Devolver el stock al producto real
      batch.update(targetRef, { 
        stock: increment(adjustment) 
      });
    } else {
      console.warn("No se encontró el producto original para devolver stock:", realProductId);
    }

    // 5. Borrar el registro del movimiento
    batch.delete(movementRef);
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error en deleteLastMovement:", error);
    return false;
  }
}


// --- MARCAR UNA ALERTA COMO LEÍDA ---
export async function markAlertAsRead(alertId: string): Promise<boolean> {
  try {
    const alertRef = doc(db, COL_ALERTAS, alertId);
    await updateDoc(alertRef, { 
      isRead: true 
    });
    return true;
  } catch (error) {
    console.error("Error al marcar alerta como leída:", error);
    return false;
  }
}

// --- MARCAR TODAS LAS ALERTAS COMO LEÍDAS (Opcional para el botón "Marcar todas") ---
export async function markAllAlertsAsRead(): Promise<boolean> {
  try {
    const q = query(collection(db, COL_ALERTAS), where("isRead", "==", false));
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    querySnapshot.forEach((documento) => {
      batch.update(documento.ref, { isRead: true });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error al marcar todas las alertas:", error);
    return false;
  }
}

// --- FUNCIÓN DE REPORTES AVANZADOS ---
export async function getReportDataCloud(start: Date, end: Date) {
  try {
    // 1. Traemos todo el inventario y todos los movimientos
    // (Para reportes históricos es mejor traer una base sólida de datos)
    const [botellas, movimientosRaw] = await Promise.all([
      getBottles(),
      getMovements() 
    ]);

    // 2. Filtramos los movimientos por el rango de fechas seleccionado
    const filteredMovements = movimientosRaw.filter((m: any) => {
      const moveDate = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
      return moveDate >= start && moveDate <= end;
    });

    // 3. Inicializamos los acumuladores
    const salesByBottleMap: Record<string, { name: string, quantity: number, revenue: number }> = {};
    const salesByCategory: Record<string, number> = {};
    let totalRevenue = 0;
    let totalSalesUnits = 0;
    let totalEntriesUnits = 0;

    // 4. Procesamos los datos movimiento por movimiento
    filteredMovements.forEach((m: any) => {
      const isVenta = m.type === 'Venta';
      const cantidad = Number(m.cantidad || 0);

      if (isVenta) {
        totalSalesUnits += cantidad;
        
        // Buscamos la botella para obtener el precio y la categoría
        const botella = botellas.find(b => b.id === m.botellaID);
        const precio = Number(botella?.precio || 0);
        const revenueMove = cantidad * precio;
        totalRevenue += revenueMove;

        // Agrupamos por botella para el ranking
        if (!salesByBottleMap[m.botellaID]) {
          salesByBottleMap[m.botellaID] = { 
            name: m.nombreBotella || 'Producto Desconocido', 
            quantity: 0, 
            revenue: 0 
          };
        }
        salesByBottleMap[m.botellaID].quantity += cantidad;
        salesByBottleMap[m.botellaID].revenue += revenueMove;

        // Agrupamos por categoría
        const cat = botella?.categoria || 'otros';
        salesByCategory[cat] = (salesByCategory[cat] || 0) + cantidad;

      } else if (m.type === 'Entrada') {
        totalEntriesUnits += cantidad;
      }
    });

    // 5. Devolvemos el objeto formateado para la vista
    return {
      movements: filteredMovements,
      totalSales: totalSalesUnits,
      totalEntries: totalEntriesUnits,
      totalRevenue: totalRevenue,
      salesByCategory: salesByCategory,
      // Convertimos el mapa a un array y lo ordenamos por los que más recaudaron
      salesByBottle: Object.values(salesByBottleMap).sort((a, b) => b.revenue - a.revenue)
    };

  } catch (error) {
    console.error("Error generando reporte cloud:", error);
    return null;
  }
}