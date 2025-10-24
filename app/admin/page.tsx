"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Upload,
  Image as ImageIcon,
  BarChart3,
  Settings,
  Home,
  Video,
  Library,
  ChevronLeft,
  Plus,
  Users,
  Shield,
  Menu
} from "lucide-react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { AdminContentManager } from "@/components/admin/admin-content-manager"
import { AdminUserManager } from "@/components/admin/admin-user-manager"
import { AdminImageGallery } from "@/components/admin/admin-image-gallery"
import { AdminUploadInterface } from "@/components/admin/admin-upload-interface"
import { AdminAnalytics } from "@/components/admin/admin-analytics"

export default function AdminPage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState("dashboard")
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await getAccessTokenCached()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
    setIsMobileSidebarOpen(false)
  }
  const { data: stats } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const headers = await authHeaders()
      return apiGet("/api/v1/admin/stats", { headers })
    },
  })

  const renderActiveSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <AdminDashboard stats={stats} />
      case "content":
        return <AdminContentManager />
      case "users":
        return <AdminUserManager />
      case "images":
        return <AdminImageGallery />
      case "upload":
        return <AdminUploadInterface />
      case "analytics":
        return <AdminAnalytics />
      default:
        return <AdminDashboard stats={stats} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  aria-label="Open sidebar"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 sm:w-72">
                <AdminSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
              </SheetContent>
            </Sheet>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Platform
            </Button>
            <div className="h-6 w-px bg-border hidden md:block" />
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold text-foreground hidden md:block">Admin Portal</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => handleSectionChange("upload")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload Content
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Hidden on mobile, shown on md+ */}
        <div className="hidden md:block">
          <AdminSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {renderActiveSection()}
          </div>
        </main>
      </div>
    </div>
  )
}
