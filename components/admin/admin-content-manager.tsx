"use client"

import React, { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { API_BASE_URL, apiGet, apiPost, apiPut, apiDelete } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Loader2, Plus, Edit, Trash2, Search, Filter, Mic, ChevronDown, ChevronUp, X, Tag, Brain } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
interface Video {
  id: string
  title: string
  description?: string
  youtube_id: string
  video_url: string
  audio_url:string
  preacher?: { id: string; name: string }
  topic?: string
  duration?: number
  tags?: string[]
  created_at: string
}

interface Preacher {
  id: string
  name: string
  bio?: string
  image_url?: string
}

export function AdminContentManager() {
  const [activeTab, setActiveTab] = useState("videos")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [selectedPreacher, setSelectedPreacher] = useState<Preacher | null>(null)
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false)
  const [isPreacherDialogOpen, setIsPreacherDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteType, setDeleteType] = useState<"video" | "preacher">("video")
  const [deleteId, setDeleteId] = useState<string>("")
  
  // Filter states
  const [preacherFilter, setPreacherFilter] = useState<string>("all")
  const [topicFilter, setTopicFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [durationFilter, setDurationFilter] = useState<string>("all")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const queryClient = useQueryClient()
  const { toast } = useToast()

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await getAccessTokenCached()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Fetch videos
  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ["admin", "videos"],
    queryFn: async () => {
      const headers = await authHeaders()
      return apiGet("/api/v1/admin/videos", { headers })
    },
  })

  // Fetch preachers
  const { data: preachersData, isLoading: preachersLoading } = useQuery({
    queryKey: ["admin", "preachers"],
    queryFn: async () => {
      const headers = await authHeaders()
      return apiGet("/api/v1/admin/preachers", { headers })
    },
  })

  const videos = videosData || []
  const preachers = preachersData || []

  // Extract unique topics and tags from videos
  const uniqueTopics: string[] = Array.from(new Set(videos.map((v: Video) => v.topic).filter((topic: string | undefined): topic is string => Boolean(topic)))) as string[]
  const allTags: string[] = videos.flatMap((v: Video) => v.tags || []).filter((tag: string): tag is string => Boolean(tag))
  const uniqueTags: string[] = Array.from(new Set(allTags))

  // Enhanced filtering logic
  const filteredVideos = videos.filter((video: Video) => {
    // Text search
    const matchesSearch = searchTerm === "" ||
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.preacher?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    // Preacher filter
    const matchesPreacher = preacherFilter === "all" || video.preacher?.id === preacherFilter

    // Topic filter
    const matchesTopic = topicFilter === "all" || video.topic === topicFilter

    // Date filter
    let matchesDate = true
    if (dateFilter !== "all") {
      const videoDate = new Date(video.created_at)
      const now = new Date()
      const daysDiff = Math.floor((now.getTime() - videoDate.getTime()) / (1000 * 3600 * 24))
      
      switch (dateFilter) {
        case "today":
          matchesDate = daysDiff === 0
          break
        case "week":
          matchesDate = daysDiff <= 7
          break
        case "month":
          matchesDate = daysDiff <= 30
          break
        case "quarter":
          matchesDate = daysDiff <= 90
          break
        case "year":
          matchesDate = daysDiff <= 365
          break
      }
    }

    // Duration filter
    let matchesDuration = true
    if (durationFilter !== "all" && video.duration) {
      switch (durationFilter) {
        case "short":
          matchesDuration = video.duration < 300 // < 5 minutes
          break
        case "medium":
          matchesDuration = video.duration >= 300 && video.duration < 1800 // 5-30 minutes
          break
        case "long":
          matchesDuration = video.duration >= 1800 // >= 30 minutes
          break
      }
    }

    // Tags filter
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => video.tags?.includes(tag))

    return matchesSearch && matchesPreacher && matchesTopic && matchesDate && matchesDuration && matchesTags
  })

  // Filter preachers based on search term
  const filteredPreachers = preachers.filter((preacher: Preacher) =>
    preacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    preacher.bio?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEditVideo = (video: Video) => {
    setSelectedVideo(video)
    setIsVideoDialogOpen(true)
  }

  const handleEditPreacher = (preacher: Preacher) => {
    setSelectedPreacher(preacher)
    setIsPreacherDialogOpen(true)
  }

  const handleDelete = (type: "video" | "preacher", id: string) => {
    setDeleteType(type)
    setDeleteId(id)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    try {
      const headers = await authHeaders()
      const endpoint = deleteType === "video" ? `/api/v1/admin/videos/${deleteId}` : `/api/v1/admin/preachers/${deleteId}`

      await apiDelete(endpoint, { headers })

      queryClient.invalidateQueries({ queryKey: ["admin", deleteType === "video" ? "videos" : "preachers"] })

      toast({
        title: "Success",
        description: `${deleteType === "video" ? "Video" : "Preacher"} deleted successfully.`,
      })

      setIsDeleteDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete ${deleteType}.`,
      })
    }
  }

  const handleSaveVideo = async (videoData: any) => {
    try {
      const headers = await authHeaders()
      const isEditing = selectedVideo !== null

      if (isEditing) {
        await apiPut(`/api/v1/admin/videos/${selectedVideo.id}`, videoData, { headers })
      } else {
        await apiPost("/api/v1/admin/videos", videoData, { headers })
      }

      queryClient.invalidateQueries({ queryKey: ["admin", "videos"] })

      toast({
        title: "Success",
        description: `Video ${isEditing ? "updated" : "created"} successfully.`,
      })

      setIsVideoDialogOpen(false)
      setSelectedVideo(null)
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${selectedVideo ? "update" : "create"} video.`,
      })
    }
  }

  const handleTranscribeVideo = async (video: Video) => {
    try {
      const headers = await authHeaders()
      const youtubeUrl = video.audio_url ? video.audio_url : video.video_url

      console.log("Transcribing video:", video.id, "URL:", youtubeUrl)

      // Send as form data since the backend expects Form parameters
      const formData = new FormData()
      formData.append('audio_url', youtubeUrl)
      formData.append('video_id', video.id)

      console.log("Content manager transcription - audio_url:", youtubeUrl, "video_id:", video.id)
      console.log("Content manager transcription Form data:", formData)

      const response = await fetch(`${API_BASE_URL}/api/v1/transcription/transcribe-url`, {
        method: 'POST',
        headers: {
          ...headers,
          // Don't set Content-Type, let browser set it for FormData
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      toast({
        title: "Success",
        description: "Video sent for transcription successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send video for transcription.",
      })
    }
  }

  const handleAIAnalysis = async (video: Video) => {
    try {
      const headers = await authHeaders()

      console.log("Starting AI analysis for video:", video.id)

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/videos/${video.id}/ai-analysis`, {
        method: 'POST',
        headers: {
          ...headers,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      toast({
        title: "Success",
        description: "AI analysis has been queued. The video will be analyzed for summary and scripture extraction.",
      })

      console.log("AI analysis queued:", result)
    } catch (error) {
      console.error("AI analysis error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start AI analysis.",
      })
    }
  }

  const handleSavePreacher = async (preacherData: any) => {
    try {
      const headers = await authHeaders()
      const isEditing = selectedPreacher !== null

      if (isEditing) {
        await apiPut(`/api/v1/admin/preachers/${selectedPreacher.id}`, preacherData, { headers })
      } else {
        await apiPost("/api/v1/admin/preachers", preacherData, { headers })
      }

      queryClient.invalidateQueries({ queryKey: ["admin", "preachers"] })

      toast({
        title: "Success",
        description: `Preacher ${isEditing ? "updated" : "created"} successfully.`,
      })

      setIsPreacherDialogOpen(false)
      setSelectedPreacher(null)
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${selectedPreacher ? "update" : "create"} preacher.`,
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Content Management</h1>
          <p className="text-muted-foreground">
            Manage videos, preachers, and other platform content.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setSelectedVideo(null)
              setIsVideoDialogOpen(true)
            }}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Video
          </Button>
          <Button
            onClick={() => {
              setSelectedPreacher(null)
              setIsPreacherDialogOpen(true)
            }}
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Preacher
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {(preacherFilter !== "all" || topicFilter !== "all" || dateFilter !== "all" || durationFilter !== "all" || selectedTags.length > 0) && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {[
                preacherFilter !== "all" ? 1 : 0,
                topicFilter !== "all" ? 1 : 0,
                dateFilter !== "all" ? 1 : 0,
                durationFilter !== "all" ? 1 : 0,
                selectedTags.length
              ].reduce((a, b) => a + b, 0)}
            </Badge>
          )}
        </Button>
      </div>

      {/* Advanced Filters */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent className="space-y-4">
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Advanced Filters</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPreacherFilter("all")
                    setTopicFilter("all")
                    setDateFilter("all")
                    setDurationFilter("all")
                    setSelectedTags([])
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Preacher Filter */}
                <div className="space-y-2">
                  <Label htmlFor="preacher-filter" className="text-sm font-medium">Preacher</Label>
                  <Select value={preacherFilter} onValueChange={setPreacherFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All preachers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Preachers</SelectItem>
                      {preachers.map((preacher: Preacher) => (
                        <SelectItem key={preacher.id} value={preacher.id}>
                          {preacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Topic Filter */}
                <div className="space-y-2">
                  <Label htmlFor="topic-filter" className="text-sm font-medium">Topic</Label>
                  <Select value={topicFilter} onValueChange={setTopicFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All topics" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Topics</SelectItem>
                      {uniqueTopics.map((topic) => (
                        <SelectItem key={topic} value={topic}>
                          {topic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Filter */}
                <div className="space-y-2">
                  <Label htmlFor="date-filter" className="text-sm font-medium">Date Added</Label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All dates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="quarter">This Quarter</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration Filter */}
                <div className="space-y-2">
                  <Label htmlFor="duration-filter" className="text-sm font-medium">Duration</Label>
                  <Select value={durationFilter} onValueChange={setDurationFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All durations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Durations</SelectItem>
                      <SelectItem value="short">Short (&lt; 5 min)</SelectItem>
                      <SelectItem value="medium">Medium (5-30 min)</SelectItem>
                      <SelectItem value="long">Long (&ge; 30 min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags Filter */}
              {uniqueTags.length > 0 && (
                <div className="mt-6 space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {uniqueTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/80"
                        onClick={() => {
                          setSelectedTags(prev =>
                            prev.includes(tag)
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag]
                          )
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {selectedTags.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTags([])}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Clear tags
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted border-border">
          <TabsTrigger value="videos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Videos ({filteredVideos.length})
          </TabsTrigger>
          <TabsTrigger value="preachers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Preachers ({filteredPreachers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-4">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle>Videos</CardTitle>
              <CardDescription>
                Manage video content and metadata
              </CardDescription>
            </CardHeader>
            <CardContent>
              {videosLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading videos...
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead>Title</TableHead>
                          <TableHead>Preacher</TableHead>
                          <TableHead>Topic</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVideos.map((video: Video) => (
                          <TableRow key={video.id} className="border-border">
                            <TableCell className="font-medium">{video.title}</TableCell>
                            <TableCell>{video.preacher?.name || "Unknown"}</TableCell>
                            <TableCell>{video.topic || "—"}</TableCell>
                            <TableCell>{new Date(video.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditVideo(video)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleTranscribeVideo(video)}
                                  title="Send for transcription"
                                >
                                  <Mic className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAIAnalysis(video)}
                                  title="Generate AI summary & extract scriptures"
                                >
                                  <Brain className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete("video", video.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {filteredVideos.map((video: Video) => (
                      <Card key={video.id} className="bg-card/50 border-border shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0 mr-2">
                              <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
                                {video.title}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {video.preacher?.name || "Unknown"}
                              </p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditVideo(video)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTranscribeVideo(video)}
                                title="Send for transcription"
                                className="h-8 w-8 p-0"
                              >
                                <Mic className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAIAnalysis(video)}
                                title="Generate AI summary & extract scriptures"
                                className="h-8 w-8 p-0"
                              >
                                <Brain className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete("video", video.id)}
                                className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span>{video.topic || "No topic"}</span>
                            <span>{new Date(video.created_at).toLocaleDateString()}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preachers" className="space-y-4">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle>Preachers</CardTitle>
              <CardDescription>
                Manage preacher profiles and information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {preachersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading preachers...
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead>Name</TableHead>
                          <TableHead>Bio</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPreachers.map((preacher: Preacher) => (
                          <TableRow key={preacher.id} className="border-border">
                            <TableCell className="font-medium">{preacher.name}</TableCell>
                            <TableCell className="max-w-xs truncate">{preacher.bio || "—"}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditPreacher(preacher)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete("preacher", preacher.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {filteredPreachers.map((preacher: Preacher) => (
                      <Card key={preacher.id} className="bg-card/50 border-border shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0 mr-2">
                              <h3 className="font-semibold text-foreground line-clamp-1 mb-2">
                                {preacher.name}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-3">
                                {preacher.bio || "No bio available"}
                              </p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditPreacher(preacher)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete("preacher", preacher.id)}
                                className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Video Dialog */}
      <VideoDialog
        video={selectedVideo}
        isOpen={isVideoDialogOpen}
        onClose={() => {
          setIsVideoDialogOpen(false)
          setSelectedVideo(null)
        }}
        onSave={handleSaveVideo}
        preachers={preachers}
      />

      {/* Preacher Dialog */}
      <PreacherDialog
        preacher={selectedPreacher}
        isOpen={isPreacherDialogOpen}
        onClose={() => {
          setIsPreacherDialogOpen(false)
          setSelectedPreacher(null)
        }}
        onSave={handleSavePreacher}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <VisuallyHidden>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {deleteType}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
          
        </DialogContent>
        </VisuallyHidden>
      </Dialog>
    </div>
  )
}

// Video Dialog Component
function VideoDialog({ video, isOpen, onClose, onSave, preachers }: {
  video: Video | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  preachers: Preacher[]
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    youtube_id: "",
    preacher_id: "",
    topic: "",
    duration: 0,
    tags: "",
    start_time_seconds: null as number | null,
    end_time_seconds: null as number | null,
    video_url: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update form when video changes
  React.useEffect(() => {
    if (video) {
      setFormData({
        title: video.title || "",
        description: video.description || "",
        youtube_id: video.youtube_id || "",
        preacher_id: video.preacher?.id || "",
        topic: video.topic || "",
        duration: video.duration || 0,
        tags: video.tags?.join(", ") || "",
        start_time_seconds: null,
        end_time_seconds: null,
        video_url: "",
      })
    } else {
      setFormData({
        title: "",
        description: "",
        youtube_id: "",
        preacher_id: "",
        topic: "",
        duration: 0,
        tags: "",
        start_time_seconds: null,
        end_time_seconds: null,
        video_url: "",
      })
    }
  }, [video])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const submitData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(",").map(tag => tag.trim()) : [],
        duration: Number(formData.duration) || 0,
      }

      await onSave(submitData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{video ? "Edit Video" : "Add New Video"}</DialogTitle>
          <DialogDescription>
            {video ? "Update video information" : "Create a new video entry"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtube_id">YouTube ID *</Label>
              <Input
                id="youtube_id"
                value={formData.youtube_id}
                onChange={(e) => setFormData({ ...formData, youtube_id: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preacher">Preacher</Label>
              <Select
                value={formData.preacher_id}
                onValueChange={(value) => setFormData({ ...formData, preacher_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select preacher" />
                </SelectTrigger>
                <SelectContent>
                  {preachers.map((preacher) => (
                    <SelectItem key={preacher.id} value={preacher.id}>
                      {preacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="sermon, faith, christian"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {video ? "Update" : "Create"} Video
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Preacher Dialog Component
function PreacherDialog({ preacher, isOpen, onClose, onSave }: {
  preacher: Preacher | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
}) {
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    image_url: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update form when preacher changes
  React.useEffect(() => {
    if (preacher) {
      setFormData({
        name: preacher.name || "",
        bio: preacher.bio || "",
        image_url: preacher.image_url || "",
      })
    } else {
      setFormData({
        name: "",
        bio: "",
        image_url: "",
      })
    }
  }, [preacher])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSave(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{preacher ? "Edit Preacher" : "Add New Preacher"}</DialogTitle>
          <DialogDescription>
            {preacher ? "Update preacher information" : "Create a new preacher profile"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Profile Image URL</Label>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {preacher ? "Update" : "Create"} Preacher
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
