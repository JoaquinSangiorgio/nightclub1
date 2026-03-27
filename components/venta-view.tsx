'use client'

import { useEffect, useState } from 'react'
import { getBottles, addMovement, deleteLastMovement } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { Botella } from '@/lib/types'
import { 
  Wine, Zap, History, Search, ShoppingCart, 
  Plus, ArrowUpRight, RotateCcw, User as UserIcon, Layers 
} from 'lucide-react'
import { toast } from 'sonner' 
import { CheckCircle2, AlertCircle } from 'lucide-react'


export function VentaView() {
  const { user } = useAuth()
  const [bottles, setBottles] = useState<Botella[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  
  // Estado para rastrear las ventas de la sesión actual
  const [sessionSales, setSessionSales] = useState<{
    id: string, 
    name: string, 
    qty: number, 
    movementIds: string[] 
  }[]>([])

  const loadData = async () => {
    const data = await getBottles()
    setBottles(data)
  }
  
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await loadData()
      setLoading(false)
    }
    init()
  }, [])

  // VALIDACIÓN DE STOCK PARA COMBOS
  const checkComboStock = (combo: Botella) => {
    if (!combo.isCombo || !combo.receta) return { available: true }
    
    for (const ing of combo.receta) {
      // Buscamos el ID del ingrediente (soporta productID o productId)
      const idIngrediente = (ing as any).productID || (ing as any).productId;
      const productoBase = bottles.find(b => b.id === idIngrediente)
      
      if (!productoBase || (productoBase.stock || 0) < ing.cantidad) {
        return { 
          available: false, 
          missing: productoBase?.nombre || "Ingrediente" 
        }
      }
    }
    return { available: true }
  }

  const handleQuickSale = async (item: Botella) => {
  const isCombo = !!item.isCombo;
  
  // 1. VALIDACIÓN DE STOCK (Anti-errores)
  const { available, missing } = isCombo ? checkComboStock(item) : { 
    available: (item.stock || 0) > 0, 
    missing: item.nombre 
  };

  if (!available) {
    toast.error(`Sin stock de ${missing}`);
    return;
  }

  // --- OPTIMIZACIÓN DE UX (INSTANTÁNEO) ---
  const previousBottles = [...bottles];
  const previousSession = [...sessionSales];

  // Actualizamos el stock VISUALMENTE de inmediato
  setBottles(prev => prev.map(b => {
    if (isCombo && item.receta) {
      // Buscamos el ingrediente ignorando si es 'productID' o 'productId'
      const ing = item.receta.find((r: any) => (r.productID || r.productId) === b.id);
      return ing ? { ...b, stock: (b.stock || 0) - ing.cantidad } : b;
    }
    return b.id === item.id ? { ...b, stock: (b.stock || 0) - 1 } : b;
  }));

  // Agregamos al resumen derecho de inmediato
  setSessionSales(prev => {
    const exists = prev.find(s => s.id === item.id);
    if (exists) {
      return prev.map(s => s.id === item.id ? { ...s, qty: s.qty + 1 } : s);
    }
    return [...prev, { id: item.id, name: item.nombre, qty: 1, movementIds: [] }];
  });

  const toastId = toast.loading(`Despachando ${item.nombre}...`);

  try {
    // --- OPTIMIZACIÓN DE RED (PROMISE.ALL) ---
    let resultIds: string[] = [];

    if (isCombo && item.receta) {
      const promises = item.receta.map((ing: any) => {
        // Usamos el ID correcto que venga de la DB (D mayúscula o d minúscula)
        const idFinal = ing.productID || ing.productId; 
        return addMovement(
          idFinal, 
          'Venta', 
          ing.cantidad, 
          user?.id || 'anon', 
          user?.name || 'Sistema', 
          `Combo: ${item.nombre}`
        );
      });
      const results = await Promise.all(promises);
      resultIds = results.filter(r => r !== null).map(r => r.id);
    } else {
      const res = await addMovement(item.id, 'Venta', 1, user?.id || 'anon', user?.name || 'Sistema', 'Venta rápida');
      if (res) resultIds = [res.id];
    }

    // Guardamos los IDs reales en el fondo
    setSessionSales(prev => prev.map(s => 
      s.id === item.id ? { ...s, movementIds: [...s.movementIds, ...resultIds] } : s
    ));

    toast.success(`${item.nombre} listo!`, { id: toastId });

  } catch (e) {
    // Si falla internet, revertimos los cambios visuales
    setBottles(previousBottles);
    setSessionSales(previousSession);
    toast.error("Error de sincronización", { id: toastId });
  }
};

  // FUNCIÓN PARA DESHACER (Devuelve el stock)
  const handleUndo = async (productId: string) => {
  const saleItem = sessionSales.find(s => s.id === productId)
  if (!saleItem) return

  const bottleOriginal = bottles.find(b => b.id === productId)
  const recetaSize = bottleOriginal?.isCombo ? (bottleOriginal.receta?.length || 1) : 1
  const idsToUndo = saleItem.movementIds.slice(-recetaSize)

  // --- OPTIMIZACIÓN DE UX (Instantáneo) ---
  // Actualizamos la lista de la derecha ANTES de ir a la base de datos
  const backupSales = [...sessionSales]; // Copia de seguridad por si falla
  setSessionSales(prev => prev.map(s => 
    s.id === productId 
      ? { ...s, qty: s.qty - 1, movementIds: s.movementIds.slice(0, -recetaSize) } 
      : s
  ).filter(s => s.qty > 0))

  const toastId = toast.loading(`Sincronizando stock...`);

  try {
    // --- OPTIMIZACIÓN DE RED (Paralelo) ---
    // Ejecutamos todos los deleteLastMovement al mismo tiempo
    await Promise.all(
      idsToUndo.map(moveId => deleteLastMovement(moveId, productId))
    );

    // Recargamos los datos para confirmar que los números son correctos
    await loadData()
    toast.success("Stock restaurado", { id: toastId });

  } catch (e) {
    // Si algo sale mal, devolvemos la interfaz a como estaba
    setSessionSales(backupSales);
    await loadData();
    toast.error("Error de conexión. Intenta de nuevo.", { id: toastId });
  }
}

  const filteredBottles = bottles.filter(b => 
    b.nombre.toLowerCase().includes(search.toLowerCase()) || 
    b.marca.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-500 font-black italic animate-pulse">Sincronizando Barra...</div>

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-8 font-rounded animate-in fade-in duration-500 overflow-hidden">
      
      {/* PANEL IZQUIERDO: CATÁLOGO */}
      <div className="flex-[2] flex flex-col space-y-6 min-h-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 px-2">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-rose-500/20 rounded-[1.5rem] text-rose-500 shadow-lg shadow-rose-500/10">
              <Zap className="w-8 h-8 fill-current" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">Despacho</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
                Sesión: <span className="text-rose-400">{user?.name}</span>
              </p>
            </div>
          </div>
          
          <div className="relative w-full md:w-72 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-rose-500 transition-colors" />
            <input 
              type="text" placeholder="Buscar botella o combo..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-900/50 border-2 border-slate-800 rounded-[1.8rem] text-white outline-none focus:border-rose-500/50 font-bold transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 content-start custom-scrollbar">
          {filteredBottles.map(bottle => {
            const isCombo = bottle.isCombo;
            const status = isCombo ? checkComboStock(bottle) : null;
            const isOut = isCombo ? !status?.available : (bottle.stock || 0) <= 0;

            return (
              <button
                key={bottle.id}
                disabled={isOut}
                onClick={() => handleQuickSale(bottle)}
                className={`
                  group relative aspect-square rounded-[2.5rem] border-2 transition-all active:scale-95 flex flex-col items-center justify-center p-4 text-center
                  ${isOut 
                    ? 'bg-slate-900/20 border-slate-800 opacity-40 cursor-not-allowed grayscale' 
                    : isCombo 
                      ? 'bg-purple-600/10 border-purple-500/40 hover:border-purple-400 shadow-xl shadow-purple-900/10'
                      : 'bg-slate-900/40 border-slate-800 hover:border-rose-500 shadow-xl shadow-black/40'}
                `}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 mb-3 transition-colors 
                  ${isOut ? 'bg-slate-800 border-slate-700' : isCombo ? 'bg-purple-900/40 border-purple-500/50 text-purple-400' : 'bg-slate-800 border-slate-700 text-slate-400 group-hover:text-rose-500'}`}>
                  {isCombo ? <Layers className="w-8 h-8" /> : <Wine className="w-8 h-8" />}
                </div>
                
                <div className="min-w-0 w-full px-2">
                  <p className="font-bold text-white text-[11px] uppercase leading-tight truncate">{bottle.nombre}</p>
                  {isCombo ? (
                    <p className={`text-[9px] font-black mt-2 uppercase ${isOut ? 'text-rose-500 animate-pulse' : 'text-purple-400'}`}>
                      {isOut ? `FALTA: ${status?.missing}` : 'Combo Disponible'}
                    </p>
                  ) : (
                    <p className="text-[10px] font-black text-slate-600 mt-2 uppercase tracking-tighter">
                      STOCK: <span className={(bottle.stock || 0) <= (bottle.stockMin || 0) ? 'text-orange-500 animate-pulse' : 'text-slate-400'}>{bottle.stock || 0}</span>
                    </p>
                  )}
                </div>

                {!isOut && (
                  <div className={`absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-1.5 shadow-lg ${isCombo ? 'bg-purple-500 shadow-purple-500/40' : 'bg-rose-500 shadow-rose-500/40'}`}>
                    <Plus className="w-3 h-3 text-white stroke-[4px]" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* PANEL DERECHO: HISTORIAL DE LA SESIÓN */}
      <div className="flex-1 bg-[#0f172a]/50 border-2 border-slate-800 rounded-[3rem] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-8 border-b-2 border-slate-800 bg-rose-500/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-rose-500" />
            <h2 className="font-bold text-white uppercase tracking-widest text-sm italic">Movimientos Hoy</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
            <span className="text-rose-500 text-[10px] font-black uppercase">Live</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {sessionSales.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-800 space-y-4 opacity-20">
              <ShoppingCart className="w-16 h-16" />
              <p className="text-xs font-black uppercase tracking-widest italic">Barra vacía</p>
            </div>
          ) : (
            sessionSales.map((sale) => (
              <div key={sale.id} className="group flex items-center justify-between bg-slate-900/80 p-5 rounded-[2.2rem] border border-slate-800 hover:border-rose-500/30 transition-all shadow-xl shadow-black/20">
                <div className="min-w-0 pr-4">
                  <p className="font-black text-slate-200 text-[11px] uppercase truncate mb-1 italic tracking-tight">{sale.name}</p>
                  <p className="text-[9px] text-slate-600 font-bold uppercase flex items-center gap-1.5 tracking-tighter">
                    <UserIcon className="w-2.5 h-2.5" /> {user?.name}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleUndo(sale.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all active:scale-90"
                    title="Anular despacho"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <div className="bg-rose-500 text-white font-black px-4 py-2 rounded-2xl text-xl shadow-lg shadow-rose-500/20">
                    x{sale.qty}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER DEL RESUMEN */}
        <div className="p-8 bg-slate-900 border-t-2 border-slate-800 shrink-0">
          <div className="flex justify-between items-center mb-6 px-2">
            <span className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Total Despachado</span>
            <span className="text-5xl font-black text-white italic tracking-tighter">
              {sessionSales.reduce((acc, curr) => acc + curr.qty, 0)}
            </span>
          </div>
          <button className="w-full py-6 bg-white text-slate-950 font-black rounded-[1.8rem] flex items-center justify-center gap-3 hover:bg-rose-500 hover:text-white transition-all text-xl uppercase italic shadow-2xl active:scale-95">
            Cerrar Reporte
            <ArrowUpRight className="w-6 h-6 stroke-[3px]" />
          </button>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; }
      `}</style>
    </div>
  )
}