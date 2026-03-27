'use client'

import { useEffect, useState } from 'react'
import { getBottles, addMovement } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { Botella } from '@/lib/types' // Importación corregida
import { 
  Truck, 
  Plus, 
  Trash2, 
  Save, 
  PackageCheck, 
  Search, 
  ShoppingCart,
  Loader2
} from 'lucide-react'

export default function EntranteView() {
  const { user } = useAuth()
  const [bottles, setBottles] = useState<Botella[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [cart, setCart] = useState<{id: string, name: string, qty: number, cost: number}[]>([])

  // Carga inicial asíncrona desde Firebase
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

  const addToCart = (bottle: Botella) => {
    const exists = cart.find(item => item.id === bottle.id)
    if (!exists) {
      setCart([...cart, { 
        id: bottle.id, 
        name: bottle.nombre, // Cambiado de .name a .nombre
        qty: 1, 
        cost: bottle.precioCosto || 0 // Cambiado de .costPrice a .precioCosto
      }])
    }
  }

  const updateItem = (id: string, field: 'qty' | 'cost', value: number) => {
    setCart(cart.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  // Finalizar carga asíncronamente
  const handleFinalize = async () => {
    if (cart.length === 0 || isSaving) return

    setIsSaving(true)
    try {
      // Ejecutamos todos los movimientos en Firebase
      const promises = cart.map(item => 
        addMovement(
          item.id,
          'Entrada', // Ajustado a 'Entrada' con E mayúscula para coincidir con tu Firebase
          item.qty,
          user?.id || 'anon',
          user?.name || 'Sistema',
          `Ingreso de mercadería - Costo: $${item.cost}`
        )
      )

      await Promise.all(promises)

      setCart([])
      await loadData() // Refrescar stock visual desde la nube
      alert("¡Inventario actualizado! La mercadería ha sido ingresada.")
    } catch (error) {
      console.error("Error al guardar entrada:", error)
      alert("Hubo un error al guardar los datos. Intenta de nuevo.")
    } finally {
      setIsSaving(false)
    }
  }

  const filteredBottles = bottles.filter(b => 
    b.nombre.toLowerCase().includes(search.toLowerCase()) // Cambiado de .name a .nombre
  )

  const totalInvestment = cart.reduce((acc, curr) => acc + (curr.qty * curr.cost), 0)

  if (loading) {
    return (
      <div className="h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Cargando catálogo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-8 font-rounded animate-in fade-in duration-500">
      
      {/* PANEL IZQUIERDO: SELECCIÓN DE PRODUCTOS */}
      <div className="flex-1 flex flex-col space-y-4 min-h-0">
        <div className="flex items-center gap-3 px-2">
          <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Recepción</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Llegada de proveedor</p>
          </div>
        </div>

        <div className="relative shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar producto..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-4 bg-slate-900/50 border-2 border-slate-800 rounded-[1.5rem] text-white outline-none focus:border-indigo-500/50 font-bold"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
          {filteredBottles.map(bottle => (
            <button
              key={bottle.id}
              onClick={() => addToCart(bottle)}
              className="w-full flex items-center justify-between p-4 bg-slate-900/30 border-2 border-slate-800 hover:border-indigo-500/50 rounded-2xl transition-all group"
            >
              <div className="text-left">
                <p className="font-bold text-white text-sm uppercase tracking-tight">{bottle.nombre}</p>
                <p className="text-[10px] text-slate-500 font-bold">{bottle.marca} • Stock: {bottle.stock}</p>
              </div>
              <Plus className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 group-active:scale-90 transition-all" />
            </button>
          ))}
        </div>
      </div>

      {/* PANEL DERECHO: DETALLE DEL INGRESO */}
      <div className="flex-1 bg-slate-900/40 border-2 border-slate-800 rounded-[3rem] flex flex-col overflow-hidden shadow-2xl relative">
        <div className="p-6 border-b-2 border-slate-800 bg-emerald-500/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-white uppercase tracking-widest text-sm italic">Detalle de Carga</h2>
          </div>
          <span className="bg-slate-800 text-slate-400 text-[10px] font-black px-3 py-1 rounded-full uppercase">
            {cart.length} ITEMS
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-40">
              <ShoppingCart className="w-16 h-16 mb-4 stroke-[1px]" />
              <p className="font-bold italic text-center text-sm uppercase tracking-widest">Carga los ítems <br/> del remito</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="bg-slate-950/50 p-5 rounded-[2rem] border border-slate-800 space-y-4 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-start px-2">
                  <p className="font-black text-white text-xs uppercase tracking-tight truncate w-40">{item.name}</p>
                  <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="text-slate-600 hover:text-rose-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-600 uppercase ml-3 tracking-widest">Cantidad</label>
                    <input 
                      type="number" value={item.qty} 
                      onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white font-black outline-none focus:border-indigo-500 text-center" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-600 uppercase ml-3 tracking-widest">Costo Unit ($)</label>
                    <input 
                      type="number" value={item.cost}
                      onChange={(e) => updateItem(item.id, 'cost', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-emerald-400 font-black outline-none focus:border-emerald-500 text-center" 
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer con Resumen y Acción */}
        {cart.length > 0 && (
          <div className="p-8 bg-slate-900 border-t-2 border-slate-800 shrink-0">
            <div className="flex justify-between items-center mb-6 px-2">
              <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">Total Inversión:</span>
              <span className="text-3xl font-black text-white italic tracking-tighter">
                ${totalInvestment.toLocaleString()}
              </span>
            </div>
            <button 
              onClick={handleFinalize}
              disabled={isSaving}
              className={`w-full py-5 ${isSaving ? 'bg-slate-700' : 'bg-emerald-600 hover:bg-emerald-500'} text-white font-black rounded-[1.8rem] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 text-lg`}
            >
              {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              {isSaving ? 'GUARDANDO...' : 'VALIDAR ENTRADA'}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 20px; }
      `}</style>
    </div>
  )
}