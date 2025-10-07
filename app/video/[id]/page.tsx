"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Heart, Plus, Sparkles, Clock, Eye, BookOpen, Users, Quote, Scroll, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog"
import { AIGenerationModal } from "@/components/ai-generation-modal"
import { AppHeader } from "@/components/app-header"
import { apiGet, apiPost, apiDelete } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { useAuth } from "@/lib/auth-context"
import { useQuery, useQueryClient } from "@tanstack/react-query"

interface Preacher {
  id: string
  name: string
  bio: string | null
  image_url: string | null
  created_at: string
}

interface Video {
  id: string
  title: string
  description: string | null
  source_video_id: string
  topic: string | null
  duration: number | null
  thumbnail_url: string | null
  created_at: string
  sermon_notes: string[] | null
  scripture_references: any[] | null
  tags: string[] | null
  preacher?: Preacher
  preacher_name?: string
  start_time_seconds?: number | null
  end_time_seconds?: number | null
  video_url?: string | null
}

export default function VideoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  const [favorites, setFavorites] = useState<string[]>([])
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [showPlayer, setShowPlayer] = useState(true) // Auto-start video when page loads
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const videoId = params.id as string

  // Clear the scroll restoration flag when entering video page
  useEffect(() => {
    // This ensures the main page knows we navigated away
    return () => {
      // Cleanup on unmount
    }
  }, [])


  // Fetch video details
  const videoQuery = useQuery({
    queryKey: ["video", videoId],
    queryFn: () => apiGet(`/api/data/videos/${videoId}`),
    enabled: !!videoId,
  })

  // Fetch user favorites
  const favoritesQuery = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      const accessToken = await getAccessTokenCached()
      const favs = await apiGet("/api/favorites", {
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

    const isFavorite = favorites.includes(videoId)
    const accessToken = await getAccessTokenCached()
    const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    
    try {
      if (isFavorite) {
        await apiDelete(`/api/favorites/${videoId}`, { headers })
      } else {
        await apiPost("/api/favorites", { video_id: videoId }, { headers })
      }
      await queryClient.invalidateQueries({ queryKey: ["favorites", user.id] })
    } catch (error) {
      console.error("Error toggling favorite:", error)
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

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  if (videoQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-foreground text-xl mb-4">Loading video...</div>
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  if (videoQuery.isError || !videoQuery.data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-destructive text-xl mb-4">Video Not Found</div>
          <p className="text-muted-foreground mb-6">The video you're looking for doesn't exist or has been removed.</p>
          <Button
            onClick={() => router.push("/")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  const video = videoQuery.data
  const isFavorite = favorites.includes(videoId)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        favorites={favorites}
        showActions={false}
        backButton={{
          label: "← Back to Home",
          href: "/",
          scroll: false
        }}
      />
      
      {/* Action Bar */}
      <div className="border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-end space-x-2">
            {user && (
              <>
                <AddToCollectionDialog videoId={videoId}>
                  <Button variant="outline" size="sm" className="border-border hover:bg-accent">
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Add to Collection</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </AddToCollectionDialog>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAI}
                  className="border-border hover:bg-accent"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Generate AI</span>
                  <span className="sm:hidden">AI</span>
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFavorite}
              className={`border-border hover:bg-accent ${isFavorite ? "text-destructive border-destructive/50" : ""}`}
            >
              <Heart className={`w-4 h-4 mr-2 ${isFavorite ? "fill-current" : ""}`} />
              <span className="hidden sm:inline">{isFavorite ? "Favorited" : "Add to Favorites"}</span>
              <span className="sm:hidden">{isFavorite ? "★" : "☆"}</span>
            </Button>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Main Layout - Video + Sidebar */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Left Column - Video and Main Content */}
            <div className="xl:col-span-3 space-y-8">
              {/* Video Player Section */}
              <div className="aspect-video bg-muted rounded-lg overflow-hidden shadow-lg relative">
                <div className="w-full h-full">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${video.source_video_id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&fs=1&controls=1&disablekb=0&iv_load_policy=3&cc_load_policy=0&showinfo=0${video.start_time_seconds ? `&start=${video.start_time_seconds}` : ''}`}
                    className="w-full h-full rounded-lg"
                    allow="autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                    title={video.title}
                    loading="eager"
                  />
                </div>
              </div>

              {/* Video Info Section */}
              <div className="space-y-6">
                {/* Title and Topic */}
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <Badge variant="secondary" className="bg-gradient-to-r from-secondary/30 to-secondary/20 text-secondary-foreground border-secondary/50 shadow-sm font-semibold">
                      {video.topic || "General"}
                    </Badge>
                  </div>
                  <h1 className="text-3xl font-bold text-foreground mb-2 leading-tight">
                    {video.title}
                  </h1>
                  <div className="flex items-center space-x-4 text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">{video.preacher?.name || video.preacher_name || "Unknown"}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(video.duration)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4" />
                      <span>N/A views</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {video.description && (
                  <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                    <h2 className="text-xl font-semibold text-foreground mb-3">About This Sermon</h2>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {video.description}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {video.tags && video.tags.length > 0 && (
                  <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                    <h2 className="text-xl font-semibold text-foreground mb-3">Tags</h2>
                    <div className="flex flex-wrap gap-2">
                      {video.tags.map((tag: string, index: number) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-muted border-border text-muted-foreground hover:bg-accent cursor-pointer transition-colors"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="xl:col-span-1 space-y-6">
              {/* Preacher Info */}
              <div className="bg-card rounded-lg p-6 border border-border shadow-sm sticky top-4">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-primary" />
                  Preacher
                </h2>
                <div className="text-center">
                  {video.preacher?.image_url ? (
                    <img
                      src={video.preacher.image_url}
                      alt={video.preacher?.name || video.preacher_name || "Unknown"}
                      className="w-20 h-20 rounded-full object-cover border-3 border-primary/20 mx-auto mb-3"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center border-3 border-primary/20 mx-auto mb-3">
                      <Users className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                  <h3 className="font-semibold text-foreground mb-2">{video.preacher?.name || video.preacher_name || "Unknown"}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {video.preacher?.bio || "Gospel preacher and teacher dedicated to sharing God's word."}
                  </p>
                </div>
              </div>

              {/* Video Summary */}
              {video.description && (
                <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg p-6 border border-primary/20 shadow-sm">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                    <Scroll className="w-5 h-5 mr-2 text-primary" />
                    Sermon Summary
                  </h2>
                  <div className="relative">
                    <div className={`text-sm text-muted-foreground leading-relaxed ${expandedSection === 'summary' ? '' : 'line-clamp-4'}`}>
                      {video.description}
                    </div>
                    {video.description.length > 200 && (
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'summary' ? null : 'summary')}
                        className="text-primary hover:text-primary/80 text-xs font-medium mt-2 flex items-center transition-colors"
                      >
                        {expandedSection === 'summary' ? (
                          <><ChevronUp className="w-3 h-3 mr-1" /> Show Less</>
                        ) : (
                          <><ChevronDown className="w-3 h-3 mr-1" /> Read More</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Scripture References */}
              {video.scripture_references && video.scripture_references.length > 0 && (
                <div className="bg-gradient-to-br from-secondary/5 to-primary/5 rounded-lg p-6 border border-secondary/20 shadow-sm">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                    <Quote className="w-5 h-5 mr-2 text-secondary" />
                    Bible Excerpts
                  </h2>
                  <div className="space-y-4">
                    {video.scripture_references.slice(0, expandedSection === 'scripture' ? undefined : 3).map((ref: any, index: number) => (
                      <div key={index} className="bg-card/50 rounded-lg p-4 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-primary">
                            {ref.book} {ref.chapter}:{ref.verse}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground italic leading-relaxed">
                          "{ref.text}"
                        </p>
                      </div>
                    ))}
                    {video.scripture_references.length > 3 && (
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'scripture' ? null : 'scripture')}
                        className="text-secondary hover:text-secondary/80 text-xs font-medium flex items-center transition-colors w-full justify-center pt-2"
                      >
                        {expandedSection === 'scripture' ? (
                          <><ChevronUp className="w-3 h-3 mr-1" /> Show Less</>
                        ) : (
                          <><ChevronDown className="w-3 h-3 mr-1" /> Show {video.scripture_references.length - 3} More</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Sermon Notes */}
              {video.sermon_notes && video.sermon_notes.length > 0 && (
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                    <BookOpen className="w-5 h-5 mr-2 text-primary" />
                    Sermon Notes
                  </h2>
                  <div className="space-y-3">
                    {video.sermon_notes.slice(0, expandedSection === 'notes' ? undefined : 3).map((note: string, index: number) => (
                      <div key={index} className="bg-muted/50 rounded-lg p-3 border-l-4 border-primary/30">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {note}
                        </p>
                      </div>
                    ))}
                    {video.sermon_notes.length > 3 && (
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'notes' ? null : 'notes')}
                        className="text-primary hover:text-primary/80 text-xs font-medium flex items-center transition-colors w-full justify-center pt-2"
                      >
                        {expandedSection === 'notes' ? (
                          <><ChevronUp className="w-3 h-3 mr-1" /> Show Less</>
                        ) : (
                          <><ChevronDown className="w-3 h-3 mr-1" /> Show {video.sermon_notes.length - 3} More</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
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
          preacherName={video.preacher?.name}
          onContentGenerated={handleAIContentGenerated}
        />
      )}
    </div>
  )
}
