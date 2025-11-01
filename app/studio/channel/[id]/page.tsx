"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChevronLeft,
  Plus,
  Menu,
  Settings,
  BarChart3,
  Video,
  Upload,
  Image as ImageIcon,
  Tv
} from "lucide-react"
import { StudioSidebar } from "@/components/studio/studio-sidebar"
import { ContentManager } from "@/components/studio/content-manager"
import { ImageGallery } from "@/components/studio/image-gallery"
import { VideoUploadInterface } from "@/components/studio/video-upload-interface"
import { AnalyticsDashboard } from "@/components/studio/analytics-dashboard"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function ChannelStudioPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const channelId = params.id as string
  const [activeSection, setActiveSection] = useState("content")
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await getAccessTokenCached()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Fetch channel details
  const { data: channel, isLoading: channelLoading } = useQuery({
    queryKey: ["channel", channelId],
    queryFn: async () => {
      return apiGet(`/api/v1/channels/${channelId}`)
    },
  })

  // Fetch channel stats
  const { data: stats } = useQuery({
    queryKey: ["channel", channelId, "stats"],
    queryFn: async () => {
      const headers = await authHeaders()
      return apiGet(`/api/v1/channels/${channelId}/stats`, { headers })
    },
    enabled: !!channel,
  })

  // Check if user is the channel owner
  useEffect(() => {
    if (channel && user && channel.owner_id !== user.id) {
      router.push(`/channel/${channelId}`)
    }
  }, [channel, user, channelId, router])

  const renderActiveSection = () => {
    switch (activeSection) {
      case "content":
        return <ContentManager onCreateVideo={() => setActiveSection("upload")} />
      case "images":
        return <ImageGallery />
      case "upload":
        return <VideoUploadInterface />
      case "analytics":
        return <AnalyticsDashboard />
      case "settings":
        return <ChannelSettings channel={channel} />
      default:
        return <ContentManager onCreateVideo={() => setActiveSection("upload")} />
    }
  }

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
    setIsMobileSidebarOpen(false)
  }

  if (channelLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-12 w-64 bg-muted animate-pulse rounded" />
          <div className="h-96 w-full bg-muted animate-pulse rounded" />
        </div>
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Channel Not Found</CardTitle>
            <CardDescription>The channel you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/studio")}>Go to Studio</Button>
          </CardContent>
        </Card>
      </div>
    )
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
                <ChannelStudioSidebar 
                  activeSection={activeSection} 
                  onSectionChange={handleSectionChange}
                  channelName={channel.name}
                />
              </SheetContent>
            </Sheet>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/studio")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Studio
            </Button>
            <div className="h-6 w-px bg-border hidden md:block" />
            <div className="flex items-center gap-3 hidden md:flex">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <Tv className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">{channel.name}</h1>
                <p className="text-xs text-muted-foreground">{channel.video_count} videos</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/channel/${channelId}`)}
            >
              View Channel
            </Button>
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
          <ChannelStudioSidebar 
            activeSection={activeSection} 
            onSectionChange={handleSectionChange}
            channelName={channel.name}
          />
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

// Channel-specific sidebar component
function ChannelStudioSidebar({ 
  activeSection, 
  onSectionChange,
  channelName 
}: { 
  activeSection: string
  onSectionChange: (section: string) => void
  channelName: string
}) {
  const menuItems = [
    { id: "content", label: "Content", icon: Video },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "upload", label: "Upload", icon: Upload },
    { id: "images", label: "Images", icon: ImageIcon },
    { id: "settings", label: "Settings", icon: Settings },
  ]

  return (
    <aside className="w-64 border-r border-border bg-card/30 h-[calc(100vh-73px)] sticky top-[73px]">
      <div className="p-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Channel Studio
        </p>
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.id}
              variant={activeSection === item.id ? "secondary" : "ghost"}
              className={`w-full justify-start ${
                activeSection === item.id
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
              onClick={() => onSectionChange(item.id)}
            >
              <Icon className="h-4 w-4 mr-3" />
              {item.label}
            </Button>
          )
        })}
      </div>
    </aside>
  )
}

// Channel settings component
function ChannelSettings({ channel }: { channel: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Channel Settings</h2>
        <p className="text-muted-foreground">Manage your channel information and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Channel Information</CardTitle>
          <CardDescription>Basic details about your channel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Channel Name</label>
            <p className="text-sm text-muted-foreground mt-1">{channel.name}</p>
          </div>
          {channel.description && (
            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <p className="text-sm text-muted-foreground mt-1">{channel.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Videos</label>
              <p className="text-2xl font-bold text-foreground mt-1">{channel.video_count}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Views</label>
              <p className="text-2xl font-bold text-foreground mt-1">{channel.view_count?.toLocaleString() || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
          <CardDescription>Configure advanced channel options</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Advanced settings coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}
