"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Video,
  Search,
  Filter,
  Play,
  Edit,
  Trash2,
  Eye,
  Clock,
  Users,
  TrendingUp,
  Tv
} from "lucide-react"
import { cn } from "@/lib/utils"

// API Response Types
interface VideoResponse {
  id: string
  title: string
  description?: string
  topic?: string
  youtube_id?: string
  duration?: number
  preacher?: {
    id: string
    name: string
    slug?: string
    image_url?: string
  }
  thumbnail_url?: string
  video_url?: string
  hls_master_url?: string
  sermon_notes: string[]
  scripture_references: any[]
  tags: string[]
  status: string
  visibility: string
  view_count: number
  created_at: string
  published_at?: string
}

export function ContentManager({ onCreateVideo }: { onCreateVideo?: () => void }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedTopic, setSelectedTopic] = useState("all")
  const [selectedChannelId, setSelectedChannelId] = useState("all")

  // Fetch videos from API
  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await getAccessTokenCached()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const { data: videos, isLoading, error } = useQuery({
    queryKey: ["user", "videos", selectedChannelId],
    queryFn: async (): Promise<VideoResponse[]> => {
      const headers = await authHeaders()
      const params = new URLSearchParams()
      if (selectedChannelId !== "all") {
        params.append("channel_id", selectedChannelId)
      }
      const url = `/api/users/videos${params.toString() ? `?${params.toString()}` : ""}`
      return apiGet(url, { headers })
    },
  })

  // Fetch user's channels for filtering
  const { data: channels } = useQuery({
    queryKey: ["channels", "my"],
    queryFn: async () => {
      const headers = await authHeaders()
      return apiGet("/api/channels/my", { headers }) as Promise<{ id: string; name: string }[]>
    }
  })

  const filteredContent = videos?.filter((item: VideoResponse) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
                         (item.preacher?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    const matchesStatus = selectedStatus === "all" || item.status === selectedStatus
    const matchesTopic = selectedTopic === "all" || item.topic === selectedTopic
    return matchesSearch && matchesStatus && matchesTopic
  }) || []

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    if (mins >= 60) {
      const hours = Math.floor(mins / 60)
      const remainderMinutes = mins % 60
      return `${hours}h ${remainderMinutes}m`
    }
    return `${mins}m ${secs.toString().padStart(2, "0")}s`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-green-500/10 text-green-600 border-green-500/20"
      case "draft": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
      case "processing": return "bg-blue-500/10 text-blue-600 border-blue-500/20"
      default: return "bg-gray-500/10 text-gray-600 border-gray-500/20"
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Content Manager</h2>
          <p className="text-muted-foreground mt-1">
            Manage your videos, sermons, and Christian content
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={onCreateVideo}>
          <Video className="h-4 w-4 mr-2" />
          Create Video
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search videos by title, description, or preacher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-input border-border"
                />
              </div>
            </div>

            {/* Channel Filter - Only show if user has multiple channels */}
            {channels && channels.length > 1 && (
              <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                <SelectTrigger className="w-full md:w-48 bg-input border-border">
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">All Channels</SelectItem>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      <div className="flex items-center gap-2">
                        <Tv className="h-3 w-3" />
                        {channel.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-40 bg-input border-border">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger className="w-full md:w-40 bg-input border-border">
                <SelectValue placeholder="All Topics" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Topics</SelectItem>
                <SelectItem value="Faith">Faith</SelectItem>
                <SelectItem value="Worship">Worship</SelectItem>
                <SelectItem value="Youth Ministry">Youth Ministry</SelectItem>
                <SelectItem value="Prayer">Prayer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="bg-card border-border shadow-sm overflow-hidden">
              <div className="aspect-video bg-accent animate-pulse" />
              <CardContent className="p-4">
                <div className="h-4 bg-accent rounded animate-pulse mb-2" />
                <div className="h-3 bg-accent rounded animate-pulse mb-3 w-3/4" />
                <div className="flex gap-4 mb-3">
                  <div className="h-3 bg-accent rounded animate-pulse w-16" />
                  <div className="h-3 bg-accent rounded animate-pulse w-12" />
                </div>
                <div className="flex justify-between items-center mb-2">
                  <div className="h-3 bg-accent rounded animate-pulse w-20" />
                  <div className="h-3 bg-accent rounded animate-pulse w-16" />
                </div>
                <div className="flex gap-2 mb-4">
                  <div className="h-5 bg-accent rounded animate-pulse w-12" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 bg-accent rounded animate-pulse flex-1" />
                  <div className="h-8 bg-accent rounded animate-pulse flex-1" />
                  <div className="h-8 bg-accent rounded animate-pulse w-8" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-12 text-center">
            <Video className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Error loading content</h3>
            <p className="text-muted-foreground mb-6">
              Failed to load videos. Please try again later.
            </p>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContent.map((item: VideoResponse) => (
            <Card key={item.id} className="bg-card border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="relative">
                <div className="aspect-video bg-accent overflow-hidden">
                  <img
                    src={item.thumbnail_url || "/placeholder.svg?height=180&width=320"}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Button variant="secondary" size="sm" className="bg-white/90 hover:bg-white">
                      <Play className="h-4 w-4 mr-2" />
                      Play
                    </Button>
                  </div>
                </div>

                <div className="absolute top-3 left-3">
                  <Badge className={cn("text-xs", getStatusColor(item.status))}>
                    {item.status}
                  </Badge>
                </div>

                <div className="absolute top-3 right-3">
                  <Button variant="secondary" size="sm" className="bg-black/50 hover:bg-black/70 border-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description || "No description available"}</p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {item.view_count} views
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {item.duration ? formatDuration(item.duration) : "N/A"}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{item.preacher?.name || "Unknown Preacher"}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {item.topic || "No Topic"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !error && filteredContent.length === 0 && (
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-12 text-center">
            <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No content found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || selectedStatus !== "all" || selectedTopic !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first video to get started"}
            </p>
            <Button className="bg-primary hover:bg-primary/90" onClick={onCreateVideo}>
              <Video className="h-4 w-4 mr-2" />
              Create Video
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
