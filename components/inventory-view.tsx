'use client'

import { useEffect, useState } from 'react'
import { getBottles, addBottle, updateBottle, deleteBottle } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { Botella } from '@/lib/types'
import { 
  Plus, Search, Edit2, Trash2, X, Wine, 
  Layers, Loader2, Beaker, ChevronRight, Minus, Lock
} from 'lucide-react'

const CATEGORIES = [
  { value: 'whisky', label: 'Whiskies', icon: '🥃' },
  { value: 'vodka', label: 'Vodkas', icon: '🍸' },
  { value: 'ron', label: 'Licores', icon: '🍹' },
  { value: 'tequila', label: 'Tequilas', icon: '🌵' },
  { value: 'gin', label: 'Gins', icon: '🌿' },
  { value: 'cerveza', label: 'Cervezas', icon: '🍺' },
  { value: 'vino', label: 'Vinos', icon: '🍷' },
  { value: 'champagne', label: 'Champagnes', icon: '🥂' },
  { value: 'Gaseosa', label: 'Ingredientes / Gaseosas', icon: '🥤' },
  { value: 'Combo', label: ' Combos', icon: '🍾🥂' },
  { value: 'otros', label: 'Otros', icon: '🍾' },
]

export function InventoryView() {
  const { user } = useAuth() 
  const isOwner = user?.role === 'owner'

  const [bottles, setBottles] = useState<Botella[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingBottle, setEditingBottle] = useState<Botella | null>(null)
  
  const [formData, setFormData] = useState<any>({
    nombre: '', categoria: 'whisky', marca: '', stock: 0, stockMin: 5, 
    precio: 0, precioCosto: 0, isCombo: false, receta: []
  })

  const loadBottles = async () => {
    setLoading(true)
    try {
      const data = await getBottles()
      setBottles(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBottles() }, [])

  const groupedData = CATEGORIES.map(cat => ({
    ...cat,
    items: bottles.filter(b => b.categoria === cat.value && 
      (b.nombre.toLowerCase().includes(search.toLowerCase()) || b.marca.toLowerCase().includes(search.toLowerCase())))
  })).filter(group => group.items.length > 0)

  const openForm = (bottle?: Botella) => {
    if (bottle) {
      setEditingBottle(bottle)
      setFormData({ 
        ...bottle, 
        isCombo: bottle.isCombo || false, 
        receta: bottle.receta || [],
        precioCosto: bottle.precioCosto || 0
      })
    } else {
      setEditingBottle(null)
      setFormData({ 
        nombre: '', categoria: 'whisky', marca: '', stock: 0, 
        stockMin: 5, precio: 0, precioCosto: 0, isCombo: false, receta: [] 
      })
    }
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const dataToSave = {
        ...formData,
        receta: formData.isCombo ? formData.receta : [],
        stock: formData.isCombo ? 0 : Number(formData.stock),
        precio: Number(formData.precio),
        precioCosto: Number(formData.precioCosto)
    }

    if (editingBottle) {
      await updateBottle(editingBottle.id, dataToSave)
    } else {
      await addBottle(dataToSave)
    }
    await loadBottles()
    setShowModal(false)
  }

  const addIngredientToRecipe = (prodId: string) => {
    const product = bottles.find(b => b.id === prodId)
    if (!product) return
    const exists = (formData.receta || []).find((r: any) => r.productID === prodId)
    if (exists) {
        const updatedReceta = formData.receta.map((r: any) => 
            r.productID === prodId ? { ...r, cantidad: r.cantidad + 1 } : r
        )
        setFormData({ ...formData, receta: updatedReceta })
    } else {
        const newRecipe = [...(formData.receta || []), { productID: prodId, cantidad: 1 }]
        setFormData({ ...formData, receta: newRecipe })
    }
  }

  if (loading && bottles.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Consultando Cava...</p>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-6 animate-in fade-in duration-500 font-rounded">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 px-2">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">Inventario</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Lista de Precios y Existencias</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400" />
            <input 
              type="text" placeholder="Buscar por nombre o marca..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border-2 border-slate-800 rounded-[1.5rem] text-white focus:border-indigo-500/50 outline-none transition-all font-bold"
            />
          </div>
          {isOwner && (
            <button 
              onClick={() => openForm()}
              className="p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <Plus className="w-6 h-6 stroke-[3px]" />
            </button>
          )}
        </div>
      </div>

      {/* GRID DE CARDS */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-12 custom-scrollbar pb-10">
        {groupedData.map((group) => (
          <div key={group.value} className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <span className="text-2xl">{group.icon}</span>
              <h2 className="text-lg font-black text-white uppercase tracking-[0.2em] italic">{group.label}</h2>
              <div className="flex-1 h-[2px] bg-slate-800/50 rounded-full" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {group.items.map((bottle) => {
                const isLow = (bottle.stock || 0) <= (bottle.stockMin || 5);
                const isOut = (bottle.stock || 0) <= 0;
                const margin = bottle.precio > 0 ? ((bottle.precio - (bottle.precioCosto || 0)) / bottle.precio) * 100 : 0;

                return (
                  <div key={bottle.id} className="group relative bg-[#111827]/80 border-2 border-slate-800 hover:border-indigo-500/50 rounded-[2.5rem] p-6 h-[270px] flex flex-col justify-between transition-all duration-300 shadow-xl overflow-hidden">
                    
                    <div className="flex justify-between items-start z-10">
                      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${bottle.isCombo ? 'bg-purple-600 text-white' : isOut ? 'bg-rose-600 text-white' : isLow ? 'bg-amber-500 text-black' : 'bg-emerald-600 text-white'}`}>
                        {bottle.isCombo ? 'Combo' : isOut ? 'Sin Stock' : isLow ? 'Stock Bajo' : 'Disponible'}
                      </div>
                      {isOwner && (
                        <button onClick={() => openForm(bottle)} className="p-2 bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${bottle.isCombo ? 'bg-purple-500/10 border-purple-500/30' : 'bg-slate-800 border-slate-700'}`}>
                          {bottle.isCombo ? <Layers className="w-6 h-6 text-purple-400" /> : <Wine className={`w-6 h-6 ${isLow ? 'text-orange-400' : 'text-slate-500'}`} />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-white truncate text-lg uppercase tracking-tighter italic leading-none">{bottle.nombre}</h3>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{bottle.marca}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/50">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] text-slate-500 font-black uppercase italic tracking-widest">Precio de venta: </span>
                          <span className="text-3xl font-black text-emerald-400 italic leading-none">${bottle.precio?.toLocaleString()}</span>
                        </div>
                        {isOwner && (
                          <div className="flex justify-between items-center border-t border-slate-800/50 mt-2 pt-2">
                             <span className="text-[8px] text-slate-600 font-black uppercase">Costo: <span className="text-slate-400">${bottle.precioCosto?.toLocaleString()}</span></span>
                             <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${margin > 40 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>ROI {margin.toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* MOSTRAR INGREDIENTES SI ES COMBO */}
                    {bottle.isCombo ? (
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                        {bottle.receta?.map((r: any, i: number) => {
                          const p = bottles.find(b => b.id === (r.productID || r.productId));
                          return (
                            <span key={i} className="text-[8px] whitespace-nowrap bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded-lg font-black uppercase">
                                {r.cantidad}x {p?.nombre.substring(0,6) || 'Prod'}...
                            </span>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex justify-between items-center px-2">
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${isOut ? 'bg-rose-500 animate-pulse' : isLow ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                           <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">En Almacén</span>
                        </div>
                        <span className={`text-2xl font-black italic ${isOut ? 'text-rose-500' : isLow ? 'text-amber-500' : 'text-white'}`}>{bottle.stock || 0}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-[3rem] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 max-h-[95vh]">
            
            <div className="p-8 border-b-2 border-slate-800 flex justify-between items-center bg-indigo-600/5">
              <div>
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">NUEVO PRODUCTO</h2>
                <p className="text-xs text-slate-500 font-bold uppercase mt-1 italic">{editingBottle ? 'Actualización' : 'Agregar producto'}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 text-slate-500 hover:text-white bg-slate-800 rounded-2xl transition-all"><X className="w-7 h-7" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                   <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Nombre Comercial</label>
                      <input type="text" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full px-6 py-4 bg-slate-950 border-2 border-slate-800 rounded-2xl text-white font-black focus:border-indigo-500 outline-none transition-all uppercase italic" />
                   </div>
                   {isOwner && (
                     <div className="w-full md:w-32 space-y-2 flex flex-col items-center">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Combo</label>
                        <button type="button" onClick={() => setFormData({...formData, isCombo: !formData.isCombo})} className={`w-full py-4 rounded-2xl border-2 transition-all font-black text-xs ${formData.isCombo ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-700'}`}>{formData.isCombo ? 'SÍ' : 'NO'}</button>
                     </div>
                   )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-4">Categoría</label>
                    <select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full px-6 py-4 bg-slate-950 border-2 border-slate-800 rounded-2xl text-slate-300 font-bold outline-none cursor-pointer">{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-4">Marca</label>
                    <input type="text" required value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} className="w-full px-6 py-4 bg-slate-950 border-2 border-slate-800 rounded-2xl text-white font-black outline-none italic uppercase" />
                  </div>
                </div>
              </div>

              {/* SECCIÓN DE RECETA EN EL MODAL */}
              {formData.isCombo && (
                <div className="p-6 bg-purple-500/5 border-2 border-purple-500/20 rounded-[2.5rem] space-y-4">
                  <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em] flex items-center gap-2"><Beaker className="w-4 h-4" /> Configurar Combo</h4>
                  <div className="space-y-2">
                    {(formData.receta || []).map((item: any, idx: number) => {
                      const p = bottles.find(b => b.id === (item.productID || item.productId));
                      return (
                        <div key={idx} className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
                          <span className="text-xs font-black text-white uppercase italic">{p?.nombre || 'Producto'}</span>
                          <div className="flex items-center gap-4">
                             <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
                                <button type="button" onClick={() => {
                                    const newRec = [...formData.receta];
                                    newRec[idx].cantidad = Math.max(1, newRec[idx].cantidad - 1);
                                    setFormData({...formData, receta: newRec});
                                }} className="p-1 text-slate-500 hover:text-white"><Minus className="w-3 h-3"/></button>
                                <span className="w-8 text-center font-black text-purple-400 text-sm">{item.cantidad}</span>
                                <button type="button" onClick={() => {
                                    const newRec = [...formData.receta];
                                    newRec[idx].cantidad += 1;
                                    setFormData({...formData, receta: newRec});
                                }} className="p-1 text-slate-500 hover:text-white"><Plus className="w-3 h-3"/></button>
                            </div>
                            <button type="button" onClick={() => setFormData({...formData, receta: formData.receta.filter((_:any, i:number)=>i!==idx)})} className="text-rose-500"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <select onChange={(e) => { if(e.target.value) addIngredientToRecipe(e.target.value); e.target.value = "" }} className="w-full p-4 bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl text-[10px] font-black text-slate-500 outline-none hover:border-purple-500/50 transition-colors">
                      <option value="">+ Vincular agregado...</option>
                      {bottles.filter(b => !b.isCombo).map(b => (
                          <option key={b.id} value={b.id}>{b.nombre} ({b.marca})</option>
                      ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-slate-950 border-2 border-slate-800 rounded-[2.5rem] relative">
                <div className={`text-center space-y-2 ${formData.isCombo ? 'hidden' : 'md:border-r-2 border-slate-800'}`}>
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center justify-center gap-1">Existencia {editingBottle && <Lock className="w-3 h-3" />}</label>
                  <input type="number" value={formData.stock} disabled={!!editingBottle} onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} className={`w-full bg-transparent text-center text-4xl font-black text-white outline-none ${editingBottle ? 'opacity-50' : ''}`} />
                </div>
                <div className={`text-center space-y-2 border-slate-800 ${isOwner ? 'md:border-r-2' : 'hidden'}`}>
                  <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Costo</label>
                  <input type="number" value={formData.precioCosto} onChange={e => setFormData({...formData, precioCosto: parseFloat(e.target.value) || 0})} className="w-full bg-transparent text-center text-4xl font-black text-rose-400 outline-none italic" />
                </div>
                <div className={`text-center space-y-2 ${!isOwner && !formData.isCombo ? 'md:col-span-2' : isOwner ? '' : 'col-span-3'}`}>
                  <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Precio de Venta</label>
                  <input type="number" value={formData.precio} onChange={e => setFormData({...formData, precio: parseFloat(e.target.value) || 0})} className="w-full bg-transparent text-center text-4xl font-black text-emerald-400 outline-none italic" />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="submit" className="flex-1 py-6 bg-indigo-600 text-white font-black text-xl rounded-[2rem] shadow-xl hover:bg-indigo-500 transition-all uppercase italic">
                  {editingBottle ? 'Confirmar Cambios' : 'Registrar'}
                </button>
                {isOwner && editingBottle && (
                  <button type="button" onClick={async () => { if(confirm('¿Borrar activo?')) { await deleteBottle(editingBottle.id); await loadBottles(); setShowModal(false); } }} className="px-8 bg-rose-500/10 text-rose-500 rounded-[2rem] border-2 border-rose-500/20"><Trash2 className="w-6 h-6" /></button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}