'use client'

import { useEffect, useState } from 'react'
import { getBottles, addBottle, updateBottle, deleteBottle } from '@/lib/store'
import { Botella } from '@/lib/types'
import { 
  Plus, Search, Edit2, Trash2, X, Wine, 
  Minus, Layers, Loader2, Beaker 
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
    const data = await getBottles()
    setBottles(data)
    setLoading(false)
  }

  useEffect(() => { loadBottles() }, [])

  const groupedData = CATEGORIES.map(cat => ({
    ...cat,
    items: bottles.filter(b => b.categoria === cat.value && 
      (b.nombre.toLowerCase().includes(search.toLowerCase()) || b.marca.toLowerCase().includes(search.toLowerCase())))
  })).filter(group => group.items.length > 0)

  const handleQuickUpdate = async (id: string, newStock: number) => {
    await updateBottle(id, { stock: Math.max(0, newStock) })
    await loadBottles()
  }

  const openForm = (bottle?: Botella) => {
    if (bottle) {
      setEditingBottle(bottle)
      setFormData({ 
        ...bottle, 
        isCombo: bottle.isCombo || false, 
        receta: bottle.receta || [] 
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
    // Aseguramos consistencia: si no es combo, la receta se limpia
    const dataToSave = {
        ...formData,
        receta: formData.isCombo ? formData.receta : [],
        stock: formData.isCombo ? 0 : formData.stock
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
    
    // Evitar duplicados en la receta, mejor aumentar cantidad si ya existe
    const exists = formData.receta.find((r: any) => r.productID === prodId)
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
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Sincronizando Almacén...</p>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-6 animate-in fade-in duration-500 font-rounded">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 px-2">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Inventario</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Gestión Central de Productos</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400" />
            <input 
              type="text" placeholder="Buscar producto..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border-2 border-slate-800 rounded-[1.5rem] text-white focus:border-indigo-500/50 outline-none transition-all font-bold"
            />
          </div>
          <button 
            onClick={() => openForm()}
            className="p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-6 h-6 stroke-[3px]" />
          </button>
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-10 custom-scrollbar pb-10">
        {groupedData.map((group) => (
          <div key={group.value} className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <span className="text-2xl">{group.icon}</span>
              <h2 className="text-lg font-black text-white uppercase tracking-[0.2em] italic">{group.label}</h2>
              <div className="flex-1 h-[2px] bg-slate-800/50 rounded-full" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.items.map((bottle) => {
                const isLow = bottle.stock <= (bottle.stockMin || 0);
                const isOut = (bottle.stock || 0) <= 0;
                const isCombo = bottle.isCombo;

                return (
                  <div key={bottle.id} className={`group relative bg-slate-900/40 border-2 ${isCombo ? 'border-purple-500/30' : 'border-slate-800'} hover:border-indigo-500/50 rounded-[2.5rem] p-6 flex flex-col justify-between h-52 overflow-hidden transition-all shadow-lg`}>
                    
                    {isCombo && (
                      <div className="absolute top-0 left-0 bg-purple-600 text-white text-[9px] font-black px-4 py-1 rounded-br-2xl uppercase tracking-widest">COMBO</div>
                    )}

                    <button 
                      onClick={() => openForm(bottle)}
                      className="absolute top-4 right-4 p-3 bg-slate-800/80 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-2xl z-10 transition-all active:scale-90"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <div className="mt-2">
                      <div className="flex items-center gap-4 mb-3 pr-10">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isCombo ? 'bg-purple-500/10 border-purple-500/30' : 'bg-slate-800 border-slate-700'}`}>
                          {isCombo ? <Layers className="w-6 h-6 text-purple-400" /> : <Wine className="w-6 h-6 text-slate-400" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-white truncate text-lg uppercase tracking-tight italic">{bottle.nombre}</h3>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{bottle.marca}</p>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-emerald-400 italic">${bottle.precio?.toLocaleString()}</span>
                      </div>
                    </div>

                    {!isCombo ? (
                      <div className="flex items-center justify-between bg-slate-950/50 p-2 rounded-2xl border border-slate-800/50 relative z-0">
                        <button onClick={() => handleQuickUpdate(bottle.id, (bottle.stock || 0) - 1)} className="w-10 h-10 rounded-xl hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"><Minus className="w-5 h-5" /></button>
                        <div className="flex flex-col items-center">
                          <span className={`text-2xl font-black leading-none ${isOut ? 'text-rose-500' : isLow ? 'text-amber-500' : 'text-white'}`}>{bottle.stock || 0}</span>
                          <span className="text-[9px] font-black text-slate-600 uppercase mt-1">Existencia</span>
                        </div>
                        <button onClick={() => handleQuickUpdate(bottle.id, (bottle.stock || 0) + 1)} className="w-10 h-10 rounded-xl hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"><Plus className="w-5 h-5" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
                        {bottle.receta?.map((r, i) => (
                            <span key={i} className="text-[8px] whitespace-nowrap bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded-lg font-bold">
                                {r.cantidad}x {r.productId}
                            </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal - Con Soporte para Combos */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-[3rem] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 max-h-[95vh]">
            
            <div className="p-8 border-b-2 border-slate-800 flex justify-between items-center bg-indigo-600/5">
              <div>
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                  {editingBottle ? 'Editar Registro' : 'Nuevo Ingreso'}
                </h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Configuración técnica de stock</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 text-slate-500 hover:text-white bg-slate-800 rounded-2xl transition-all">
                <X className="w-7 h-7" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              
              <div className="space-y-4">
                <div className="flex gap-4">
                   <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-4">Nombre del Item</label>
                      <input 
                        type="text" placeholder="Ej: Fernet + Coca 3L" required
                        value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-950 border-2 border-slate-800 rounded-2xl text-white font-bold focus:border-indigo-500 outline-none transition-all"
                      />
                   </div>
                   <div className="w-32 space-y-2 flex flex-col items-center justify-center">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">¿Es Combo?</label>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, isCombo: !formData.isCombo})}
                        className={`w-full py-4 rounded-2xl border-2 transition-all font-black text-xs flex items-center justify-center gap-2 ${formData.isCombo ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-600'}`}
                      >
                        {formData.isCombo && <Layers className="w-3 h-3" />}
                        {formData.isCombo ? 'SÍ' : 'NO'}
                      </button>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-4">Categoría</label>
                    <select 
                      value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-950 border-2 border-slate-800 rounded-2xl text-slate-300 font-bold outline-none appearance-none cursor-pointer"
                    >
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-4">Marca / Distribuidor</label>
                    <input 
                      type="text" placeholder="Ej: Branca / Coca" required
                      value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-950 border-2 border-slate-800 rounded-2xl text-white font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN DE RECETA DINÁMICA */}
              {formData.isCombo && (
                <div className="p-6 bg-purple-500/5 border-2 border-purple-500/20 rounded-[2rem] space-y-4 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                      <Beaker className="w-4 h-4" /> Ingredientes de la Receta
                    </h4>
                    <span className="text-[9px] bg-purple-500 text-white px-2 py-0.5 rounded-full font-black">LOGIC BASED</span>
                  </div>
                  
                  <div className="space-y-2">
                    {(formData.receta || []).length === 0 && (
                        <p className="text-center py-4 text-slate-600 text-xs italic font-bold">Sin ingredientes seleccionados</p>
                    )}
                    {(formData.receta || []).map((item: any, idx: number) => {
                      const p = bottles.find(b => b.id === item.productID);
                      return (
                        <div key={idx} className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 group/item">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white uppercase italic">{p?.nombre || item.productID}</span>
                            <span className="text-[8px] text-slate-600 font-black tracking-widest">ID: {item.productID}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-800">
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
                            <button 
                              type="button" 
                              onClick={() => setFormData({...formData, receta: formData.receta.filter((_:any, i:number)=>i!==idx)})}
                              className="p-2 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="relative">
                    <select 
                        onChange={(e) => { if(e.target.value) addIngredientToRecipe(e.target.value); e.target.value = "" }}
                        className="w-full p-4 bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl text-xs font-bold text-slate-500 outline-none hover:border-purple-500/50 transition-colors cursor-pointer appearance-none"
                    >
                        <option value="">+ Vincular ingrediente a la receta...</option>
                        {bottles.filter(b => !b.isCombo).map(b => (
                            <option key={b.id} value={b.id}>{b.nombre} ({b.marca})</option>
                        ))}
                    </select>
                    <Plus className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* SECCIÓN PRECIOS Y STOCK */}
              <div className="grid grid-cols-2 gap-4 p-8 bg-slate-950 border-2 border-slate-800 rounded-[2.5rem]">
                {!formData.isCombo && (
                  <div className="text-center space-y-2 border-r-2 border-slate-800 pr-4">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Existencia Actual</label>
                    <input 
                        type="number" 
                        value={formData.stock} 
                        onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} 
                        className="w-full bg-transparent text-center text-5xl font-black text-white outline-none" 
                    />
                  </div>
                )}
                <div className={`text-center space-y-2 ${formData.isCombo ? 'col-span-2' : ''}`}>
                  <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Precio Venta (Combo/Unidad)</label>
                  <div className="flex items-center justify-center">
                    <span className="text-3xl font-black text-emerald-500/20">$</span>
                    <input 
                        type="number" 
                        value={formData.precio} 
                        onChange={e => setFormData({...formData, precio: parseFloat(e.target.value) || 0})} 
                        className="w-full bg-transparent text-center text-5xl font-black text-emerald-400 outline-none italic" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 shrink-0">
                <button type="submit" className="flex-1 py-6 bg-indigo-600 text-white font-black text-xl rounded-[1.8rem] shadow-xl hover:bg-indigo-500 transition-all uppercase italic tracking-tighter">
                  {editingBottle ? 'Confirmar Cambios' : 'Crear en Inventario'}
                </button>
                {editingBottle && (
                  <button 
                    type="button" 
                    onClick={async () => { if(confirm('¿Eliminar este registro permanentemente?')) { await deleteBottle(editingBottle.id); await loadBottles(); setShowModal(false); } }}
                    className="px-6 bg-rose-500/10 text-rose-500 rounded-[1.8rem] border-2 border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                  >
                    <Trash2 className="w-7 h-7" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}