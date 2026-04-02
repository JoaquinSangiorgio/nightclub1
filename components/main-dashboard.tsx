'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './sidebar'
import { DashboardView } from './dashboard-view'
import { InventoryView } from './inventory-view'
import EntranteView from './entrante-view' 
import { VentaView } from './venta-view'
import { AlertsView } from './alerts-view'
import { ReportsView } from './reports-view'
import { getAlerts } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'

export function MainDashboard() {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [alertCount, setAlertCount] = useState(0)
  const { user } = useAuth()

  // 1. Convertimos refreshAlerts en ASYNC
 const refreshAlerts = async () => {
  try {
    const alerts = await getAlerts()
    // Agregamos una validación para evitar errores si 'a' es null o no tiene la propiedad
    const unread = alerts.filter((a: any) => a && a.isRead === false)
    setAlertCount(unread.length)
  } catch (error) {
    console.error("Error al refrescar alertas:", error)
  }
}

  useEffect(() => {
    // 2. Llamamos a la función asíncrona
    refreshAlerts()
    
    // Intervalo de 30 segundos (5 es muy poco para Firebase/cuota gratuita)
    const interval = setInterval(refreshAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return user?.role === 'owner' ? <DashboardView onNavigate={setActiveSection} /> : <InventoryView />
      case 'inventory':
        return <InventoryView /> 
      case 'entrada':
        return <EntranteView />
      case 'venta':
        return <VentaView />
      case 'alerts':
        return <AlertsView onRefreshAlerts={refreshAlerts} />
      case 'reports':
        return user?.role === 'owner' ? <ReportsView /> : <DashboardView onNavigate={setActiveSection} />
      default:
        return <DashboardView onNavigate={setActiveSection} />
    }
  }

  return (
    <div className="h-screen w-full bg-[#0f172a] flex text-slate-200 selection:bg-indigo-500/30 overflow-hidden">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        alertCount={alertCount}
      />

      <main className="flex-1 min-h-0 relative flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex-1 overflow-y-auto custom-scrollbar relative p-6 lg:p-12">
          <div className="max-w-[1600px] mx-auto min-h-full">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              {renderContent()}
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap');
        
        html, body {
          margin: 0;
          padding: 0;
          overflow: hidden !important;
          background-color: #0f172a;
          font-family: 'Quicksand', sans-serif !important;
        }

        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 20px;
          border: 2px solid #0f172a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  )
}