"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Heart, Plus, Sparkles, Clock, Eye, BookOpen, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
// VideoPlayer component removed - using direct iframe for better UX
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog"
import { AIGenerationModal } from "@/components/ai-generation-modal"
import { createClient } from "@/lib/supabase/client"
import { apiGet, apiPost, apiDelete } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"

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
  youtube_id: string
  topic: string | null
  duration: number | null
  thumbnail_url: string | null
  created_at: string
  sermon_notes: string[] | null
  scripture_references: any[] | null
  tags: string[] | null
  preacher: Preacher
  start_time_seconds?: number | null
  end_time_seconds?: number | null
  video_url?: string | null
}

export default function VideoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  const [user, setUser] = useState<any>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [showPlayer, setShowPlayer] = useState(true) // Auto-start video when page loads

  const videoId = params.id as string

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error("Error checking user:", error)
    }
  }

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
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/")}
                className="hover:bg-accent"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md">
                  <BookOpen className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <Link href="/" className="text-xl font-bold text-foreground hover:text-primary transition-colors">
                    WordLyte
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {user && (
                <>
                  <AddToCollectionDialog videoId={videoId}>
                    <Button variant="outline" size="sm" className="border-border hover:bg-accent">
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Collection
                    </Button>
                  </AddToCollectionDialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAI}
                    className="border-border hover:bg-accent"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Content
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
                {isFavorite ? "Favorited" : "Add to Favorites"}
              </Button>
            </div>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Video Player Section */}
          <div className="mb-8">
            <div className="aspect-video bg-muted rounded-lg overflow-hidden shadow-lg relative">
              <div className="w-full h-full">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${video.youtube_id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&fs=1&controls=1&disablekb=0&iv_load_policy=3&cc_load_policy=0&showinfo=0${video.start_time_seconds ? `&start=${video.start_time_seconds}` : ''}`}
                  className="w-full h-full rounded-lg"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                  title={video.title}
                  loading="eager"
                />
              </div>
            </div>
          </div>

          {/* Video Info Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
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
                    <span className="font-medium">{video.preacher.name}</span>
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

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Preacher Info */}
              <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                <h2 className="text-xl font-semibold text-foreground mb-4">About the Preacher</h2>
                <div className="flex items-start space-x-4">
                  {video.preacher.image_url ? (
                    <img
                      src={video.preacher.image_url}
                      alt={video.preacher.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center border-2 border-border">
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{video.preacher.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {video.preacher.bio || "Gospel preacher and teacher dedicated to sharing God's word."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sermon Notes Preview */}
              {(video.sermon_notes?.length || video.scripture_references?.length) && (
                <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Study Materials</h2>
                  <div className="space-y-3">
                    {video.sermon_notes && video.sermon_notes.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-3">
                          <BookOpen className="w-5 h-5 text-primary" />
                          <span className="font-medium text-foreground">Sermon Notes</span>
                        </div>
                        <Badge variant="secondary">{video.sermon_notes.length}</Badge>
                      </div>
                    )}
                    {video.scripture_references && video.scripture_references.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-3">
                          <BookOpen className="w-5 h-5 text-secondary" />
                          <span className="font-medium text-foreground">Scripture References</span>
                        </div>
                        <Badge variant="secondary">{video.scripture_references.length}</Badge>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    Study materials include detailed sermon notes and scripture references to enhance your learning experience.
                  </p>
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
