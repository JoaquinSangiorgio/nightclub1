'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { auth, db } from './firebase'
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  User as FirebaseUser 
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
    // Escucha cambios en la sesión (Login/Logout/Refresh)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 1. El usuario está autenticado, buscamos sus datos extras (Rol, Nombre) en Firestore
        const userDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid))
        
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setUser({
            id: firebaseUser.uid,
            username: firebaseUser.email || '',
            role: userData.role || 'employee',
            name: userData.name || 'Usuario'
          })
        } else {
          // Si no tiene documento en Firestore, le damos un perfil básico
          setUser({
            id: firebaseUser.uid,
            username: firebaseUser.email || '',
            role: 'employee',
            name: 'Nuevo Usuario'
          })
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