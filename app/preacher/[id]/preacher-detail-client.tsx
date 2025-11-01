"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Heart,
  Users,
  Eye,
  BookOpen,
  Share2,
  Check,
  ExternalLink,
  Calendar,
  MapPin,
  Globe,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Mail,
  Phone,
  Building,
  Award,
  PlayCircle,
  Clock,
  Star,
  Menu
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { apiGet, apiPost, apiDelete } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { useAuth } from "@/lib/auth-context"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { debugLog } from "@/lib/utils/debug"
import { Preacher, Video } from "@/lib/types"
import { formatDuration, getPreacherName } from "@/lib/utils/video-helpers"
import { AppHeader } from "@/components/app-header"
import { preacherApi } from "@/lib/services/preacher-api"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { ShareDialog } from "@/components/share-dialog"

interface PreacherDetailClientProps {
  initialPreacher: Preacher | null
}

export default function PreacherDetailClient({ initialPreacher }: PreacherDetailClientProps) {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { toast } = useToast()

  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({})
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [videosPage, setVideosPage] = useState(1)
  const [allVideos, setAllVideos] = useState<Video[]>([])

  const preacherId = params.id as string

  // Helper function to update action loading state
  const setActionLoadingState = (action: string, loading: boolean) => {
    setActionLoading(prev => ({ ...prev, [action]: loading }))
  }

  // Fetch preacher details - use initial data if available
  const preacherQuery = useQuery({
    queryKey: ["preacher", preacherId],
    queryFn: () => preacherApi.getPreacher(preacherId),
    initialData: initialPreacher,
    staleTime: 10 * 60 * 1000, // 10 minutes - matches server revalidation
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false, // Don't refetch if we have fresh server data
    refetchOnWindowFocus: false, // Avoid unnecessary refetches
    enabled: !!preacherId,
  })

  // Fetch preacher videos with pagination
  const videosQuery = useQuery({
    queryKey: ["preacher-videos", preacherId, videosPage],
    queryFn: async () => {
      const response = await preacherApi.getPreacherVideos(preacherId, {
        skip: (videosPage - 1) * 20,
        limit: 20,
        status_filter: "published"
      })
      return response || []
    },
    enabled: !!preacherId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  })

  // Check if current user follows this preacher
  const followStatusQuery = useQuery({
    queryKey: ["follow-status", preacherId, user?.id],
    queryFn: async () => {
      if (!user?.id) return false
      return preacherApi.checkFollowStatus(preacherId)
    },
    enabled: !!user?.id && !!preacherId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Fetch preacher stats - optional, don't fail if missing
  const statsQuery = useQuery({
    queryKey: ["preacher-stats", preacherId],
    queryFn: () => preacherApi.getPreacherStats(preacherId),
    enabled: !!preacherId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry if stats don't exist
  })

  // Combine videos from all pages
  useEffect(() => {
    if (videosQuery.data) {
      if (videosPage === 1) {
        setAllVideos(videosQuery.data)
      } else {
        setAllVideos(prev => [...prev, ...videosQuery.data])
      }
    }
  }, [videosQuery.data, videosPage])

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to follow preachers."
      })
      router.push("/auth/login")
      return
    }
    if (!preacherQuery.data) return

    const actionKey = 'follow'
    const isFollowing = followStatusQuery.data
    setActionLoadingState(actionKey, true)

    try {
      if (isFollowing) {
        // Unfollow
        await preacherApi.unfollowPreacher(preacherId)
        toast({
          title: "Unfollowed",
          description: `You are no longer following ${preacherQuery.data.name}.`,
        })
      } else {
        // Follow
        await preacherApi.followPreacher(preacherId, { notify_on_upload: true })
        toast({
          title: "Following!",
          description: `You are now following ${preacherQuery.data.name}. You'll be notified of new uploads.`,
        })
      }

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["preacher", preacherId] })
      queryClient.invalidateQueries({ queryKey: ["follow-status", preacherId, user?.id] })
    } catch (error: any) {
      console.error("Error toggling follow:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update follow status. Please try again."
      })
    } finally {
      setActionLoadingState(actionKey, false)
    }
  }

  // Load more videos
  const handleLoadMoreVideos = () => {
    if (!videosQuery.isFetching) {
      setVideosPage(prev => prev + 1)
    }
  }

  // Get social media icon
  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'twitter': return Twitter
      case 'facebook': return Facebook
      case 'instagram': return Instagram
      case 'youtube': return Youtube
      default: return ExternalLink
    }
  }

  // Format social links
  const formatSocialLink = (platform: string, url: string) => {
    if (url.startsWith('http')) return url
    switch (platform.toLowerCase()) {
      case 'twitter': return `https://twitter.com/${url}`
      case 'facebook': return `https://facebook.com/${url}`
      case 'instagram': return `https://instagram.com/${url}`
      case 'youtube': return `https://youtube.com/${url}`
      default: return url
    }
  }

  // Show loading only if we don't have initial data and are fetching
  if (preacherQuery.isLoading && !initialPreacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/30 dark:to-purple-950/20">
        {/* Header skeleton */}
        <div className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800" />

        <div className="container mx-auto px-4 lg:px-6 max-w-[1600px]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-8">
            {/* Main content skeleton */}
            <div className="lg:col-span-8 space-y-8">
              {/* Banner skeleton */}
              <div className="aspect-[3/1] w-full bg-muted animate-pulse rounded-lg" />

              {/* Preacher info skeleton */}
              <div className="space-y-6">
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 bg-muted animate-pulse rounded-full" />
                  <div className="flex-1 space-y-4">
                    <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-6 w-full bg-muted animate-pulse rounded" />
                    <div className="flex gap-4">
                      <div className="h-9 w-20 bg-muted animate-pulse rounded" />
                      <div className="h-9 w-16 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Videos skeleton */}
              <div className="space-y-4">
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="aspect-video w-full bg-muted animate-pulse rounded" />
                      <div className="h-4 w-full bg-muted animate-pulse rounded" />
                      <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar skeleton */}
            <div className="lg:col-span-4 space-y-6">
              <div className="space-y-4">
                <div className="h-6 w-24 bg-muted animate-pulse rounded" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-4/6 bg-muted animate-pulse rounded" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-6 w-20 bg-muted animate-pulse rounded" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-16 w-full bg-muted animate-pulse rounded" />
                  <div className="h-16 w-full bg-muted animate-pulse rounded" />
                  <div className="h-16 w-full bg-muted animate-pulse rounded" />
                  <div className="h-16 w-full bg-muted animate-pulse rounded" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-6 w-28 bg-muted animate-pulse rounded" />
                <div className="space-y-2">
                  <div className="h-8 w-full bg-muted animate-pulse rounded" />
                  <div className="h-8 w-full bg-muted animate-pulse rounded" />
                  <div className="h-8 w-3/4 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (preacherQuery.isError || !preacherQuery.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/30 dark:to-purple-950/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center border-red-200 dark:border-red-800 bg-gradient-to-br from-white via-red-50/50 to-orange-50/30 dark:from-slate-900 dark:via-red-950/50 dark:to-orange-950/30 shadow-2xl">
          <CardContent className="pt-12 pb-10 px-8">
            <div className="text-7xl mb-6 animate-bounce">🙏</div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Preacher Not Found</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed text-lg">
              The preacher you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push("/")} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const preacher = preacherQuery.data
  const stats = statsQuery.data

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/30 dark:to-purple-950/20">
      {/* App Header */}
      <AppHeader
        showActions={true}
        backButton={{
          label: "← Back",
          onClick: () => router.back(),
          scroll: false
        }}
      />

      <div className="container mx-auto px-4 lg:px-6 max-w-[1600px] py-8">
        {/* Banner */}
        {preacher.banner_url && (
          <div className="relative mb-8 rounded-xl overflow-hidden shadow-lg">
            <div className="aspect-[3/1] relative">
              <img
                src={preacher.banner_url}
                alt={`${preacher.name} banner`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          </div>
        )}

        {/* Preacher Header - Full Width */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 lg:p-8 shadow-xl border border-slate-200 dark:border-slate-700 mb-10">
          <div className="flex flex-col sm:flex-row gap-6 lg:gap-8">
            <Avatar className="w-28 h-28 sm:w-36 sm:h-36 border-4 border-white dark:border-slate-700 shadow-2xl ring-2 ring-blue-200 dark:ring-blue-800">
              <AvatarImage src={preacher.image_url || preacher.profile_image_url || undefined} alt={preacher.name} />
              <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 text-blue-700 dark:text-blue-300">
                {preacher.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-5">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-3 bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
                  {preacher.name}
                </h1>
                {preacher.is_verified && (
                  <Badge variant="secondary" className="mb-3 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 px-3 py-1">
                    <Check className="w-4 h-4 mr-1" />
                    Verified Preacher
                  </Badge>
                )}
                <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-400">
                  {preacher.denomination && (
                    <span className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg">
                      <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      {preacher.denomination}
                    </span>
                  )}
                  {preacher.church_affiliation && (
                    <span className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg">
                      <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      {preacher.church_affiliation}
                    </span>
                  )}
                </div>
              </div>

              {preacher.bio && (
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl text-base">
                  {preacher.bio}
                </p>
              )}

              {/* Preaches message */}
              {preacher.ministry_focus && preacher.ministry_focus.length > 0 && (
                <div className="flex items-start gap-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    <strong className="text-blue-700 dark:text-blue-300">{preacher.name}</strong> preaches on topics like: <strong className="text-purple-700 dark:text-purple-300">{preacher.ministry_focus.slice(0, 3).join(', ')}</strong>
                    {preacher.ministry_focus.length > 3 && `, and ${preacher.ministry_focus.length - 3} more`}
                  </span>
                </div>
              )}

              {/* Statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-t border-slate-200 dark:border-slate-700">
                <div className="text-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{(preacher.follower_count ?? 0).toLocaleString()}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">Followers</div>
                </div>
                <div className="text-center bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{(preacher.video_count ?? 0).toLocaleString()}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">Sermons</div>
                </div>
                <div className="text-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 p-4 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">{(preacher.total_views ?? 0).toLocaleString()}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">Total Views</div>
                </div>
                <div className="text-center bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/50 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {statsQuery.isLoading ? '...' : Math.round(((stats?.total_watch_time ?? 0) / 3600))}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">Hours Watched</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleFollowToggle}
                  variant={followStatusQuery.data ? "default" : "outline"}
                  size="sm"
                  disabled={actionLoading.follow || followStatusQuery.isLoading}
                  className={cn(
                    "flex items-center gap-2 transition-all rounded-xl px-5 py-2.5 shadow-md",
                    followStatusQuery.data
                      ? "bg-pink-600 hover:bg-pink-700 text-white border-pink-600"
                      : "bg-white dark:bg-slate-800 border-pink-200 dark:border-pink-800 hover:bg-pink-100 dark:hover:bg-pink-900/30 hover:border-pink-300 dark:hover:border-pink-700"
                  )}
                >
                  {actionLoading.follow || followStatusQuery.isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span className="font-semibold">Loading...</span>
                    </>
                  ) : followStatusQuery.data ? (
                    <>
                      <Heart className="w-5 h-5 fill-current" />
                      <span className="font-semibold">Following</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Follow</span>
                    </>
                  )}
                </Button>

                <ShareDialog
                  content={{
                    title: preacher.name,
                    text: `Check out ${preacher.name} on Wordlyte`,
                    url: typeof window !== "undefined" ? window.location.href : "",
                    type: "custom"
                  }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 bg-white dark:bg-slate-800 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-700 transition-all rounded-xl px-5 py-2.5 shadow-md"
                  >
                    <Share2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Share</span>
                  </Button>
                </ShareDialog>

                {preacher.website_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={preacher.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all rounded-xl px-5 py-2.5 shadow-md">
                      <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Website</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Hamburger Menu Button */}
        <div className="lg:hidden flex justify-start mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-all rounded-xl px-4 py-2"
          >
            <Menu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">{mobileSidebarOpen ? 'Hide Menu' : 'Show Menu'}</span>
          </Button>
        </div>

        {/* Content Grid Below Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
          {/* Mobile overlay when sidebar is open */}
          {mobileSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}

          {/* Main Content - Videos Section */}
          <div className="lg:col-span-8 space-y-6">
            {/* Sermons/Videos Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white/80 dark:bg-slate-800/80 p-5 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span>Sermons & Teachings</span>
                  <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 px-3 py-1">{preacher.video_count ?? 0} videos</Badge>
                </h2>
              </div>

              {/* Videos Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {allVideos.map((video) => (
                  <Card key={video.id} className="group hover:shadow-xl transition-all duration-200 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm overflow-hidden rounded-2xl">
                    <div className="relative">
                      <Link href={`/video/${video.id}`}>
                        <div className="aspect-video relative overflow-hidden rounded-t-lg bg-muted">
                          {video.thumbnail_url ? (
                            <img
                              src={video.thumbnail_url}
                              alt={video.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
                              <PlayCircle className="w-12 h-12 text-muted-foreground/50" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                            {formatDuration(video.duration || 0)}
                          </div>
                        </div>
                      </Link>
                    </div>

                    <CardContent className="p-4">
                      <Link href={`/video/${video.id}`}>
                        <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                          {video.title}
                        </h3>
                      </Link>

                      {video.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {video.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {video.view_count?.toLocaleString() || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {video.like_count || 0}
                          </span>
                        </div>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(video.published_at || video.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Load More Button */}
              {videosQuery.data && videosQuery.data.length === 20 && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={handleLoadMoreVideos}
                    disabled={videosQuery.isFetching}
                    className="min-w-48 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 rounded-xl py-6 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    {videosQuery.isFetching ? (
                      <>
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load More Sermons'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className={cn("lg:col-span-4 space-y-6 z-50", mobileSidebarOpen ? "block" : "hidden lg:block")}>
            {/* Ministry Focus */}
            {preacher.ministry_focus && preacher.ministry_focus.length > 0 && (
              <Card className="border-amber-200/60 dark:border-amber-800/40 shadow-xl bg-gradient-to-br from-white via-amber-50/50 to-orange-50/30 dark:from-slate-900 dark:via-amber-950/50 dark:to-orange-950/30 backdrop-blur-sm">
                <CardHeader className="pb-4 border-b border-amber-100 dark:border-amber-900/50">
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                      <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span>Ministry Focus</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-2">
                    {preacher.ministry_focus.map((focus, index) => (
                      <Badge key={index} variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 px-3 py-1">
                        {focus}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Social Links */}
            {preacher.social_links && Object.keys(preacher.social_links).length > 0 && (
              <Card className="border-blue-200/60 dark:border-blue-800/40 shadow-xl bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/30 dark:from-slate-900 dark:via-blue-950/50 dark:to-indigo-950/30 backdrop-blur-sm">
                <CardHeader className="pb-4 border-b border-blue-100 dark:border-blue-900/50">
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                      <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span>Connect</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {Object.entries(preacher.social_links).map(([platform, url]) => {
                    const Icon = getSocialIcon(platform)
                    return (
                      <Button
                        key={platform}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all rounded-xl py-2.5 shadow-sm"
                        asChild
                      >
                        <a
                          href={formatSocialLink(platform, url as string)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Icon className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                        </a>
                      </Button>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Contact Information */}
            {(preacher.website_url || preacher.theological_position) && (
              <Card className="border-purple-200/60 dark:border-purple-800/40 shadow-xl bg-gradient-to-br from-white via-purple-50/50 to-pink-50/30 dark:from-slate-900 dark:via-purple-950/50 dark:to-pink-950/30 backdrop-blur-sm">
                <CardHeader className="pb-4 border-b border-purple-100 dark:border-purple-900/50">
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                      <Building className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span>About</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {preacher.theological_position && (
                    <div className="flex items-start gap-3 bg-purple-50 dark:bg-purple-950/50 p-3 rounded-xl border border-purple-200 dark:border-purple-800">
                      <Star className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">Theological Position</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{preacher.theological_position}</div>
                      </div>
                    </div>
                  )}

                  {preacher.website_url && (
                    <div className="flex items-start gap-3 bg-purple-50 dark:bg-purple-950/50 p-3 rounded-xl border border-purple-200 dark:border-purple-800">
                      <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">Website</div>
                        <Button variant="link" size="sm" className="h-auto p-0 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold" asChild>
                          <a href={preacher.website_url} target="_blank" rel="noopener noreferrer">
                            Visit Website →
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
