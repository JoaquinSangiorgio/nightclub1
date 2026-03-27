'use client'

import { useAuth } from '@/lib/auth-context'
import { 
  Wine, 
  LayoutDashboard, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Bell, 
  FileText, 
  LogOut,
  Menu,
  X,
  User,
  Zap,
  Truck
} from 'lucide-react'
import { useState } from 'react'

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  alertCount: number
}

// Menú para Propietario: Acceso total
const ownerMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventario', icon: Package },
  { id: 'entrada', label: 'Entradas', icon: Truck }, 
  { id: 'venta', label: 'Ventas', icon: Zap },       
  { id: 'alerts', label: 'Alertas', icon: Bell },
  { id: 'reports', label: 'Reportes', icon: FileText },
]

// Menú para Staff: Enfocado en la operación
const employeeMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'entrada', label: 'Entradas', icon: Truck },
  { id: 'venta', label: 'Ventas', icon: Zap },
  { id: 'alerts', label: 'Alertas', icon: Bell },
]

export function Sidebar({ activeSection, onSectionChange, alertCount }: SidebarProps) {
  const { user, logout } = useAuth()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const menuItems = user?.role === 'owner' ? ownerMenuItems : employeeMenuItems

  const handleSectionChange = (section: string) => {
    onSectionChange(section)
    setIsMobileOpen(false)
  }

  return (
    <>
      {/* Botón Mobile flotante */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/30 active:scale-90 transition-transform"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay con desenfoque */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 animate-in fade-in duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50
        transform transition-all duration-300 ease-out
        ${isMobileOpen ? 'translate-x-0 shadow-2xl shadow-black' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full p-6 font-rounded">
          
          {/* Logo Section */}
          <div className="mb-10 relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Wine className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight leading-none">NightClub</h1>
                <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase mt-1">Manager</p>
              </div>
            </div>
            
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-2 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* User Profile Card */}
          <div className="mb-8 p-4 bg-slate-800/40 border border-slate-700/30 rounded-[1.8rem] flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20">
              <User className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-100 truncate">{user?.name}</p>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${user?.role === 'owner' ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  {user?.role === 'owner' ? 'Propietario' : 'Personal'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
            <p className="px-4 mb-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.25em]">Menú Principal</p>
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              const showBadge = item.id === 'alerts' && alertCount > 0

              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionChange(item.id)}
                  className={`
                    w-full flex items-center gap-4 px-4 py-3.5 rounded-[1.25rem] text-left transition-all group
                    ${isActive 
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 transition-all group-hover:scale-110 group-active:scale-90 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className={`flex-1 text-[15px] ${isActive ? 'font-bold' : 'font-semibold'}`}>
                    {item.label}
                  </span>
                  {showBadge && (
                    <span className={`
                      px-2.5 py-1 text-[11px] font-black rounded-lg
                      ${isActive ? 'bg-white/20 text-white' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse'}
                    `}>
                      {alertCount}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Logout Section */}
          <div className="mt-auto pt-6 border-t border-slate-800/50">
            <button
              onClick={logout}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-[1.25rem] text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all font-bold group"
            >
              <div className="p-2 rounded-lg bg-slate-800/50 group-hover:bg-rose-500/20 transition-colors">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="text-sm">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}