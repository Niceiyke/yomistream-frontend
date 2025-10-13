"use client"

import { useState } from "react"
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
  TrendingUp
} from "lucide-react"
import { cn } from "@/lib/utils"

// Mock data - replace with real API data
interface ContentItem {
  id: string
  title: string
  description: string
  youtubeId: string
  thumbnail: string
  duration: number
  preacher: string
  topic: string
  tags: string[]
  views: number
  createdAt: string
  status: "published" | "draft" | "processing"
}

const mockContent: ContentItem[] = [
  {
    id: "1",
    title: "Sunday Sermon: Faith in Action",
    description: "A powerful message about living out your faith through daily actions and decisions.",
    youtubeId: "dQw4w9WgXcQ",
    thumbnail: "/placeholder.svg?height=180&width=320",
    duration: 3600,
    preacher: "Pastor John Smith",
    topic: "Faith",
    tags: ["sermon", "faith", "christian living"],
    views: 1250,
    createdAt: "2024-01-15T10:30:00Z",
    status: "published"
  },
  {
    id: "2",
    title: "Youth Ministry Update",
    description: "Updates on upcoming youth events and activities for the coming month.",
    youtubeId: "dQw4w9WgXcQ",
    thumbnail: "/placeholder.svg?height=180&width=320",
    duration: 1800,
    preacher: "Youth Pastor Sarah",
    topic: "Youth Ministry",
    tags: ["youth", "ministry", "events"],
    views: 450,
    createdAt: "2024-01-12T14:20:00Z",
    status: "published"
  },
  {
    id: "3",
    title: "Prayer and Worship Night",
    description: "A special evening of prayer and worship recorded live from our sanctuary.",
    youtubeId: "dQw4w9WgXcQ",
    thumbnail: "/placeholder.svg?height=180&width=320",
    duration: 5400,
    preacher: "Worship Leader Mike",
    topic: "Worship",
    tags: ["worship", "prayer", "live"],
    views: 890,
    createdAt: "2024-01-10T19:00:00Z",
    status: "processing"
  },
]

export function ContentManager() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedTopic, setSelectedTopic] = useState("all")

  const filteredContent = mockContent.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.preacher.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === "all" || item.status === selectedStatus
    const matchesTopic = selectedTopic === "all" || item.topic === selectedTopic
    return matchesSearch && matchesStatus && matchesTopic
  })

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
        <Button className="bg-primary hover:bg-primary/90">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContent.map((item) => (
          <Card key={item.id} className="bg-card border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="relative">
              <div className="aspect-video bg-accent overflow-hidden">
                <img
                  src={item.thumbnail}
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
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description}</p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {item.views} views
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(item.duration)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{item.preacher}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {item.topic}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 3).map((tag) => (
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

      {filteredContent.length === 0 && (
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-12 text-center">
            <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No content found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || selectedStatus !== "all" || selectedTopic !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first video to get started"}
            </p>
            <Button className="bg-primary hover:bg-primary/90">
              <Video className="h-4 w-4 mr-2" />
              Create Video
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
