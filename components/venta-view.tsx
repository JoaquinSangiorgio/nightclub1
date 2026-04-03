'use client'

import { useEffect, useState } from 'react'
import { getBottles, addMovement, savePendingMovement } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { Botella } from '@/lib/types'
import { 
  Wine, Zap, History, Search, ShoppingCart, 
  ArrowUpRight, RotateCcw, Layers, Loader2,
  CheckCircle2, GlassWater, Printer, Wallet, CreditCard, Banknote, User
} from 'lucide-react'
import { toast } from 'sonner' 

export function VentaView() {
  const { user } = useAuth()
  const [bottles, setBottles] = useState<Botella[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isFinishing, setIsFinishing] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia' | 'Tarjeta'>('Efectivo')
  
  // Nuevos estados para validación de transferencia/tarjeta
  const [transactionRef, setTransactionRef] = useState('')
  const [clientName, setClientName] = useState('')

  const [sessionSales, setSessionSales] = useState<{
    id: string, name: string, qty: number, tipo: string, precio: number
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
    loadData().then(() => setLoading(false))
  }, [])

  useEffect(() => {
    localStorage.setItem('bar_session_sales', JSON.stringify(sessionSales))
  }, [sessionSales])

  const checkStockStatus = (item: Botella) => {
    if (item.tipo === 'botella') {
      return { available: (item.stockMl || 0) >= (item.mlPorUnidad || 0), missing: item.nombre }
    }
    if ((item.tipo === 'receta' || item.tipo === 'combo') && item.receta) {
      for (const ing of item.receta) {
        const insumo = bottles.find(b => b.id === ing.productId)
        if (!insumo || (insumo.stockMl || 0) < Number(ing.cantidadMl)) {
          return { available: false, missing: insumo?.nombre || "Ingrediente" }
        }
      }
    }
    return { available: true }
  }

  const handleQuickSale = (item: Botella) => {
    const { available, missing } = checkStockStatus(item)
    if (!available) {
      toast.error(`Stock insuficiente de ${missing}`)
      return
    }

    setBottles(prev => prev.map(b => {
      if ((item.tipo === 'receta' || item.tipo === 'combo') && item.receta) {
        const ing = item.receta.find(r => r.productId === b.id)
        if (ing) return { ...b, stockMl: (b.stockMl || 0) - Number(ing.cantidadMl) }
      }
      if (b.id === item.id && item.tipo === 'botella') {
        return { ...b, stockMl: (b.stockMl || 0) - (b.mlPorUnidad || 0) }
      }
      return b
    }))

    setSessionSales(prev => {
      const exists = prev.find(s => s.id === item.id)
      if (exists) return prev.map(s => s.id === item.id ? { ...s, qty: s.qty + 1 } : s)
      return [...prev, { id: item.id, name: item.nombre, qty: 1, tipo: item.tipo, precio: item.precio }]
    })
    toast.success(`${item.nombre} +1`, { duration: 800 })
  }

  const handleUndoLocal = (productId: string) => {
    const saleItem = sessionSales.find(s => s.id === productId)
    if (!saleItem) return
    const original = bottles.find(b => b.id === productId)

    setBottles(prev => prev.map(b => {
      if ((saleItem.tipo === 'receta' || saleItem.tipo === 'combo') && original?.receta) {
        const ing = original.receta.find(r => r.productId === b.id)
        if (ing) return { ...b, stockMl: (b.stockMl || 0) + Number(ing.cantidadMl) }
      }
      if (b.id === productId && saleItem.tipo === 'botella') {
        return { ...b, stockMl: (b.stockMl || 0) + (original?.mlPorUnidad || 0) }
      }
      return b
    }))

    setSessionSales(prev => prev.map(s => 
      s.id === productId ? { ...s, qty: s.qty - 1 } : s
    ).filter(s => s.qty > 0))
  }

  const printTicket = () => {
    const total = sessionSales.reduce((acc, curr) => acc + (curr.qty * curr.precio), 0)
    const ticketWindow = window.open('', '_blank', 'width=300,height=600')
    if (!ticketWindow) return

    ticketWindow.document.write(`
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 80mm; padding: 10px; font-size: 12px; }
            .text-center { text-align: center; }
            .header { font-weight: bold; font-size: 16px; margin-bottom: 10px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .total { font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="text-center header">BUTIC</div>
          <div class="text-center">Comprobante de Despacho</div>
          <div class="text-center">${new Date().toLocaleString()}</div>
          <div class="divider"></div>
          ${sessionSales.map(item => `
            <div class="item">
              <span>${item.qty} x ${item.name.substring(0, 15)}</span>
              <span>$${(item.qty * item.precio).toLocaleString()}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="item">
            <span>PAGO:</span>
            <span>${paymentMethod.toUpperCase()}</span>
          </div>
          ${clientName ? `<div class="item"><span>CLIENTE:</span><span>${clientName.toUpperCase()}</span></div>` : ''}
          <div class="total">
            <span>TOTAL:</span>
            <span>$${total.toLocaleString()}</span>
          </div>
          <div class="divider"></div>
          <div class="text-center" style="margin-top: 20px;">¡Gracias!</div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `)
    ticketWindow.document.close()
  }

  const processFinalSale = async () => {
  // Validación para transferencias
  if (paymentMethod !== 'Efectivo' && !transactionRef) {
    toast.error("Por favor, ingresá el número de transacción");
    return;
  }

  setShowConfirmModal(false);
  setIsFinishing(true);
  
  const ticketId = `TICK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // 1. Preparamos los movimientos (Copia local de lo que hay en la comanda)
  const extraInfo = paymentMethod !== 'Efectivo' 
    ? `|Ref: ${transactionRef}${clientName ? `|Cli: ${clientName}` : ''}`
    : '';

  const movements = sessionSales.map(sale => ({
    botellaId: sale.id,
    nombreBotella: sale.name,
    tipo: 'venta',
    cantidad: sale.qty,
    monto: sale.precio * sale.qty,
    usuarioId: user?.id || 'anon',
    nombreUsuario: user?.name || 'Sistema',
    notas: `Pago: ${paymentMethod}${extraInfo}|Ticket: ${ticketId}`,
    createdAt: new Date().toISOString()
  }));

  // 2. DISPARAR TICKET (Prioridad #1: Que el cliente se lleve su papel)
  printTicket();

  // 3. LIMPIEZA INMEDIATA (Esto permite seguir cobrando al siguiente)
  const salesToSync = [...movements]; // Backup para el proceso de sincronización
  setSessionSales([]); // Vaciamos la comanda visualmente
  setTransactionRef('');
  setClientName('');
  localStorage.removeItem('bar_session_sales');

  try {
    // 4. Intentar guardar en Firebase
    // Usamos un Promise.race o simplemente el map
    const promises = salesToSync.map(m => 
      addMovement(m.botellaId, 'venta', m.cantidad, m.usuarioId, m.nombreUsuario, m.notas)
    );
    
    // Ponemos un timeout manual o dejamos que Firebase falle
    await Promise.all(promises);
    toast.success("Venta sincronizada online");
  } catch (e) {
    // 5. SI FALLA (No hay internet o timeout): Guardar en cola local
    salesToSync.forEach(m => savePendingMovement(m));
    toast.warning("Sin conexión: Venta guardada localmente para sincronizar luego", {
      duration: 5000
    });
  } finally {
    setIsFinishing(false);
    // Recargamos botellas para que el stock visual local sea el correcto
    loadData(); 
  }
};

  const filteredItems = bottles.filter(b => 
    b.nombre.toLowerCase().includes(search.toLowerCase()) || 
    b.marca.toLowerCase().includes(search.toLowerCase())
  )

  const totalAmount = sessionSales.reduce((acc, curr) => acc + (curr.qty * curr.precio), 0)

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-500 font-black italic animate-pulse text-xs uppercase tracking-widest">Iniciando Barra...</div>

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-8 font-rounded animate-in fade-in duration-500 overflow-hidden relative">
      <div className="flex-[2] flex flex-col space-y-6 min-h-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 px-2">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/20 rounded-[1.5rem] text-indigo-400">
              <Zap className="w-8 h-8 fill-current" />
            </div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">DESPACHO</h1>
          </div>
          <input type="text" placeholder="Buscar producto..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full md:w-72 pl-6 pr-6 py-4 bg-slate-900/50 border-2 border-slate-800 rounded-[1.8rem] text-white outline-none focus:border-indigo-500/50 font-bold" />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-10 custom-scrollbar pb-10">
          {['receta', 'combo', 'botella'].map(tipo => {
            const items = filteredItems.filter(b => b.tipo === tipo && (tipo !== 'botella' || Number(b.precio) > 0))
            if (items.length === 0) return null
            const titles: any = { receta: 'Tragos y Copas', combo: 'Combos y Baldes', botella: 'Botellas / Unidades' }
            const icons: any = { receta: <GlassWater className="text-sky-400" />, combo: <Layers className="text-purple-400" />, botella: <Wine className="text-rose-400" /> }
            return (
              <div key={tipo} className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                  {icons[tipo]}
                  <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em] italic">{titles[tipo]}</h2>
                  <div className="flex-1 h-[1px] bg-slate-800" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map(bottle => (
                    <ItemButton key={bottle.id} bottle={bottle} status={checkStockStatus(bottle)} onClick={() => handleQuickSale(bottle)} variant={tipo as any} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex-1 bg-slate-900/30 border-2 border-slate-800 rounded-[3rem] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-8 border-b-2 border-slate-800 bg-indigo-500/5 flex items-center gap-3 shrink-0">
          <History className="w-5 h-5 text-indigo-400" />
          <h2 className="font-bold text-white uppercase tracking-widest text-xs italic">Comanda Actual</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {sessionSales.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-800 space-y-4 opacity-20">
              <ShoppingCart className="w-16 h-16" />
              <p className="text-xs font-black uppercase italic tracking-widest">Sin pedido...</p>
            </div>
          ) : (
            sessionSales.map((sale) => (
              <div key={sale.id} className="group flex items-center justify-between bg-slate-900/80 p-5 rounded-[2.2rem] border border-slate-800 hover:border-indigo-500/30 transition-all">
                <div className="min-w-0 pr-4">
                  <p className="font-black text-slate-200 text-[11px] uppercase truncate italic leading-none">{sale.name}</p>
                  <p className="text-[15px] text-emerald-500 font-bold mt-1">${(sale.precio * sale.qty).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleUndoLocal(sale.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"><RotateCcw className="w-5 h-5" /></button>
                  <div className="bg-indigo-600 text-white font-black px-4 py-2 rounded-2xl text-xl">x{sale.qty}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-8 bg-slate-900 border-t-2 border-slate-800 shrink-0">
          <div className="flex justify-between items-end mb-6 px-2">
            <div className="flex flex-col">
              <span className="text-slate-500 font-bold uppercase text-[9px]">Monto Total</span>
              <span className="text-4xl font-black text-white italic tracking-tighter">${totalAmount.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-bold uppercase text-[9px]">Items</span>
              <p className="text-xl font-black text-slate-300 italic">{sessionSales.reduce((acc, curr) => acc + curr.qty, 0)}</p>
            </div>
          </div>
          <button 
            onClick={() => sessionSales.length > 0 && setShowConfirmModal(true)} 
            disabled={isFinishing || sessionSales.length === 0}
            className="w-full py-6 bg-emerald-600 text-white font-black rounded-[1.8rem] flex items-center justify-center gap-3 hover:bg-emerald-500 transition-all text-xl uppercase italic shadow-2xl active:scale-95 disabled:opacity-30"
          >
            {isFinishing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Printer className="w-6 h-6 stroke-[3px]" />}
            {isFinishing ? 'Guardando...' : 'Cerrar y Ticket'}
          </button>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-[3rem] w-full max-w-md p-8 animate-in zoom-in-95 duration-200 shadow-2xl overflow-y-auto max-h-[95vh]">
            <div className="text-center mb-8">
               <div className="w-16 h-16 bg-emerald-500/20 rounded-3xl flex items-center justify-center text-emerald-500 mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
               </div>
               <h2 className="text-2xl font-black text-white uppercase italic leading-none">Finalizar Venta</h2>
               <p className="text-[10px] text-slate-500 font-bold uppercase mt-3 tracking-widest">Medio de Pago</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { id: 'Efectivo', icon: Banknote, color: 'text-emerald-400' },
                { id: 'Transferencia', icon: Wallet, color: 'text-sky-400' },
                { id: 'Tarjeta', icon: CreditCard, color: 'text-purple-400' }
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as any)}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${paymentMethod === method.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-600'}`}
                >
                  <method.icon className={`w-6 h-6 mb-2 ${paymentMethod === method.id ? 'text-white' : method.color}`} />
                  <span className="text-[8px] font-black uppercase">{method.id}</span>
                </button>
              ))}
            </div>

            {/* CAMPOS ADICIONALES PARA TRANSFERENCIA/TARJETA */}
            {paymentMethod !== 'Efectivo' && (
              <div className="space-y-4 mb-8 animate-in slide-in-from-top-2">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Nº Transacción / Referencia</label>
                  <div className="relative">
                    <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Ej: 83294..." 
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      className="w-full bg-slate-950 border-2 border-slate-800 p-4 pl-12 rounded-2xl text-white font-bold outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Nombre Cliente (Opcional)</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Ej: Juan Perez" 
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-slate-950 border-2 border-slate-800 p-4 pl-12 rounded-2xl text-white font-bold outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex w-full gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 font-black rounded-2xl uppercase text-[10px]">Volver</button>
              <button 
                onClick={processFinalSale} 
                className="flex-[2] py-4 bg-emerald-600 text-white font-black rounded-2xl uppercase text-[10px] px-8 hover:bg-emerald-500 transition-all shadow-xl"
              >
                Confirmar Despacho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ItemButton({ bottle, status, onClick, variant }: { bottle: Botella, status: any, onClick: () => void, variant: 'receta' | 'combo' | 'botella' }) {
  const Icon = variant === 'receta' ? GlassWater : variant === 'combo' ? Layers : Wine
  const isOut = !status.available
  const activeColor = { receta: 'sky', combo: 'purple', botella: 'rose' }[variant]
  return (
    <button
      disabled={isOut}
      onClick={onClick}
      className={`group relative aspect-square rounded-[2.2rem] border-2 transition-all active:scale-95 flex flex-col items-center justify-center p-4 text-center ${isOut ? 'bg-slate-900/20 border-slate-800 opacity-40 cursor-not-allowed grayscale' : `bg-slate-900/40 border-${activeColor}-500/20 hover:border-${activeColor}-500 shadow-xl`}`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 mb-3 transition-colors ${isOut ? 'bg-slate-800 border-slate-700 text-slate-600' : `bg-slate-800/50 border-slate-700 text-${activeColor}-400`}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0 w-full px-1">
        <p className="font-bold text-white text-[10px] uppercase leading-tight truncate italic">{bottle.nombre}</p>
        <p className={`text-[9px] font-black mt-2 uppercase tracking-tighter ${isOut ? 'text-rose-500' : 'text-slate-500'}`}>
          {isOut ? `AGOTADO` : `$${bottle.precio}`}
        </p>
      </div>
    </button>
  )
}