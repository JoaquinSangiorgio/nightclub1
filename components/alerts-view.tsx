'use client'

import { useState, useEffect } from 'react'
import { getAlerts, markAlertAsRead, getBottles } from '@/lib/store'
import { Botella, Alerta } from '@/lib/types'
import { 
  Bell, AlertTriangle, XCircle, Check, CheckCheck, 
  Loader2, Clock, Droplets, RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

export function AlertsView({ onRefreshAlerts }: { onRefreshAlerts?: () => void }) {
  const [alerts, setAlerts] = useState<Alerta[]>([])
  const [bottles, setBottles] = useState<Botella[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('unread')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [alertsData, bottlesData] = await Promise.all([
        getAlerts(),
        getBottles()
      ])
      
      const sortedAlerts = (alertsData as Alerta[]).sort((a, b) => {
        if (a.leida !== b.leida) return a.leida ? 1 : -1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      setAlerts(sortedAlerts)
      setBottles(bottlesData as Botella[])
      if (onRefreshAlerts) onRefreshAlerts()
    } catch (error) {
      console.error("Error cargando alertas:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (alertId: string) => {
    setActionLoading(alertId)
    try {
      const success = await markAlertAsRead(alertId)
      if (success) {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, leida: true } : a))
        if (onRefreshAlerts) onRefreshAlerts()
        toast.success("Alerta archivada")
        await loadData(true)
      }
    } catch (e) {
      toast.error("Error al procesar")
    } finally {
      setActionLoading(null)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(() => loadData(true), 30000)
    return () => clearInterval(interval)
  }, [])

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'unread') return !alert.leida
    if (filter === 'read') return alert.leida
    return true
  })

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
      <Loader2 className="w-12 h-12 animate-spin text-rose-500 opacity-20" />
      <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Sincronizando Alertas...</p>
    </div>
  )

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-24 lg:pb-20 font-rounded max-w-7xl mx-auto">
      
      {/* HEADER RESPONSIVE */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 lg:gap-10 px-2 lg:px-4">
        <div className="flex items-center gap-4 lg:gap-8">
          <div className="w-16 h-16 lg:w-24 lg:h-24 bg-rose-500 rounded-2xl lg:rounded-[2.5rem] flex items-center justify-center text-white shadow-xl shrink-0 border-2 lg:border-4 border-white/10">
            <Bell className="w-8 h-8 lg:w-12 lg:h-12" />
          </div>
          <div>
            <h2 className="text-3xl lg:text-7xl font-black text-white uppercase italic tracking-tighter leading-none mb-1 lg:mb-4">Alertas</h2>
            <p className="text-[9px] lg:text-xs text-slate-500 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
              Estado crítico de barra
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4 bg-slate-900/60 p-2 rounded-[1.5rem] lg:rounded-[2.5rem] border border-slate-800 backdrop-blur-2xl overflow-x-auto no-scrollbar">
          <button 
            onClick={() => loadData()} 
            className="p-3 lg:p-5 bg-slate-800 hover:bg-white hover:text-slate-950 rounded-xl lg:rounded-3xl text-slate-300 transition-all active:rotate-180 duration-700"
          >
            <RefreshCw className="w-4 h-4 lg:w-6 lg:h-6" />
          </button>
          
          <div className="flex gap-1.5 lg:gap-2">
            {(['unread', 'read', 'all'] as const).map((t) => (
              <button 
                key={t} 
                onClick={() => setFilter(t)} 
                className={`px-4 lg:px-10 py-2.5 lg:py-5 rounded-lg lg:rounded-[1.8rem] text-[9px] lg:text-xs font-black uppercase transition-all whitespace-nowrap ${filter === t ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-800'}`}
              >
                {t === 'unread' ? `Pendientes (${alerts.filter(a => !a.leida).length})` : t === 'read' ? 'Historial' : 'Todas'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LISTA DE ALERTAS RESPONSIVA */}
      <div className="grid gap-4 lg:gap-8 px-2">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 lg:py-40 bg-slate-900/10 rounded-[3rem] lg:rounded-[5rem] border-2 lg:border-4 border-dashed border-slate-800/30">
            <CheckCheck className="w-12 h-12 lg:w-16 lg:h-16 text-emerald-500/20 mb-6" />
            <p className="text-slate-600 text-[10px] lg:text-sm font-black uppercase italic tracking-[0.3em] text-center px-6">
              Barra bajo control nominal.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const bottle = bottles.find(b => b.id === alert.botellaId);
            const stockActualBot = (bottle && bottle.mlPorUnidad > 0) 
              ? (Number(bottle.stockMl || 0) / Number(bottle.mlPorUnidad)).toFixed(1) 
              : '?';

            const isOut = alert.tipo === 'out_of_stock';

            return (
              <div 
                key={alert.id} 
                className={`group p-6 lg:p-12 rounded-[2.5rem] lg:rounded-[4rem] border-2 lg:border-4 transition-all duration-500 flex flex-col lg:flex-row justify-between items-center gap-6 lg:gap-10 ${
                  alert.leida 
                  ? 'border-slate-800 bg-transparent opacity-30 grayscale scale-[0.98]' 
                  : isOut 
                    ? 'border-rose-500 bg-rose-500/[0.04] shadow-xl' 
                    : 'border-orange-500 bg-orange-500/[0.04] shadow-xl'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center gap-6 lg:gap-10 w-full">
                  <div className={`w-16 h-16 lg:w-28 lg:h-28 rounded-2xl lg:rounded-[2.5rem] shrink-0 flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105 ${alert.leida ? 'bg-slate-800 text-slate-600' : isOut ? 'bg-rose-500 text-white' : 'bg-orange-500 text-white'}`}>
                    {isOut ? <XCircle className="w-8 h-8 lg:w-14 lg:h-14" /> : <AlertTriangle className="w-8 h-8 lg:w-14 lg:h-14" />}
                  </div>
                  
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 lg:gap-6">
                       <h4 className="text-xl lg:text-5xl font-black text-white uppercase italic leading-none tracking-tighter truncate max-w-full">
                         {alert.nombreBotella}
                       </h4>
                       {!alert.leida && (
                         <span className={`text-[8px] lg:text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${isOut ? 'bg-rose-600' : 'bg-orange-600'} text-white shadow-lg`}>
                           {isOut ? 'SIN STOCK' : 'BAJO'}
                         </span>
                       )}
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 lg:gap-8 mt-4 lg:mt-8">
                      <div className="flex items-center gap-2 lg:gap-4 bg-slate-950 px-4 lg:px-8 py-2 lg:py-4 rounded-xl lg:rounded-[1.5rem] border border-slate-800 shadow-inner">
                        <Droplets className={`w-4 h-4 lg:w-6 lg:h-6 ${isOut ? 'text-rose-500' : 'text-orange-400'}`} />
                        <span className="text-sm lg:text-2xl text-white font-black italic">{stockActualBot} <span className="text-slate-600 text-[8px] lg:text-xs not-italic font-bold ml-1 uppercase">Unid.</span></span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-slate-500 font-bold uppercase text-[8px] lg:text-xs tracking-widest">
                        <Clock className="w-3 h-3 lg:w-5 lg:h-5" />
                        {new Date(alert.createdAt).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>

                {!alert.leida && (
                  <button
                    onClick={() => handleMarkAsRead(alert.id)}
                    disabled={actionLoading === alert.id}
                    className="w-full lg:w-auto flex items-center justify-center gap-4 bg-white text-slate-950 hover:bg-emerald-500 hover:text-white p-5 lg:p-8 lg:px-16 rounded-2xl lg:rounded-[2.8rem] font-black uppercase italic transition-all active:scale-95 disabled:opacity-50 shadow-2xl"
                  >
                    {actionLoading === alert.id ? (
                      <Loader2 className="w-5 h-5 lg:w-8 lg:h-8 animate-spin" />
                    ) : (
                      <>
                        <span className="text-xs lg:text-lg">Archivar</span>
                        <CheckCheck className="w-5 h-5 lg:w-8 lg:h-8" />
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
      <style jsx>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  )
}