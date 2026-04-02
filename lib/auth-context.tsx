'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { auth, db } from './firebase'
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { Usuario } from './types' 

interface AuthContextType {
  user: Usuario | null
  login: (email: string, pass: string) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true)
      if (firebaseUser) {
        try {
          // Buscamos el documento del usuario en la colección 'usuarios'
          const userDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid))
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            
            setUser({
              id: firebaseUser.uid,
              username: firebaseUser.email || '',
              role: userData.role || 'employee',
              // Priorizamos 'nombre', luego 'name', y sino usamos el email como fallback
              name: userData.nombre || userData.name || firebaseUser.email?.split('@')[0] || 'Usuario'
            })
          } else {
            // Fallback si el usuario está en Auth pero no tiene documento en Firestore
            setUser({
              id: firebaseUser.uid,
              username: firebaseUser.email || '',
              role: 'employee',
              name: firebaseUser.email?.split('@')[0] || 'Invitado'
            })
          }
        } catch (error) {
          console.error("Error al obtener perfil de usuario:", error)
        }
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass)
  }

  const logout = async () => {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}