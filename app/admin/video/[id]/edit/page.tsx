"use client"

import React, { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { API_BASE_URL, apiGet, apiPut } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Loader2, Edit, Mic, Brain, Eye, ThumbsUp, MessageSquare, Share, Calendar, Clock, ArrowLeft, Save } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Video {
  id: string
  title: string
  description?: string
  youtube_url?: string
  original_url?: string
  video_url: string
  audio_url?: string
  preacher?: { id: string; name: string }
  topic?: string
  topic_id?: string
  thumbnail_url?: string
  thumbnail_high_res_url?: string
  duration?: number
  start_time_seconds?: number
  end_time_seconds?: number
  status?: string
  visibility?: string
  is_featured?: boolean
  is_trending?: boolean
  tags?: string[]
  keywords?: string[]
  meta_title?: string
  meta_description?: string
  published_at?: string
  created_at: string
  updated_at?: string
  view_count?: number
  like_count?: number
  comment_count?: number
  share_count?: number
  avg_watch_percentage?: number
  completion_rate?: number
  engagement_score?: number
  transcript?: string
  transcript_language?: string
  transcription_status?: string
  // Sermon content fields
  sermon_notes?: string[]
  key_points?: string[]
  // AI metadata (when available)
  ai_summary?: string
  ai_topics?: string[]
  ai_sentiment?: string
  content_rating?: string
  safety_score?: number
}

interface Preacher {
  id: string
  name: string
  bio?: string
  image_url?: string
}

export default function VideoEditPage() {
  const params = useParams()
  const router = useRouter()
  const videoId = params.id as string
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    youtube_url: "",
    original_url: "",
    video_url: "",
    audio_url: "",
    preacher_id: "",
    topic: "",
    topic_id: "",
    thumbnail_url: "",
    thumbnail_high_res_url: "",
    duration: 0,
    start_time_seconds: null as number | null,
    end_time_seconds: null as number | null,
    status: "draft",
    visibility: "public",
    is_featured: false,
    is_trending: false,
    tags: "",
    keywords: "",
    meta_title: "",
    meta_description: "",
    published_at: "",
    // Sermon content fields
    sermon_notes: "",
    key_points: "",
    transcript: "",
    // AI metadata (read-only when available)
    ai_summary: "",
    ai_topics: "",
    ai_sentiment: "",
    content_rating: "",
    safety_score: null as number | null,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeSection, setActiveSection] = useState("basic")

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await getAccessTokenCached()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Fetch video data
  const { data: videoData, isLoading: videoLoading } = useQuery({
    queryKey: ["admin", "video", videoId],
    queryFn: async () => {
      const headers = await authHeaders()
      return apiGet(`/api/v1/videos/${videoId}`, { headers })
    },
    enabled: !!videoId
  })

  // Fetch preachers
  const { data: preachersData } = useQuery({
    queryKey: ["admin", "preachers"],
    queryFn: async () => {
      const headers = await authHeaders()
      return apiGet("/api/v1/admin/preachers", { headers })
    },
  })

  const video = videoData || null
  const preachers = preachersData || []

  // Update form when video data is loaded
  useEffect(() => {
    if (video) {
      setFormData({
        title: video.title || "",
        description: video.description || "",
        youtube_url: video.youtube_url || "",
        original_url: video.original_url || "",
        video_url: video.video_url || "",
        audio_url: video.audio_url || "",
        preacher_id: video.preacher?.id || "",
        topic: video.topic || "",
        topic_id: video.topic_id || "",
        thumbnail_url: video.thumbnail_url || "",
        thumbnail_high_res_url: video.thumbnail_high_res_url || "",
        duration: video.duration || 0,
        start_time_seconds: video.start_time_seconds || null,
        end_time_seconds: video.end_time_seconds || null,
        status: video.status || "draft",
        visibility: video.visibility || "public",
        is_featured: video.is_featured || false,
        is_trending: video.is_trending || false,
        tags: video.tags?.join(", ") || "",
        keywords: video.keywords?.join(", ") || "",
        meta_title: video.meta_title || "",
        meta_description: video.meta_description || "",
        published_at: video.published_at || "",
        sermon_notes: video.sermon_notes?.join("\n") || "",
        key_points: video.key_points?.join("\n") || "",
        transcript: video.transcript || "",
        ai_summary: video.ai_summary || "",
        ai_topics: video.ai_topics?.join(", ") || "",
        ai_sentiment: video.ai_sentiment || "",
        content_rating: video.content_rating || "",
        safety_score: video.safety_score || null,
      })
    }
  }, [video])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const submitData = {
        ...formData,
        topic_id: formData.topic_id || null,
        preacher_id: formData.preacher_id || null,
        tags: formData.tags ? formData.tags.split(",").map(tag => tag.trim()) : [],
        keywords: formData.keywords ? formData.keywords.split(",").map(keyword => keyword.trim()) : [],
        sermon_notes: formData.sermon_notes ? formData.sermon_notes.split("\n").map(note => note.trim()).filter(note => note.length > 0) : [],
        key_points: formData.key_points ? formData.key_points.split("\n").map(point => point.trim()).filter(point => point.length > 0) : [],
        ai_topics: formData.ai_topics ? formData.ai_topics.split(",").map(topic => topic.trim()) : [],
        duration: Number(formData.duration) || 0,
        start_time_seconds: formData.start_time_seconds ? Number(formData.start_time_seconds) : null,
        end_time_seconds: formData.end_time_seconds ? Number(formData.end_time_seconds) : null,
        safety_score: formData.safety_score ? Number(formData.safety_score) : null,
      }

      const headers = await authHeaders()
      await apiPut(`/api/v1/videos/${videoId}`, submitData, { headers })

      queryClient.invalidateQueries({ queryKey: ["admin", "videos"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "video", videoId] })

      toast({
        title: "Success",
        description: "Video updated successfully.",
      })

      router.push("/admin")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update video.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTranscribeVideo = async () => {
    try {
      const headers = await authHeaders()
      const youtubeUrl = video.audio_url ? video.audio_url : video.video_url

      console.log("Transcribing video:", videoId, "URL:", youtubeUrl)

      // Send as form data since the backend expects Form parameters
      const formData = new FormData()
      formData.append('audio_url', youtubeUrl)
      formData.append('video_id', videoId)

      console.log("Content manager transcription - audio_url:", youtubeUrl, "video_id:", videoId)

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

  const handleAIAnalysis = async () => {
    try {
      const headers = await authHeaders()

      console.log("Starting AI analysis for video:", videoId)

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/videos/${videoId}/ai-analysis`, {
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

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (videoLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading video...</p>
        </div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Video not found</p>
          <Button onClick={() => router.push("/admin/content-manager")} className="mt-4">
            Back to Content Manager
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Edit Video</h1>
              <p className="text-sm text-muted-foreground">{video.title}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTranscribeVideo}
              className="flex items-center gap-2"
            >
              <Mic className="h-4 w-4" />
              Transcribe
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleAIAnalysis}
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              AI Analysis
            </Button>
            <Button
              type="submit"
              form="video-edit-form"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <form id="video-edit-form" onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeSection} onValueChange={setActiveSection}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="media">Media & URLs</TabsTrigger>
              <TabsTrigger value="publishing">Publishing</TabsTrigger>
              <TabsTrigger value="ai">AI Metadata</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                  <CardDescription>Core video details and content</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                      rows={4}
                      placeholder="Video description and summary..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="preacher">Preacher</Label>
                      <Select
                        value={formData.preacher_id || "none"}
                        onValueChange={(value) => setFormData({ ...formData, preacher_id: value === "none" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select preacher" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No preacher</SelectItem>
                          {preachers.map((preacher: Preacher) => (
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
                        placeholder="e.g., Salvation, Prayer, Faith"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (seconds)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                        placeholder="3600"
                      />
                      {formData.duration > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {formatDuration(formData.duration)}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="start_time">Start Time (seconds)</Label>
                      <Input
                        id="start_time"
                        type="number"
                        value={formData.start_time_seconds || ""}
                        onChange={(e) => setFormData({ ...formData, start_time_seconds: e.target.value ? Number(e.target.value) : null })}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_time">End Time (seconds)</Label>
                      <Input
                        id="end_time"
                        type="number"
                        value={formData.end_time_seconds || ""}
                        onChange={(e) => setFormData({ ...formData, end_time_seconds: e.target.value ? Number(e.target.value) : null })}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="sermon, faith, christian, salvation"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sermon Content</CardTitle>
                  <CardDescription>Notes, key points, and transcript content</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sermon_notes">Sermon Notes (one per line)</Label>
                    <Textarea
                      id="sermon_notes"
                      value={formData.sermon_notes}
                      onChange={(e) => setFormData({ ...formData, sermon_notes: e.target.value })}
                      rows={6}
                      placeholder="Enter sermon notes, one note per line..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="key_points">Key Points (one per line)</Label>
                    <Textarea
                      id="key_points"
                      value={formData.key_points}
                      onChange={(e) => setFormData({ ...formData, key_points: e.target.value })}
                      rows={4}
                      placeholder="Enter key points from the sermon, one point per line..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transcript">Transcript</Label>
                    <Textarea
                      id="transcript"
                      value={formData.transcript}
                      onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
                      rows={8}
                      placeholder="Full transcript of the video content..."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="media" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Media & URLs</CardTitle>
                  <CardDescription>Video sources, thumbnails, and media URLs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="youtube_url">YouTube URL</Label>
                    <Input
                      id="youtube_url"
                      value={formData.youtube_url}
                      onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="original_url">Original URL</Label>
                    <Input
                      id="original_url"
                      value={formData.original_url}
                      onChange={(e) => setFormData({ ...formData, original_url: e.target.value })}
                      placeholder="Original source URL if different"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="video_url">Video URL</Label>
                      <Input
                        id="video_url"
                        value={formData.video_url}
                        onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                        placeholder="Direct video file URL"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="audio_url">Audio URL</Label>
                      <Input
                        id="audio_url"
                        value={formData.audio_url}
                        onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })}
                        placeholder="Audio file URL for transcription"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                      <Input
                        id="thumbnail_url"
                        value={formData.thumbnail_url}
                        onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                        placeholder="Thumbnail image URL"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="thumbnail_high_res">High-Res Thumbnail URL</Label>
                      <Input
                        id="thumbnail_high_res"
                        value={formData.thumbnail_high_res_url}
                        onChange={(e) => setFormData({ ...formData, thumbnail_high_res_url: e.target.value })}
                        placeholder="High resolution thumbnail URL"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="publishing" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Publishing Settings</CardTitle>
                  <CardDescription>Visibility, status, and SEO settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="visibility">Visibility</Label>
                      <Select
                        value={formData.visibility}
                        onValueChange={(value) => setFormData({ ...formData, visibility: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="unlisted">Unlisted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_featured"
                        checked={formData.is_featured}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                      />
                      <Label htmlFor="is_featured">Featured Video</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_trending"
                        checked={formData.is_trending}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_trending: checked })}
                      />
                      <Label htmlFor="is_trending">Trending Video</Label>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="published_at">Publish Date & Time</Label>
                    <Input
                      id="published_at"
                      type="datetime-local"
                      value={formData.published_at}
                      onChange={(e) => setFormData({ ...formData, published_at: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meta_title">Meta Title (SEO)</Label>
                    <Input
                      id="meta_title"
                      value={formData.meta_title}
                      onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                      placeholder="SEO title (50-60 characters)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meta_description">Meta Description (SEO)</Label>
                    <Textarea
                      id="meta_description"
                      value={formData.meta_description}
                      onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                      rows={2}
                      placeholder="SEO description (150-160 characters)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keywords">Keywords (SEO)</Label>
                    <Input
                      id="keywords"
                      value={formData.keywords}
                      onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                      placeholder="keyword1, keyword2, keyword3"
                    />
                  </div>
                </CardContent>
              </Card>

              {video && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Engagement Metrics
                    </CardTitle>
                    <CardDescription>Current video performance statistics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Eye className="h-4 w-4" />
                          <span className="text-sm">Views</span>
                        </div>
                        <div className="text-2xl font-bold">{video.view_count || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <ThumbsUp className="h-4 w-4" />
                          <span className="text-sm">Likes</span>
                        </div>
                        <div className="text-2xl font-bold">{video.like_count || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <MessageSquare className="h-4 w-4" />
                          <span className="text-sm">Comments</span>
                        </div>
                        <div className="text-2xl font-bold">{video.comment_count || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Share className="h-4 w-4" />
                          <span className="text-sm">Shares</span>
                        </div>
                        <div className="text-2xl font-bold">{video.share_count || 0}</div>
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Avg. Watch %:</span>
                        <span className="ml-2 font-medium">{video.avg_watch_percentage ? `${Math.round(video.avg_watch_percentage)}%` : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Completion Rate:</span>
                        <span className="ml-2 font-medium">{video.completion_rate ? `${Math.round(video.completion_rate)}%` : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Engagement Score:</span>
                        <span className="ml-2 font-medium">{video.engagement_score ? video.engagement_score.toFixed(2) : 'N/A'}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Created: {new Date(video.created_at).toLocaleString()}</span>
                        </div>
                        {video.updated_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Updated: {new Date(video.updated_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="ai" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    AI-Generated Metadata
                  </CardTitle>
                  <CardDescription>AI analysis results and automated content insights</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai_summary">AI Summary</Label>
                    <Textarea
                      id="ai_summary"
                      value={formData.ai_summary}
                      onChange={(e) => setFormData({ ...formData, ai_summary: e.target.value })}
                      rows={4}
                      placeholder="AI-generated summary of the video content..."
                      readOnly={!video} // Read-only for existing videos
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ai_topics">AI Topics (comma separated)</Label>
                      <Input
                        id="ai_topics"
                        value={formData.ai_topics}
                        onChange={(e) => setFormData({ ...formData, ai_topics: e.target.value })}
                        placeholder="faith, salvation, prayer, scripture"
                        readOnly={!video}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ai_sentiment">AI Sentiment</Label>
                      <Select
                        value={formData.ai_sentiment}
                        onValueChange={(value) => setFormData({ ...formData, ai_sentiment: value })}
                        disabled={!video}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Not analyzed" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="positive">Positive</SelectItem>
                          <SelectItem value="neutral">Neutral</SelectItem>
                          <SelectItem value="negative">Negative</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="content_rating">Content Rating</Label>
                      <Select
                        value={formData.content_rating}
                        onValueChange={(value) => setFormData({ ...formData, content_rating: value })}
                        disabled={!video}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Not rated" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Audience</SelectItem>
                          <SelectItem value="mature">Mature Content</SelectItem>
                          <SelectItem value="family">Family Friendly</SelectItem>
                          <SelectItem value="educational">Educational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="safety_score">Safety Score (0-100)</Label>
                      <Input
                        id="safety_score"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.safety_score || ""}
                        onChange={(e) => setFormData({ ...formData, safety_score: e.target.value ? Number(e.target.value) : null })}
                        readOnly={!video}
                        placeholder="AI-generated safety score"
                      />
                    </div>
                  </div>

                  {video?.transcription_status && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <Mic className="h-4 w-4" />
                        <span className="text-muted-foreground">Transcription Status:</span>
                        <Badge variant={video.transcription_status === 'completed' ? 'default' : 'secondary'}>
                          {video.transcription_status}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </div>
    </div>
  )
}
