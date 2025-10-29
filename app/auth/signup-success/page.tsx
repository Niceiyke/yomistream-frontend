"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function SignUpSuccessPage() {
  const { user } = useAuth()
  const router = useRouter()

  // If user is already authenticated (e.g., after email verification), redirect to stored URL
  useEffect(() => {
    if (user) {
      const redirectUrl = localStorage.getItem('redirectAfterAuth') || '/'
      localStorage.removeItem('redirectAfterAuth')
      router.push(redirectUrl)
    }
  }, [user, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Card className="bg-card border-border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">Check Your Email</CardTitle>
            <CardDescription className="text-muted-foreground">We&apos;ve sent you a confirmation link</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-6">
              Please check your email and click the confirmation link to activate your account.
            </p>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/">Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
