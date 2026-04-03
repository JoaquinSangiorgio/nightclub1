'use client'

import { useEffect, useState } from 'react'
import { getBottles, addBottle, updateBottle, deleteBottle } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { Botella, ItemReceta } from '@/lib/types'
import { 
  Plus, Search, Edit2, Trash2, X, Wine, 
  Loader2, Droplets, LayoutGrid, List, GlassWater,
  FileSpreadsheet, Upload, Download, AlertCircle, Check
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

const CATEGORIES = [
  { value: 'whisky', label: 'Whiskies', icon: '🥃' },
  { value: 'vodka', label: 'Vodkas', icon: '🍸' },
  { value: 'ron', label: 'Licores / Ron', icon: '🍹' },
  { value: 'tequila', label: 'Tequilas', icon: '🌵' },
  { value: 'gin', label: 'Gins', icon: '🌿' },
  { value: 'cerveza', label: 'Cervezas', icon: '🍺' },
  { value: 'vino', label: 'Vinos', icon: '🍷' },
  { value: 'champagne', label: 'Champagnes', icon: '🥂' },
  { value: 'Gaseosa', label: 'Ingredientes / Gaseosas', icon: '🥤' },
  { value: 'Combo', label: 'Combos / Promos', icon: '📦' },
  { value: 'Trago', label: 'Tragos (Vaso/Copa)', icon: '🍹' },
  { value: 'otros', label: 'Otros', icon: '🎁' },
]

export function InventoryView() {
  const { user } = useAuth() 
  const isOwner = user?.role === 'owner'
  
  const [bottles, setBottles] = useState<Botella[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showModal, setShowModal] = useState(false)
  const [editingBottle, setEditingBottle] = useState<Botella | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  
  const initialForm = {
    nombre: '', marca: '', categoria: 'whisky', tipo: 'botella',
    mlPorUnidad: '', unidadesStock: '', unidadesMin: '', precio: '', precioCosto: '', receta: []
  }

  const [formData, setFormData] = useState<any>(initialForm)

  const loadData = async () => {
    setLoading(true)
    const data = await getBottles()
    setBottles(data)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  // --- LÓGICA DE EXCEL ---
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let count = 0;
        for (const row of data as any[]) {
          const ml = Number(row.CapacidadMl || 750);
          const stockUni = Number(row.StockUnidades || 0);
          const minUni = Number(row.MinimoAviso || 0);

          const newProd: Partial<Botella> = {
            nombre: String(row.Nombre || 'Sin Nombre').toUpperCase(),
            marca: String(row.Marca || 'Genérica').toUpperCase(),
            categoria: String(row.Categoria || 'otros').toLowerCase() as any, // FIXED: Type Casting
            tipo: (String(row.Tipo || 'botella').toLowerCase()) as any,       // FIXED: Type Casting
            mlPorUnidad: ml,
            stockMl: stockUni * ml,
            stockMinMl: minUni * ml,
            precio: Number(row.PrecioVenta || 0),
            precioCosto: Number(row.PrecioCosto || 0),
            isCombo: String(row.Tipo).toLowerCase() !== 'botella',
            receta: []
          };
          await addBottle(newProd);
          count++;
        }
        toast.success(`Se importaron ${count} productos`);
        loadData();
      } catch (err) {
        toast.error("Error en el formato del Excel");
      } finally {
        setIsImporting(false);
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  }

  const downloadTemplate = () => {
    const template = [
      { Nombre: 'FERNET BRANCA', Marca: 'BRANCA', Categoria: 'ron', Tipo: 'botella', CapacidadMl: 750, StockUnidades: 12, MinimoAviso: 3, PrecioVenta: 8000, PrecioCosto: 4500 },
      { Nombre: 'COCA COLA 1.5L', Marca: 'COCA COLA', Categoria: 'Gaseosa', Tipo: 'botella', CapacidadMl: 1500, StockUnidades: 24, MinimoAviso: 6, PrecioVenta: 2500, PrecioCosto: 1200 }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "Plantilla_Inventario_Disco.xlsx");
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const tipoFinal = formData.tipo || 'botella'
    const stockMl = tipoFinal === 'botella' ? Number(formData.unidadesStock || 0) * Number(formData.mlPorUnidad || 0) : 0
    const stockMinMl = tipoFinal === 'botella' ? Number(formData.unidadesMin || 0) * Number(formData.mlPorUnidad || 0) : 0

    const dataToSave: Partial<Botella> = {
      nombre: formData.nombre.toUpperCase(),
      marca: formData.marca.toUpperCase(),
      categoria: formData.categoria as any, // FIXED: Type Casting
      tipo: tipoFinal as any,               // FIXED: Type Casting
      mlPorUnidad: Number(formData.mlPorUnidad || 0),
      stockMl,
      stockMinMl,
      precio: Number(formData.precio || 0),
      precioCosto: Number(formData.precioCosto || 0),
      isCombo: tipoFinal !== 'botella',
      receta: tipoFinal !== 'botella' ? formData.receta : []
    }

    try {
      if (editingBottle) { 
        await updateBottle(editingBottle.id, dataToSave) 
        toast.success("Actualizado")
      } else { 
        await addBottle(dataToSave) 
        toast.success("Creado")
      }
      loadData(); setShowModal(false)
    } catch (error) { toast.error("Error al guardar") }
  }

  const openForm = (bottle?: Botella) => {
    if (bottle) {
      setEditingBottle(bottle)
      setFormData({ 
        nombre: bottle.nombre, marca: bottle.marca, categoria: bottle.categoria, tipo: bottle.tipo || 'botella',
        mlPorUnidad: bottle.mlPorUnidad || '',
        unidadesStock: bottle.mlPorUnidad > 0 ? (bottle.stockMl / bottle.mlPorUnidad).toFixed(1) : '',
        unidadesMin: bottle.mlPorUnidad > 0 ? (bottle.stockMinMl / bottle.mlPorUnidad).toFixed(0) : '',
        precio: bottle.precio || '', precioCosto: bottle.precioCosto || '',
        receta: bottle.receta ? JSON.parse(JSON.stringify(bottle.receta)) : []
      })
    } else {
      setEditingBottle(null); setFormData(initialForm)
    }
    setShowModal(true)
  }

  const filteredBottles = bottles.filter(b => 
    b.nombre.toLowerCase().includes(search.toLowerCase()) || b.marca.toLowerCase().includes(search.toLowerCase())
  )

  const groupedData = CATEGORIES.map(cat => ({
    ...cat,
    items: filteredBottles.filter(b => b.categoria === cat.value)
  })).filter(group => group.items.length > 0)

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest italic animate-pulse">Analizando Bodega...</p>
    </div>
  )

  return (
    <div className="h-full flex flex-col space-y-6 lg:space-y-10 font-rounded animate-in fade-in pb-24 lg:pb-10">
      
      {/* HEADER RESPONSIVE */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 px-2">
        <div className="w-full xl:w-auto">
          <h1 className="text-4xl lg:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">Inventario</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-3 italic flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            Stock Inteligente
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {isOwner && (
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={downloadTemplate} className="flex-1 sm:flex-none p-4 bg-slate-800 text-slate-300 rounded-2xl hover:text-white transition-all shadow-lg" title="Plantilla Excel">
                <Download className="w-5 h-5 mx-auto" />
              </button>
              <label className="flex-[3] sm:flex-none p-4 bg-emerald-600/20 text-emerald-500 border-2 border-emerald-500/20 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2">
                {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
                <span className="text-[10px] font-black uppercase italic">Importar Excel</span>
                <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" disabled={isImporting} />
              </label>
            </div>
          )}
          
          <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border-2 border-slate-800">
            <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}><LayoutGrid className="w-5 h-5" /></button>
            <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}><List className="w-5 h-5" /></button>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
            <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-slate-900/50 border-2 border-slate-800 rounded-2xl text-white focus:border-indigo-500 outline-none font-bold" />
          </div>

          {isOwner && (
            <button onClick={() => openForm()} className="p-4 bg-white text-slate-950 rounded-2xl shadow-xl hover:bg-indigo-500 hover:text-white transition-all active:scale-95 group">
              <Plus className="w-6 h-6 stroke-[3px] group-hover:rotate-90 transition-transform" />
            </button>
          )}
        </div>
      </div>

      {/* LISTADO RESPONSIVE */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-12 pr-1 pb-10">
        {groupedData.map((group) => (
          <div key={group.value} className="space-y-6">
            <div className="flex items-center gap-4 px-2">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-xl shadow-lg border border-slate-800">{group.icon}</div>
              <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">{group.label}</h2>
              <div className="flex-1 h-[1px] bg-slate-800 rounded-full" />
            </div>
            <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6" : "space-y-3"}>
              {group.items.map((bottle) => (
                viewMode === 'grid' 
                  ? <ProductCard key={bottle.id} bottle={bottle} onEdit={() => openForm(bottle)} isOwner={isOwner} />
                  : <ProductRow key={bottle.id} bottle={bottle} onEdit={() => openForm(bottle)} isOwner={isOwner} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL RESPONSIVE XL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-xl z-[999] flex items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border-x-0 sm:border-2 border-slate-800 sm:rounded-[3rem] w-full max-w-2xl flex flex-col h-full sm:h-auto sm:max-h-[95vh] overflow-hidden shadow-2xl">
            <div className="p-6 lg:p-8 border-b-2 border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0">
              <div>
                <h2 className="text-2xl lg:text-3xl font-black text-white uppercase italic tracking-tighter">{editingBottle ? 'Editar' : 'Nuevo'}</h2>
                <p className="text-[9px] text-indigo-400 font-black uppercase mt-2 tracking-widest italic">Panel de Configuración</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-4 text-slate-500 hover:text-white bg-slate-800/50 rounded-2xl transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 lg:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-4">Tipo</label>
                  <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})} className="w-full p-4 bg-slate-950 border-2 border-slate-800 rounded-2xl text-white font-black uppercase italic outline-none focus:border-indigo-500">
                    <option value="botella">📦 BOTELLA (INSUMO)</option>
                    <option value="receta">🍹 TRAGO (RECETA)</option>
                    <option value="combo">🎁 COMBO (PROMO)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-4">Categoría</label>
                  <select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full p-4 bg-slate-950 border-2 border-slate-800 rounded-2xl text-white font-black uppercase italic outline-none focus:border-indigo-500">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <input type="text" placeholder="NOMBRE" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="p-4 bg-slate-950 border-2 border-slate-800 rounded-2xl text-white font-black uppercase italic outline-none focus:border-indigo-500" />
                 <input type="text" placeholder="MARCA" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} className="p-4 bg-slate-950 border-2 border-slate-800 rounded-2xl text-white font-black uppercase italic outline-none focus:border-indigo-500" />
              </div>

              {formData.tipo === 'botella' && (
                <div className="grid grid-cols-3 gap-3 bg-indigo-600/5 p-6 rounded-3xl border-2 border-indigo-500/10">
                  <div className="text-center"><label className="text-[8px] font-black text-indigo-400 uppercase">ML x Bot</label><input type="number" value={formData.mlPorUnidad} onChange={e => setFormData({...formData, mlPorUnidad: e.target.value})} className="w-full bg-transparent text-center text-2xl font-black text-white outline-none" placeholder="750" /></div>
                  <div className="text-center border-x-2 border-slate-800/50"><label className="text-[8px] font-black text-indigo-400 uppercase">Stock Unid.</label><input type="number" step="0.1" value={formData.unidadesStock} onChange={e => setFormData({...formData, unidadesStock: e.target.value})} className="w-full bg-transparent text-center text-2xl font-black text-white outline-none" placeholder="0" /></div>
                  <div className="text-center"><label className="text-[8px] font-black text-indigo-400 uppercase">Mínimo</label><input type="number" value={formData.unidadesMin} onChange={e => setFormData({...formData, unidadesMin: e.target.value})} className="w-full bg-transparent text-center text-2xl font-black text-white outline-none" placeholder="0" /></div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 p-6 bg-slate-950 rounded-[2.5rem] border-2 border-slate-800 shadow-inner">
                <div className="text-center"><label className="text-[9px] text-rose-500 font-black uppercase">Costo Insumo</label><input type="number" value={formData.precioCosto} onChange={e => setFormData({...formData, precioCosto: e.target.value})} className="w-full bg-transparent text-center text-3xl font-black text-rose-400 outline-none italic" /></div>
                <div className="text-center border-l-2 border-slate-800"><label className="text-[9px] text-emerald-500 font-black uppercase">Precio Venta</label><input type="number" value={formData.precio} onChange={e => setFormData({...formData, precio: e.target.value})} className="w-full bg-transparent text-center text-3xl font-black text-emerald-400 outline-none italic" /></div>
              </div>

              <button type="submit" className="w-full py-6 bg-indigo-600 text-white font-black text-xl rounded-[2rem] shadow-xl hover:bg-indigo-500 uppercase italic transition-all">Guardar Producto</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductCard({ bottle, onEdit, isOwner }: { bottle: Botella, onEdit: () => void, isOwner: boolean }) {
  const isOut = bottle.tipo === 'botella' && (bottle.stockMl || 0) <= (bottle.stockMinMl || 0);
  const stockVisual = (bottle.tipo === 'botella' && (bottle.mlPorUnidad || 0) > 0)
    ? (bottle.stockMl / bottle.mlPorUnidad).toFixed(1) 
    : 'REC.';

  return (
    <div className={`group relative bg-[#111827]/80 border-2 rounded-[2.5rem] p-6 lg:p-8 flex flex-col justify-between transition-all duration-500 shadow-xl overflow-hidden ${isOut ? 'border-rose-500/50 bg-rose-500/5' : 'border-slate-800 hover:border-indigo-500/40'}`}>
      <div className="flex justify-between items-start z-10">
        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] ${bottle.tipo !== 'botella' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
          { bottle.tipo?.toUpperCase() || 'INSUMO' }
        </span>
        {isOwner && <button onClick={onEdit} className="p-3 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-2xl transition-all shadow-xl active:scale-90"><Edit2 className="w-4 h-4" /></button>}
      </div>
      
      <div className="py-6 min-w-0">
        <h3 className="font-black text-white truncate text-xl lg:text-2xl uppercase italic leading-none">{bottle.nombre}</h3>
        <p className="text-[10px] text-slate-600 font-bold uppercase mt-2 tracking-widest">{bottle.marca}</p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center bg-slate-950/60 p-4 rounded-2xl border border-slate-800/50 shadow-inner">
          <span className="text-[9px] text-slate-500 font-black uppercase italic tracking-widest">P. Venta</span>
          <span className="text-2xl font-black text-emerald-400 italic">${bottle.precio.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-2"><Droplets className={`w-4 h-4 ${isOut ? 'text-rose-500' : 'text-indigo-400'}`} /><span className="text-[9px] text-slate-500 font-black uppercase italic">En Stock:</span></div>
          <span className={`text-xl font-black italic ${isOut ? 'text-rose-500' : 'text-white'}`}>{stockVisual}</span>
        </div>
      </div>
    </div>
  )
}

function ProductRow({ bottle, onEdit, isOwner }: { bottle: Botella, onEdit: () => void, isOwner: boolean }) {
  const stockVisual = (bottle.tipo === 'botella' && (bottle.mlPorUnidad || 0) > 0)
    ? (bottle.stockMl / bottle.mlPorUnidad).toFixed(1) 
    : '---';

  return (
    <div className="flex items-center justify-between bg-slate-900/40 border-2 border-slate-800 p-5 rounded-[2rem] hover:border-indigo-500/30 transition-all shadow-lg">
       <div className="flex items-center gap-4 lg:gap-8 min-w-0">
          <div className={`p-4 rounded-2xl shrink-0 ${bottle.tipo !== 'botella' ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-800 text-slate-500'}`}>
            {bottle.tipo === 'botella' ? <Wine className="w-5 h-5 lg:w-6 lg:h-6" /> : <GlassWater className="w-5 h-5 lg:w-6 lg:h-6" />}
          </div>
          <div className="min-w-0">
             <h4 className="font-black text-white uppercase italic text-sm lg:text-lg truncate">{bottle.nombre}</h4>
             <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">{bottle.marca}</p>
          </div>
       </div>
       <div className="flex items-center gap-6 lg:gap-16 shrink-0">
          <div className="text-right hidden sm:block"><p className="text-[9px] text-slate-600 font-black uppercase">Venta</p><p className="font-black text-emerald-400 italic">${bottle.precio}</p></div>
          <div className="text-right"><p className="text-[9px] text-slate-600 font-black uppercase">Stock</p><p className="font-black text-white italic">{stockVisual}</p></div>
          {isOwner && <button onClick={onEdit} className="p-4 bg-slate-800 text-slate-500 hover:text-white hover:bg-indigo-600 rounded-2xl transition-all shadow-xl"><Edit2 className="w-4 h-4" /></button>}
       </div>
    </div>
  )
}