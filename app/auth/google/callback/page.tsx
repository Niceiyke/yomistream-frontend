"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiPost } from "@/lib/api"

export default function GoogleCallbackPage() {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract code and state from URL
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const state = urlParams.get('state')

        if (!code) {
          throw new Error('No authorization code received from Google')
        }

        // Call backend to complete OAuth flow
        const data = await apiPost("/api/v1/auth/google/callback", { code, state })

        if (!data?.access_token) {
          throw new Error("Invalid OAuth response")
        }

        // Store tokens
        try {
          localStorage.setItem("access_token", data.access_token)
          if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token)
          if (data.token_type) localStorage.setItem("token_type", data.token_type)
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("wordlyte-auth-changed"))
          }
        } catch {}

        // Redirect to home page
        router.push("/")
      } catch (error: unknown) {
        console.error("Google OAuth callback error:", error)
        setError(error instanceof Error ? error.message : "Authentication failed")
        // Redirect to login page after a delay
        setTimeout(() => {
          router.push("/auth/login")
        }, 3000)
      }
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="text-destructive text-xl mb-4">Authentication Failed</div>
          <div className="text-muted-foreground mb-4">{error}</div>
          <div className="text-sm text-muted-foreground">Redirecting to login page...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="text-foreground text-xl mb-4">Completing sign in...</div>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  )
}
