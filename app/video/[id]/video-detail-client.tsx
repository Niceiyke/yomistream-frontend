"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Heart,
  Sparkles,
  Users,
  Eye,
  BookOpen,
  Quote,
  Share2,
  Bookmark,
  ChevronDown,
  ChevronUp,
  FileText,
  Globe,
  Copy,
  Check,
  Mic,
  Brain
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog"
import { AppHeader } from "@/components/app-header"
import { CustomVideoPlayer } from '@/components/custom-video-player'
import { apiGet, apiPost, apiDelete } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { useAuth } from "@/lib/auth-context"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { debugLog } from "@/lib/utils/debug"
import { Video } from "@/lib/types"
import { formatDuration, getPreacherName } from "@/lib/utils/video-helpers"
import { AIGenerationModal } from "@/components/ai-generation-modal"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

interface VideoDetailClientProps {
  initialVideo: Video | null
}

export default function VideoDetailPage({ initialVideo }: VideoDetailClientProps) {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { toast } = useToast()

  const [favorites, setFavorites] = useState<string[]>([])
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({})
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({})
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set())

  const videoId = params.id as string

  // Set responsive defaults for sermon notes
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 768 // md breakpoint
      setExpandedSections(prev => ({
        ...prev,
        'sermon-notes': isDesktop, // Visible on desktop, hidden on mobile
        'scripture-references': prev['scripture-references'] || false, // Keep scripture collapsed by default
        'key-points': prev['key-points'] || false // Keep key points collapsed by default
      }))
    }

    handleResize() // Set initial state
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Helper function to update action loading state
  const setActionLoadingState = (action: string, loading: boolean) => {
    setActionLoading(prev => ({ ...prev, [action]: loading }))
  }

  // Fetch video details - use initial data if available
  const videoQuery = useQuery({
    queryKey: ["video", videoId],
    queryFn: () => {
      console.log(`🌐 CLIENT: Fetching video ${videoId} from client-side`)
      return apiGet(`/api/v1/videos/${videoId}`)
    },
    initialData: initialVideo,
    staleTime: 5 * 60 * 1000, // 5 minutes - matches server revalidation
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnMount: false, // Don't refetch if we have fresh server data
    refetchOnWindowFocus: false, // Avoid unnecessary refetches
    enabled: !!videoId,
  })

  // Fetch user favorites
  const favoritesQuery = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      const accessToken = await getAccessTokenCached()
      const favs = await apiGet("/api/v1/favorites", {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      return favs?.video_ids || []
    },
    enabled: !!user?.id,
  })

  useEffect(() => {
    if (favoritesQuery.data) setFavorites(favoritesQuery.data)
  }, [favoritesQuery.data])

  const toggleFavorite = async () => {
    if (!user) {
      router.push("/auth/login")
      return
    }
    if (!videoQuery.data) return

    const actionKey = 'favorite'
    setActionLoadingState(actionKey, true)

    const isFavorite = favorites.includes(videoId)
    const accessToken = await getAccessTokenCached()
    const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {}

    try {
      if (isFavorite) {
        await apiDelete(`/api/v1/favorites/${videoId}`, { headers })
      } else {
        await apiPost("/api/v1/favorites", { video_id: videoId }, { headers })
      }
      await queryClient.invalidateQueries({ queryKey: ["favorites", user.id] })
    } catch (error) {
      console.error("Error toggling favorite:", error)
    } finally {
      setActionLoadingState(actionKey, false)
    }
  }

  const shareVideo = async () => {
    const actionKey = 'share'
    setActionLoadingState(actionKey, true)

    try {
      if (navigator.share) {
        await navigator.share({
          title: videoQuery.data?.title,
          text: `Check out this sermon: ${videoQuery.data?.title}`,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
      }
    } catch (error) {
      console.log('Share cancelled or failed')
    } finally {
      setActionLoadingState(actionKey, false)
    }
  }

  const handleGenerateAI = () => {
    if (videoQuery.data) {
      setAiModalOpen(true)
    }
  }

  const handleAIContentGenerated = (content: any) => {
    queryClient.invalidateQueries({ queryKey: ["video", videoId] })
  }

  const handleTranscribeVideo = async () => {
    if (!videoQuery.data) return

    const actionKey = 'transcribe'
    setActionLoadingState(actionKey, true)

    try {
      const accessToken = await getAccessTokenCached()
      const youtubeUrl = videoQuery.data.video_url ? videoQuery.data.video_url : `https://www.youtube.com/watch?v=${videoQuery.data.youtube_id}`

      console.log("Transcribing video:", videoQuery.data.id, "URL:", youtubeUrl)

      // Send as form data since the backend expects Form parameters
      const formData = new FormData()
      formData.append('audio_url', youtubeUrl)
      formData.append('video_id', videoQuery.data.id)

      console.log("Video detail transcription - audio_url:", youtubeUrl, "video_id:", videoQuery.data.id)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/v1/transcription/transcribe-url`, {
        method: 'POST',
        headers: {
          ...accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
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
      console.error("Transcription error:", error)
      toast({
        title: "Error",
        description: "Failed to send video for transcription.",
      })
    } finally {
      setActionLoadingState(actionKey, false)
    }
  }

  const handleAIAnalysis = async () => {
    if (!videoQuery.data) return

    const actionKey = 'ai-analysis'
    setActionLoadingState(actionKey, true)

    try {
      const accessToken = await getAccessTokenCached()

      console.log("Starting AI analysis for video:", videoQuery.data.id)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/v1/admin/videos/${videoQuery.data.id}/ai-analysis`, {
        method: 'POST',
        headers: {
          ...accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
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
    } finally {
      setActionLoadingState(actionKey, false)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItems(prev => new Set(prev).add(itemId))
      // Remove the checkmark after 2 seconds
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(itemId)
          return newSet
        })
      }, 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  // Show loading only if we don't have initial data and are fetching
  if (videoQuery.isLoading && !initialVideo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        {/* Header skeleton */}
        <div className="h-16 bg-background/80 backdrop-blur-lg border-b border-border/50" />

        <div className="container mx-auto px-4 max-w-5xl">
          <div className="space-y-8">
            {/* Main content skeleton */}
            <div>
              {/* Video player skeleton */}
              <div className="aspect-video w-full bg-muted animate-pulse rounded-lg"></div>

              {/* Action bar skeleton */}
              <div className="bg-card/30 rounded-xl p-4 md:p-6 mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Skeleton className="h-9 w-32" />
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                  <div className="flex items-center gap-2 justify-center sm:justify-end">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-16" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </div>
              </div>

              {/* Info skeleton */}
              <div className="space-y-6 mt-6 md:mt-8">
                <Skeleton className="h-6 md:h-8 w-48" />
                <Skeleton className="h-10 md:h-12 w-full" />
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (videoQuery.isError || !videoQuery.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        <Card className="max-w-md w-full text-center border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10 shadow-xl">
          <CardContent className="pt-8 pb-6">
            <div className="text-7xl mb-6 animate-bounce">😔</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Video Not Found</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              The video you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push("/")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const video = videoQuery.data
  const isFavorite = favorites.includes(videoId)


  if (!video) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        <Card className="max-w-md w-full text-center border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10 shadow-xl">
          <CardContent className="pt-8 pb-6">
            <div className="text-7xl mb-6 animate-bounce">😔</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Video Not Found</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              The video you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push("/")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* App Header */}
      <AppHeader
        favorites={favorites}
        showActions={false}
        backButton={{
          label: "← Back",
          href: "/",
          scroll: false
        }}
      />

      <div className="container mx-auto px-4 pb-8 max-w-5xl lg:max-w-7xl">
        <div className="space-y-8">
          {/* Main Content */}
          <div>
            {/* Video Player */}
            <div className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm rounded-lg">
              <div className=" bg-gradient-to-br from-muted/50 to-muted relative overflow-hidden">
                {video?.hls_master_url ? (
                  <CustomVideoPlayer
                    src={video?.hls_master_url}
                    hlsVariants={video?.hls_playlist_url || []}
                    poster={video?.thumbnail_url || undefined}
                    autoPlay={true}
                    startTime={video?.start_time_seconds || 0}
                    endTime={video?.end_time_seconds || undefined}
                    watermark={{
                      src: "",
                      position: "bottom-right",
                      opacity: 0.8,
                      size: "small",
                      clickUrl: ""
                    }}
                    onTimeUpdate={(currentTime: number) => {
                      debugLog.video('Time update', currentTime)
                    }}
                    onEnded={() => {
                      debugLog.video('Video ended')
                    }}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🎥</div>
                      <p className="text-muted-foreground text-lg">Video URL not available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Title and Preacher Info */}
            <div className="text-center lg:text-left mt-6 md:mt-2">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight tracking-tight mb-4">
                {video.title}
              </h1>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 md:gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  <span className="font-medium text-foreground text-sm md:text-base">{getPreacherName(video) || "Unknown"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm md:text-base">{video.view_count?.toLocaleString() || 'N/A'} views</span>
                </div>
              </div>
            </div>

            {/* Admin Controls - Only visible to admin users */}
            {user?.user_type === 'admin' && (
              <Card className="border-destructive/20 shadow-lg bg-gradient-to-br from-destructive/5 to-destructive/10">
                <CardHeader className="pb-4">
                  <h2 className="text-xl font-bold text-foreground flex items-center">
                    <Sparkles className="w-5 h-5 mr-3 text-destructive" />
                    Admin Controls
                  </h2>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleTranscribeVideo}
                      disabled={actionLoading['transcribe']}
                      variant="outline"
                      className="flex items-center gap-2 border-destructive/30 hover:bg-destructive/10"
                    >
                      <Mic className="w-4 h-4" />
                      {actionLoading['transcribe'] ? 'Transcribing...' : 'Transcribe Video'}
                    </Button>
                    <Button
                      onClick={handleAIAnalysis}
                      disabled={actionLoading['ai-analysis']}
                      variant="outline"
                      className="flex items-center gap-2 border-destructive/30 hover:bg-destructive/10"
                    >
                      <Brain className="w-4 h-4" />
                      {actionLoading['ai-analysis'] ? 'Analyzing...' : 'Generate AI Summary'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    Use these controls to generate transcriptions and AI-powered summaries for this video.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Sermon Notes - Primary Focus */}
            {video.sermon_notes && video.sermon_notes.length > 0 && (
              <Card className="border-primary/20 shadow-lg bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-foreground flex items-center">
                      <BookOpen className="w-6 h-6 mr-3 text-primary" />
                      Sermon Notes
                    </h2>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSection('sermon-notes')}
                        className="h-8 w-8 p-0 hover:bg-primary/10"
                      >
                        {expandedSections['sermon-notes'] ?
                          <ChevronUp className="w-4 h-4" /> :
                          <ChevronDown className="w-4 h-4" />
                        }
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {(expandedSections['sermon-notes'] ? video.sermon_notes : []).map((note: string, index: number) => (
                      <div key={index} className="bg-card/60 rounded-lg p-6 border border-primary/10 shadow-sm relative group">
                        <div className="absolute top-3 right-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(note, `sermon-note-${index}`)}
                            className="h-6 w-6 p-0 hover:bg-primary/10 opacity-60 hover:opacity-100"
                            title="Copy sermon note"
                          >
                            {copiedItems.has(`sermon-note-${index}`) ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                        <p className="text-foreground leading-relaxed text-base whitespace-pre-wrap pr-8">
                          {note}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scripture References - Primary Focus */}
            {video.scripture_references && video.scripture_references.length > 0 && (
              <Card className="border-secondary/20 shadow-lg bg-gradient-to-br from-secondary/5 to-primary/5">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-foreground flex items-center">
                      <Quote className="w-6 h-6 mr-3 text-secondary" />
                      Scripture References
                    </h2>
                    <div className="flex items-center gap-2">
                      {video.scripture_references.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection('scripture-references')}
                          className="h-8 w-8 p-0 hover:bg-secondary/10"
                        >
                          {expandedSections['scripture-references'] ?
                            <ChevronUp className="w-4 h-4" /> :
                            <ChevronDown className="w-4 h-4" />
                          }
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-4 md:grid-cols-2">
                    {(expandedSections['scripture-references'] ? video.scripture_references : []).map((scripture: {reference: string, verse: string}, index: number) => (
                      <div key={index} className="bg-card/60 rounded-lg p-5 border border-secondary/10 shadow-sm hover:shadow-md transition-shadow">
                        <div className="mb-3 flex items-center justify-between">
                          <Badge variant="outline" className="bg-secondary/10 border-secondary/30 text-secondary font-semibold px-3 py-1">
                            {scripture.reference}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(`${scripture.reference}\n"${scripture.verse}"`, `scripture-${index}`)}
                            className="h-6 w-6 p-0 hover:bg-secondary/10 opacity-60 hover:opacity-100"
                            title="Copy scripture"
                          >
                            {copiedItems.has(`scripture-${index}`) ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                        <p className="text-foreground leading-relaxed text-sm italic">
                          "{scripture.verse}"
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Points - Primary Focus */}
            {video.key_points && video.key_points.length > 0 && (
              <Card className="border-accent/20 shadow-lg bg-gradient-to-br from-accent/5 to-primary/5">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-foreground flex items-center">
                      <FileText className="w-6 h-6 mr-3 text-accent" />
                      Key Points
                    </h2>
                    <div className="flex items-center gap-2">
                      {video.key_points.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection('key-points')}
                          className="h-8 w-8 p-0 hover:bg-accent/10"
                        >
                          {expandedSections['key-points'] ?
                            <ChevronUp className="w-4 h-4" /> :
                            <ChevronDown className="w-4 h-4" />
                          }
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-4 md:grid-cols-1">
                    {(expandedSections['key-points'] ? video.key_points : []).map((keyPoint: string, index: number) => (
                      <div key={index} className="bg-card/60 rounded-lg p-5 border border-accent/10 shadow-sm hover:shadow-md transition-shadow">
                        <div className="mb-3 flex items-center justify-between">
                          <Badge variant="outline" className="bg-accent/10 border-accent/30 text-accent font-semibold px-3 py-1">
                            Key Point {index + 1}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(keyPoint, `key-point-${index}`)}
                            className="h-6 w-6 p-0 hover:bg-accent/10 opacity-60 hover:opacity-100"
                            title="Copy key point"
                          >
                            {copiedItems.has(`key-point-${index}`) ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                        <p className="text-foreground leading-relaxed text-base whitespace-pre-wrap">
                          {keyPoint}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>

      {/* AI Generation Modal */}
      {video && (
        <AIGenerationModal
          isOpen={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          videoId={video.id}
          videoTitle={video.title}
          videoDescription={video.description || undefined}
          preacherName={video.preachers?.name}
          onContentGenerated={handleAIContentGenerated}
        />
      )}
    </div>
  )
}
