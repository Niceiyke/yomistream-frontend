"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Play, Filter, Globe, Calendar, Tag as TagIcon, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { SourceVideoCard } from "@/components/source-video-card"
import { AppHeader } from "@/components/app-header"
import { apiGet } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { SourceVideo } from "@/lib/types/content"
import { useQuery } from "@tanstack/react-query"

interface SourceVideoListResponse {
  items: SourceVideo[]
  total: number
  page: number
  page_size: number
  has_next: boolean
}

export default function SourceVideosPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState("all")
  const [selectedChannel, setSelectedChannel] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [videos, setVideos] = useState<SourceVideo[]>([])
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const scrollPositionRef = useRef<number>(0)

  // React Query: source videos with pagination and filters
  const sourceVideosQuery = useQuery({
    queryKey: ["source-videos", currentPage, searchQuery, selectedLanguage, selectedChannel],
    queryFn: () => {
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: '20',
      })

      if (searchQuery) params.append('search', searchQuery)
      if (selectedLanguage !== "all") params.append('language', selectedLanguage)
      if (selectedChannel) params.append('youtube_channel_id', selectedChannel)

      const url = `/api/public/source-videos?${params.toString()}`
      return apiGet(url)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  useEffect(() => {
    if (sourceVideosQuery.data) {
      setVideos(sourceVideosQuery.data.items || [])
      setTotal(sourceVideosQuery.data.total || 0)
      setHasNext(sourceVideosQuery.data.has_next || false)
      setError(null)
    }
    if (sourceVideosQuery.isError) {
      setError("Failed to load source videos")
    }
  }, [sourceVideosQuery.data, sourceVideosQuery.isError])

  // Save scroll position before navigating away
  const handleVideoClick = (video: SourceVideo) => {
    const currentScroll = window.scrollY
    sessionStorage.setItem('sourceVideosScrollPosition', currentScroll.toString())

    // Navigate to detail page
    router.push(`/source-videos/${video.id}`)
  }

  // Restore scroll position when returning to page
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('sourceVideosScrollPosition')
    if (savedScrollPosition) {
      const scrollPos = parseInt(savedScrollPosition, 10)
      setTimeout(() => {
        window.scrollTo(0, scrollPos)
        sessionStorage.removeItem('sourceVideosScrollPosition')
      }, 100)
    }
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.refresh()
  }

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedLanguage, selectedChannel])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    sourceVideosQuery.refetch()
  }

  const handleLoadMore = () => {
    if (hasNext) {
      setCurrentPage(prev => prev + 1)
    }
  }

  // Show loading if auth is loading or if we're loading data and don't have any yet
  const isLoading = authLoading || (sourceVideosQuery.isLoading && videos.length === 0)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-foreground text-xl mb-4">Loading source videos...</div>
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-destructive text-xl mb-4">Connection Error</div>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button
            onClick={() => sourceVideosQuery.refetch()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        favorites={[]}
        onSignOut={handleSignOut}
        showActions={false}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Source Videos
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover Christian sermons and teachings from YouTube sources.
            Browse our curated collection of gospel content.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search videos, channels, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-input border-border placeholder:text-muted-foreground"
              />
            </div>

            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-full md:w-48 bg-input border-border">
                <Globe className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={sourceVideosQuery.isLoading}
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </form>

          {/* Active Filters */}
          {(searchQuery || selectedLanguage !== "all" || selectedChannel) && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Active filters:</span>

              {searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery("")}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    ×
                  </button>
                </Badge>
              )}

              {selectedLanguage !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {selectedLanguage.toUpperCase()}
                  <button
                    onClick={() => setSelectedLanguage("all")}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            {total > 0 ? (
              <>
                Showing <span className="font-semibold text-foreground">{videos.length}</span> of{" "}
                <span className="font-semibold text-foreground">{total}</span> source videos
              </>
            ) : (
              "No source videos found"
            )}
          </p>
        </div>

        {/* Videos Grid */}
        {videos.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {videos.map((video) => (
                <SourceVideoCard
                  key={video.id}
                  video={video}
                  onPlay={() => handleVideoClick(video)}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasNext && (
              <div className="text-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={sourceVideosQuery.isLoading}
                  variant="outline"
                  className="px-8 py-3"
                >
                  {sourceVideosQuery.isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    "Load More Videos"
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No videos found</h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your search terms or filters
            </p>
            <Button
              onClick={() => {
                setSearchQuery("")
                setSelectedLanguage("all")
                setSelectedChannel("")
                setCurrentPage(1)
              }}
              variant="outline"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
