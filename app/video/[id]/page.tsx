"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Heart,
  Plus,
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
  Globe
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { formatDuration, getPreacherName, getPreacherImageUrl } from "@/lib/utils/video-helpers"
import { AIGenerationModal } from "@/components/ai-generation-modal"
import { cn } from "@/lib/utils"

export default function VideoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [favorites, setFavorites] = useState<string[]>([])
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({})
  const [isScrolled, setIsScrolled] = useState(false)

  const videoId = params.id as string

  // Track scroll for header effects
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Helper function to update action loading state
  const setActionLoadingState = (action: string, loading: boolean) => {
    setActionLoading(prev => ({ ...prev, [action]: loading }))
  }

  // Fetch video details
  const videoQuery = useQuery({
    queryKey: ["video", videoId],
    queryFn: () => apiGet(`/api/v1/videos/${videoId}`),
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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  if (videoQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        {/* Header skeleton */}
        <div className="h-16 bg-background/80 backdrop-blur-lg border-b border-border/50" />

        {/* Action bar skeleton */}
        <div className="border-b border-border/30 bg-card/30 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-24" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main content skeleton */}
            <div className="lg:col-span-8 space-y-8">
              {/* Video player skeleton */}
              <Skeleton className="aspect-video w-full rounded-lg" />

              {/* Info skeleton */}
              <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-12 w-full" />
                <div className="flex gap-4">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-9 w-16" />
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-16" />
                </div>
              </div>
            </div>

            {/* Sidebar skeleton */}
            <div className="lg:col-span-4 space-y-6">
              <Skeleton className="h-64 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-40 w-full rounded-lg" />
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

  console.log("video data:", video)
  console.log("sermon_notes:", video?.sermon_notes)
  console.log("sermon_notes type:", typeof video?.sermon_notes)
  console.log("sermon_notes length:", video?.sermon_notes?.length)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header with glassmorphism effect */}
      <div className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        isScrolled ? "bg-background/80 backdrop-blur-lg border-b border-border/50" : "bg-transparent"
      )}>
        <AppHeader
          favorites={favorites}
          showActions={false}
          backButton={{
            label: "← Back",
            href: "/",
            scroll: false
          }}
        />

        {/* Clean Action Bar */}
        <div className="border-b border-border/30 bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border-primary/30 shadow-sm font-semibold px-4 py-2">
                  <Globe className="w-4 h-4 mr-2" />
                  {video.topic || "General"}
                </Badge>
                {user && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAI}
                    className="border-border/50 hover:bg-accent/80 hover:border-accent transition-all duration-200"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFavorite}
                  disabled={actionLoading.favorite}
                  className={cn(
                    "border-border/50 hover:border-accent transition-all duration-200",
                    isFavorite ? "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20" : "hover:bg-accent/80"
                  )}
                >
                  {actionLoading.favorite ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Heart className={cn("w-4 h-4 mr-2 transition-all", isFavorite && "fill-current scale-110")} />
                  )}
                  <span className="hidden sm:inline">{isFavorite ? "Favorited" : "Favorite"}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={shareVideo}
                  disabled={actionLoading.share}
                  className="border-border/50 hover:bg-accent/80 hover:border-accent transition-all duration-200"
                >
                  {actionLoading.share ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Share2 className="w-4 h-4 mr-2" />
                  )}
                  <span className="hidden sm:inline">Share</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="border-border/50 hover:bg-accent/80 hover:border-accent transition-all duration-200">
                      <Bookmark className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>
                      <Bookmark className="w-4 h-4 mr-2" />
                      Save for Later
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      Report Video
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="space-y-8">
          {/* Main Content */}
          <div className="space-y-8">
            {/* Video Player */}
            <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-muted/50 to-muted relative overflow-hidden">
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
                      logo={getPreacherImageUrl(video) ? {
                        src: getPreacherImageUrl(video)!,
                        position: "top-left",
                        size: "medium",
                        showDuration: 15,
                        clickUrl: `https://yomistream.com/preacher/${video.preacher_id}`
                      } : undefined}
                      onTimeUpdate={(currentTime) => {
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
              </CardContent>
            </Card>

            {/* Title and Preacher Info */}
            <div className="text-center lg:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight mb-4">
                {video.title}
              </h1>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">{getPreacherName(video) || "Unknown"}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>{video.view_count?.toLocaleString() || 'N/A'} views</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sermon Notes - Primary Focus */}
            {video.sermon_notes && video.sermon_notes.length > 0 && (
              <Card className="border-primary/20 shadow-lg bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-foreground flex items-center">
                      <BookOpen className="w-6 h-6 mr-3 text-primary" />
                      Sermon Notes
                    </h2>
                    {video.sermon_notes.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSection('sermon-notes')}
                        className="h-8 w-8 p-0 hover:bg-primary/10"
                      >
                        {expandedSections.has('sermon-notes') ?
                          <ChevronUp className="w-4 h-4" /> :
                          <ChevronDown className="w-4 h-4" />
                        }
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {(expandedSections.has('sermon-notes') ? video.sermon_notes : video.sermon_notes.slice(0, 1)).map((note: string, index: number) => (
                      <div key={index} className="bg-card/60 rounded-lg p-6 border border-primary/10 shadow-sm">
                        <p className="text-foreground leading-relaxed text-base whitespace-pre-wrap">
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
                  <h2 className="text-2xl font-bold text-foreground flex items-center">
                    <Quote className="w-6 h-6 mr-3 text-secondary" />
                    Scripture References
                  </h2>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-4 md:grid-cols-2">
                    {video.scripture_references.map((scripture: any, index: number) => (
                      <div key={index} className="bg-card/60 rounded-lg p-5 border border-secondary/10 shadow-sm hover:shadow-md transition-shadow">
                        <div className="mb-3">
                          <Badge variant="outline" className="bg-secondary/10 border-secondary/30 text-secondary font-semibold px-3 py-1">
                            {scripture.reference}
                          </Badge>
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
