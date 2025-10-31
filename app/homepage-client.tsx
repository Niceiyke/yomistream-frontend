"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Play, Heart, Users, Filter, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PreacherCard } from "@/components/preacher-card"
import { FixedVideoCard } from "@/components/video-card-fixed"
import { TagFilter } from "@/components/tag-filter"
import { AIGenerationModal } from "@/components/ai-generation-modal"
import { AppHeader } from "@/components/app-header"
import { SimplePerformanceDashboard } from "@/components/simple-performance-dashboard"
import { apiGet, apiGetCached, apiPost, apiDelete } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Video, Preacher } from "@/lib/types"
import { getAllUniqueTags, videoHasTag, formatDuration, getPreacherName, getPreacherId, normalizeVideoTags, getPreacherImageUrl } from "@/lib/utils/video-helpers"

interface UserFavorite {
  id: string
  video_id: string
  created_at: string
}

interface HomepageClientProps {
  initialVideos: Video[]
  initialPreachers: Preacher[]
}

export default function GospelPlatform({ initialVideos, initialPreachers }: HomepageClientProps) {
  // Removed selectedVideo state as videos now open in dedicated pages
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTopic, setSelectedTopic] = useState("all")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [preacherFavorites, setPreacherFavorites] = useState<string[]>([])
  const [filteredPreacherId, setFilteredPreacherId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"videos" | "preachers">("videos")
  const [showTagFilter, setShowTagFilter] = useState(false)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [selectedVideoForAI, setSelectedVideoForAI] = useState<Video | null>(null)
  const [videos, setVideos] = useState<Video[]>(initialVideos)
  const [preachers, setPreachers] = useState<Preacher[]>(initialPreachers)
  const [error, setError] = useState<string | null>(null)
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false)

  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const scrollPositionRef = useRef<number>(0)
  const hasRestoredScroll = useRef(false)


  // React Query: videos & preachers - use initial data if available
  const videosQuery = useQuery({
    queryKey: ["videos"],
    queryFn: async () => {
      console.log(`🌐 CLIENT: Fetching videos from client-side`);
      const response = await apiGetCached("/api/v1/videos/");
      // Extract items array from paginated response
      return response.items || [];
    },
    initialData: initialVideos,
    staleTime: 30 * 1000, // 30 seconds - responsive to view count changes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false, // Don't refetch if we have fresh server data
    refetchOnWindowFocus: true, // Refetch when window regains focus
  })
  const preachersQuery = useQuery({
    queryKey: ["preachers"],
    queryFn: () => {
      console.log(`🌐 CLIENT: Fetching preachers from client-side`);
      return apiGetCached("/api/v1/public/preachers");
    },
    initialData: initialPreachers,
    staleTime: 15 * 60 * 1000, // 15 minutes - matches server revalidation
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false, // Don't refetch if we have fresh server data
    refetchOnWindowFocus: false, // Avoid unnecessary refetches
  })

  useEffect(() => {
    if (videosQuery.data) setVideos(videosQuery.data)
    if (preachersQuery.data) setPreachers(preachersQuery.data)
    // manage error flags
    if (videosQuery.isError || preachersQuery.isError) {
      setError("Failed to load data")
    }
  }, [videosQuery.data, preachersQuery.data, videosQuery.isError, preachersQuery.isError])


  console.log("videos", videos)
  
  // React Query: favorites (dependent on user)
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

  const preacherFavoritesQuery = useQuery({
    queryKey: ["preacherFavorites", user?.id],
    queryFn: async () => {
      const accessToken = await getAccessTokenCached()
      const favs = await apiGet("/api/v1/favorites/preachers", {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      return favs?.preacher_ids || []
    },
    enabled: !!user?.id,
  })

  useEffect(() => {
    if (favoritesQuery.data) setFavorites(favoritesQuery.data)
    if (preacherFavoritesQuery.data) setPreacherFavorites(preacherFavoritesQuery.data)
  }, [favoritesQuery.data, preacherFavoritesQuery.data])

  // Restore scroll position when returning to page
  useEffect(() => {
    // Check if we're returning from a navigation
    const savedScrollPosition = sessionStorage.getItem('mainPageScrollPosition')

    if (savedScrollPosition && !hasRestoredScroll.current && videos && videos.length > 0) {
      hasRestoredScroll.current = true

      // Wait for images and content to load
      const restoreScroll = () => {
        const scrollPos = parseInt(savedScrollPosition, 10)
        console.log('Restoring scroll to:', scrollPos) // Debug log
        window.scrollTo(0, scrollPos)
        sessionStorage.removeItem('mainPageScrollPosition')
      }

      // Try multiple times to ensure content is rendered
      setTimeout(restoreScroll, 100)
    }
  }, [videos?.length])

  // Also listen for browser back button
  useEffect(() => {
    const handlePopState = () => {
      const savedScrollPosition = sessionStorage.getItem('mainPageScrollPosition')
      if (savedScrollPosition) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedScrollPosition, 10))
          sessionStorage.removeItem('mainPageScrollPosition')
        }, 100)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Save scroll position before navigating away
  const handleVideoClick = (videoId: string) => {
    const currentScroll = window.scrollY
    console.log('Saving scroll position:', currentScroll) // Debug log
    sessionStorage.setItem('mainPageScrollPosition', currentScroll.toString())
    router.push(`/video/${videoId}`)
  }

  // Toggle favorites via API then invalidate queries
  const toggleFavorite = async (videoId: string) => {
    if (!user) {
      router.push("/auth/login")
      return
    }
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
    }
  }

  const togglePreacherFavorite = async (preacherId: string) => {
    if (!user) {
      router.push("/auth/login")
      return
    }
    const isFavorite = preacherFavorites.includes(preacherId)
    const accessToken = await getAccessTokenCached()
    const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    try {
      if (isFavorite) {
        await apiDelete(`/api/v1/favorites/preachers/${preacherId}`, { headers })
      } else {
        await apiPost("/api/v1/favorites/preachers", { preacher_id: preacherId }, { headers })
      }
      await queryClient.invalidateQueries({ queryKey: ["preacherFavorites", user.id] })
    } catch (error) {
      console.error("Error toggling preacher favorite:", error)
    }
  }

  const handleViewPreacherSermons = (preacherId: string, preacherName: string) => {
    // Navigate to the preacher detail page
    router.push(`/preacher/${preacherId}`)
  }

  const handleSignOut = async () => {
    await signOut()
    setFavorites([])
    setPreacherFavorites([])
    setFilteredPreacherId(null)
    router.refresh()
  }

  const handleGenerateAI = (videoId: string) => {
    const video = (videos || []).find((v) => v.id === videoId)
    if (video) {
      setSelectedVideoForAI(video)
      setAiModalOpen(true)
    }
  }

  const handleAIContentGenerated = (content: any) => {
    // Invalidate to refresh videos
    queryClient.invalidateQueries({ queryKey: ["videos"] })
  }

  // Get all unique tags from videos - ensure videos is an array
  const allTags = getAllUniqueTags(videos || [])

  const filteredVideos = (videos || []).filter((video) => {
    const preacherName = getPreacherName(video)
    const preacherId = getPreacherId(video)

    const matchesSearch =
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (preacherName && preacherName.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesTopic = selectedTopic === "all" || video.topic?.toLowerCase() === selectedTopic.toLowerCase()
    const matchesPreacher = !filteredPreacherId || preacherId === filteredPreacherId
    const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => videoHasTag(video, tag))
    return matchesSearch && matchesTopic && matchesPreacher && matchesTags
  })

  const filteredPreachers = preachers.filter((preacher) =>
    !searchQuery.trim() || preacher.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )


  // Show loading if auth is loading or if we're loading data and don't have any yet
  const isLoading = authLoading || ((videosQuery.isLoading || preachersQuery.isLoading) && !videosQuery.data && !preachersQuery.data)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/30 dark:to-purple-950/20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-6 bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">Loading divine content...</div>
          <div className="w-12 h-12 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/30 dark:to-purple-950/20 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto bg-white/80 dark:bg-slate-800/80 rounded-2xl shadow-xl border border-red-200 dark:border-red-800 p-8">
          <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Connection Error</div>
          <p className="text-slate-600 dark:text-slate-400 mb-6 text-lg">{error}</p>
          <Button
            onClick={() => {
              setError(null)
              queryClient.invalidateQueries({ queryKey: ["videos"] })
              queryClient.invalidateQueries({ queryKey: ["preachers"] })
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all w-full"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/30 dark:to-purple-950/20">
      <AppHeader
        favorites={favorites}
        onSignOut={handleSignOut}
        showActions={true}
      />

      <div className="container mx-auto px-4 lg:px-6 py-8 max-w-[1600px]">
        <div className="mb-10 space-y-5">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
              <Input
                placeholder="Search videos, preachers, or topics..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (e.target.value === "") {
                    setFilteredPreacherId(null)
                  }
                }}
                className="pl-12 pr-4 py-6 bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl shadow-lg placeholder:text-slate-400 dark:placeholder:text-slate-500 text-base focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
              />
            </div>
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger className="w-full md:w-56 bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-6 text-base hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                <Filter className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                <SelectValue placeholder="Filter by topic" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Topics</SelectItem>
                <SelectItem value="gospel">Gospel</SelectItem>
                <SelectItem value="theology">Theology</SelectItem>
                <SelectItem value="faith">Faith</SelectItem>
                <SelectItem value="prayer">Prayer</SelectItem>
                <SelectItem value="worship">Worship</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setShowTagFilter(!showTagFilter)}
              className={`border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 rounded-xl shadow-lg py-6 px-5 ${
                showTagFilter ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300" : "text-slate-700 dark:text-slate-300"
              }`}
            >
              <Tag className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline font-semibold">Tags</span>
              <span className="sm:hidden font-semibold">Tags</span>
              {selectedTags.length > 0 && ` (${selectedTags.length})`}
            </Button>
            {(filteredPreacherId || selectedTags.length > 0) && (
              <Button
                variant="outline"
                onClick={() => {
                  setFilteredPreacherId(null)
                  setSearchQuery("")
                  setSelectedTags([])
                }}
                className="border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-700 transition-all duration-300 rounded-xl shadow-lg py-6 px-5 text-slate-700 dark:text-slate-300 font-semibold"
              >
                <span className="hidden sm:inline">Clear Filters</span>
                <span className="sm:hidden">Clear</span>
              </Button>
            )}
          </div>

          {showTagFilter && (
            <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl p-6 border border-purple-200 dark:border-purple-800 shadow-xl backdrop-blur-sm">
              <TagFilter availableTags={allTags} selectedTags={selectedTags} onTagsChange={setSelectedTags} />
            </div>
          )}

          <div className="flex space-x-2 bg-white/80 dark:bg-slate-800/80 rounded-2xl p-2 border border-slate-200 dark:border-slate-700 shadow-lg">
            <Button
              variant={activeTab === "videos" ? "default" : "ghost"}
              onClick={() => setActiveTab("videos")}
              className={`flex-1 transition-all duration-300 rounded-xl py-6 ${
                activeTab === "videos" 
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-400 text-white shadow-lg shadow-blue-500/30" 
                  : "hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300"
              }`}
            >
              <Play className="w-5 h-5 mr-2" />
              <span className="text-base font-semibold">Videos</span>
            </Button>
            <Button
              variant={activeTab === "preachers" ? "default" : "ghost"}
              onClick={() => setActiveTab("preachers")}
              className={`flex-1 transition-all duration-300 rounded-xl py-6 ${
                activeTab === "preachers" 
                  ? "bg-gradient-to-r from-purple-600 to-purple-500 dark:from-purple-500 dark:to-purple-400 text-white shadow-lg shadow-purple-500/30" 
                  : "hover:bg-purple-100 dark:hover:bg-purple-900/30 text-slate-600 dark:text-slate-400 hover:text-purple-700 dark:hover:text-purple-300"
              }`}
            >
              <Users className="w-5 h-5 mr-2" />
              <span className="text-base font-semibold">Preachers</span>
            </Button>
          </div>
        </div>

        {/* Inline video player removed - videos now open in dedicated pages */}

        {activeTab === "videos" ? (
          <div>
            {(filteredPreacherId || selectedTags.length > 0) && (
              <div className="mb-8 p-5 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-lg">
                <p className="text-slate-700 dark:text-slate-300 text-base">
                  {filteredPreacherId && (
                    <>
                      Showing sermons by{" "}
                      <span className="font-bold text-blue-700 dark:text-blue-300">{preachers.find((p) => p.id === filteredPreacherId)?.name}</span>
                    </>
                  )}
                  {filteredPreacherId && selectedTags.length > 0 && <span className="mx-2 text-slate-400">•</span>}
                  {selectedTags.length > 0 && <>Filtered by tags: <span className="font-bold text-purple-700 dark:text-purple-300">{selectedTags.join(", ")}</span></>}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredVideos.map((video) => (
                <FixedVideoCard
                  key={video.id}
                  video={video}
                  isFavorite={favorites.includes(video.id)}
                  onPlay={() => handleVideoClick(video.id)}
                  onToggleFavorite={() => toggleFavorite(video.id)}
                  onGenerateAI={handleGenerateAI}
                  user={user || undefined}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredPreachers.map((preacher) => (
              <PreacherCard
                key={preacher.id}
                preacher={{
                  id: preacher.id,
                  name: preacher.name,
                  church: "Ministry",
                  description: preacher.bio || "Gospel preacher and teacher",
                  videoCount: (videos || []).filter((v) => getPreacherId(v) === preacher.id).length,
                  image: preacher.image_url || preacher.profile_image_url || "/preacher.jpg",
                }}
                isFavorite={preacherFavorites.includes(preacher.id)}
                onViewSermons={() => handleViewPreacherSermons(preacher.id, preacher.name)}
                onToggleFavorite={() => togglePreacherFavorite(preacher.id)}
                user={user}
              />
            ))}
          </div>
        )}

        {((activeTab === "videos" && filteredVideos.length === 0) ||
          (activeTab === "preachers" && filteredPreachers.length === 0)) && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
              <Search className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">No results found</h3>
            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-md mx-auto leading-relaxed mb-8">
              Try adjusting your search terms, filters, or browse our full collection.
            </p>
            <Button
              onClick={() => {
                setSearchQuery("")
                setSelectedTopic("all")
                setSelectedTags([])
                setFilteredPreacherId(null)
              }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl py-6 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              size="lg"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>

      {selectedVideoForAI && (
        <AIGenerationModal
          isOpen={aiModalOpen}
          onClose={() => {
            setAiModalOpen(false)
            setSelectedVideoForAI(null)
          }}
          videoId={selectedVideoForAI!.id}
          videoTitle={selectedVideoForAI!.title}
          videoDescription={selectedVideoForAI!.description || undefined}
          preacherName={selectedVideoForAI!.preachers?.name}
          onContentGenerated={handleAIContentGenerated}
        />
      )}
    </div>
  )
}
