'use client'

import { useState, useEffect } from 'react'
import { getReportDataCloud } from '@/lib/store'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePie, Pie, Cell, BarChart, Bar, Legend, 
} from 'recharts'

import {
  Calendar, TrendingUp, TrendingDown, Activity,
  Loader2, Clock, Layers, Wine,
  ArrowUpRight, Percent, ChevronRight, ShoppingCart, BarChart3, User, DollarSign, Filter, Wallet, UserIcon
} from 'lucide-react'

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b']

export function ReportsView() {
  const [activeTab, setActiveTab] = useState<'metrics' | 'audit'>('metrics')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('00:00')
  const [endTime, setEndTime] = useState('23:59')
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const generateReport = async () => {
    setLoading(true)
    try {
      const start = new Date(startDate + 'T00:00:00')
      const end = new Date(endDate + 'T23:59:59')
      const data = await getReportDataCloud(start, end)
      setReportData(data)
    } catch (e) {
      console.error("Error en reporte:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { generateReport() }, [startDate, endDate])

  const getProcessedData = () => {
    if (!reportData) return { trend: [], hourly: [], stats: { revenue: 0, cost: 0, profit: 0, margin: 0 } }
    const salesOnly = reportData.movements?.filter((m: any) => m.type === 'Venta') || []
    const totalRevenue = Number(reportData.totalRevenue || 0)
    const totalCost = Number(reportData.totalCost || 0)
    const profit = totalRevenue - totalCost
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0

    const hourMap: Record<string, number> = {}
    salesOnly.forEach((m: any) => {
      const date = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt)
      const h = `${date.getHours().toString().padStart(2, '0')}:00`
      hourMap[h] = (hourMap[h] || 0) + Number(m.cantidad)
    })
    const hourly = Object.entries(hourMap).map(([hour, ventas]) => ({ hour, ventas })).sort((a,b) => a.hour.localeCompare(b.hour))

    let totalAcc = 0
    let moneyAcc = 0
    const trend = salesOnly
      .sort((a:any, b:any) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
      .map((m: any) => {
        totalAcc += Number(m.cantidad || 0)
        moneyAcc += (Number(m.cantidad || 0) * Number(m.precioVenta || 0))
        const date = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt)
        return {
          time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          acumulado: totalAcc,
          dinero: moneyAcc
        }
      })
    return { trend, hourly, stats: { revenue: totalRevenue, cost: totalCost, profit, margin } }
  }

  const { trend, hourly, stats } = getProcessedData()

  const pieData = Object.entries(reportData?.salesByCategory || {}).map(([name, value]) => ({
    name: name.toString().toUpperCase(),
    value: Number(value)
  }))

  const filteredAudit = reportData?.movements?.filter((m: any) => {
    const date = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt)
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    return timeStr >= startTime && timeStr <= endTime
  }) || []

  return (
    <div className="space-y-6 md:space-y-8 pb-10 animate-in fade-in duration-700 font-rounded">
      
      {/* HEADER & FILTROS RESPONSIVE */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-6 px-2">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
            <BarChart3 className="text-white w-6 h-6" />
          </div>
          <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-md w-full sm:w-auto">
            <button onClick={() => setActiveTab('metrics')} className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'metrics' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Métricas</button>
            <button onClick={() => setActiveTab('audit')} className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'audit' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Auditoría</button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 bg-slate-900/50 p-2 rounded-[2rem] border border-slate-800 shadow-xl text-white w-full sm:w-auto">
           <Calendar className="hidden sm:block w-4 h-4 text-indigo-500 ml-2" />
           <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent font-black text-[10px] sm:text-xs outline-none cursor-pointer" />
           <ChevronRight className="w-4 h-4 text-slate-700" />
           <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent font-black text-[10px] sm:text-xs outline-none cursor-pointer" />
           <button onClick={generateReport} className="bg-indigo-600 p-3 rounded-xl text-white active:scale-90 transition-all hover:bg-indigo-500">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
           </button>
        </div>
      </div>

      {loading && !reportData ? (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-black uppercase text-[10px] tracking-[0.3em]">Procesando Big Data...</p>
        </div>
      ) : reportData ? (
        <>
          {activeTab === 'metrics' ? (
            <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 duration-700">
              
              {/* STAT CARDS RESPONSIVE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Recaudación" value={`$${stats.revenue.toLocaleString()}`} icon={Wallet} color="text-emerald-400" sub="Ventas Brutas" />
                <StatCard label="Inversión" value={`$${stats.cost.toLocaleString()}`} icon={TrendingDown} color="text-rose-400" sub="Costo de Almacén" />
                <StatCard label="Ganancia Neta" value={`$${stats.profit.toLocaleString()}`} icon={TrendingUp} color="text-indigo-400" sub="Dinero Limpio" />
                <StatCard label="Rentabilidad" value={`${stats.margin.toFixed(1)}%`} icon={Percent} color="text-purple-400" sub="Eficiencia" />
              </div>

              {/* GRÁFICOS RESPONSIVE */}
              <div className="grid lg:grid-cols-2 gap-6">
                <ChartCard title="Tendencia" sub="Unidades vs Recaudación">
                  <div className="h-[250px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trend}>
                        <defs>
                          <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                          <linearGradient id="colorDinero" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis yAxisId="left" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} itemStyle={{ fontSize: '10px' }} />
                        <Area yAxisId="left" type="monotone" dataKey="acumulado" stroke="#6366f1" fill="url(#colorAcc)" strokeWidth={3} />
                        <Area yAxisId="right" type="monotone" dataKey="dinero" stroke="#10b981" fill="url(#colorDinero)" strokeWidth={2} strokeDasharray="5 5" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <ChartCard title="Flujo Horario" sub="Volumen por hora">
                  <div className="h-[250px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="hour" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#1e293b', radius: 8}} contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} />
                        <Bar dataKey="ventas" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>

              {/* MIX Y TOP PERFORMANCE RESPONSIVE */}
              <div className="grid lg:grid-cols-3 gap-6">
                <ChartCard title="Mix de Venta" sub="Categorías">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePie>
                        <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                          {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                      </RePie>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <div className="lg:col-span-2 bg-[#0f172a]/40 border-2 border-slate-800/50 rounded-[2.5rem] p-6 sm:p-8">
                  <h2 className="text-white font-black uppercase italic text-lg mb-6 leading-none">Top Performance</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {reportData.salesByBottle?.slice(0, 6).map((item: any, i: number) => (
                      <div key={i} className="bg-slate-900/50 p-5 rounded-[2rem] border border-slate-800 flex items-center justify-between group hover:border-indigo-500/50 transition-all">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white uppercase italic truncate">{item.name}</p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase">{item.quantity} UDS.</p>
                        </div>
                        <p className="font-black text-emerald-400 text-base sm:text-lg ml-2 shrink-0">${Number(item.revenue || 0).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className="bg-slate-900/50 border-2 border-slate-800 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl text-white">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500"><Filter className="w-6 h-6" /></div>
                    <div>
                      <h2 className="font-black text-white uppercase italic text-lg leading-none tracking-tight">Registro de Turno</h2>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Filtrar franja horaria</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-2xl border border-slate-700 w-full md:w-auto">
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="flex-1 bg-transparent font-black text-xs p-2 outline-none text-center" />
                    <span className="text-slate-600 font-black text-xs">AL</span>
                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="flex-1 bg-transparent font-black text-xs p-2 outline-none text-center" />
                  </div>
               </div>
               <AuditTable movements={filteredAudit} />
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="bg-[#0f172a]/60 border-2 border-slate-800/50 p-6 rounded-[2.2rem] relative overflow-hidden group shadow-xl">
      <Icon className={`absolute -right-4 -bottom-4 w-20 h-20 opacity-5 ${color}`} />
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <h2 className={`text-2xl sm:text-3xl font-black italic tracking-tighter ${color}`}>{value}</h2>
      <p className="text-[9px] text-slate-600 font-bold uppercase mt-2 italic">{sub}</p>
    </div>
  )
}

function ChartCard({ title, sub, children }: any) {
  return (
    <div className="bg-[#0f172a]/40 border-2 border-slate-800/50 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl">
      <div className="mb-6 text-left">
        <h2 className="text-white font-black uppercase italic text-base sm:text-lg tracking-tight leading-none">{title}</h2>
        <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">{sub}</p>
      </div>
      {children}
    </div>
  )
}

function AuditTable({ movements }: any) {
  return (
    <div className="bg-[#0f172a]/40 border-2 border-slate-800/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
      {/* HEADER DE TABLA */}
      <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/20">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-indigo-500" />
          <h2 className="text-white font-black uppercase italic tracking-tight">Auditoría Detallada</h2>
        </div>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-4 py-1.5 rounded-full font-black uppercase italic">
          {movements.length} Registros Encontrados
        </span>
      </div>

      {/* VISTA DESKTOP (Tabla tradicional) - Oculta en móviles */}
      <div className="hidden md:block overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#111827]">
            <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
              <th className="p-5">Día / Hora</th>
              <th className="p-5">Producto</th>
              <th className="p-5">Usuario</th>
              <th className="p-5 text-center">Tipo</th>
              <th className="p-5 text-center">Cant.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {movements.map((m: any, i: number) => {
              const date = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
              return (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-5 text-[10px] font-bold text-slate-400 italic">
                    {date.toLocaleDateString()} - {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-5 font-black text-white text-xs uppercase italic tracking-tight">{m.nombreBotella}</td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-indigo-400 font-black text-[8px]">
                        {m.nombreUsuario?.substring(0, 2).toUpperCase() || 'SI'}
                      </div>
                      <span className="text-[10px] font-bold text-slate-300 uppercase">{m.nombreUsuario || 'SISTEMA'}</span>
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase ${m.type === 'Venta' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {m.type}
                    </span>
                  </td>
                  <td className={`p-5 text-center font-black text-xl ${m.type === 'Venta' ? 'text-rose-500' : 'text-emerald-400'}`}>
                    {m.type === 'Venta' ? '-' : '+'}{m.cantidad}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* VISTA MÓVIL (Cards apiladas) - Oculta en desktop */}
      <div className="md:hidden divide-y divide-slate-800/40">
        {movements.map((m: any, i: number) => {
          const date = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
          const isVenta = m.type === 'Venta';
          return (
            <div key={i} className="p-5 flex flex-col gap-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-white font-black text-sm uppercase italic leading-none">{m.nombreBotella}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {date.toLocaleDateString()} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} HS
                  </p>
                </div>
                <div className={`text-2xl font-black italic ${isVenta ? 'text-rose-500' : 'text-emerald-400'}`}>
                  {isVenta ? '-' : '+'}{m.cantidad}
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-2xl border border-slate-800/50">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-3 h-3 text-slate-600" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{m.nombreUsuario || 'SISTEMA'}</span>
                </div>
                <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase ${isVenta ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {m.type}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {movements.length === 0 && (
        <div className="p-20 text-center text-slate-600 font-black uppercase italic text-xs tracking-[0.2em]">
          Sin movimientos registrados en este turno
        </div>
      )}
    </div>
  );
}