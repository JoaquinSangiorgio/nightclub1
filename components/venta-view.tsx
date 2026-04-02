'use client'

import { useEffect, useState } from 'react'
import { getBottles, addMovement } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { Botella } from '@/lib/types'
import { 
  Wine, Zap, History, Search, ShoppingCart, 
  Plus, ArrowUpRight, RotateCcw, User as UserIcon, Layers, Loader2, X, AlertCircle, CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner' 

export function VentaView() {
  const { user } = useAuth()
  const [bottles, setBottles] = useState<Botella[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isFinishing, setIsFinishing] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false) // Nuevo estado para el modal
  
  const [sessionSales, setSessionSales] = useState<{
    id: string, 
    name: string, 
    qty: number,
    isCombo: boolean
  }[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bar_session_sales')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })

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

  useEffect(() => {
    localStorage.setItem('bar_session_sales', JSON.stringify(sessionSales))
  }, [sessionSales])

  const checkComboStock = (combo: Botella) => {
    if (!combo.isCombo || !combo.receta) return { available: true }
    for (const ing of combo.receta) {
      const idIngrediente = (ing as any).productID || (ing as any).productId;
      const productoBase = bottles.find(b => b.id === idIngrediente)
      if (!productoBase || (productoBase.stock || 0) < ing.cantidad) {
        return { available: false, missing: productoBase?.nombre || "Ingrediente" }
      }
    }
    return { available: true }
  }

  const handleQuickSale = (item: Botella) => {
    const isCombo = !!item.isCombo;
    const { available, missing } = isCombo ? checkComboStock(item) : { 
      available: (item.stock || 0) > 0, 
      missing: item.nombre 
    };

    if (!available) {
      toast.error(`Sin stock de ${missing}`);
      return;
    }

    setBottles(prev => prev.map(b => {
      if (isCombo && item.receta) {
        const ing = item.receta.find((r: any) => (r.productID || r.productId) === b.id);
        return ing ? { ...b, stock: (b.stock || 0) - ing.cantidad } : b;
      }
      return b.id === item.id ? { ...b, stock: (b.stock || 0) - 1 } : b;
    }));

    setSessionSales(prev => {
      const exists = prev.find(s => s.id === item.id);
      if (exists) {
        return prev.map(s => s.id === item.id ? { ...s, qty: s.qty + 1 } : s);
      }
      return [...prev, { id: item.id, name: item.nombre, qty: 1, isCombo }];
    });

    toast.success(`${item.nombre} en lista`, { duration: 1000 });
  };

  const handleUndoLocal = (productId: string) => {
    const saleItem = sessionSales.find(s => s.id === productId);
    if (!saleItem) return;
    const original = bottles.find(b => b.id === productId);

    setBottles(prev => prev.map(b => {
      if (saleItem.isCombo && original?.receta) {
        const ing = original.receta.find((r: any) => (r.productID || r.productId) === b.id);
        return ing ? { ...b, stock: (b.stock || 0) + ing.cantidad } : b;
      }
      return b.id === productId ? { ...b, stock: (b.stock || 0) + 1 } : b;
    }));

    setSessionSales(prev => prev.map(s => 
      s.id === productId ? { ...s, qty: s.qty - 1 } : s
    ).filter(s => s.qty > 0));
  };

  // --- LÓGICA DE CIERRE REAL ---
  const processFinalSale = async () => {
    setShowConfirmModal(false);
    setIsFinishing(true);
    const toastId = toast.loading("Sincronizando Venta final...");

    try {
      const promises = sessionSales.map(sale => 
        addMovement(
          sale.id, 
          'Venta', 
          sale.qty, 
          user?.id || 'anon', 
          user?.name || 'Sistema', 
          sale.isCombo ? `Combo: ${sale.name}` : 'Venta Rápida'
        )
      );

      await Promise.all(promises);

      setSessionSales([]);
      localStorage.removeItem('bar_session_sales');
      await loadData();
      
      toast.success("Venta completada con éxito", { id: toastId, icon: <CheckCircle2 className="text-emerald-500" /> });
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cerrar la venta. Reintentá.", { id: toastId, icon: <AlertCircle className="text-rose-500" /> });
    } finally {
      setIsFinishing(false);
    }
  }

  const filteredItems = bottles.filter(b => 
    b.nombre.toLowerCase().includes(search.toLowerCase()) || 
    b.marca.toLowerCase().includes(search.toLowerCase())
  )
  const comboItems = filteredItems.filter(b => b.isCombo)
  const productItems = filteredItems.filter(b => !b.isCombo)

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-500 font-black italic animate-pulse">Sincronizando Barra...</div>

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-8 font-rounded animate-in fade-in duration-500 overflow-hidden relative">
      
      <div className="flex-[2] flex flex-col space-y-6 min-h-0">
        {/* Header Catálogo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 px-2">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-rose-500/20 rounded-[1.5rem] text-rose-500 shadow-lg">
              <Zap className="w-8 h-8 fill-current" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">VENTA</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
                Operador: <span className="text-rose-400">{user?.name}</span>
              </p>
            </div>
          </div>
          
          <div className="relative w-full md:w-72 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-rose-500 transition-colors" />
            <input 
              type="text" placeholder="Buscar producto..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-slate-900/50 border-2 border-slate-800 rounded-[1.8rem] text-white outline-none focus:border-rose-500/50 font-bold transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-10 custom-scrollbar pb-10">
          {comboItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] italic">Combos</h2>
                <div className="flex-1 h-[1px] bg-purple-500/20 rounded-full" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {comboItems.map(bottle => {
                  const status = checkComboStock(bottle);
                  return <ItemButton key={bottle.id} bottle={bottle} isOut={!status.available} status={status} onClick={() => handleQuickSale(bottle)} />
                })}
              </div>
            </div>
          )}

          {productItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <Wine className="w-5 h-5 text-rose-500" />
                <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] italic">Botellas</h2>
                <div className="flex-1 h-[1px] bg-rose-500/20 rounded-full" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {productItems.map(bottle => (
                  <ItemButton key={bottle.id} bottle={bottle} isOut={(bottle.stock || 0) <= 0} onClick={() => handleQuickSale(bottle)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PANEL DERECHO: CIERRE DE SESIÓN */}
      <div className="flex-1 bg-slate-900/30 border-2 border-slate-800 rounded-[3rem] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-8 border-b-2 border-slate-800 bg-rose-500/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-rose-500" />
            <h2 className="font-bold text-white uppercase tracking-widest text-sm italic">Pre-Carga</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {sessionSales.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-800 space-y-4 opacity-20">
              <ShoppingCart className="w-16 h-16" />
              <p className="text-xs font-black uppercase italic tracking-widest">Esperando pedidos...</p>
            </div>
          ) : (
            sessionSales.map((sale) => (
              <div key={sale.id} className="group flex items-center justify-between bg-slate-900/80 p-5 rounded-[2.2rem] border border-slate-800 hover:border-rose-500/30 transition-all">
                <div className="min-w-0 pr-4">
                  <p className="font-black text-slate-200 text-[11px] uppercase truncate italic">{sale.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleUndoLocal(sale.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <div className="bg-rose-500 text-white font-black px-4 py-2 rounded-2xl text-xl">x{sale.qty}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-8 bg-slate-900 border-t-2 border-slate-800 shrink-0">
          <div className="flex justify-between items-center mb-6 px-2">
            <span className="text-slate-500 font-bold uppercase text-[10px]">Items totales</span>
            <span className="text-5xl font-black text-white italic">
              {sessionSales.reduce((acc, curr) => acc + curr.qty, 0)}
            </span>
          </div>
          <button 
            onClick={() => sessionSales.length > 0 && setShowConfirmModal(true)} 
            disabled={isFinishing || sessionSales.length === 0}
            className="w-full py-6 bg-white text-slate-950 font-black rounded-[1.8rem] flex items-center justify-center gap-3 hover:bg-rose-500 hover:text-white transition-all text-xl uppercase italic shadow-2xl active:scale-95 disabled:opacity-30"
          >
            {isFinishing ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowUpRight className="w-6 h-6 stroke-[3px]" />}
            {isFinishing ? 'Procesando...' : 'Confirmar Venta'}
          </button>
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN PERSONALIZADO (REEMPLAZA AL ALERT DE LOCALHOST) */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-rose-500/20 rounded-3xl flex items-center justify-center text-rose-500">
                <AlertCircle className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase italic">¿Confirmar Venta?</h2>
                <p className="text-slate-500 text-xs font-bold uppercase mt-2 leading-relaxed">
                  Se descontarán <span className="text-white">{sessionSales.reduce((acc, curr) => acc + curr.qty, 0)} items</span> del inventario y se registrarán permanentemente.
                </p>
              </div>
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-4 bg-slate-800 text-slate-400 font-black rounded-2xl uppercase text-[10px] hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={processFinalSale}
                  className="flex-2 py-4 bg-green-900 text-white font-black rounded-2xl uppercase text-[10px] px-8 hover:bg-green-500 transition-all shadow-lg shadow-rose-600/20"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function ItemButton({ bottle, isOut, status, onClick }: { bottle: Botella, isOut: boolean, status?: any, onClick: () => void }) {
  const isCombo = bottle.isCombo;
  return (
    <button
      disabled={isOut}
      onClick={onClick}
      className={`group relative aspect-square rounded-[2.5rem] border-2 transition-all active:scale-95 flex flex-col items-center justify-center p-4 text-center ${isOut ? 'bg-slate-900/20 border-slate-800 opacity-40 cursor-not-allowed grayscale' : isCombo ? 'bg-purple-600/10 border-purple-500/40 hover:border-purple-400' : 'bg-slate-900/40 border-slate-800 hover:border-rose-500 shadow-xl'}`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 mb-3 transition-colors ${isOut ? 'bg-slate-800 border-slate-700' : isCombo ? 'bg-purple-900/40 border-purple-500/50 text-purple-400' : 'bg-slate-800 border-slate-700 text-slate-400 group-hover:text-rose-500'}`}>
        {isCombo ? <Layers className="w-8 h-8" /> : <Wine className="w-8 h-8" />}
      </div>
      <div className="min-w-0 w-full px-2">
        <p className="font-bold text-white text-[11px] uppercase leading-tight truncate italic">{bottle.nombre}</p>
        <p className="text-[10px] font-black text-slate-600 mt-2 uppercase tracking-tighter">
          {isCombo ? (isOut ? `FALTA: ${status?.missing}` : 'Disponible') : `STOCK: ${bottle.stock || 0}`}
        </p>
      </div>
    </button>
  );
}