"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Menu
} from "lucide-react"
import { StudioSidebar } from "@/components/studio/studio-sidebar"
import { DashboardOverview } from "@/components/studio/dashboard-overview"
import { ContentManager } from "@/components/studio/content-manager"
import { ImageGallery } from "@/components/studio/image-gallery"
import { ChannelManager } from "@/components/studio/channel-manager"
import { VideoUploadInterface } from "@/components/studio/video-upload-interface"
import { AnalyticsDashboard } from "@/components/studio/analytics-dashboard"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function StudioPage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState("dashboard")
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await getAccessTokenCached()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Fetch user's content stats
  const { data: stats } = useQuery({
    queryKey: ["studio", "stats"],
    queryFn: async () => {
      const headers = await authHeaders()
      return apiGet("/api/v1/users/studio/stats", { headers })
    },
  })

  const renderActiveSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardOverview stats={stats} />
      case "channel":
        return <ChannelManager />
      case "content":
        return <ContentManager onCreateVideo={() => setActiveSection("upload")} />
      case "images":
        return <ImageGallery />
      case "upload":
        return <VideoUploadInterface />
      case "analytics":
        return <AnalyticsDashboard />
      default:
        return <DashboardOverview stats={stats} />
    }
  }

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
    setIsMobileSidebarOpen(false)
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
                <StudioSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
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
            <h1 className="text-xl font-semibold text-foreground hidden md:block">YouTube Studio</h1>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setActiveSection("upload")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Hidden on mobile, shown on md+ */}
        <div className="hidden md:block">
          <StudioSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
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
