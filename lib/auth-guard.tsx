"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      const isAuthPage = pathname.startsWith('/auth')
      if (!isAuthPage && !user) {
        router.push('/auth/login')
      }
    }
  }, [loading, user, pathname, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-foreground text-xl mb-4">Loading...</div>
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  const isAuthPage = pathname.startsWith('/auth')
  if (!isAuthPage && !user) {
    // This will be handled by the useEffect redirect, but return null to prevent flash
    return null
  }

  return <>{children}</>
}
