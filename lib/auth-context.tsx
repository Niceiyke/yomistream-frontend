"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { API_BASE_URL } from '@/lib/api'
import { invalidateAuthCache, getAccessTokenCached } from '@/lib/auth-cache'

interface AuthContextType {
  user: any | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const checkUser = async () => {
    try {
      const token = await getAccessTokenCached()
      if (!token) {
        setUser(null)
        return
      }
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!res.ok) {
        setUser(null)
        return
      }
      const data = await res.json()
      setUser(data)
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('token_type')
          localStorage.removeItem('verification_token')
        }
      } catch {}
      invalidateAuthCache()
      setUser(null)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('wordlyte-auth-changed'))
      }
    } catch (error) {
    }
  }

  const refreshUser = async () => {
    setLoading(true)
    await checkUser()
  }

  useEffect(() => {
    checkUser()
    const handle = () => refreshUser()
    if (typeof window !== 'undefined') {
      window.addEventListener('wordlyte-auth-changed', handle)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('wordlyte-auth-changed', handle)
      }
    }
  }, [])

  const value: AuthContextType = {
    user,
    loading,
    signOut,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

