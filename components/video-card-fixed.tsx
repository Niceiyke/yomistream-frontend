"use client"

import { useState, useRef, useEffect, useCallback, memo } from "react"
import { Play, Heart, Clock, Plus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog"
import { SermonNotesPreview } from "@/components/sermon-notes-preview"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { apiGet } from "@/lib/api"
import { useConnectionQuality } from "@/lib/hooks/use-connection-quality"
import { User } from "@/lib/types/user"
import Image from "next/image"

interface Video {
  id: string
  title: string
  preacher: string
  duration: string
  views: string
  video_url: string
  topic: string
  description: string
  sermon_notes?: string[]
  scripture_references?: any[]
  tags?: string[]
  thumbnail_url?: string
}

interface VideoCardProps {
  video: Video
  isFavorite: boolean
  onPlay: () => void
  onToggleFavorite: () => void
  user?: User
  onGenerateAI?: (videoId: string) => void
}

// Simple global state for preview management (temporary fix)
let activePreviewId: string | null = null
const MAX_CONCURRENT_PREVIEWS = 1

export const FixedVideoCard = memo(function FixedVideoCard({ 
  video, 
  isFavorite, 
  onPlay, 
  onToggleFavorite, 
  user, 
  onGenerateAI
}: VideoCardProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const connectionQuality = useConnectionQuality()
  
  // Component state
  const [isHovered, setIsHovered] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  
  // Refs for cleanup and timing
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isUnmountedRef = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Stable prefetch function
  const prefetchVideo = useCallback(async () => {
    if (isUnmountedRef.current) return

    try {
      await queryClient.prefetchQuery({
        queryKey: ["video", video.id],
        queryFn: () => apiGet(`/api/public/videos/${video.id}`),
        staleTime: 60_000,
      })
    } catch (error) {
      console.warn('Prefetch failed for video:', video.id, error)
    }
  }, [queryClient, video.id])

  // Handle interaction start (hover/focus)
  const handleInteractionStart = useCallback(() => {
    if (isUnmountedRef.current) return

    setIsHovered(true)
    
    // Clear any existing timeouts
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current)
    }
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
    }
    
    // Get connection-aware delays
    const delays = connectionQuality.getRecommendedDelays()
    
    // Prefetch after delay (only on medium/fast connections)
    if (!connectionQuality.isSlowConnection) {
      prefetchTimeoutRef.current = setTimeout(() => {
        if ((isHovered || isFocused) && !isUnmountedRef.current) {
          prefetchVideo()
        }
      }, delays.prefetch)
    }
    
    // Preview after longer delay (only on fast connections)
    if (connectionQuality.shouldEnablePreviews && delays.preview > 0) {
      previewTimeoutRef.current = setTimeout(() => {
        if ((isHovered || isFocused) && !isUnmountedRef.current && !activePreviewId) {
          activePreviewId = video.id
          setShowPreview(true)
        }
      }, delays.preview)
    }
  }, [connectionQuality, prefetchVideo, video.id, isHovered, isFocused])

  // Handle interaction end (mouse leave/blur)
  const handleInteractionEnd = useCallback(() => {
    setIsHovered(false)
    setIsFocused(false)
    
    // Clear timeouts
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current)
      prefetchTimeoutRef.current = null
    }
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
      previewTimeoutRef.current = null
    }
    
    // Cancel requests
    queryClient.cancelQueries({ queryKey: ["video", video.id] })
    
    // Clean up preview
    if (showPreview && activePreviewId === video.id) {
      setShowPreview(false)
      activePreviewId = null
    }
  }, [queryClient, video.id, showPreview])

  // Handle card click/activation
  const handleCardActivation = useCallback((event?: React.KeyboardEvent) => {
    if (event) {
      event.preventDefault()
    }

    // Clean up before navigation
    handleInteractionEnd()
    queryClient.cancelQueries({ queryKey: ["video"] })
    activePreviewId = null
    
    // Save scroll and navigate
    sessionStorage.setItem('mainPageScrollPosition', window.scrollY.toString())
    router.push(`/video/${video.id}`)
  }, [handleInteractionEnd, queryClient, router, video.id])

  // Keyboard event handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        handleCardActivation(event)
        break
      case 'Escape':
        if (cardRef.current) {
          cardRef.current.blur()
        }
        break
    }
  }, [handleCardActivation])

  // Focus handlers
  const handleFocus = useCallback(() => {
    setIsFocused(true)
    handleInteractionStart()
  }, [handleInteractionStart])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    setTimeout(() => {
      if (!isFocused && !isHovered) {
        handleInteractionEnd()
      }
    }, 100)
  }, [isFocused, isHovered, handleInteractionEnd])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true
      
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current)
      }
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current)
      }
      
      queryClient.cancelQueries({ queryKey: ["video", video.id] })
      
      if (activePreviewId === video.id) {
        activePreviewId = null
      }
    }
  }, [queryClient, video.id])

  // Reset unmounted flag
  useEffect(() => {
    isUnmountedRef.current = false
  }, [])

  return (
    <div 
      ref={cardRef}
      className={`cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl ${
        isFocused ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      role="article"
      tabIndex={0}
      aria-label={`${video.title} by ${video.preacher}, duration ${video.duration}`}
      onMouseEnter={handleInteractionStart}
      onMouseLeave={handleInteractionEnd}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={() => handleCardActivation()}
      onKeyDown={handleKeyDown}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-muted mb-3">
        {/* Thumbnail Image - Stable, no reloading */}
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={`Thumbnail for ${video.title}`}
            fill
            className="object-cover"
            loading="lazy"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
            unoptimized={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <Play className="w-16 h-16 text-muted-foreground/50" aria-hidden="true" />
          </div>
        )}

        {/* Preview Overlay - Only on fast connections */}
        {showPreview && connectionQuality.shouldEnablePreviews && (
          <div className="absolute inset-0 z-10 bg-black animate-in fade-in-0 duration-300">
            {video.video_url && video.video_url.includes('youtube') ? (
              <iframe
                src={`${video.video_url}&autoplay=1&mute=1&controls=0`}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                title={`Preview: ${video.title}`}
              />
            ) : video.video_url ? (
              <video
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                aria-label={`Video preview for ${video.title}`}
              >
                <source src={video.video_url} type="video/mp4" />
              </video>
            ) : null}
          </div>
        )}

        {/* Connection Quality Indicator (Development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
            {connectionQuality.quality}
          </div>
        )}

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-semibold px-2 py-1 rounded">
          <Clock className="w-3 h-3 inline mr-1" aria-hidden="true" />
          <span>{video.duration}</span>
        </div>

        {/* Topic Badge */}
        <div className="absolute top-2 left-2">
          <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm">
            {video.topic}
          </Badge>
        </div>

        {/* Play Button Overlay */}
        {(isHovered || isFocused) && !showPreview && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center animate-in fade-in-0 duration-200">
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center transform transition-transform group-hover:scale-110">
              <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" aria-hidden="true" />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {(isHovered || isFocused) && user && (
          <div className="absolute top-2 right-2 flex gap-1 animate-in slide-in-from-top-2 duration-200">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite()
              }}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-current text-red-500" : ""}`} aria-hidden="true" />
            </Button>
            <div onClick={(e) => e.stopPropagation()}>
              <AddToCollectionDialog videoId={video.id}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm"
                  aria-label="Add to collection"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </Button>
              </AddToCollectionDialog>
            </div>
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="flex gap-3">
        {/* Preacher Avatar */}
        <div className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
            <span className="text-sm font-semibold text-foreground" aria-hidden="true">
              {video.preacher.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Title and Metadata */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-1">{video.preacher}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{video.views} views</span>
            <SermonNotesPreview
              notesCount={video.sermon_notes?.length ?? 0}
              scriptureCount={video.scripture_references?.length ?? 0}
            />
          </div>

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2" role="list" aria-label="Video tags">
              {video.tags.slice(0, 2).map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs bg-muted/50 border-border/50 text-muted-foreground"
                  role="listitem"
                >
                  {tag}
                </Badge>
              ))}
              {video.tags.length > 2 && (
                <Badge 
                  variant="outline" 
                  className="text-xs bg-muted/50 border-border/50 text-muted-foreground"
                  title={`${video.tags.length - 2} more tags`}
                >
                  +{video.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* AI Generation Button */}
        {user && onGenerateAI && (
          <div className="flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                onGenerateAI(video.id)
              }}
              aria-label="Generate AI content for this video"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
})

export default FixedVideoCard
