'use client'

import { useState, useEffect } from 'react'
import { getReportDataCloud, getAlerts, markAlertAsRead } from '@/lib/store'
import { 
  FileText, Download, Calendar, TrendingUp, TrendingDown,
  DollarSign, BarChart3, Activity, Loader2, List, Layers,
  Clock, ArrowUpRight, Wallet, ShoppingCart, Wine, User, 
  Bell, AlertTriangle, XCircle, Check, CheckCheck
} from 'lucide-react'

const CATEGORIES_LABELS: Record<string, string> = {
  whisky: 'Whisky', vodka: 'Vodka', ron: 'Licores', tequila: 'Tequila',
  gin: 'Gin', cerveza: 'Cerveza', vino: 'Vino', champagne: 'Champagne',
  otros: 'Otros', Gaseosa: 'Gaseosa', Combo: 'Combo', Licores: 'Licores'
}

// --- COMPONENTE PRINCIPAL DE REPORTES ---
export function ReportsView() {
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [reportData, setReportData] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [isGrouped, setIsGrouped] = useState(true)

  const generateReport = async () => {
    setLoading(true)
    try {
      const start = new Date(startDate + 'T00:00:00')
      const end = new Date(endDate + 'T23:59:59')
      const data = await getReportDataCloud(start, end)
      setReportData(data)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { generateReport() }, [])

  const getProcessedMovements = () => {
    if (!reportData) return []
    if (!isGrouped) return reportData.movements

    const grouped = reportData.movements.reduce((acc: any, curr: any) => {
      const date = curr.createdAt?.toDate ? curr.createdAt.toDate() : new Date(curr.createdAt);
      const timeKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
      const sessionKey = `${curr.descripcion || curr.notas}-${curr.nombreUsuario}-${timeKey}-${curr.type}`;
      const key = `${curr.botellaID}-${sessionKey}`;

      if (!acc[key]) {
        acc[key] = { 
          ...curr, 
          totalQty: 0, 
          count: 0,
          displayDate: date,
          isComboDisplay: curr.descripcion?.startsWith('Combo:') || curr.notas?.startsWith('Combo:')
        }
      }

      acc[key].totalQty += curr.cantidad 
      acc[key].count += 1
      return acc
    }, {})

    return Object.values(grouped).sort((a: any, b: any) => b.displayDate - a.displayDate)
  }

  const maxCategoryValue = reportData?.salesByCategory 
    ? Math.max(...Object.values(reportData.salesByCategory as Record<string, number>), 1) 
    : 1

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-rounded pb-10">
      {/* Header y Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-[1.8rem] flex items-center justify-center shadow-2xl shadow-indigo-600/40">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Reportes</h1>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Auditoría de Sesión</p>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border-2 border-slate-800 p-2 rounded-[2.2rem] flex items-center gap-2 shadow-xl">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-white font-black text-xs px-4 outline-none cursor-pointer" />
          <div className="h-6 w-[2px] bg-slate-800" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-white font-black text-xs px-4 outline-none cursor-pointer" />
          <button onClick={generateReport} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-8 py-3 rounded-[1.6rem] text-[10px] uppercase transition-all shadow-lg">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sincronizar'}
          </button>
        </div>
      </div>

      {reportData ? (
        <>
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Recaudación Est.', val: `$${reportData.totalRevenue.toLocaleString()}`, icon: Wallet, color: 'text-indigo-400' },
              { label: 'Ventas Totales', val: reportData.totalSales, icon: ShoppingCart, color: 'text-rose-400' },
              { label: 'Ingresos Stock', val: reportData.totalEntries, icon: TrendingUp, color: 'text-emerald-400' },
              { label: 'Movimientos', val: reportData.movements.length, icon: Activity, color: 'text-slate-500' }
            ].map((kpi, i) => (
              <div key={i} className="bg-[#0f172a]/40 border-2 border-slate-800/50 p-6 rounded-[2rem] relative overflow-hidden group shadow-lg">
                <kpi.icon className={`absolute -right-4 -bottom-4 w-20 h-20 opacity-5 ${kpi.color}`} />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{kpi.label}</p>
                <h3 className={`text-3xl font-black italic tracking-tighter ${kpi.color}`}>{kpi.val}</h3>
              </div>
            ))}
          </div>

          {/* TABLA DE AUDITORÍA CONSOLIDADA */}
          <div className="bg-[#0f172a]/40 border-2 border-slate-800/50 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-8 border-b-2 border-slate-800 flex justify-between items-center bg-slate-900/20">
              <h2 className="font-black text-white uppercase italic text-lg tracking-tight">Auditoría por Cierre</h2>
              <button 
                onClick={() => setIsGrouped(!isGrouped)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${isGrouped ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
              >
                <List className="w-4 h-4" />
                {isGrouped ? 'Cierres Agrupados' : 'Lista Individual'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950/50 border-b border-slate-800 text-slate-500 font-black text-[10px] uppercase">
                  <tr>
                    <th className="p-6">Fecha / Hora</th>
                    <th className="p-6">Producto</th>
                    <th className="p-6 text-center">Frecuencia</th>
                    <th className="p-6">Operador</th>
                    <th className="p-6 text-center">Cant. Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {getProcessedMovements().map((m: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-6">
                        <p className="text-white font-bold text-xs">{m.displayDate.toLocaleDateString()}</p>
                        <p className="text-[10px] text-slate-600 font-black uppercase">{m.displayDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} HS</p>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          {m.isComboDisplay ? <Layers className="w-4 h-4 text-purple-400" /> : <Wine className="w-4 h-4 text-slate-500" />}
                          <p className="text-sm text-white font-black uppercase italic">{m.nombreBotella}</p>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <span className="text-[9px] font-black bg-slate-900 px-3 py-1 rounded-full text-slate-500 border border-slate-800">
                          {isGrouped ? `${m.count} CLICKS` : '1 CLICK'}
                        </span>
                      </td>
                      <td className="p-6 text-xs font-bold text-indigo-400 uppercase italic">
                        {m.nombreUsuario || 'Admin'}
                      </td>
                      <td className={`p-6 text-center text-2xl font-black italic ${m.type === 'Entrada' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {m.type === 'Entrada' ? '+' : '-'}{isGrouped ? m.totalQty : m.cantidad}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="py-40 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-slate-800 animate-spin" />
        </div>
      )}
    </div>
  )
}

// --- EXPORT ADICIONAL PARA EVITAR ERRORES EN EL DASHBOARD ---
export function AlertsView({ onRefreshAlerts }: { onRefreshAlerts?: () => void }) {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('unread')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadAlerts = async () => {
    setLoading(true)
    const data = await getAlerts()
    setAlerts(data)
    setLoading(false)
    if (onRefreshAlerts) onRefreshAlerts() 
  }

  const handleMarkAsRead = async (alertId: string) => {
    setActionLoading(alertId)
    const success = await markAlertAsRead(alertId)
    if (success) {
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, isRead: true } : a))
      if (onRefreshAlerts) onRefreshAlerts()
    }
    setActionLoading(null)
  }

  useEffect(() => { loadAlerts() }, [])

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'unread') return !alert.isRead
    if (filter === 'read') return alert.isRead
    return true
  })

  if (loading) return (
    <div className="h-60 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
      <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Escaneando Inventario...</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* HEADER RESPONSIVE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-500/20 rounded-[1.2rem] flex items-center justify-center text-rose-500 shadow-lg shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter leading-none">Alertas</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Notificaciones Críticas</p>
          </div>
        </div>

        {/* SELECTOR DE FILTROS - Scroll horizontal en móviles si es necesario */}
        <div className="flex gap-1.5 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 shadow-xl self-start sm:self-auto overflow-x-auto no-scrollbar">
          {['unread', 'read', 'all'].map((t) => (
            <button 
              key={t} 
              onClick={() => setFilter(t as any)} 
              className={`px-4 sm:px-6 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase transition-all whitespace-nowrap ${filter === t ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {t === 'unread' ? 'Pendientes' : t === 'read' ? 'Leídas' : 'Todas'}
            </button>
          ))}
        </div>
      </div>

      {/* GRID DE ALERTAS */}
      <div className="grid gap-4 px-1">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-800/50">
            <CheckCheck className="w-12 h-12 text-slate-800 mb-4" />
            <p className="text-slate-600 text-[10px] font-black uppercase italic tracking-widest text-center px-10">
              No hay alertas pendientes
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`group p-4 sm:p-6 rounded-[2rem] border-2 transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                alert.isRead 
                ? 'border-slate-800/40 bg-transparent opacity-60' 
                : alert.type === 'out_of_stock' 
                  ? 'border-rose-500/40 bg-rose-500/[0.03]' 
                  : 'border-orange-500/40 bg-orange-500/[0.03]'
              }`}
            >
              <div className="flex items-center gap-4 w-full">
                <div className={`p-3 sm:p-4 rounded-2xl shrink-0 ${alert.isRead ? 'bg-slate-800/50 text-slate-600' : alert.type === 'out_of_stock' ? 'bg-rose-500/20 text-rose-500' : 'bg-orange-500/20 text-orange-500'}`}>
                  {alert.type === 'out_of_stock' ? <XCircle className="w-5 h-5 sm:w-6 sm:h-6" /> : <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-white font-black text-base sm:text-lg uppercase italic leading-none tracking-tight truncate">{alert.nombreBotella}</h4>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${alert.isRead ? 'bg-slate-800 text-slate-500' : 'bg-white/10 text-white'}`}>
                      {alert.type === 'out_of_stock' ? 'Sin Stock' : 'Stock Bajo'}
                    </span>
                    <span className="text-[8px] text-slate-600 font-bold uppercase italic flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {alert.createdAt?.toDate ? alert.createdAt.toDate().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACCIÓN RESPONSIVE */}
              {!alert.isRead && (
                <button
                  onClick={() => handleMarkAsRead(alert.id)}
                  disabled={actionLoading === alert.id}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-emerald-600 border border-slate-800 hover:border-emerald-500 p-4 sm:px-6 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-95 group/btn"
                >
                  {actionLoading === alert.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span className="text-[10px] font-black uppercase">Marcar Visto</span>
                      <Check className="w-4 h-4 group-hover/btn:scale-125 transition-transform" />
                    </>
                  )}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}