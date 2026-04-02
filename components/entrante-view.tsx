'use client'

import { useEffect, useState } from 'react'
import { getBottles, addMovement, getAlerts, markAlertAsRead } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { Botella } from '@/lib/types'
import { 
  Truck, Plus, Trash2, Save, PackageCheck, 
  Search, ShoppingCart, Loader2, FileText, Bell, AlertTriangle, Check
} from 'lucide-react'
import { toast } from 'sonner'

export default function EntranteView() {
  const { user } = useAuth()
  const [bottles, setBottles] = useState<Botella[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [nota, setNota] = useState('')

  const [cart, setCart] = useState<{id: string, name: string, qty: number, cost: number}[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bar_incoming_cart')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })

  const loadData = async () => {
    const [bottlesData, alertsData] = await Promise.all([
      getBottles(),
      getAlerts()
    ])
    setBottles(bottlesData.filter(b => !b.isCombo))
    
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
    localStorage.setItem('bar_incoming_cart', JSON.stringify(cart))
  }, [cart])

  const addToCart = (bottle: Botella) => {
    const exists = cart.find(item => item.id === bottle.id)
    if (!exists) {
      setCart([...cart, { 
        id: bottle.id, 
        name: bottle.nombre, 
        qty: 1, 
        cost: bottle.precioCosto || 0 
      }])
      toast.success(`${bottle.nombre} añadido al detalle`)
    }
  }

  const updateItem = (id: string, field: 'qty' | 'cost', value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setCart(cart.map(item => item.id === id ? { ...item, [field]: numValue } : item))
  }

  const handleMarkAsRead = async (id: string) => {
    const success = await markAlertAsRead(id)
    if (success) {
      setAlerts(prev => prev.filter(a => a.id !== id))
    }
  }

  const handleFinalize = async () => {
    if (cart.length === 0 || isSaving) return
    const toastId = toast.loading("Registrando entrada y actualizando nube...")
    setIsSaving(true)
    
    try {
      const promises = cart.map(item => 
        addMovement(
          item.id,
          'Entrada',
          item.qty,
          user?.id || 'anon',
          user?.name || 'Sistema',
          `Recepción: ${nota || 'General'} - Costo Ref: $${item.cost}`
        )
      )
      await Promise.all(promises)
      setCart([])
      setNota('')
      localStorage.removeItem('bar_incoming_cart')
      await loadData() 
      toast.success("¡Stock actualizado correctamente!", { id: toastId })
    } catch (error) {
      toast.error("Error al guardar movimientos", { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const filteredBottles = bottles.filter(b => 
    b.nombre.toLowerCase().includes(search.toLowerCase()) ||
    b.marca.toLowerCase().includes(search.toLowerCase())
  )

  const totalInvestment = cart.reduce((acc, curr) => acc + (curr.qty * curr.cost), 0)
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  if (loading) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-4 text-slate-500 font-black italic uppercase text-xs">
      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      Cargando manifiesto...
    </div>
  )

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-8 font-rounded animate-in fade-in duration-500 overflow-hidden">
      
      {/* PANEL IZQUIERDO: ALERTS + SEARCH + BOTTLES */}
      <div className="flex-[1.2] flex flex-col space-y-4 min-h-0">
        
        {/* Header Seccion */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400 shadow-lg shadow-indigo-500/10"><Truck className="w-6 h-6" /></div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Recepción</h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Ingreso de Mercadería</p>
            </div>
          </div>
        </div>

        {/* SECCION DE ALERTAS (NUEVO) */}
        {alerts.length > 0 && (
          <div className="space-y-2 px-2">
             <div className="flex items-center gap-2 mb-3">
                <Bell className="w-3 h-3 text-rose-500" />
                <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em]">Prioridad de Reposición</span>
             </div>
             <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {alerts.map(alert => (
                  <div key={alert.id} className="flex-shrink-0 bg-rose-500/10 border border-rose-500/30 p-3 rounded-2xl flex items-center gap-4 animate-in slide-in-from-left-4">
                    <div className="min-w-0">
                      <p className="text-white font-black text-[10px] uppercase truncate w-32 italic">{alert.nombreBotella}</p>
                      <p className="text-[8px] text-rose-400 font-bold uppercase">{alert.type === 'out_of_stock' ? 'AGOTADO' : 'STOCK BAJO'}</p>
                    </div>
                    <button 
                      onClick={() => handleMarkAsRead(alert.id)}
                      className="p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-400 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* Buscador */}
        <div className="relative px-2">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" placeholder="Buscar producto a ingresar..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border-2 border-slate-800 rounded-[1.5rem] text-white outline-none focus:border-indigo-500/50 font-bold transition-all"
          />
        </div>

        {/* Lista de Botellas */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar px-2">
          {filteredBottles.map(bottle => (
            <button key={bottle.id} onClick={() => addToCart(bottle)} className="w-full flex items-center justify-between p-4 bg-slate-900/30 border-2 border-slate-800 hover:border-indigo-500/50 rounded-2xl transition-all group active:scale-[0.98]">
              <div className="text-left">
                <p className="font-bold text-white text-sm uppercase italic">{bottle.nombre}</p>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-[9px] text-slate-500 font-bold uppercase">{bottle.marca}</p>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${bottle.stock <= bottle.stockMin ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-800 text-slate-400'}`}>
                    Stock: {bottle.stock}
                  </span>
                </div>
              </div>
              <Plus className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* PANEL DERECHO: MANIFIESTO DE CARGA */}
      <div className="flex-1 bg-slate-900/40 border-2 border-slate-800 rounded-[3rem] flex flex-col overflow-hidden shadow-2xl relative">
        <div className="p-8 border-b-2 border-slate-800 bg-emerald-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PackageCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-black text-white uppercase text-sm italic tracking-widest">Detalle de Ingreso</h2>
          </div>
          {cart.length > 0 && <span className="text-[10px] font-black bg-emerald-500 text-black px-3 py-1 rounded-full uppercase italic">{cart.length} Ítems</span>}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-20">
              <ShoppingCart className="w-16 h-16 mb-4 stroke-[1px]" />
              <p className="font-black italic text-xs uppercase tracking-[0.3em] text-center leading-relaxed">Esperando<br/>Mercadería</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="bg-slate-950/80 p-5 rounded-[2.5rem] border border-slate-800 space-y-4 animate-in zoom-in-95">
                <div className="flex justify-between items-start px-2">
                  <p className="font-black text-slate-200 text-[11px] uppercase truncate w-40 italic">{item.name}</p>
                  <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="p-2 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 text-center">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Cantidad</label>
                    <input 
                      type="number" 
                      value={item.qty === 0 ? '' : item.qty} 
                      onFocus={handleFocus}
                      placeholder="0"
                      onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-white font-black outline-none focus:border-indigo-500 text-center text-xl" 
                    />
                  </div>
                  <div className="space-y-2 text-center">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Costo Unit.</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 font-bold text-xs">$</span>
                      <input 
                        type="number" 
                        value={item.cost === 0 ? '' : item.cost}
                        onFocus={handleFocus}
                        placeholder="0"
                        onChange={(e) => updateItem(item.id, 'cost', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-7 pr-4 py-3 text-emerald-400 font-black outline-none focus:border-emerald-500 text-center text-xl" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-8 bg-slate-900 border-t-2 border-slate-800 space-y-6">
            <div className="relative group">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input 
                type="text" placeholder="Origen / Proveedor / Notas..." value={nota}
                onChange={(e) => setNota(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white font-bold outline-none italic focus:border-indigo-500/50 transition-all uppercase"
              />
            </div>

            <div className="flex justify-between items-center px-2">
              <div className="flex flex-col">
                <span className="text-slate-500 font-black uppercase text-[40px] tracking-widest leading-none">TOTAL</span>
                
              </div>
              <span className="text-4xl font-black text-white italic tracking-tighter">${totalInvestment.toLocaleString()}</span>
            </div>

            <button onClick={handleFinalize} disabled={isSaving} className={`w-full py-6 ${isSaving ? 'bg-slate-800 text-slate-600' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/10'} text-white font-black rounded-[2rem] flex items-center justify-center gap-3 shadow-2xl active:scale-95 text-xl uppercase italic transition-all`}>
              {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6 stroke-[3px]" />}
              {isSaving ? 'Procesando...' : 'Confirmar Ingreso'}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}