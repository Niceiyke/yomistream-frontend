"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { BookOpen, Mail, User, Calendar, Shield } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import Link from "next/link"

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="text-foreground text-xl mb-4">Loading...</div>
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">
              Manage your account information and preferences
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Profile Overview */}
            <div className="md:col-span-1">
              <Card>
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.email} />
                      <AvatarFallback className="text-2xl">
                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <CardTitle className="text-xl">
                    {user.full_name || 'User'}
                  </CardTitle>
                  <CardDescription>
                    {user.email}
                  </CardDescription>
                  <div className="flex justify-center gap-2 mt-3">
                    {user.is_verified && (
                      <Badge variant="secondary" className="text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    {user.auth_provider && user.auth_provider !== 'local' && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {user.auth_provider}
                      </Badge>
                    )}
                    {user.user_type !== 'user' && (
                      <Badge variant="default" className="text-xs capitalize">
                        {user.user_type}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
              </Card>
            </div>

            {/* Profile Details */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    Your account details and settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={user.email}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed. Contact support if needed.
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        value={user.full_name || ''}
                        disabled={!isEditing}
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Account Created
                      </Label>
                      <Input
                        value={user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Account Status */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Account Status</h3>

                    <div className="grid gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Email Verified</span>
                        <Badge variant={user.is_verified ? "default" : "secondary"}>
                          {user.is_verified ? "Verified" : "Unverified"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm">Account Active</span>
                        <Badge variant={user.is_active ? "default" : "destructive"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm">Premium Status</span>
                        <Badge variant={user.is_premium ? "default" : "secondary"}>
                          {user.is_premium ? "Premium" : "Free"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm">Authentication Provider</span>
                        <Badge variant="outline" className="capitalize">
                          {user.auth_provider || 'Local'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? 'Cancel Editing' : 'Edit Profile'}
                    </Button>

                    {isEditing && (
                      <Button>
                        Save Changes
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Links */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Quick Links</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Button variant="outline" asChild className="justify-start">
                      <Link href="/collections">
                        <BookOpen className="w-4 h-4 mr-2" />
                        My Collections
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="justify-start">
                      <Link href="/source-videos">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Source Videos
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
