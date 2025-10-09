"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Play, Heart, Clock, MoreVertical, Plus, Sparkles, BookOpen, Quote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { apiGet } from "@/lib/api"
import { usePerformanceMonitor } from "@/lib/hooks/use-performance-monitor"
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
  sermonNotes?: string[]
  scriptureReferences?: any[]
  tags?: string[]
  thumbnail_url?: string
}

interface VideoCardProps {
  video: Video
  isFavorite: boolean
  onPlay: () => void
  onToggleFavorite: () => void
  user?: any
  onGenerateAI?: (videoId: string) => void
}

// Global state for managing concurrent previews
let activePreviewCount = 0
const MAX_CONCURRENT_PREVIEWS = 1
const PREFETCH_DELAY = 2500 // Increased from 1000ms
const PREVIEW_DELAY = 3000 // Longer delay for actual video preview

// Connection quality detection
const getConnectionQuality = (): 'slow' | 'medium' | 'fast' => {
  // @ts-ignore - Navigator connection API
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  
  if (!connection) return 'medium' // Default fallback
  
  const effectiveType = connection.effectiveType
  const downlink = connection.downlink || 0
  
  // Classify connection speed
  if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 1) {
    return 'slow'
  } else if (effectiveType === '3g' || downlink < 5) {
    return 'medium'
  } else {
    return 'fast'
  }
}

export function VideoCard({ video, isFavorite, onPlay, onToggleFavorite, user, onGenerateAI }: VideoCardProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { trackEvent } = usePerformanceMonitor()
  const [isHovered, setIsHovered] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [connectionQuality] = useState(() => getConnectionQuality())
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isUnmountedRef = useRef(false)
  const navigationStartRef = useRef<number>(0)

  const handleMouseEnter = useCallback(() => {
    if (!window.matchMedia('(hover: hover)').matches || isUnmountedRef.current) {
      return
    }

    setIsHovered(true)
    
    // Intelligent prefetching based on connection quality
    const shouldPrefetch = connectionQuality !== 'slow'
    const prefetchDelay = connectionQuality === 'slow' ? PREFETCH_DELAY * 2 : PREFETCH_DELAY
    
    if (shouldPrefetch) {
      prefetchTimeoutRef.current = setTimeout(() => {
        if (isHovered && !isUnmountedRef.current) {
          // Only prefetch if still hovering after delay
          trackEvent({ type: 'prefetch', videoId: video.id })
          queryClient.prefetchQuery({
            queryKey: ["video", video.id],
            queryFn: () => apiGet(`/api/data/videos/${video.id}`),
            staleTime: 60_000,
          }).catch((error) => {
            console.warn('Prefetch failed for video:', video.id, error)
          })
        }
      }, prefetchDelay)
    }
    
    // Preview loading with stricter conditions
    const shouldShowPreview = connectionQuality === 'fast' && activePreviewCount < MAX_CONCURRENT_PREVIEWS
    
    if (shouldShowPreview) {
      previewTimeoutRef.current = setTimeout(() => {
        if (isHovered && !isUnmountedRef.current && activePreviewCount < MAX_CONCURRENT_PREVIEWS) {
          trackEvent({ type: 'preview', videoId: video.id })
          setIsPreviewLoading(true)
          activePreviewCount++
          setShowPreview(true)
        }
      }, PREVIEW_DELAY)
    }
  }, [isHovered, connectionQuality, queryClient, video.id])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    setShowMenu(false)
    
    // Cancel all pending timeouts
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current)
      prefetchTimeoutRef.current = null
    }
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
      previewTimeoutRef.current = null
    }
    
    // Cancel ongoing prefetch requests
    queryClient.cancelQueries({ queryKey: ["video", video.id] })
    trackEvent({ type: 'cancel', videoId: video.id, bytesSaved: 2000000 }) // Estimate 2MB saved
    
    // Clean up preview state
    if (showPreview) {
      setShowPreview(false)
      setIsPreviewLoading(false)
      activePreviewCount = Math.max(0, activePreviewCount - 1)
    }
  }, [queryClient, video.id, showPreview])

  const handleCardClick = useCallback(() => {
    // Track navigation start time
    navigationStartRef.current = performance.now()
    
    // Cancel all preview activities before navigation
    handleMouseLeave()
    
    // Cancel all video-related queries to prioritize main video loading
    queryClient.cancelQueries({ queryKey: ["video"] })
    
    // Reset global preview counter
    activePreviewCount = 0
    
    // Save scroll position and navigate
    sessionStorage.setItem('mainPageScrollPosition', window.scrollY.toString())
    
    // Track navigation event
    const loadTime = performance.now() - navigationStartRef.current
    trackEvent({ type: 'navigation', videoId: video.id, loadTime })
    
    router.push(`/video/${video.id}`)
  }, [handleMouseLeave, queryClient, router, video.id, trackEvent])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true
      
      // Clear all timeouts
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current)
      }
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current)
      }
      
      // Cancel queries and clean up preview state
      queryClient.cancelQueries({ queryKey: ["video", video.id] })
      
      if (showPreview) {
        activePreviewCount = Math.max(0, activePreviewCount - 1)
      }
    }
  }, [queryClient, video.id, showPreview])
  
  // Reset unmounted flag when component mounts
  useEffect(() => {
    isUnmountedRef.current = false
  }, [])

  return (
    <div 
      className="cursor-pointer group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-muted mb-3">
        {/* Thumbnail Image */}
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <Play className="w-16 h-16 text-muted-foreground/50" />
          </div>
        )}

        {/* Hover Preview Overlay - Only on fast connections */}
        {showPreview && connectionQuality === 'fast' && (
          <div className="absolute inset-0 z-10 bg-black animate-in fade-in-0 duration-300">
            {isPreviewLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            )}
            {video.video_url && (
              video.video_url.match(/\.(mp4|webm|ogg|m3u8)(\?|$)/i) ? (
                <video
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  onLoadStart={() => setIsPreviewLoading(false)}
                  onError={() => {
                    setIsPreviewLoading(false)
                    console.warn('Preview video failed to load:', video.id)
                  }}
                >
                  <source src={video.video_url} type="video/mp4" />
                </video>
              ) : (
                <iframe
                  src={`${video.video_url}&autoplay=1&mute=1`}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  title={`Preview: ${video.title}`}
                  onLoad={() => setIsPreviewLoading(false)}
                />
              )
            )}
          </div>
        )}
        
        {/* Connection Quality Indicator (Development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
            {connectionQuality}
          </div>
        )}

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-semibold px-2 py-1 rounded">
          {video.duration}
        </div>

        {/* Topic Badge */}
        <div className="absolute top-2 left-2">
          <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm">
            {video.topic}
          </Badge>
        </div>

        {/* Play Button Overlay on Hover */}
        {isHovered && !showPreview && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center animate-in fade-in-0 duration-200">
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center transform transition-transform group-hover:scale-110">
              <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
            </div>
          </div>
        )}

        {/* Quick Actions Menu */}
        {isHovered && (
          <div className="absolute top-2 right-2 flex gap-1 animate-in slide-in-from-top-2 duration-200">
            {user && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleFavorite()
                  }}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? "fill-current text-red-500" : ""}`} />
                </Button>
                <div onClick={(e) => e.stopPropagation()}>
                  <AddToCollectionDialog videoId={video.id}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </AddToCollectionDialog>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="flex gap-3">
        {/* Preacher Avatar Placeholder */}
        <div className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
            <span className="text-sm font-semibold text-foreground">
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
            {(video.sermonNotes?.length || video.scriptureReferences?.length) && (
              <>
                <span>•</span>
                <div className="flex items-center gap-2">
                  {video.sermonNotes?.length > 0 && (
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      <span>{video.sermonNotes.length}</span>
                    </div>
                  )}
                  {video.scriptureReferences?.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Quote className="w-3 h-3" />
                      <span>{video.scriptureReferences.length}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {video.tags.slice(0, 2).map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs bg-muted/50 border-border/50 text-muted-foreground"
                >
                  {tag}
                </Badge>
              ))}
              {video.tags.length > 2 && (
                <Badge variant="outline" className="text-xs bg-muted/50 border-border/50 text-muted-foreground">
                  +{video.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* More Options */}
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
              title="Generate AI content"
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
