"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Heart, Clock, Eye, Plus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog"
import { SermonNotesPreview } from "@/components/sermon-notes-preview"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { apiGet } from "@/lib/api"

interface Video {
  id: string
  title: string
  preacher: string
  duration: string
  views: string
  source_video_id: string
  topic: string
  description: string
  sermonNotes?: string[]
  scriptureReferences?: any[]
  tags?: string[]
}

interface VideoCardProps {
  video: Video
  isFavorite: boolean
  onPlay: () => void
  onToggleFavorite: () => void
  user?: any
  onGenerateAI?: (videoId: string) => void
}

export function VideoCard({ video, isFavorite, onPlay, onToggleFavorite, user, onGenerateAI }: VideoCardProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isHovered, setIsHovered] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const handleMouseEnter = () => {
    // Only enable hover preview on desktop (non-touch devices)
    if (window.matchMedia('(hover: hover)').matches) {
      setIsHovered(true)
      
      // Prefetch video data on hover for faster navigation
      queryClient.prefetchQuery({
        queryKey: ["video", video.id],
        queryFn: () => apiGet(`/api/data/videos/${video.id}`),
        staleTime: 60_000,
      })
      
      // Start preview after 1 second of hovering
      hoverTimeoutRef.current = setTimeout(() => {
        setShowPreview(true)
      }, 1000)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setShowPreview(false)
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
      previewTimeoutRef.current = null
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    console.log('Card click event triggered')
    console.log('Event target:', e.target)
    console.log('Current target:', e.currentTarget)
    
    // Prevent navigation if clicking on actual buttons (not the card itself)
    const target = e.target as HTMLElement
    const currentTarget = e.currentTarget as HTMLElement
    
    // Check if we clicked on a button element, but exclude the card itself
    const isActualButton = target.closest('button') && target.closest('button') !== currentTarget
    
    console.log('Is actual button clicked:', isActualButton)
    
    if (isActualButton) {
      console.log('Actual button clicked, preventing navigation')
      return
    }
    
    console.log('Card clicked, navigating to:', `/video/${video.id}`)
    console.log('Router object:', router)
    
    // Show loading state
    setIsNavigating(true)
    
    // Prefetch data in background (don't wait for it)
    queryClient.prefetchQuery({
      queryKey: ["video", video.id],
      queryFn: () => apiGet(`/api/data/videos/${video.id}`),
      staleTime: 60_000,
    }).catch(error => {
      console.error('Error prefetching video data:', error)
    })
    
    // Navigate immediately
    try {
      router.push(`/video/${video.id}`)
      console.log('Navigation initiated successfully')
    } catch (error) {
      console.error('Navigation error:', error)
    }
    
    // Reset loading state after a short delay
    setTimeout(() => setIsNavigating(false), 1000)
  }

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current)
      }
    }
  }, [])

  return (
    <Card 
      className={`bg-card border-border hover:bg-accent/20 transition-all duration-300 group shadow-lg hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 hover:-translate-y-1 backdrop-blur-sm cursor-pointer relative overflow-hidden ${
        isNavigating ? 'opacity-75 scale-[0.98]' : ''
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          console.log('Keyboard navigation to:', `/video/${video.id}`)
          router.push(`/video/${video.id}`)
        }
      }}
    >
      {/* Hover Preview Overlay - Desktop Only */}
      {showPreview && (
        <div className="absolute inset-0 z-10 bg-black/90 flex items-center justify-center animate-in fade-in-0 duration-300">
          <div className="w-full h-full relative">
            <iframe
              ref={iframeRef}
              src={`https://www.youtube-nocookie.com/embed/${video.source_video_id}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${video.source_video_id}&start=10`}
              className="w-full h-full rounded-lg"
              allow="autoplay; encrypted-media"
              allowFullScreen={false}
              title={`Preview: ${video.title}`}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none rounded-lg" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <p className="text-sm font-medium truncate">{video.title}</p>
              <p className="text-xs opacity-80">Click to watch full video</p>
            </div>
            {/* Loading indicator */}
            <div className="absolute top-4 right-4">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Badge variant="secondary" className="bg-gradient-to-r from-secondary/30 to-secondary/20 text-secondary-foreground border-secondary/50 shadow-sm font-semibold">
            {video.topic}
          </Badge>
          <div className="flex items-center space-x-1">
            {user && onGenerateAI && (
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 text-muted-foreground hover:text-secondary hover:bg-secondary/10 transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation()
                  onGenerateAI(video.id)
                }}
                title="Generate AI content"
              >
                <Sparkles className="w-4 h-4" />
              </Button>
            )}
            {user && (
              <AddToCollectionDialog videoId={video.id}>
                <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-secondary hover:bg-secondary/10 transition-all duration-200">
                  <Plus className="w-4 h-4" />
                </Button>
              </AddToCollectionDialog>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite()
              }}
              className={`w-8 h-8 ${isFavorite ? "text-destructive hover:text-destructive/80" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
            </Button>
          </div>
        </div>
        <CardTitle className="text-foreground text-lg leading-tight group-hover:text-primary transition-colors duration-300 font-bold">
          {video.title}
        </CardTitle>
        <CardDescription className="text-muted-foreground group-hover:text-secondary/80 transition-colors duration-300">by {video.preacher}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>

        {video.tags && video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {video.tags.slice(0, 3).map((tag, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs bg-muted border-border text-muted-foreground hover:bg-accent"
              >
                {tag}
              </Badge>
            ))}
            {video.tags.length > 3 && (
              <Badge variant="outline" className="text-xs bg-muted border-border text-muted-foreground">
                +{video.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {(video.sermonNotes?.length || video.scriptureReferences?.length) && (
          <SermonNotesPreview
            notesCount={video.sermonNotes?.length || 0}
            scriptureCount={video.scriptureReferences?.length || 0}
          />
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 group/duration hover:text-secondary transition-colors">
              <Clock className="w-3 h-3 text-secondary/70 group-hover/duration:text-secondary" />
              <span>{video.duration}</span>
            </div>
            <div className="flex items-center space-x-1 group/views hover:text-secondary transition-colors">
              <Eye className="w-3 h-3 text-secondary/70 group-hover/views:text-secondary" />
              <span>{video.views}</span>
            </div>
          </div>
        </div>

        <Button
          onClick={(e) => {
            e.stopPropagation()
            console.log('Watch Now button clicked, navigating to:', `/video/${video.id}`)
            setIsNavigating(true)
            router.push(`/video/${video.id}`)
            setTimeout(() => setIsNavigating(false), 1000)
          }}
          disabled={isNavigating}
          className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-75"
        >
          <Play className="w-4 h-4 mr-2" />
          {isNavigating ? 'Loading...' : 'Watch Now'}
        </Button>
      </CardContent>
    </Card>
  )
}
