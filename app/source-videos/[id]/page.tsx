"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Calendar, Clock, Globe, Tag as TagIcon, ExternalLink, Share2, Play, Scissors, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AppHeader } from "@/components/app-header"
import { apiGet, apiPost, API_BASE_URL } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useRouter, useParams } from "next/navigation"
import { SourceVideo } from "@/lib/types/content"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import Image from "next/image"

export default function SourceVideoDetailPage() {
  const [video, setVideo] = useState<SourceVideo | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Video trimming state
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [trimJobId, setTrimJobId] = useState<string | null>(null)
  const [trimStatus, setTrimStatus] = useState<string | null>(null)
  const [trimProgress, setTrimProgress] = useState<number>(0)
  const [trimmedVideoUrl, setTrimmedVideoUrl] = useState<string | null>(null)
  const [createdVideoId, setCreatedVideoId] = useState<string | null>(null)

  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const params = useParams()
  const videoId = params.id as string
  const queryClient = useQueryClient()

  // Fetch video details
  const videoQuery = useQuery({
    queryKey: ["source-video", videoId],
    queryFn: () => apiGet(`/api/public/source-videos/${videoId}`),
    enabled: !!videoId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  // Mutation for video trimming
  const trimVideoMutation = useMutation({
    mutationFn: async (data: { start_time: number; end_time: number }) => {
      const response = await apiPost("/api/v1/source-videos/trim", {
        source_video_id: videoId,
        start_time: data.start_time,
        end_time: data.end_time,
        webhook_url: API_BASE_URL ? `${API_BASE_URL}/api/v1/webhooks/trimming` : "/api/v1/webhooks/trimming", // Use backend URL for webhooks
      })
      return response
    },
    onSuccess: (data) => {
      setTrimJobId(data.job_id)
      setTrimStatus("processing")
      // Start polling for status
      pollTrimStatus(data.job_id)
    },
    onError: (error) => {
      console.error("Trim video error:", error)
      setError("Failed to start video trimming")
    },
  })

  // Poll for trim status
  const pollTrimStatus = async (jobId: string) => {
    try {
      const status = await apiGet(`/api/v1/source-videos/trim/status/${jobId}`)
      setTrimStatus(status.status)
      setTrimProgress(status.progress || 0)

      if (status.status === "completed" && status.download_url) {
        setTrimmedVideoUrl(status.download_url)
        if (status.video_id) {
          setCreatedVideoId(status.video_id)
          // Video is being transcoded, show transcoding status
          setTrimStatus("transcoding")
          // Poll for transcoding status
          pollTranscodingStatus(status.video_id)
        }
      } else if (status.status === "processing") {
        // Continue polling
        setTimeout(() => pollTrimStatus(jobId), 2000)
      }
    } catch (error) {
      console.error("Status check error:", error)
    }
  }

  // Poll for transcoding status when video is created
  const pollTranscodingStatus = async (videoId: string) => {
    try {
      const status = await apiGet(`/api/public/videos/${videoId}`)
      if (status.status === "published") {
        // Transcoding completed, redirect to video page
        setTrimStatus("ready")
        setTimeout(() => {
          router.push(`/video/${videoId}`)
        }, 2000) // Give user time to see success message
      } else if (status.status === "processing") {
        // Still transcoding, continue polling
        setTrimProgress(100) // Show as complete
        setTimeout(() => pollTranscodingStatus(videoId), 3000)
      } else {
        // Other status, stop polling
        setTrimStatus("ready")
      }
    } catch (error) {
      console.error("Transcoding status check error:", error)
      setTrimStatus("ready")
    }
  }

  // Handle trim request
  const handleTrimVideo = () => {
    if (!startTime || !endTime || !video) return

    const startSeconds = timeToSeconds(startTime)
    const endSeconds = timeToSeconds(endTime)

    if (startSeconds >= endSeconds) {
      setError("End time must be greater than start time")
      return
    }

    if (endSeconds > (video.duration || 0)) {
      setError("End time cannot exceed video duration")
      return
    }

    setError(null)
    trimVideoMutation.mutate({
      start_time: startSeconds,
      end_time: endSeconds,
    })
  }

  // Convert HH:MM:SS or MM:SS to seconds
  const timeToSeconds = (time: string): number => {
    const parts = time.split(':').map(Number)
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1]
    }
    return parts[0] || 0
  }

  useEffect(() => {
    if (videoQuery.data) {
      setVideo(videoQuery.data)
      setError(null)
    }
    if (videoQuery.isError) {
      setError("Failed to load video details")
    }
  }, [videoQuery.data, videoQuery.isError])

  // Extract YouTube video ID from URL for embed
  const getYouTubeEmbedId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  // Format duration from seconds to MM:SS or HH:MM:SS
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "0:00"

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Format published date
  const formatPublishedDate = (dateString: string | null): string => {
    if (!dateString) return "Unknown"

    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleSignOut = async () => {
    await signOut()
    router.refresh()
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video?.title || 'Source Video',
          text: video?.description || '',
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href)
      // Could add a toast notification here
    }
  }

  // Show loading if auth is loading or if we're loading video data
  const isLoading = authLoading || (videoQuery.isLoading && !videoQuery.data)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader onSignOut={handleSignOut} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-foreground text-lg">Loading video...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader onSignOut={handleSignOut} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md mx-auto p-6">
              <div className="text-destructive text-xl mb-4">Video Not Found</div>
              <p className="text-muted-foreground mb-6">{error || "The requested video could not be found."}</p>
              <Button
                onClick={() => router.push('/source-videos')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Source Videos
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const embedId = getYouTubeEmbedId(video.youtube_url)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        onSignOut={handleSignOut}
        backButton={{
          label: "Source Videos",
          href: "/source-videos",
          scroll: false
        }}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Actions */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => router.push('/source-videos')}
              className="hover:bg-secondary/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Videos
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleShare}
                className="hover:bg-secondary/10"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                className="hover:bg-secondary/10"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open on YouTube
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Video Player */}
              <div className="aspect-video w-full bg-muted rounded-xl overflow-hidden">
                {embedId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${embedId}?rel=0&modestbranding=1&iv_load_policy=3&showinfo=0`}
                    title={`YouTube video: ${video.title}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/20 to-red-600/20">
                    <div className="text-center">
                      <ExternalLink className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">Unable to embed video</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => window.open(video.youtube_url, '_blank')}
                      >
                        Open on YouTube
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Video Info */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    {video.title}
                  </h1>

                  {/* Channel Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/30 to-red-600/30 flex items-center justify-center">
                      <span className="text-sm font-semibold text-foreground">
                        {(video.channel_name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {video.channel_name || 'Unknown Channel'}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatPublishedDate(video.published_at)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(video.duration)}
                        </div>
                        {video.language && (
                          <div className="flex items-center gap-1">
                            <Globe className="w-4 h-4" />
                            {video.language.toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {video.description && (
                  <div className="bg-card rounded-lg p-6 border border-border">
                    <h3 className="font-semibold text-foreground mb-3">Description</h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {video.description}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {video.tags && video.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {video.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="hover:bg-secondary/80 cursor-pointer"
                        >
                          <TagIcon className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Video Stats */}
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="font-semibold text-foreground mb-4">Video Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Source</span>
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      YouTube
                    </Badge>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">{formatDuration(video.duration)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Published</span>
                    <span className="font-medium">{formatPublishedDate(video.published_at)}</span>
                  </div>

                  {video.language && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Language</span>
                      <span className="font-medium">{video.language.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="font-semibold text-foreground mb-4">Actions</h3>
                <div className="space-y-3">
                  <Button
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => window.open(video.youtube_url, '_blank')}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Watch on YouTube
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleShare}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Video
                  </Button>
                </div>
              </div>

              {/* Video Trimming */}
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Scissors className="w-4 h-4" />
                  Trim Video
                </h3>

                <div className="space-y-4">
                  {/* Time Inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="startTime" className="text-sm font-medium">
                        Start Time
                      </Label>
                      <Input
                        id="startTime"
                        type="text"
                        placeholder="MM:SS or HH:MM:SS"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime" className="text-sm font-medium">
                        End Time
                      </Label>
                      <Input
                        id="endTime"
                        type="text"
                        placeholder="MM:SS or HH:MM:SS"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleTrimVideo}
                    disabled={!startTime || !endTime || trimVideoMutation.isPending || trimStatus === "processing"}
                    className="w-full"
                  >
                    {trimVideoMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : trimStatus === "processing" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Trimming Video...
                      </>
                    ) : trimStatus === "transcoding" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing Video...
                      </>
                    ) : (
                      <>
                        <Scissors className="w-4 h-4 mr-2" />
                        Trim Video
                      </>
                    )}
                  </Button>

                  {/* Progress */}
                  {trimStatus === "processing" && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Trimming video...</span>
                        <span>{Math.round(trimProgress)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${trimProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Transcoding Progress */}
                  {trimStatus === "transcoding" && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Creating video for platform...</span>
                        <span>Processing</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full animate-pulse"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your trimmed video is being processed and will be available shortly.
                      </p>
                    </div>
                  )}

                  {/* Success */}
                  {trimStatus === "ready" && createdVideoId && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-600">
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                        <span className="text-sm font-medium">Video created successfully!</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Redirecting to your new video...
                      </p>
                      <Button
                        asChild
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <a href={`/video/${createdVideoId}`}>
                          View Video Now
                        </a>
                      </Button>
                    </div>
                  )}

                  {/* Status Messages */}
                  {trimStatus === "failed" && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                      Video processing failed. Please try again.
                    </div>
                  )}

                  {/* Help Text */}
                  <div className="text-xs text-muted-foreground">
                    <p>• Use MM:SS format (e.g., 1:30 for 1 minute 30 seconds)</p>
                    <p>• Or HH:MM:SS format (e.g., 0:01:30)</p>
                    <p>• Your trimmed video will be processed and added to the platform</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
