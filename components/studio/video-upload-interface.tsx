"use client"

import { useState, useRef, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { useMutation, useQueryClient,useQuery } from "@tanstack/react-query"
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
  ArrowLeft,
  FileVideo,
  Info
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Channel {
  id: string
  name: string
  description: string | null
}

interface BasicVideoData {
  title: string
  description: string
  channel_id: string
  topic?: string
}

interface UploadedVideo {
  file: File
  preview: string
  id: string
  status: "selected" | "uploading" | "completed" | "error" | "creating_record"
  progress: number
  error?: string
  video_id?: string // From transcoding service
  videoData?: BasicVideoData
}

export function VideoUploadInterface() {
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [showMetadataForm, setShowMetadataForm] = useState(true) // Start with metadata form
  const [selectedVideo, setSelectedVideo] = useState<UploadedVideo | null>(null)
  const [videoData, setVideoData] = useState<BasicVideoData>({
    title: "",
    description: "",
    channel_id: "",
    topic: "",
  })
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await getAccessTokenCached()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Fetch user's channels
  const { data: channels } = useQuery({
    queryKey: ["channels", "my"],
    queryFn: async () => {
      const headers = await authHeaders()
      return apiGet("/api/channels/my", { headers }) as Promise<Channel[]>
    }
  })

  // Set default channel when channels are loaded
  useEffect(() => {
    if (channels && channels.length > 0 && !videoData.channel_id) {
      setVideoData(prev => ({ ...prev, channel_id: channels[0].id }))
    }
  }, [channels, videoData.channel_id])

  // Fetch available topics
  const { data: topics } = useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const headers = await authHeaders()
      return apiGet("/api/admin/topics", { headers })
    }
  })

  const onDrop = (acceptedFiles: File[]) => {
    const videoFiles = acceptedFiles.filter(file =>
      file.type.startsWith('video/') || file.name.toLowerCase().includes('.mp4') || file.name.toLowerCase().includes('.mov')
    )

    if (videoFiles.length === 0) {
      toast.error("Please upload video files only")
      return
    }

    if (videoFiles.length > 1) {
      toast.error("Please upload only one video file at a time")
      return
    }

    const file = videoFiles[0]

    // Check file size (10GB limit)
    const maxSize = 10 * 1024 * 1024 * 1024 // 10GB
    if (file.size > maxSize) {
      toast.error("File too large. Maximum size: 10GB")
      return
    }

    const uploadedVideo: UploadedVideo = {
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
      status: "selected",
      progress: 0,
      videoData: videoData,
    }

    setUploadedVideos([uploadedVideo])
    setSelectedVideo(uploadedVideo)
    // Removed automatic startVideoUpload call
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm']
    },
    multiple: true,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  })

  const startVideoUpload = async (uploadedVideo: UploadedVideo) => {
    try {
      const token = await getAccessTokenCached()

      // First, upload the video file to the transcoding service via our backend
      const formData = new FormData()
      formData.append('file', uploadedVideo.file)

      const uploadResponse = await fetch('/api/users/studio/upload/video', {
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
      const videoId = uploadResult.video_id

      // Update status to creating record
      setUploadedVideos(prev =>
        prev.map(v =>
          v.id === uploadedVideo.id
            ? { ...v, status: "creating_record", progress: 75, video_id: videoId }
            : v
        )
      )

      // Now create the database record with the transcoding service video_id
      const dbData = {
        title: uploadedVideo.videoData!.title,
        description: uploadedVideo.videoData!.description,
        channel_id: uploadedVideo.videoData!.channel_id,
        topic: uploadedVideo.videoData!.topic,
        video_url: videoId, // Store the transcoding service video_id
        tags: [],
        sermon_notes: [],
        scripture_references: []
      }

      const headers = await authHeaders()
      await apiPost("/api/users/studio/videos", dbData, { headers })

      // Update status to completed
      setUploadedVideos(prev =>
        prev.map(v =>
          v.id === uploadedVideo.id
            ? { ...v, status: "completed", progress: 100 }
            : v
        )
      )

      // Refresh the videos list
      queryClient.invalidateQueries({ queryKey: ["videos"] })
      queryClient.invalidateQueries({ queryKey: ["channel", "stats"] })

      toast.success("Video uploaded and saved successfully!")
      setShowMetadataForm(true) // Reset to show metadata form again

    } catch (error) {
      console.error('Upload error:', error)
      setUploadedVideos(prev =>
        prev.map(v =>
          v.id === uploadedVideo.id
            ? { ...v, status: "error", error: "Upload failed", progress: 0 }
            : v
        )
      )
      toast.error("Video upload failed")
    }
  }

  const handleUploadClick = () => {
    if (uploadedVideos.length === 0 || uploadedVideos[0].status !== "selected") {
      return
    }
    startVideoUpload(uploadedVideos[0])
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

  const handleMetadataSubmit = () => {
    if (!videoData.title.trim()) {
      toast.error("Video title is required")
      return
    }

    if (!videoData.channel_id) {
      toast.error("Channel selection is required")
      return
    }

    setShowMetadataForm(false) // Switch to upload view
  }

  const resetUpload = () => {
    setShowMetadataForm(true)
    setUploadedVideos([])
    setSelectedVideo(null)
    setVideoData({
      title: "",
      description: "",
      channel_id: channels?.[0]?.id || "",
      topic: "",
    })
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

      {showMetadataForm ? (
        /* Metadata Form */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Video Information
            </CardTitle>
            <CardDescription>
              Provide basic information about your video before uploading
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={videoData.title}
                  onChange={(e) => setVideoData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter video title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel">Channel *</Label>
                {channels && channels.length > 1 ? (
                  <Select
                    value={videoData.channel_id}
                    onValueChange={(value) => setVideoData(prev => ({ ...prev, channel_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((ch) => (
                        <SelectItem key={ch.id} value={ch.id}>
                          <div className="flex items-center gap-2">
                            <Tv className="h-3 w-3" />
                            {ch.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/50">
                    <Tv className="h-4 w-4 text-primary" />
                    <span className="text-sm">{channels?.[0]?.name || "No channel available"}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={videoData.description}
                onChange={(e) => setVideoData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your video..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic (optional)</Label>
                <Select
                  value={videoData.topic}
                  onValueChange={(value) => setVideoData(prev => ({ ...prev, topic: value }))}
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
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleMetadataSubmit}
                className="flex-1"
              >
                <Video className="h-4 w-4 mr-2" />
                Continue to Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Upload Interface */
        <>
          {/* Upload Area */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileVideo className="h-5 w-5" />
                    Upload Video File
                  </CardTitle>
                  <CardDescription>
                    Upload your video file for "{videoData.title}"
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMetadataForm(true)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Edit Info
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
                  {isDragActive ? "Drop your video here" : "Upload Video File"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Drag and drop or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supported formats: MP4, MOV, AVI, MKV, WebM (max 10GB)
                  <br />
                  <span className="text-amber-600">Large files may take several minutes to upload</span>
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
                <CardTitle>Upload Progress</CardTitle>
                <CardDescription>
                  Processing your video upload
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

                      {uploadedVideo.status === "selected" && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            File ready for upload
                          </p>
                          <Button
                            onClick={handleUploadClick}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Start Upload
                          </Button>
                        </div>
                      )}

                      {uploadedVideo.status === "uploading" && (
                        <div className="space-y-2">
                          <Progress value={uploadedVideo.progress} className="h-2" />
                          <p className="text-sm text-muted-foreground">
                            Uploading to transcoding service... {uploadedVideo.progress}%
                          </p>
                        </div>
                      )}

                      {uploadedVideo.status === "creating_record" && (
                        <div className="space-y-2">
                          <Progress value={uploadedVideo.progress} className="h-2" />
                          <p className="text-sm text-muted-foreground">
                            Creating database record... {uploadedVideo.progress}%
                          </p>
                        </div>
                      )}

                      {uploadedVideo.status === "completed" && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <p className="text-sm text-green-600">Upload completed successfully!</p>
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

          {/* Success Actions */}
          {uploadedVideos.some(v => v.status === "completed") && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-800">Upload Successful!</h3>
                </div>
                <p className="text-sm text-green-700 mb-4">
                  Your video has been uploaded and saved to your channel. The transcoding process will begin automatically.
                </p>
                <div className="flex gap-2">
                  <Button onClick={resetUpload} variant="outline">
                    Upload Another Video
                  </Button>
                  <Button onClick={() => window.location.reload()}>
                    View in Content Manager
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
