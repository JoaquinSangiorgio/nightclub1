'use client'

import { useEffect, useState } from 'react'
import { getDashboardStats, getBottles, getAlerts, getMovements } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { 
  Package, 
  DollarSign, 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  Wine,
  Zap,
  Truck,
  Activity,
  Loader2
} from 'lucide-react'

interface DashboardViewProps {
  onNavigate: (section: string) => void
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { user } = useAuth()
  const [stats, setStats] = useState<any | null>(null)
  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  const [recentAlerts, setRecentAlerts] = useState<any[]>([])
  const [ownerMetrics, setOwnerMetrics] = useState({ revenue: 0, efficiency: 0 })
  const [loading, setLoading] = useState(true)

  const isOwner = user?.role === 'owner'

  useEffect(() => {
    const loadData = async () => {
      try {
        const [currentStats, bottles, alerts] = await Promise.all([
          getDashboardStats(),
          getBottles(),
          getAlerts()
        ])
        
        setStats(currentStats)
        setLowStockItems(bottles.filter((b: any) => !b.isCombo && b.stock <= (b.stockMin || 5)).slice(0, 5))
        setRecentAlerts(alerts.filter((a: any) => !a.isRead).slice(0, 5))

        if (isOwner) {
          const movements = await getMovements()
          const today = new Date().toISOString().split('T')[0]
          
          const revenue = movements
            .filter((m: any) => {
              // Corrección para TypeScript: comprobamos si es un Timestamp de Firebase
              const dateObj = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt)
              const moveDate = dateObj.toISOString().split('T')[0]
              return m.type === 'Venta' && moveDate === today
            })
            .reduce((total: number, m: any) => {
              const b = bottles.find((bottle: any) => bottle.id === m.botellaID)
              // Usamos Number() para asegurar que no sume strings
              const precio = Number(b?.precio || 0)
              const cant = Number(m.cantidad || 0)
              return total + (cant * precio)
            }, 0)

          const totalSoldToday = currentStats.ventasHoy || 0
          const totalStock = currentStats.totalBotellas || 0
          const efficiency = (totalSoldToday / (totalSoldToday + totalStock)) * 100
          
          setOwnerMetrics({ revenue, efficiency: isNaN(efficiency) ? 0 : efficiency })
        }
      } catch (error) {
        console.error("Error cargando Dashboard:", error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [isOwner])

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Sincronizando Centro de Mando...</p>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-10 animate-in fade-in duration-700 font-rounded pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase flex items-center gap-3">
            <Activity className="text-indigo-500 w-8 h-8" />
            Centro de Mando
          </h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">
            {isOwner ? 'Panel de Administración Global' : `Monitor de Turno: ${user?.name}`}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button onClick={() => onNavigate('venta')} className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-rose-600/20 active:scale-95">
            <Zap className="w-4 h-4 fill-current" /> VENTAS
          </button>
          <button onClick={() => onNavigate('entrada')} className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl transition-all active:scale-95">
            <Truck className="w-4 h-4" /> ENTRADAS
          </button>
        </div>
      </div>

      {/* MÉTRICAS DUEÑO */}
      {isOwner && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-1000">
          <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-600/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <DollarSign className="w-32 h-32 text-white" />
            </div>
            <p className="text-indigo-100 font-black uppercase text-[10px] tracking-widest mb-1">Recaudación (Hoy)</p>
            <h2 className="text-6xl font-black text-white italic tracking-tighter">
              ${ownerMetrics.revenue.toLocaleString()}
            </h2>
          </div>

          <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden">
             <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-1">Eficiencia de Movimiento</p>
             <h2 className="text-6xl font-black text-white italic tracking-tighter">
              {ownerMetrics.efficiency.toFixed(1)}%
             </h2>
          </div>
        </div>
      )}

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Botellas en Cava', val: stats.totalBotellas, icon: Package, color: 'text-indigo-400' },
          { label: 'Valorización', val: `$${stats.valorTotal.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400' },
          { label: 'Alertas Stock', val: stats.conteoStockBajo, icon: AlertTriangle, color: 'text-orange-400' },
          { label: 'Agotados', val: stats.conteoSinStock, icon: XCircle, color: 'text-rose-400' },
        ].map((s, i) => (
          <div key={i} className="bg-slate-900/40 border-2 border-slate-800 p-6 rounded-[2rem] hover:border-slate-700 transition-all group">
            <s.icon className={`w-6 h-6 ${s.color} mb-4`} />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
            <p className="text-3xl font-black text-white mt-1 tracking-tighter italic">{s.val}</p>
          </div>
        ))}
      </div>

      {/* LISTAS INFERIORES */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-slate-900/20 border-2 border-slate-800 rounded-[2.5rem] p-8">
          <h3 className="font-black text-white uppercase italic text-lg tracking-tight mb-8">Reposición Urgente</h3>
          <div className="space-y-3">
            {lowStockItems.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <Wine className="w-5 h-5 text-orange-400" />
                  <div>
                    <p className="font-bold text-white text-sm uppercase">{item.nombre}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{item.marca}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-orange-500 text-lg leading-none">{item.stock}</p>
                  <p className="text-[9px] font-bold text-slate-600 uppercase">Quedan</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/20 border-2 border-slate-800 rounded-[2.5rem] p-8">
          <h3 className="font-black text-white uppercase italic text-lg tracking-tight mb-8">Notificaciones</h3>
          <div className="space-y-3">
            {recentAlerts.map(alert => (
              <div key={alert.id} className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                <div className={`w-1.5 h-10 rounded-full ${alert.type === 'out_of_stock' ? 'bg-rose-500' : 'bg-orange-500'}`} />
                <div className="flex-1">
                  <p className="font-black text-white text-[11px] uppercase tracking-tight truncate">{alert.nombreBotella}</p>
                  <p className={`text-[9px] font-bold uppercase ${alert.type === 'out_of_stock' ? 'text-rose-500' : 'text-orange-500'}`}>
                    {alert.type === 'out_of_stock' ? 'Crítico: Sin stock' : `Stock bajo`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}