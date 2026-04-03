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

  // CORRECCIÓN DEFINITIVA DEL CONTADOR
  const refreshAlerts = async () => {
    try {
      const alerts = await getAlerts()
      // Filtramos por el campo CORRECTO: 'leida'
      const unread = alerts.filter((a: any) => a && a.leida === false)
      setAlertCount(unread.length)
    } catch (error) {
      console.error("Error al refrescar alertas:", error)
    }
  }

  useEffect(() => {
    refreshAlerts()
    const interval = setInterval(refreshAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardView onNavigate={setActiveSection} />
      case 'inventory':
        return <InventoryView /> 
      case 'entrada':
        return <EntranteView />
      case 'venta':
        return <VentaView />
      case 'alerts':
        return <AlertsView onRefreshAlerts={refreshAlerts} />
      case 'reports':
        // Ahora permitimos que todos entren a 'reports', 
        // ReportsView adentro se encarga de mostrar solo el arqueo si no es owner
        return <ReportsView />
      default:
        return <DashboardView onNavigate={setActiveSection} />
    }
  }

  return (
    <div className="h-screen w-full bg-[#0f172a] flex text-slate-200 selection:bg-indigo-500/30 overflow-hidden font-rounded">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        alertCount={alertCount}
      />

      <main className="flex-1 min-h-0 relative flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex-1 overflow-y-auto custom-scrollbar relative p-4 lg:p-10">
          <div className="max-w-[1600px] mx-auto min-h-full">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              {renderContent()}
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap');
        
        :root {
          --font-quicksand: 'Quicksand', sans-serif;
        }

        html, body {
          margin: 0;
          padding: 0;
          overflow: hidden !important;
          background-color: #0f172a;
          font-family: var(--font-quicksand) !important;
        }

        .font-rounded {
          font-family: var(--font-quicksand) !important;
        }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  )
}