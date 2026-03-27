'use client'

import { useEffect, useState } from 'react'
import { getAlerts, markAlertAsRead } from '@/lib/store'
import { Alerta } from '@/lib/types' // Importamos el tipo en español
import { 
  Bell, 
  AlertTriangle, 
  XCircle, 
  Check, 
  CheckCheck,
  Clock,
  Loader2
} from 'lucide-react'

interface AlertsViewProps {
  onRefreshAlerts: () => void
}

export function AlertsView({ onRefreshAlerts }: AlertsViewProps) {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('unread')

  const loadAlerts = async () => {
    const data = await getAlerts()
    setAlerts(data)
    setLoading(false)
    onRefreshAlerts() // Actualiza el contador del sidebar
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'unread') return !alert.isRead
    if (filter === 'read') return alert.isRead
    return true
  })

  const unreadCount = alerts.filter((a) => !a.isRead).length

  const handleMarkAsRead = async (alertId: string) => {
    await markAlertAsRead(alertId)
    await loadAlerts()
  }

  // Función para formatear fechas de Firebase (Timestamps)
  const formatDate = (createdAt: any) => {
    if (!createdAt) return '---'
    
    // Si es un Timestamp de Firebase, tiene el método toDate()
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHours < 24) return `Hace ${diffHours}h`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Cargando notificaciones...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-rounded">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-rose-500/20 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/10">
            <Bell className="w-7 h-7 text-rose-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Alertas</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
              {unreadCount > 0 ? `${unreadCount} pendientes de revisión` : 'Todo en orden en la cava'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Estilizadas */}
      <div className="flex gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-fit">
        {[
          { id: 'unread', label: 'Sin leer' },
          { id: 'read', label: 'Historial' },
          { id: 'all', label: 'Todas' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as typeof filter)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${
              filter === tab.id
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[2.5rem] p-20 text-center">
            <CheckCheck className="w-12 h-12 mx-auto mb-4 text-slate-800" />
            <p className="text-slate-600 font-bold italic uppercase text-sm tracking-widest">
              No hay alertas para mostrar
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`
                relative overflow-hidden bg-slate-900/40 border-2 rounded-[2rem] p-6 transition-all group
                ${alert.isRead 
                  ? 'border-slate-800 opacity-50' 
                  : alert.type === 'out_of_stock'
                    ? 'border-rose-500/50 bg-rose-500/5 shadow-lg shadow-rose-500/5'
                    : 'border-orange-500/50 bg-orange-500/5 shadow-lg shadow-orange-500/5'
                }
              `}
            >
              <div className="flex items-start gap-5">
                <div className={`
                  w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border-2
                  ${alert.type === 'out_of_stock' 
                    ? 'bg-rose-500/20 border-rose-500/30 text-rose-500' 
                    : 'bg-orange-500/20 border-orange-500/30 text-orange-500'
                  }
                `}>
                  {alert.type === 'out_of_stock' ? (
                    <XCircle className="w-6 h-6" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={`font-black uppercase italic tracking-tight text-lg ${alert.isRead ? 'text-slate-400' : 'text-white'}`}>
                        {alert.type === 'out_of_stock' ? 'Sin Stock' : 'Stock Crítico'}
                      </h3>
                      <p className="text-slate-300 font-bold text-sm uppercase mt-1">{alert.nombreBotella}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mt-2 tracking-widest">
                        ID: {alert.botellaID}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-full">
                        <Clock className="w-3 h-3 text-rose-500" />
                        {formatDate(alert.createdAt)}
                      </span>
                      
                      {!alert.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(alert.id)}
                          className="p-3 bg-white text-slate-950 hover:bg-rose-500 hover:text-white rounded-xl transition-all active:scale-90 shadow-xl"
                          title="Marcar como revisada"
                        >
                          <Check className="w-5 h-5 stroke-[3px]" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}