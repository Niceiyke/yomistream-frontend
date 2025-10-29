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
    queryFn: () => {
      console.log(`🌐 CLIENT: Fetching preacher ${preacherId} from client-side`)
      return preacherApi.getPreacher(preacherId)
    },
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
      try {
        // Try to get follower count - if it succeeds, user follows
        await preacherApi.getFollowerCount(preacherId)
        return true
      } catch (error) {
        // If it fails, user doesn't follow
        return false
      }
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
      router.push("/auth/login")
      return
    }
    if (!preacherQuery.data) return

    const actionKey = 'follow'
    setActionLoadingState(actionKey, true)

    try {
      // For now, we'll attempt to follow and handle the response
      // In a real implementation, you'd check current follow status first
      await preacherApi.followPreacher(preacherId, { notify_on_upload: true })

      toast({
        title: "Following!",
        description: `You are now following ${preacher.name}.`,
      })

      // Refresh preacher data to update follower count
      queryClient.invalidateQueries({ queryKey: ["preacher", preacherId] })
    } catch (error: any) {
      // If already following, try to unfollow
      if (error.message?.includes("Already following")) {
        try {
          await preacherApi.unfollowPreacher(preacherId)

          toast({
            title: "Unfollowed",
            description: `You are no longer following ${preacher.name}.`,
          })

          // Refresh preacher data to update follower count
          queryClient.invalidateQueries({ queryKey: ["preacher", preacherId] })
        } catch (unfollowError) {
          console.error("Error unfollowing:", unfollowError)
          toast({
            title: "Error",
            description: "Failed to unfollow. Please try again.",
          })
        }
      } else {
        console.error("Error following:", error)
        toast({
          title: "Error",
          description: "Failed to follow. Please try again.",
        })
      }
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

  console.log('Preacher query data:', preacherQuery.data)
  console.log('Videos query data:', videosQuery.data)

  // Show loading only if we don't have initial data and are fetching
  if (preacherQuery.isLoading && !initialPreacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        {/* Header skeleton */}
        <div className="h-16 bg-background/80 backdrop-blur-lg border-b border-border/50" />

        <div className="container mx-auto px-4 max-w-6xl">
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex items-center justify-center">
        <Card className="max-w-md w-full text-center border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10 shadow-xl">
          <CardContent className="pt-8 pb-6">
            <div className="text-7xl mb-6 animate-bounce">🙏</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Preacher Not Found</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              The preacher you're looking for doesn't exist or has been removed.
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

  const preacher = preacherQuery.data
  const stats = statsQuery.data

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* App Header */}
      <AppHeader
        showActions={false}
        backButton={{
          label: "← Back",
          href: "/",
          scroll: false
        }}
      />

      <div className="container mx-auto px-4 max-w-6xl py-6">
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
        <div className="bg-card/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-border/50 mb-8">
          <div className="flex flex-col sm:flex-row gap-6">
            <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-background shadow-lg">
              <AvatarImage src={preacher.image_url || preacher.profile_image_url || undefined} alt={preacher.name} />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-secondary/20">
                {preacher.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  {preacher.name}
                </h1>
                {preacher.is_verified && (
                  <Badge variant="secondary" className="mb-2">
                    <Check className="w-3 h-3 mr-1" />
                    Verified Preacher
                  </Badge>
                )}
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {preacher.denomination && (
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {preacher.denomination}
                    </span>
                  )}
                  {preacher.church_affiliation && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {preacher.church_affiliation}
                    </span>
                  )}
                </div>
              </div>

              {preacher.bio && (
                <p className="text-muted-foreground leading-relaxed max-w-2xl">
                  {preacher.bio}
                </p>
              )}

              {/* Preaches message */}
              {preacher.ministry_focus && preacher.ministry_focus.length > 0 && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <span className="text-sm">
                    <strong>{preacher.name}</strong> preaches on topics like: {preacher.ministry_focus.slice(0, 3).join(', ')}
                    {preacher.ministry_focus.length > 3 && `, and ${preacher.ministry_focus.length - 3} more`}
                  </span>
                </div>
              )}

              {/* Statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-t border-border/20">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{preacher.follower_count?.toLocaleString() || 0}</div>
                  <div className="text-xs text-muted-foreground">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{preacher.video_count?.toLocaleString() || 0}</div>
                  <div className="text-xs text-muted-foreground">Sermons</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{preacher.total_views?.toLocaleString() || 0}</div>
                  <div className="text-xs text-muted-foreground">Total Views</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">
                    {statsQuery.isLoading ? '...' : (stats ? Math.round((stats.total_watch_time || 0) / 3600) : 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Hours Watched</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleFollowToggle}
                  variant="outline"
                  size="sm"
                  disabled={actionLoading.follow}
                  className="flex items-center gap-2"
                >
                  {actionLoading.follow ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4" />
                      Follow
                    </>
                  )}
                </Button>

                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>

                {preacher.website_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={preacher.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Website
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Hamburger Menu Button */}
        <div className="lg:hidden flex justify-start mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="flex items-center gap-2"
          >
            <Menu className="w-4 h-4" />
            {mobileSidebarOpen ? 'Hide Menu' : 'Show Menu'}
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
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Sermons & Teachings
                  <Badge variant="secondary">{preacher.video_count} videos</Badge>
                </h2>
              </div>

              {/* Videos Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {allVideos.map((video) => (
                  <Card key={video.id} className="group hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/20">
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
                    className="min-w-32"
                  >
                    {videosQuery.isFetching ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
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
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    Ministry Focus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {preacher.ministry_focus.map((focus, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {focus}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Social Links */}
            {preacher.social_links && Object.keys(preacher.social_links).length > 0 && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    Connect
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(preacher.social_links).map(([platform, url]) => {
                    const Icon = getSocialIcon(platform)
                    return (
                      <Button
                        key={platform}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        asChild
                      >
                        <a
                          href={formatSocialLink(platform, url as string)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Icon className="w-4 h-4 mr-2" />
                          {platform.charAt(0).toUpperCase() + platform.slice(1)}
                        </a>
                      </Button>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Contact Information */}
            {(preacher.website_url || preacher.theological_position) && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building className="w-5 h-5 text-primary" />
                    About
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {preacher.theological_position && (
                    <div className="flex items-start gap-3">
                      <Star className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium">Theological Position</div>
                        <div className="text-sm text-muted-foreground">{preacher.theological_position}</div>
                      </div>
                    </div>
                  )}

                  {preacher.website_url && (
                    <div className="flex items-start gap-3">
                      <Globe className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium">Website</div>
                        <Button variant="link" size="sm" className="h-auto p-0 text-sm" asChild>
                          <a href={preacher.website_url} target="_blank" rel="noopener noreferrer">
                            Visit Website
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
