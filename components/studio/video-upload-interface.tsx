"use client"

import { useState, useRef, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Upload,
  X,
  Video,
  AlertCircle,
  CheckCircle,
  Loader2,
  Tv,
  Plus
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Channel {
  id: string
  name: string
  description: string | null
}

interface VideoUploadData {
  title: string
  description: string
  channel_id: string
  youtube_id?: string
  topic?: string
  tags: string[]
  sermon_notes: string[]
  scripture_references: string[]
}

interface UploadedVideo {
  file: File
  preview: string
  id: string
  status: "uploading" | "completed" | "error"
  progress: number
  error?: string
  uploadData?: VideoUploadData
}

export function VideoUploadInterface() {
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<UploadedVideo | null>(null)
  const [uploadForm, setUploadForm] = useState<VideoUploadData>({
    title: "",
    description: "",
    channel_id: "",
    youtube_id: "",
    topic: "",
    tags: [],
    sermon_notes: [],
    scripture_references: []
  })
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await getAccessTokenCached()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Fetch user's channel
  const { data: channel } = useQuery({
    queryKey: ["channel", "my"],
    queryFn: async () => {
      const headers = await authHeaders()
      return apiGet("/api/channels/my", { headers }) as Promise<Channel>
    }
  })

  // Fetch available topics
  const { data: topics } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const headers = await authHeaders()
      return apiGet("/api/admin/topics", { headers })
    }
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const videoFiles = acceptedFiles.filter(file =>
      file.type.startsWith('video/') || file.name.toLowerCase().includes('.mp4') || file.name.toLowerCase().includes('.mov')
    )

    if (videoFiles.length === 0) {
      toast.error("Please upload video files only")
      return
    }

    const newVideos: UploadedVideo[] = videoFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
      status: "uploading",
      progress: 0,
    }))

    setUploadedVideos(prev => [...prev, ...newVideos])

    // Start upload for each video
    newVideos.forEach(uploadedVideo => {
      startVideoUpload(uploadedVideo.id, uploadedVideo.file)
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm']
    },
    multiple: true,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  })

  const startVideoUpload = async (videoId: string, file: File) => {
    try {
      const token = await getAccessTokenCached()

      // First, upload the video file to get a temporary URL
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch('/api/admin/upload/video', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Video upload failed')
      }

      const uploadResult = await uploadResponse.json()

      setUploadedVideos(prev =>
        prev.map(v =>
          v.id === videoId
            ? { ...v, status: "completed", progress: 100 }
            : v
        )
      )

      toast.success("Video uploaded successfully!")
    } catch (error) {
      console.error('Upload error:', error)
      setUploadedVideos(prev =>
        prev.map(v =>
          v.id === videoId
            ? { ...v, status: "error", error: "Upload failed", progress: 0 }
            : v
        )
      )
      toast.error("Video upload failed")
    }
  }

  const removeVideo = (videoId: string) => {
    setUploadedVideos(prev => {
      const video = prev.find(v => v.id === videoId)
      if (video?.preview) {
        URL.revokeObjectURL(video.preview)
      }
      return prev.filter(v => v.id !== videoId)
    })
  }

  const openUploadForm = (video: UploadedVideo) => {
    if (!channel) {
      toast.error("You need to create a channel first")
      return
    }

    setSelectedVideo(video)
    setUploadForm({
      title: video.file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      description: "",
      channel_id: channel.id,
      youtube_id: "",
      topic: "",
      tags: [],
      sermon_notes: [],
      scripture_references: []
    })
    setShowUploadForm(true)
  }

  const publishVideoMutation = useMutation({
    mutationFn: async (data: VideoUploadData & { video_url: string }) => {
      const headers = await authHeaders()
      return apiPost("/api/admin/videos", data, { headers })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] })
      queryClient.invalidateQueries({ queryKey: ["channel", "stats"] })
      toast.success("Video published successfully!")
      setShowUploadForm(false)
      setSelectedVideo(null)
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to publish video")
    }
  })

  const handlePublishVideo = () => {
    if (!selectedVideo) return

    if (!uploadForm.title.trim()) {
      toast.error("Video title is required")
      return
    }

    if (!uploadForm.channel_id) {
      toast.error("Channel selection is required")
      return
    }

    // For now, we'll assume the video is uploaded and use a placeholder URL
    // In a real implementation, you'd get the actual uploaded video URL
    const videoData = {
      ...uploadForm,
      video_url: `uploaded://${selectedVideo.file.name}` // Placeholder
    }

    publishVideoMutation.mutate(videoData)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Video className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Upload Videos</h2>
            <p className="text-sm text-muted-foreground">
              Share your Christian content with the world
            </p>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive || isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            )}
          >
            <input {...getInputProps()} ref={fileInputRef} />
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {isDragActive ? "Drop your videos here" : "Upload Christian Videos"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop video files, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supported formats: MP4, MOV, AVI, MKV, WebM (max 2GB)
            </p>
            <Button variant="outline" className="mt-4" onClick={() => fileInputRef.current?.click()}>
              Browse Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Videos */}
      {uploadedVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Videos</CardTitle>
            <CardDescription>
              {uploadedVideos.filter(v => v.status === "completed").length} of {uploadedVideos.length} videos uploaded
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadedVideos.map((uploadedVideo) => (
              <div key={uploadedVideo.id} className="flex items-center gap-4 p-4 border border-border rounded-lg">
                <div className="w-20 h-12 rounded overflow-hidden bg-accent flex-shrink-0">
                  <video
                    src={uploadedVideo.preview}
                    className="w-full h-full object-cover"
                    muted
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground truncate">
                      {uploadedVideo.file.name}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {formatFileSize(uploadedVideo.file.size)}
                    </Badge>
                  </div>

                  {uploadedVideo.status === "uploading" && (
                    <div className="space-y-2">
                      <Progress value={uploadedVideo.progress} className="h-2" />
                      <p className="text-sm text-muted-foreground">
                        Uploading... {uploadedVideo.progress}%
                      </p>
                    </div>
                  )}

                  {uploadedVideo.status === "completed" && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <p className="text-sm text-green-600">Upload completed</p>
                      <Button
                        size="sm"
                        onClick={() => openUploadForm(uploadedVideo)}
                        className="ml-auto"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Details & Publish
                      </Button>
                    </div>
                  )}

                  {uploadedVideo.status === "error" && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <p className="text-sm text-red-600">
                        {uploadedVideo.error || "Upload failed"}
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVideo(uploadedVideo.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Video Details Form Modal */}
      {showUploadForm && selectedVideo && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video Details
            </CardTitle>
            <CardDescription>
              Add details to publish your video to your channel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter video title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel">Channel *</Label>
                <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/50">
                  <Tv className="h-4 w-4 text-primary" />
                  <span className="text-sm">{channel?.name || "No channel"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your video..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Select
                  value={uploadForm.topic}
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, topic: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics?.map((topic: any) => (
                      <SelectItem key={topic.id} value={topic.name}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtube_id">YouTube ID (optional)</Label>
                <Input
                  id="youtube_id"
                  value={uploadForm.youtube_id}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, youtube_id: e.target.value }))}
                  placeholder="e.g., dQw4w9WgXcQ"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={uploadForm.tags.join(', ')}
                onChange={(e) => setUploadForm(prev => ({
                  ...prev,
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                }))}
                placeholder="christian, sermon, worship (comma-separated)"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handlePublishVideo}
                disabled={publishVideoMutation.isPending}
                className="flex-1"
              >
                {publishVideoMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Video className="h-4 w-4 mr-2" />
                )}
                Publish Video
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowUploadForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
