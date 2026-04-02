'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Martini, Eye, EyeOff, AlertCircle, Lock, Mail, Loader2 } from 'lucide-react'

export function LoginForm() {
  const [email, setEmail] = useState('') // Cambiado de username a email
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false) // Estado para el feedback de carga
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!email || !password) {
      setError('Por favor completa todos los campos')
      return
    }

    setLoading(true)
    try {
      await login(email, password)
      // No hace falta redirección manual, el AuthProvider detectará 
      // el cambio de estado y mostrará el Dashboard automáticamente.
    } catch (err: any) {
      console.error(err)
      // Manejo de errores específicos de Firebase
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Credenciales incorrectas. Revisa tu email y contraseña.')
      } else if (err.code === 'auth/invalid-email') {
        setError('El formato del correo electrónico no es válido.')
      } else {
        setError('Ocurrió un error al intentar iniciar sesión.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4 font-rounded">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-amber-900/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-900/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="bg-[#0f0f0f]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 overflow-hidden">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 bg-gradient-to-tr from-amber-500 to-amber-200 rounded-xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(245,158,11,0.3)] transform rotate-3">
              <Martini className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white italic uppercase">
              Club<span className="text-amber-500 not-italic">Night</span>
            </h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Inventory Suite v2.0</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase ml-1 tracking-widest">Correo Electrónico</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-amber-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all font-bold"
                  placeholder="nombre@rol.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase ml-1 tracking-widest">Contraseña</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-amber-500 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pl-12 pr-14 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all font-bold"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-amber-500/10 uppercase italic tracking-tighter flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Acceder al Sistema'
              )}
            </button>
          </form>
          
          
        </div>
      </div>
    </div>
  )
}