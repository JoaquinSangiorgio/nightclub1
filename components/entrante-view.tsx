'use client'

import { useEffect, useState } from 'react'
import { getBottles, addMovement } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { Botella } from '@/lib/types'
import { 
  Truck, Plus, Trash2, Save, PackageCheck, 
  Search, ShoppingCart, Loader2, FileText 
} from 'lucide-react'
import { toast } from 'sonner'

export default function EntranteView() {
  const { user } = useAuth()
  const [bottles, setBottles] = useState<Botella[]>([])
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
    const data = await getBottles()
    // FILTRO: Solo botellas individuales (NO COMBOS)
    setBottles(data.filter(b => !b.isCombo))
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
        qty: 1, // Empezamos en 1 para que sea más natural
        cost: bottle.precioCosto || 0 
      }])
      toast.success(`${bottle.nombre} añadido`)
    }
  }

  const updateItem = (id: string, field: 'qty' | 'cost', value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setCart(cart.map(item => item.id === id ? { ...item, [field]: numValue } : item))
  }

  const handleFinalize = async () => {
    if (cart.length === 0 || isSaving) return
    const toastId = toast.loading("Registrando entrada...")
    setIsSaving(true)
    
    try {
      const promises = cart.map(item => 
        addMovement(
          item.id,
          'Entrada',
          item.qty,
          user?.id || 'anon',
          user?.name || 'Sistema',
          `Proveedor: ${nota || 'General'} - Costo: $${item.cost}`
        )
      )
      await Promise.all(promises)
      setCart([])
      setNota('')
      localStorage.removeItem('bar_incoming_cart')
      await loadData() 
      toast.success("¡Stock actualizado!", { id: toastId })
    } catch (error) {
      toast.error("Error al guardar", { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const filteredBottles = bottles.filter(b => 
    b.nombre.toLowerCase().includes(search.toLowerCase()) ||
    b.marca.toLowerCase().includes(search.toLowerCase())
  )

  const totalInvestment = cart.reduce((acc, curr) => acc + (curr.qty * curr.cost), 0)

  // Función para manejar el foco y limpiar el 0 visualmente
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
    </div>
  )

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-8 font-rounded animate-in fade-in duration-500 overflow-hidden">
      
      {/* PANEL IZQUIERDO */}
      <div className="flex-1 flex flex-col space-y-4 min-h-0">
        <div className="flex items-center gap-3 px-2">
          <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400"><Truck className="w-6 h-6" /></div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Recepción</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Solo Botellas Individuales</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" placeholder="Buscar producto..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-4 bg-slate-900/50 border-2 border-slate-800 rounded-[1.5rem] text-white outline-none focus:border-indigo-500/50 font-bold"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
          {filteredBottles.map(bottle => (
            <button key={bottle.id} onClick={() => addToCart(bottle)} className="w-full flex items-center justify-between p-4 bg-slate-900/30 border-2 border-slate-800 hover:border-indigo-500/50 rounded-2xl transition-all group">
              <div className="text-left">
                <p className="font-bold text-white text-sm uppercase">{bottle.nombre}</p>
                <p className="text-[10px] text-slate-500 font-bold">{bottle.marca} • Stock: {bottle.stock}</p>
              </div>
              <Plus className="w-5 h-5 text-slate-600 group-hover:text-indigo-400" />
            </button>
          ))}
        </div>
      </div>

      {/* PANEL DERECHO */}
      <div className="flex-1 bg-slate-900/40 border-2 border-slate-800 rounded-[3rem] flex flex-col overflow-hidden shadow-2xl relative">
        <div className="p-6 border-b-2 border-slate-800 bg-emerald-500/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-white uppercase text-sm italic">Detalle de Ingreso</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-40">
              <ShoppingCart className="w-16 h-16 mb-4 stroke-[1px]" />
              <p className="font-bold italic text-sm uppercase tracking-widest text-center">Sin productos<br/>seleccionados</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="bg-slate-950/50 p-5 rounded-[2rem] border border-slate-800 space-y-4">
                <div className="flex justify-between items-start px-2">
                  <p className="font-black text-white text-[11px] uppercase truncate w-40 italic">{item.name}</p>
                  <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="text-slate-600 hover:text-rose-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 text-center">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Cantidad</label>
                    <input 
                      type="number" 
                      value={item.qty === 0 ? '' : item.qty} 
                      onFocus={handleFocus}
                      placeholder="0"
                      onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white font-black outline-none focus:border-indigo-500 text-center" 
                    />
                  </div>
                  <div className="space-y-1 text-center">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Costo Unit ($)</label>
                    <input 
                      type="number" 
                      value={item.cost === 0 ? '' : item.cost}
                      onFocus={handleFocus}
                      placeholder="0"
                      onChange={(e) => updateItem(item.id, 'cost', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-emerald-400 font-black outline-none focus:border-emerald-500 text-center" 
                    />
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
                type="text" placeholder="Origen / Proveedor / Remito..." value={nota}
                onChange={(e) => setNota(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold outline-none italic focus:border-indigo-500/50"
              />
            </div>

            <div className="flex justify-between items-center px-2">
              <span className="text-slate-500 font-bold uppercase text-[10px]">Inversión Total:</span>
              <span className="text-3xl font-black text-white italic">${totalInvestment.toLocaleString()}</span>
            </div>

            <button onClick={handleFinalize} disabled={isSaving} className={`w-full py-5 ${isSaving ? 'bg-slate-700' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-black rounded-[1.8rem] flex items-center justify-center gap-3 shadow-xl active:scale-95 text-lg uppercase italic`}>
              {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              {isSaving ? 'Cargando...' : 'Confirmar Ingreso'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 