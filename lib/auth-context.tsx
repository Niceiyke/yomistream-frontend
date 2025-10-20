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

  const refreshAccessToken = async (): Promise<string | null> => {
    try {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null
      if (!refreshToken) return null

      const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (!res.ok) return null

      const data = await res.json()
      if (data.access_token) {
        // Store the new tokens
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', data.access_token)
          if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token)
          if (data.token_type) localStorage.setItem('token_type', data.token_type)
        }
        // Invalidate cache to force refresh
        invalidateAuthCache()
        return data.access_token
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
    }
    return null
  }

  const checkUser = async () => {
    try {
      let token = await getAccessTokenCached()
      if (!token) {
        setUser(null)
        return
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })

      if (res.ok) {
        const data = await res.json()
        setUser(data)
        return
      }

      // If 401/403, try refreshing token
      if (res.status === 401 || res.status === 403) {
        const newToken = await refreshAccessToken()
        if (newToken) {
          // Retry with new token
          const retryRes = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${newToken}` },
            cache: 'no-store',
          })
          if (retryRes.ok) {
            const data = await retryRes.json()
            setUser(data)
            return
          }
        }
      }

      setUser(null)
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

