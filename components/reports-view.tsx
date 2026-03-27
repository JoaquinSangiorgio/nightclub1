'use client'

import { useState } from 'react'
import { getReportDataCloud, getBottles } from '@/lib/store'
import { 
  FileText, 
  Download, 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Activity,
  Loader2
} from 'lucide-react'

const CATEGORIES_LABELS: Record<string, string> = {
  whisky: 'Whisky',
  vodka: 'Vodka',
  ron: 'Licores',
  tequila: 'Tequila',
  gin: 'Gin',
  cerveza: 'Cerveza',
  vino: 'Vino',
  champagne: 'Champagne',
  otros: 'Otros',
}

export function ReportsView() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [reportData, setReportData] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  const generateReport = async () => {
    setLoading(true)
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    
    const data = await getReportDataCloud(start, end)
    setReportData(data)
    setLoading(false)
  }

  const exportToCSV = () => {
    if (!reportData) return
    const headers = ['Producto', 'Unidades', 'Ingresos Generados']
    const rows = reportData.salesByBottle.map((b: any) => [
      b.name,
      b.quantity,
      b.revenue
    ])

    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `reporte_ventas_${startDate}_a_${endDate}.csv`
    link.click()
  }

  const maxCategoryValue = reportData 
    ? Math.max(...Object.values(reportData.salesByCategory as Record<string, number>), 1) 
    : 1

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-rounded pb-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-indigo-600/20">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Análisis de Datos</h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Inteligencia de Negocio</p>
          </div>
        </div>

        {/* FILTRO DE FECHAS */}
        <div className="bg-slate-900/50 border-2 border-slate-800 p-2 rounded-[2rem] flex flex-col sm:flex-row items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-white font-bold text-sm outline-none border-none focus:ring-0 cursor-pointer"
            />
          </div>
          <div className="h-6 w-[2px] bg-slate-800 hidden sm:block" />
          <div className="flex items-center gap-2 px-4">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-white font-bold text-sm outline-none border-none focus:ring-0 cursor-pointer"
            />
          </div>
          <button
            onClick={generateReport}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-3 rounded-[1.5rem] transition-all active:scale-95 text-xs uppercase flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sincronizar'}
          </button>
        </div>
      </div>

      {reportData ? (
        <>
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Unidades Vendidas', val: reportData.totalSales, icon: TrendingDown, color: 'text-rose-400' },
              { label: 'Nuevos Ingresos', val: reportData.totalEntries, icon: TrendingUp, color: 'text-emerald-400' },
              { label: 'Recaudación Est.', val: `$${reportData.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-indigo-400' },
              { label: 'Mov. Totales', val: reportData.movements.length, icon: Activity, color: 'text-slate-400' }
            ].map((kpi, i) => (
              <div key={i} className="bg-slate-900/40 border-2 border-slate-800 p-6 rounded-[2rem] relative overflow-hidden group">
                <kpi.icon className={`absolute -right-4 -bottom-4 w-20 h-20 opacity-5 group-hover:opacity-10 transition-opacity ${kpi.color}`} />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{kpi.label}</p>
                <h3 className={`text-3xl font-black italic tracking-tighter ${kpi.color}`}>{kpi.val}</h3>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* VENTAS POR CATEGORÍA */}
            <div className="bg-slate-900/20 border-2 border-slate-800 rounded-[2.5rem] p-8">
              <h2 className="font-black text-white uppercase italic text-lg tracking-tight mb-8">Ventas por Categoría</h2>
              <div className="space-y-6">
                {Object.entries(reportData.salesByCategory as Record<string, number>).map(([cat, qty]) => (
                  <div key={cat} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                      <span className="text-slate-400">{CATEGORIES_LABELS[cat] || cat}</span>
                      <span className="text-white">{qty} uds.</span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all duration-1000"
                        style={{ width: `${(qty / maxCategoryValue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RANKING PRODUCTOS */}
            <div className="bg-slate-900/20 border-2 border-slate-800 rounded-[2.5rem] p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-black text-white uppercase italic text-lg tracking-tight">Ranking de Ventas</h2>
                <button onClick={exportToCSV} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all text-slate-400 hover:text-white">
                  <Download className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                {reportData.salesByBottle.slice(0, 6).map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-slate-800 group hover:border-indigo-500/30 transition-all">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-black text-slate-700 italic">#{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white uppercase tracking-tight truncate w-32 md:w-48">{item.name}</p>
                        <p className="text-[10px] text-slate-600 font-bold">{item.quantity} unidades</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-emerald-400 italic leading-none">${item.revenue.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AUDITORÍA */}
          <div className="bg-slate-900/20 border-2 border-slate-800 rounded-[2.5rem] overflow-hidden">
            <div className="p-8 border-b-2 border-slate-800">
              <h2 className="font-black text-white uppercase italic text-lg tracking-tight">Auditoría de Movimientos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950/50 border-b border-slate-800">
                  <tr>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Botella</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Tipo</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Cantidad</th>
                    <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Operador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {reportData.movements.slice(0, 15).map((m: any) => {
                    const moveDate = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
                    return (
                      <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-6 text-sm text-slate-300 font-bold">{moveDate.toLocaleDateString()}</td>
                        <td className="p-6 text-sm text-white font-black uppercase tracking-tighter">{m.nombreBotella}</td>
                        <td className="p-6 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${m.type === 'Entrada' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {m.type}
                          </span>
                        </td>
                        <td className={`p-6 text-center text-lg font-black ${m.type === 'Entrada' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {m.type === 'Entrada' ? '+' : '-'}{m.cantidad}
                        </td>
                        <td className="p-6 text-sm text-slate-500 font-bold">{m.nombreUsuario}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem]">
          {loading ? (
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
          ) : (
            <>
              <BarChart3 className="w-16 h-16 text-slate-700 mb-6 opacity-20" />
              <p className="text-slate-500 font-bold uppercase tracking-[0.2em] italic">Selecciona un rango para procesar los datos</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}