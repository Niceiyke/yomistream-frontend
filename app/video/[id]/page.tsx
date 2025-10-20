"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Heart,
  Plus,
  Sparkles,
  Clock,
  Eye,
  BookOpen,
  Users,
  Quote,
  Scroll,
  ChevronDown,
  ChevronUp,
  Share2,
  Bookmark,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  MoreVertical,
  ThumbsUp,
  MessageCircle,
  Download,
  Calendar,
  MapPin,
  Globe
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog"
import { AppHeader } from "@/components/app-header"
import { CustomVideoPlayer } from '@/components/custom-video-player'
import { apiGet, apiPost, apiDelete } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { useAuth } from "@/lib/auth-context"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { debugLog } from "@/lib/utils/debug"
import { Video, Preacher } from "@/lib/types"
import { formatDuration, getPreacherName, getPreacherImageUrl, normalizeVideoTags } from "@/lib/utils/video-helpers"
import { MobileVideoActions } from "@/components/mobile-video-actions"
import { MobileVideoSidebar } from "@/components/mobile-video-sidebar"
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
  const [isRetrying, setIsRetrying] = useState(false)
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({})
  const [isScrolled, setIsScrolled] = useState(false)

  const videoId = params.id as string

  // Track scroll for header effects
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
        // Fallback: copy to clipboard
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

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await queryClient.invalidateQueries({ queryKey: ["video", videoId] })
      await queryClient.refetchQueries({ queryKey: ["video", videoId] })
    } catch (error) {
      console.error("Retry failed:", error)
    } finally {
      setIsRetrying(false)
    }
  }

  const setActionLoadingState = (action: string, loading: boolean) => {
    setActionLoading(prev => ({ ...prev, [action]: loading }))
  }

  if (videoQuery.isLoading) {
    return <VideoDetailSkeleton />
  }

  if (videoQuery.isError || !videoQuery.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10 shadow-xl">
          <CardContent className="pt-8 pb-6">
            <div className="text-7xl mb-6 animate-bounce">😔</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Video Not Found</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              The video you're looking for doesn't exist or has been removed.
              This could be due to an expired link or content that was taken down.
            </p>

            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                {isRetrying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Try Again
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="w-full border-border/50 hover:bg-accent/80 transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>

            <div className="mt-6 pt-4 border-t border-border/30">
              <p className="text-xs text-muted-foreground">
                If this problem persists, please contact support.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const video = videoQuery.data
  const isFavorite = favorites.includes(videoId)

  console.log("video", video)

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

        {/* Action Bar with modern design */}
        <div className="border-b border-border/30 bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto">
                {user && (
                  <>
                    <AddToCollectionDialog videoId={videoId}>
                      <Button variant="outline" size="sm" className="border-border/50 hover:bg-accent/80 hover:border-accent transition-all duration-200 whitespace-nowrap">
                        <Plus className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Add to Collection</span>
                        <span className="sm:hidden">Add</span>
                      </Button>
                    </AddToCollectionDialog>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateAI}
                      className="border-border/50 hover:bg-accent/80 hover:border-accent transition-all duration-200 whitespace-nowrap"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Generate AI</span>
                      <span className="sm:hidden">AI</span>
                    </Button>
                  </>
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
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </DropdownMenuItem>
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

      {/* Mobile Action Bar - Visible only on mobile */}
      <div className="lg:hidden border-b border-border/30 bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <MobileVideoActions
            videoId={videoId}
            isFavorite={isFavorite}
            user={user}
            onToggleFavorite={toggleFavorite}
            onGenerateAI={handleGenerateAI}
            onShare={shareVideo}
            className="w-full"
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content - Video and Details */}
          <div className="lg:col-span-8 space-y-8">
            {/* Video Player Section with modern card design */}
            <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-muted/50 to-muted relative overflow-hidden">
                  {video.hls_master_url ? (
                    <CustomVideoPlayer
                      src={video.hls_master_url}
                      hlsVariants={video.hls_playlist_url || []}
                      poster={video.thumbnail_url || undefined}
                      autoPlay={true}
                      startTime={video.start_time_seconds || 0}
                      endTime={video.end_time_seconds || undefined}
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

            {/* Video Info with modern typography */}
            <div className="space-y-6">
              {/* Topic Badge */}
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border-primary/30 shadow-sm font-semibold px-4 py-2">
                  <Globe className="w-4 h-4 mr-2" />
                  {video.topic || "General"}
                </Badge>
              </div>

              {/* Title and Stats */}
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight" id="video-title">
                  {video.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-muted-foreground" role="group" aria-label="Video metadata">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" aria-hidden="true" />
                    <span className="font-medium text-foreground" aria-label={`Preacher: ${getPreacherName(video) || "Unknown"}`}>
                      {getPreacherName(video) || "Unknown"}
                    </span>
                  </div>

                  <Separator orientation="vertical" className="h-4" aria-hidden="true" />

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" aria-hidden="true" />
                    <span aria-label={`Duration: ${formatDuration(video.duration)}`}>
                      {formatDuration(video.duration)}
                    </span>
                  </div>

                  <Separator orientation="vertical" className="h-4" aria-hidden="true" />

                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" aria-hidden="true" />
                    <span aria-label={`View count: ${video.view_count?.toLocaleString() || 'N/A'} views`}>
                      {video.view_count?.toLocaleString() || 'N/A'} views
                    </span>
                  </div>

                  <Separator orientation="vertical" className="h-4" aria-hidden="true" />

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" aria-hidden="true" />
                    <span aria-label={`Published: ${new Date(video.created_at).toLocaleDateString()}`}>
                      {new Date(video.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Engagement Actions */}
              <div className="flex items-center gap-4 pt-4 border-t border-border/50" role="group" aria-label="Engagement actions">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-accent/80 transition-colors"
                  aria-label="Like this video"
                >
                  <ThumbsUp className="w-4 h-4 mr-2" aria-hidden="true" />
                  <span className="hidden sm:inline">Like</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-accent/80 transition-colors"
                  aria-label="Add a comment"
                >
                  <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                  <span className="hidden sm:inline">Comment</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={shareVideo}
                  disabled={actionLoading.share}
                  className="hover:bg-accent/80 transition-colors"
                  aria-label="Share this video"
                >
                  {actionLoading.share ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true" />
                  ) : (
                    <Share2 className="w-4 h-4 mr-2" aria-hidden="true" />
                  )}
                  <span className="hidden sm:inline">Share</span>
                </Button>
              </div>

              {/* Description */}
              {video.description && (
                <Card className="border-border/50 shadow-sm bg-gradient-to-br from-card to-card/50">
                  <CardHeader className="pb-4">
                    <h2 className="text-xl font-semibold text-foreground flex items-center">
                      <Scroll className="w-5 h-5 mr-3 text-primary" />
                      About This Sermon
                    </h2>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-base">
                      {video.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Tags */}
              {normalizeVideoTags(video.tags).length > 0 && (
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="pb-4">
                    <h2 className="text-xl font-semibold text-foreground">Tags</h2>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {normalizeVideoTags(video.tags).map((tag: string, index: number) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-gradient-to-r from-muted/50 to-muted/30 border-border hover:border-primary/50 cursor-pointer transition-all duration-200 hover:shadow-sm"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Preacher Info */}
            <Card className="border-border/50 shadow-lg bg-gradient-to-br from-card to-card/80 sticky top-24">
              <CardHeader className="pb-4">
                <h2 className="text-xl font-semibold text-foreground flex items-center">
                  <Users className="w-5 h-5 mr-3 text-primary" />
                  Preacher
                </h2>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center space-y-4">
                  <Avatar className="w-24 h-24 mx-auto border-4 border-primary/20 shadow-lg">
                    <AvatarImage
                      src={video.preachers?.profile_image_url || video.preachers?.image_url}
                      alt={video.preachers?.name || "Unknown"}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary text-xl font-semibold">
                      {video.preachers?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h3 className="font-bold text-lg text-foreground mb-2">
                      {video.preachers?.name || "Unknown"}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {video.preachers?.bio || "Gospel preacher and teacher dedicated to sharing God's word."}
                    </p>
                  </div>

                  {video.preachers?.church_affiliation && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{video.preachers.church_affiliation}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sermon Summary */}
            {video.description && (
              <Card className="border-border/50 shadow-sm bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground flex items-center">
                      <Scroll className="w-5 h-5 mr-3 text-primary" />
                      Sermon Summary
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSection('summary')}
                      className="h-8 w-8 p-0 hover:bg-primary/10"
                    >
                      {expandedSections.has('summary') ?
                        <ChevronUp className="w-4 h-4" /> :
                        <ChevronDown className="w-4 h-4" />
                      }
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className={cn(
                    "text-sm text-muted-foreground leading-relaxed transition-all duration-300",
                    expandedSections.has('summary') ? "" : "line-clamp-4"
                  )}>
                    {video.description}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scripture References */}
            {video.scripture_references && video.scripture_references.length > 0 && (
              <Card className="border-border/50 shadow-sm bg-gradient-to-br from-secondary/5 to-primary/5">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground flex items-center">
                      <Quote className="w-5 h-5 mr-3 text-secondary" />
                      Bible Excerpts
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSection('scripture')}
                      className="h-8 w-8 p-0 hover:bg-secondary/10"
                    >
                      {expandedSections.has('scripture') ?
                        <ChevronUp className="w-4 h-4" /> :
                        <ChevronDown className="w-4 h-4" />
                      }
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {(expandedSections.has('scripture') ? video.scripture_references : video.scripture_references.slice(0, 3)).map((ref: any, index: number) => (
                      <div key={index} className="bg-card/50 rounded-lg p-4 border border-border/30 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                            {ref.book} {ref.chapter}:{ref.verse}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground italic leading-relaxed">
                          "{ref.text}"
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sermon Notes */}
            {video.sermon_notes && video.sermon_notes.length > 0 && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground flex items-center">
                      <BookOpen className="w-5 h-5 mr-3 text-primary" />
                      Sermon Notes
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSection('notes')}
                      className="h-8 w-8 p-0 hover:bg-primary/10"
                    >
                      {expandedSections.has('notes') ?
                        <ChevronUp className="w-4 h-4" /> :
                        <ChevronDown className="w-4 h-4" />
                      }
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {(expandedSections.has('notes') ? video.sermon_notes : video.sermon_notes.slice(0, 3)).map((note: string, index: number) => (
                      <div key={index} className="bg-muted/30 rounded-lg p-4 border-l-4 border-primary/30 shadow-sm">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {note}
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

// Modern skeleton loader component
function VideoDetailSkeleton() {
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
