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
import { SourceVideoFilters } from '@/components/source-video-filters'
import { getAccessTokenCached } from "@/lib/auth-cache"

interface SourceVideoListResponse {
  items: SourceVideo[]
  total: number
  page: number
  page_size: number
  has_next: boolean
}

export default function SourceVideosPage() {
  // Search and basic filters
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [videos, setVideos] = useState<SourceVideo[]>([])
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Advanced filters
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  })
  const [selectedDuration, setSelectedDuration] = useState("all")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedChannel, setSelectedChannel] = useState("all")
  const [sortBy, setSortBy] = useState("relevance")
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [excludeTrimmed, setExcludeTrimmed] = useState(false)

  // Available options
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [availableChannels, setAvailableChannels] = useState<{ id: string; name: string }[]>([])

  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const scrollPositionRef = useRef<number>(0)

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await getAccessTokenCached()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // React Query: source videos with pagination and filters
  const sourceVideosQuery = useQuery({
    queryKey: ["source-videos", currentPage, searchQuery, selectedLanguage, dateRange, selectedDuration, selectedTags, selectedChannel, sortBy, excludeTrimmed],
    queryFn: async () => {
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: '20',
        sort_by: sortBy,
      })

      if (searchQuery) params.append('search', searchQuery)
      if (selectedLanguage !== "all") params.append('language', selectedLanguage)
      if (selectedChannel !== "all") params.append('youtube_channel_id', selectedChannel)

      // Date range filters
      if (dateRange.from) params.append('published_after', dateRange.from.toISOString().split('T')[0])
      if (dateRange.to) params.append('published_before', dateRange.to.toISOString().split('T')[0])

      // Duration filters
      if (selectedDuration !== "all") {
        switch (selectedDuration) {
          case "short":
            params.append('max_duration', '300') // 5 minutes
            break
          case "medium":
            params.append('min_duration', '300') // 5 minutes
            params.append('max_duration', '1200') // 20 minutes
            break
          case "long":
            params.append('min_duration', '1200') // 20 minutes
            params.append('max_duration', '3600') // 60 minutes
            break
          case "very_long":
            params.append('min_duration', '3600') // 60 minutes
            break
        }
      }

      // Tags filter
      if (selectedTags.length > 0) {
        params.append('tags', selectedTags.join(','))
      }

      // Exclude trimmed videos filter
      if (excludeTrimmed) {
        params.append('exclude_trimmed', 'true')
      }

      const url = `/api/admin/source-videos?${params.toString()}`
      const headers = await authHeaders()
      return apiGet(url, { headers })
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

  // Save scroll position and filter state before navigating away
  const handleVideoClick = (video: SourceVideo) => {
    const currentScroll = window.scrollY
    sessionStorage.setItem('sourceVideosScrollPosition', currentScroll.toString())

    // Save all filter state to sessionStorage
    const filterState = {
      searchQuery,
      selectedLanguage,
      dateRange,
      selectedDuration,
      selectedTags,
      selectedChannel,
      sortBy,
      currentPage,
      viewMode,
      excludeTrimmed
    }
    sessionStorage.setItem('sourceVideosFilters', JSON.stringify(filterState))

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

  // Load saved filter state when returning to page
  useEffect(() => {
    const savedFilters = sessionStorage.getItem('sourceVideosFilters')
    if (savedFilters) {
      try {
        const filterState = JSON.parse(savedFilters)

        // Restore filter state
        setSearchQuery(filterState.searchQuery || "")
        setSelectedLanguage(filterState.selectedLanguage || "all")

        // Handle date range - convert ISO strings back to Date objects
        if (filterState.dateRange) {
          setDateRange({
            from: filterState.dateRange.from ? new Date(filterState.dateRange.from) : undefined,
            to: filterState.dateRange.to ? new Date(filterState.dateRange.to) : undefined
          })
        }

        setSelectedDuration(filterState.selectedDuration || "all")
        setSelectedTags(filterState.selectedTags || [])
        setSelectedChannel(filterState.selectedChannel || "all")
        setSortBy(filterState.sortBy || "relevance")
        setCurrentPage(filterState.currentPage || 1)
        setViewMode(filterState.viewMode || 'grid')
        setExcludeTrimmed(filterState.excludeTrimmed || false)

        // Clear the saved filters from sessionStorage
        sessionStorage.removeItem('sourceVideosFilters')
      } catch (error) {
        console.warn('Failed to parse saved filter state:', error)
        // Clear corrupted data
        sessionStorage.removeItem('sourceVideosFilters')
      }
    }
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.refresh()
  }

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedLanguage, dateRange, selectedDuration, selectedTags, selectedChannel, excludeTrimmed])

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

  const handleClearAllFilters = () => {
    setSearchQuery("")
    setSelectedLanguage("all")
    setDateRange({ from: undefined, to: undefined })
    setSelectedDuration("all")
    setSelectedTags([])
    setSelectedChannel("all")
    setSortBy("relevance")
    setCurrentPage(1)
    setExcludeTrimmed(false)
  }

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('sourceVideosViewMode', mode)
  }

  // Load view mode from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem('sourceVideosViewMode') as 'grid' | 'list'
    if (savedViewMode) {
      setViewMode(savedViewMode)
    }
  }, [])

  // Fetch available tags and channels
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const headers = await authHeaders()
        // Fetch available tags
        const tagsResponse = await apiGet('/api/admin/source-videos/tags', { headers })
        if (tagsResponse?.tags) {
          setAvailableTags(tagsResponse.tags)
        }

        // Fetch available channels
        const channelsResponse = await apiGet('/api/admin/source-videos/channels', { headers })
        if (channelsResponse?.channels) {
          const filteredChannels = channelsResponse.channels
            .filter((ch: any) => ch.youtube_channel_id && ch.youtube_channel_id.trim() !== '')
            .map((ch: any) => ({
              id: ch.youtube_channel_id,
              name: ch.channel_name || ch.youtube_channel_id
            }))
          
          setAvailableChannels(filteredChannels)
        }
      } catch (error) {
        console.warn('Failed to fetch filter options:', error)
      }
    }

    fetchFilterOptions()
  }, [])

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
        backButton={{
          label: "Back to Admin",
          href: "/admin",
          scroll: false
        }}
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
        <SourceVideoFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedDuration={selectedDuration}
          onDurationChange={setSelectedDuration}
          availableTags={availableTags}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          availableChannels={availableChannels}
          selectedChannel={selectedChannel}
          onChannelChange={setSelectedChannel}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          excludeTrimmed={excludeTrimmed}
          onExcludeTrimmedChange={setExcludeTrimmed}
          isLoading={sourceVideosQuery.isLoading}
          onClearAll={handleClearAllFilters}
        />

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

        {/* Videos Grid/List */}
        {videos.length > 0 ? (
          <>
            <div className={
              viewMode === 'grid'
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8"
                : "space-y-4 mb-8"
            }>
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
                setDateRange({ from: undefined, to: undefined })
                setSelectedDuration("all")
                setSelectedTags([])
                setSelectedChannel("all")
                setCurrentPage(1)
                setExcludeTrimmed(false)
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
