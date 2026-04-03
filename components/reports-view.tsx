'use client'

import React, { useState, useEffect } from 'react'
import { getReportDataCloud, saveCashAudit, db } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart as RePie, Pie, Cell
} from 'recharts'
import {
  Calendar, TrendingUp, TrendingDown, Activity,
  Loader2, Clock, Layers, Wine, Search,
  ArrowUpRight, Percent, ChevronRight, BarChart3, 
  Wallet, Info, X, ChevronDown, ChevronUp, ShoppingCart,
  User, CreditCard, Tag, Printer, Banknote, Landmark,
  ArrowDownCircle, ReceiptText, Calculator, Monitor, ShieldCheck, History as HistoryIcon,
  CheckCircle2, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b']

export function ReportsView() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'owner'
  
  const [activeTab, setActiveTab] = useState<'metrics' | 'audit' | 'cash'>(isAdmin ? 'metrics' : 'cash')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('00:00')
  const [endTime, setEndTime] = useState('23:59')
  
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [auditSearch, setAuditSearch] = useState('')
  const [lastClosureDate, setLastClosureDate] = useState<string | null>(null)
  const [pastAudits, setPastAudits] = useState<any[]>([])
  
  // ESTADOS DE EXPANSIÓN (CORREGIDOS)
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null)
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null)
  
  const [cashUserFilter, setCashUserFilter] = useState<string>(isAdmin ? 'todos' : user?.name || '')
  const [manualCash, setManualCash] = useState({ efectivo: '', transferencia: '', tarjeta: '' })
  const [savingAudit, setSavingAudit] = useState(false)

  const fetchLastClosure = async () => {
    try {
      const q = query(
        collection(db, 'cash_audits'),
        where('terminal', '==', cashUserFilter),
        orderBy('createdAt', 'desc'),
        limit(1)
      )
      const snap = await getDocs(q)
      setLastClosureDate(!snap.empty ? snap.docs[0].data().createdAt : null)

      if (isAdmin) {
        const qHistory = query(collection(db, 'cash_audits'), orderBy('createdAt', 'desc'), limit(20))
        const snapH = await getDocs(qHistory)
        setPastAudits(snapH.docs.map(d => ({ id: d.id, ...d.data() })))
      }
    } catch (e) { console.error("Error cierres:", e) }
  }

  const generateReport = async () => {
    setLoading(true)
    await fetchLastClosure()
    try {
      const start = new Date(startDate + 'T00:00:00')
      const end = new Date(endDate + 'T23:59:59')
      const data = await getReportDataCloud(start, end)
      setReportData(data)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { generateReport() }, [startDate, endDate, cashUserFilter])

  const getProcessedData = () => {
    const defaultData = { 
      trend: [] as any[], hourly: [] as any[], 
      cashFlow: { Efectivo: 0, Transferencia: 0, Tarjeta: 0, total: 0 },
      auditSorted: [] as any[], usersList: [] as string[],
      pieData: [] as any[], topSales: [] as any[]
    }
    if (!reportData) return defaultData
    
    const allMovements = reportData.movements || []
    const movementsAfterClosure = allMovements.filter((m: any) => {
      if (!lastClosureDate) return true
      return new Date(m.createdAt) > new Date(lastClosureDate)
    })

    const salesOnly = movementsAfterClosure.filter((m: any) => m.tipo?.toLowerCase() === 'venta')
    const usersList = Array.from(new Set(allMovements.map((m: any) => m.nombreUsuario || 'Sistema'))) as string[]

    const cashMovements = salesOnly.filter((m: any) => 
      cashUserFilter === 'todos' ? true : (m.nombreUsuario || 'Sistema') === cashUserFilter
    )

    const cashFlow = {
      Efectivo: cashMovements.filter((m: any) => m.notas?.includes('Pago: Efectivo')).reduce((acc:number, curr:any) => acc + Number(curr.monto || 0), 0),
      Transferencia: cashMovements.filter((m: any) => m.notas?.includes('Pago: Transferencia')).reduce((acc:number, curr:any) => acc + Number(curr.monto || 0), 0),
      Tarjeta: cashMovements.filter((m: any) => m.notas?.includes('Pago: Tarjeta')).reduce((acc:number, curr:any) => acc + Number(curr.monto || 0), 0),
      total: cashMovements.reduce((acc:number, curr:any) => acc + Number(curr.monto || 0), 0)
    }

    const allSales = allMovements.filter((m: any) => m.tipo?.toLowerCase() === 'venta')
    const hourMap: Record<string, number> = {}
    allSales.forEach((m: any) => {
      const h = `${new Date(m.createdAt).getHours().toString().padStart(2, '0')}:00`
      hourMap[h] = (hourMap[h] || 0) + Number(m.monto || 0)
    })
    const hourly = Object.entries(hourMap).map(([hour, total]) => ({ hour, ventas: total })).sort((a,b) => a.hour.localeCompare(b.hour))

    let moneyAcc = 0
    const trend = [...allSales].sort((a:any, b:any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((m: any) => {
        moneyAcc += Number(m.monto || 0); return { time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), acumulado: moneyAcc }
    })

    const pieData = Object.entries(reportData.salesByCategory || {}).map(([name, value]) => ({ name: name.toUpperCase(), value: Number(value) }))

    const rawMovements = [...allMovements].sort((a:any, b:any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const groups: any[] = []; const processedTicketIds = new Set()
    rawMovements.forEach(m => {
      const tId = m.notas?.match(/Ticket: (TICK-\d+-\d+)/)?.[1]
      if (tId && !processedTicketIds.has(tId)) {
        const items = rawMovements.filter(item => item.notas?.includes(tId))
        groups.push({ id: tId, isTicket: true, createdAt: m.createdAt, nombreUsuario: m.nombreUsuario, montoTotal: items.reduce((a:number, c:any) => a + Number(c.monto || 0), 0), itemsCount: items.reduce((a:number, c:any) => a + Number(c.cantidad || 0), 0), details: items, notas: m.notas })
        processedTicketIds.add(tId)
      } else if (!tId) { groups.push({ ...m, isTicket: false }) }
    })

    const auditSorted = groups.filter(g => {
      const search = auditSearch.toLowerCase()
      return !search || (g.isTicket ? g.details.map((i:any) => i.nombreBotella).join(' ') : g.nombreBotella)?.toLowerCase().includes(search) || g.nombreUsuario?.toLowerCase().includes(search)
    })

    return { trend, hourly, cashFlow, auditSorted, usersList, pieData, topSales: reportData.salesByBottle || [] }
  }

  const { trend, hourly, cashFlow, auditSorted, usersList, pieData, topSales } = getProcessedData()

  const handlePrintAgain = (ticket: any) => {
    const ticketWindow = window.open('', '_blank', 'width=300,height=600')
    if (!ticketWindow) return
    const pay = ticket.notas?.match(/Pago: ([^|]+)/)?.[1] || '---'
    ticketWindow.document.write(`
      <html><head><style>body { font-family: 'Courier New', monospace; width: 80mm; padding: 10px; font-size: 12px; }.text-center { text-align: center; }.header { font-weight: bold; font-size: 16px; }.divider { border-top: 1px dashed #000; margin: 10px 0; }.item { display: flex; justify-content: space-between; }</style></head>
      <body><div class="text-center header">STUDIO 244</div><div class="text-center">** DUPLICADO **</div><div class="divider"></div>
      ${ticket.details.map((i: any) => `<div class="item"><span>${i.cantidad} x ${i.nombreBotella}</span><span>$${Number(i.monto).toLocaleString()}</span></div>`).join('')}
      <div class="divider"></div><div class="item"><span>PAGO:</span><span>${pay.toUpperCase()}</span></div><div class="item" style="font-weight:bold"><span>TOTAL:</span><span>$${Number(ticket.montoTotal).toLocaleString()}</span></div><script>window.print(); window.close();</script></body></html>
    `)
    ticketWindow.document.close()
  }

  const handleSaveAudit = async () => {
    if (!manualCash.efectivo) return toast.error("Ingresá el efectivo contado")
    setSavingAudit(true)
    const data = {
      createdAt: new Date().toISOString(),
      terminal: cashUserFilter,
      esperado: cashFlow,
      real: { Efectivo: Number(manualCash.efectivo), Transferencia: Number(manualCash.transferencia), Tarjeta: Number(manualCash.tarjeta) },
      usuarioReporta: user?.name || 'Sistema',
      tipoCierre: cashUserFilter === 'todos' ? 'GLOBAL' : 'PARCIAL'
    }
    const res = await saveCashAudit(data)
    if (res) { toast.success("Caja reseteada"); setManualCash({ efectivo: '', transferencia: '', tarjeta: '' }); generateReport() }
    setSavingAudit(false)
  }

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-700 font-rounded pb-24">
      
      {/* HEADER NAVEGACIÓN */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-6 px-2">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shrink-0"><BarChart3 className="text-white w-6 h-6" /></div>
          <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border-2 border-slate-800 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {isAdmin && <button onClick={() => setActiveTab('metrics')} className={`flex-1 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'metrics' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Métricas</button>}
            {isAdmin && <button onClick={() => setActiveTab('audit')} className={`flex-1 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'audit' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Auditoría</button>}
            <button onClick={() => setActiveTab('cash')} className={`flex-1 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === 'cash' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Arqueo</button>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-[2rem] border-2 border-slate-800 text-white w-full sm:w-auto justify-center">
             <Calendar className="w-4 h-4 text-indigo-500 ml-2" /><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent font-black text-xs outline-none p-1 w-28" /><ChevronRight className="w-4 h-4 text-slate-700" /><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent font-black text-xs outline-none p-1 w-28" /><button onClick={generateReport} className="bg-indigo-600 p-3 rounded-xl text-white shadow-lg active:scale-90"><ArrowUpRight className="w-4 h-4 stroke-[3px]" /></button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-500 font-black uppercase text-[10px] tracking-[0.3em]"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />Cargando...</div>
      ) : (
        <>
          {isAdmin && activeTab === 'metrics' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 px-1 lg:px-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Caja Total" value={`$${reportData?.totalRevenue?.toLocaleString() || 0}`} icon={Wallet} color="text-emerald-400" sub="Ventas Netas" />
                <StatCard label="Volumen" value={reportData?.movements?.length || 0} icon={TrendingUp} color="text-indigo-400" sub="Operaciones" />
                <StatCard label="Ticket Promedio" value={`$${(reportData?.totalRevenue / (auditSorted.length || 1)).toFixed(0)}`} icon={ReceiptText} color="text-sky-400" sub="Promedio" />
                <StatCard label="Inversión" value={`$${reportData?.totalInvestment?.toLocaleString() || 0}`} icon={TrendingDown} color="text-rose-400" sub="Costo Stock" />
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <ChartCard title="Crecimiento" sub="Acumulado ($)"><div className="h-[250px] lg:h-[300px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><defs><linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} /><XAxis dataKey="time" hide /><YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} /><Area type="monotone" dataKey="acumulado" stroke="#6366f1" fill="url(#colorAcc)" strokeWidth={4} /></AreaChart></ResponsiveContainer></div></ChartCard>
                <ChartCard title="Horas Pico" sub="Ventas/Hora ($)"><div className="h-[250px] lg:h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={hourly}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} /><XAxis dataKey="hour" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} /><YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} /><Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} /><Bar dataKey="ventas" fill="#10b981" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></ChartCard>
              </div>
              <div className="grid lg:grid-cols-3 gap-6">
                <ChartCard title="Mix Financiero" sub="Categorías"><div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><RePie><Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">{pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} /><Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} /></RePie></ResponsiveContainer></div></ChartCard>
                <div className="lg:col-span-2 bg-[#0f172a]/40 border-2 border-slate-800/50 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl">
                  <h2 className="text-white font-black uppercase italic text-lg mb-8 text-center lg:text-left">Ranking de Salida</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {topSales.slice(0, 6).map((item: any, i: number) => (
                      <div key={i} className="bg-slate-900/60 p-5 rounded-[2.2rem] border border-slate-800 flex items-center justify-between group hover:border-emerald-500/40 transition-all"><div className="min-w-0 pr-2"><p className="text-[13px] font-black text-white uppercase italic truncate">{item.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{item.quantity} Salidas</p></div><p className="font-black text-emerald-400 text-lg italic">${Number(item.revenue || 0).toLocaleString()}</p></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cash' && (
            <div className="animate-in slide-in-from-bottom-4 space-y-8 max-w-6xl mx-auto px-2">
              <div className="bg-slate-900/80 border-2 border-indigo-500/30 p-6 lg:p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400"><Monitor className="w-8 h-8" /></div>
                  <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Caja actual</p><h3 className="text-white font-black uppercase italic text-xl">{cashUserFilter === 'todos' ? 'CIERRE GLOBAL' : cashUserFilter}</h3></div>
                </div>
                {isAdmin && (
                  <select value={cashUserFilter} onChange={(e) => setCashUserFilter(e.target.value)} className="w-full md:w-auto bg-slate-950 border-2 border-slate-800 text-white font-black p-4 rounded-2xl outline-none min-w-[200px] cursor-pointer focus:border-indigo-500">
                    <option value="todos">CIERRE GLOBAL (ADMIN)</option>
                    {usersList.map((u: string) => <option key={u} value={u}>CAJA: {u.toUpperCase()}</option>)}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-slate-900/50 border-2 border-slate-800 p-6 lg:p-10 rounded-[3rem] backdrop-blur-md relative overflow-hidden">
                    {cashFlow.total === 0 && (
                      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-6">
                         <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 mb-4 shadow-xl"><CheckCircle2 className="w-8 h-8" /></div>
                         <h4 className="text-white font-black uppercase italic text-xl">Caja al día</h4>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-8"><Calculator className="text-indigo-500 w-6 h-6" /><h3 className="text-white font-black uppercase italic text-xl">Declaración Real</h3></div>
                    <div className="space-y-4 lg:space-y-6">
                      <ManualInput label="Efectivo" icon={Banknote} value={manualCash.efectivo} onChange={(v:any) => setManualCash({...manualCash, efectivo: v})} expected={cashFlow.Efectivo} />
                      <ManualInput label="Transf." icon={Landmark} value={manualCash.transferencia} onChange={(v:any) => setManualCash({...manualCash, transferencia: v})} expected={cashFlow.Transferencia} />
                      <ManualInput label="Tarjeta" icon={CreditCard} value={manualCash.tarjeta} onChange={(v:any) => setManualCash({...manualCash, tarjeta: v})} expected={cashFlow.Tarjeta} />
                    </div>
                    <button onClick={handleSaveAudit} disabled={savingAudit || cashFlow.total === 0} className="w-full mt-10 py-6 lg:py-8 bg-emerald-600 text-white font-black text-xl lg:text-2xl rounded-[2.5rem] shadow-2xl uppercase italic flex items-center justify-center gap-4">
                      {savingAudit ? <Loader2 className="animate-spin" /> : <ArrowDownCircle className="w-8 h-8" />} FINALIZAR ARQUEO
                    </button>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                    <Banknote className="absolute -right-4 -bottom-4 w-32 h-32 text-white opacity-10" />
                    <p className="text-indigo-200 font-black uppercase text-[10px] mb-2 tracking-widest italic">Ventas sin rendir</p>
                    <h2 className="text-4xl lg:text-5xl font-black text-white italic tracking-tighter">${cashFlow.total.toLocaleString()}</h2>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="space-y-6 pt-10">
                  <div className="flex items-center gap-4 px-4"><HistoryIcon className="text-indigo-500 w-6 h-6" /><h3 className="text-white font-black uppercase italic text-xl">Historial de Arqueos</h3></div>
                  <div className="bg-slate-900/50 border-2 border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[900px]"><thead className="bg-slate-950/50"><tr className="text-slate-500 text-[10px] font-black uppercase border-b border-slate-800"><th className="p-6">Fecha / Hora</th><th className="p-6">Terminal</th><th className="p-6">Cajero</th><th className="p-6 text-center">Esperado</th><th className="p-6 text-center">Real</th><th className="p-6 text-center">Acciones</th></tr></thead><tbody className="divide-y divide-slate-800/40">
                      {pastAudits.map((a, i) => {
                        const isExp = expandedAudit === a.id;
                        const diff = a.real.Efectivo - a.esperado.Efectivo;
                        return (
                          <React.Fragment key={a.id || i}>
                            <tr className={`hover:bg-white/[0.04] transition-all ${isExp ? 'bg-indigo-500/[0.08] border-l-4 border-indigo-500' : ''}`}>
                              <td className="p-6 text-xs font-black text-slate-400 italic">{new Date(a.createdAt).toLocaleString()} HS</td>
                              <td className="p-6"><span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase ${a.terminal === 'todos' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-400'}`}>{a.terminal}</span></td>
                              <td className="p-6 text-sm font-black text-white uppercase italic">{a.usuarioReporta}</td>
                              <td className="p-6 text-center text-sm font-black text-slate-400 tracking-tight">${a.esperado.total.toLocaleString()}</td>
                              <td className="p-6 text-center text-sm font-black text-white tracking-tight">${(a.real.Efectivo + a.real.Transferencia + a.real.Tarjeta).toLocaleString()}</td>
                              <td className="p-6 text-center"><button onClick={() => setExpandedAudit(isExp ? null : a.id)} className={`p-3 rounded-2xl transition-all ${isExp ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{isExp ? <ChevronUp className="w-4 h-4 stroke-[3px]" /> : <ChevronDown className="w-4 h-4 stroke-[3px]" />}</button></td>
                            </tr>
                            {isExp && (
                              <tr className="bg-slate-950/90 animate-in slide-in-from-top-2 duration-300"><td colSpan={6} className="p-10 border-y-2 border-indigo-500/20"><div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"><DetailBox label="Efectivo" expected={a.esperado.Efectivo} real={a.real.Efectivo} diff={diff} icon={Banknote} color="emerald" /><DetailBox label="Transf." expected={a.esperado.Transferencia} real={a.real.Transferencia} diff={a.real.Transferencia - a.esperado.Transferencia} icon={Landmark} color="sky" /><DetailBox label="Tarjeta" expected={a.esperado.Tarjeta} real={a.real.Tarjeta} diff={a.real.Tarjeta - a.esperado.Tarjeta} icon={CreditCard} color="purple" /></div></td></tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody></table></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {isAdmin && activeTab === 'audit' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 px-2">
               <div className="bg-slate-900/50 border-2 border-slate-800 p-6 rounded-[2.5rem] flex flex-col xl:flex-row items-center gap-6 shadow-2xl backdrop-blur-sm">
                  <div className="relative flex-1 w-full"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="text" placeholder="Buscar ticket..." value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} className="w-full bg-slate-950/80 border border-slate-800 text-white font-bold text-xs pl-12 py-4 rounded-2xl outline-none focus:border-indigo-500/50 transition-all" /></div>
                  <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-800 shadow-inner"><Clock className="w-4 h-4 text-indigo-500 ml-2" /><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-transparent text-white font-black text-xs outline-none text-center" /><span className="text-slate-700 font-black text-[10px]">HASTA</span><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-transparent text-white font-black text-xs outline-none text-center" /></div>
               </div>
               <div className="bg-[#0f172a]/40 border-2 border-slate-800/50 rounded-[3rem] overflow-hidden shadow-2xl">
                 <div className="overflow-x-auto"><table className="w-full text-left border-collapse min-w-[1000px]"><thead className="bg-slate-950/50"><tr className="text-slate-400 text-[10px] font-black uppercase border-b border-slate-800"><th className="p-6">Fecha / Hora</th><th className="p-6">Detalle / ID</th><th className="p-6 text-center">Cajero</th><th className="p-6 text-center">Monto</th><th className="p-6 text-center">Acciones</th></tr></thead><tbody className="divide-y divide-slate-800/40">
                   {auditSorted.map((m: any, i: number) => {
                     const isExp = expandedTicket === m.id;
                     return (
                       <React.Fragment key={m.id || i}>
                         <tr className="hover:bg-white/[0.03]">
                           <td className="p-6 text-xs font-black text-slate-400 italic">{new Date(m.createdAt).toLocaleString()} HS</td>
                           <td className="p-6 text-white font-black text-sm uppercase italic">{m.isTicket ? m.id : m.nombreBotella}</td>
                           <td className="p-6 text-center text-xs font-black text-slate-400 uppercase italic">{m.nombreUsuario}</td>
                           <td className="p-6 text-center font-black text-lg text-emerald-400 italic">${Number(m.montoTotal || m.monto || 0).toLocaleString()}</td>
                           <td className="p-6 text-center"><div className="flex items-center justify-center gap-2">{m.isTicket && <button onClick={() => handlePrintAgain(m)} className="p-3 bg-slate-800 hover:bg-indigo-600 rounded-xl text-indigo-400 hover:text-white transition-all shadow-lg"><Printer className="w-5 h-5" /></button>}{m.isTicket && <button onClick={() => setExpandedTicket(isExp ? null : m.id)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-all shadow-lg">{isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>}</div></td>
                         </tr>
                         {isExp && m.isTicket && (
                           <tr className="bg-slate-950/80 animate-in fade-in"><td colSpan={6} className="p-8 border-y-2 border-indigo-500/20"><div className="space-y-4 max-w-2xl">{m.details.map((item: any, idx: number) => (<div key={idx} className="flex justify-between items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800/50"><div className="flex items-center gap-4"><Wine className="w-5 h-5 text-slate-500" /><span className="text-sm font-black text-white uppercase italic">{item.nombreBotella}</span></div><div className="flex items-center gap-10"><span className="text-xs font-bold text-slate-500 uppercase">x{item.cantidad}</span><span className="text-lg font-black text-emerald-400 italic">${Number(item.monto || 0).toLocaleString()}</span></div></div>))}</div></td></tr>
                         )}
                       </React.Fragment>
                     )
                   })}
                 </tbody></table></div>
               </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function DetailBox({ label, expected, real, diff, icon: Icon, color }: any) {
  const colorMap: any = { emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20', purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20' }
  return (
    <div className={`bg-slate-900/60 p-8 rounded-[2.5rem] border-2 border-slate-800 shadow-2xl flex flex-col gap-6 relative overflow-hidden group hover:border-slate-700 transition-all`}>
      <div className="flex items-center justify-between relative z-10"><div className="flex items-center gap-4"><div className={`p-4 rounded-2xl ${colorMap[color].split(' ')[1]} ${colorMap[color].split(' ')[0]}`}><Icon className="w-6 h-6" /></div><span className="text-xs font-black text-white uppercase tracking-[0.2em] italic">{label}</span></div>{diff !== 0 && <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase italic ${diff > 0 ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-400'}`}>Diferencia</span>}</div>
      <div className="space-y-4 relative z-10"><div className="flex justify-between items-end border-b border-slate-800/50 pb-3"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sistema</span><span className="text-lg font-black text-slate-300 italic">${expected.toLocaleString()}</span></div><div className="flex justify-between items-end"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cajero</span><span className="text-3xl font-black text-white italic tracking-tighter">${real.toLocaleString()}</span></div></div>
      <div className={`mt-4 p-4 rounded-2xl border flex justify-between items-center ${diff === 0 ? 'bg-emerald-500/5 border-emerald-500/10' : diff > 0 ? 'bg-sky-500/5 border-sky-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}><span className="text-[10px] font-black text-slate-500 uppercase italic">Balance:</span><span className={`text-xl font-black italic ${diff === 0 ? 'text-emerald-400' : diff > 0 ? 'text-sky-400' : 'text-rose-500'}`}>{diff === 0 ? 'CORRECTO' : `${diff > 0 ? '+' : ''}$${diff.toLocaleString()}`}</span></div>
      <Icon className={`absolute -right-6 -bottom-6 w-32 h-32 opacity-[0.02] ${colorMap[color].split(' ')[0]} group-hover:scale-110 transition-all duration-700`} />
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="bg-[#0f172a]/60 border-2 border-slate-800/50 p-7 rounded-[2.5rem] relative overflow-hidden group shadow-2xl transition-all hover:border-slate-700"><Icon className={`absolute -right-6 -bottom-6 w-24 h-24 opacity-5 ${color} group-hover:scale-110 transition-all duration-500`} /><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">{label}</p><h2 className={`text-3xl sm:text-4xl font-black italic tracking-tighter ${color} drop-shadow-sm`}>{value}</h2><div className="flex items-center gap-1.5 mt-3"><Info className="w-2.5 h-2.5 text-slate-700" /><p className="text-[9px] text-slate-600 font-bold uppercase italic tracking-tighter">{sub}</p></div></div>
  )
}

function ChartCard({ title, sub, children }: any) {
  return (
    <div className="bg-[#0f172a]/40 border-2 border-slate-800/50 p-6 sm:p-8 rounded-[2.8rem] shadow-2xl backdrop-blur-sm"><div className="mb-8 flex justify-between items-start"><div><h2 className="text-white font-black uppercase italic text-base sm:text-lg tracking-tight leading-none">{title}</h2><p className="text-[10px] text-slate-600 font-bold uppercase mt-2 italic tracking-widest">{sub}</p></div></div>{children}</div>
  )
}

function ManualInput({ label, icon: Icon, value, onChange, expected }: any) {
  const diff = (Number(value) || 0) - expected;
  return (
    <div className="bg-slate-950/50 p-6 rounded-[2.2rem] border border-slate-800 group focus-within:border-indigo-500/50 transition-all">
      <div className="flex justify-between items-center mb-4"><div className="flex items-center gap-3"><div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-focus-within:text-indigo-400 transition-colors"><Icon className="w-5 h-5" /></div><span className="text-xs font-black text-slate-300 uppercase tracking-tighter">{label}</span></div><div className="text-right"><p className="text-[9px] font-black text-slate-500 uppercase italic">Esperado</p><p className="text-xs font-black text-white italic">${expected.toLocaleString()}</p></div></div>
      <div className="relative"><input type="number" placeholder="0.00" value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent border-b-2 border-slate-800 py-2 text-3xl font-black text-white outline-none focus:border-indigo-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />{value && <div className={`absolute right-0 top-1/2 -translate-y-1/2 text-[10px] font-black px-4 py-2 rounded-full ${diff >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>{diff === 0 ? '✓ OK' : `${diff > 0 ? '+' : ''}${diff.toLocaleString()}`}</div>}</div>
    </div>
  )
}