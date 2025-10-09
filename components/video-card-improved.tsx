"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Play, Heart, Clock, Plus, Sparkles, BookOpen, Quote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { apiGet } from "@/lib/api"
import { usePerformanceMonitor } from "@/lib/hooks/use-performance-monitor"
import { usePreviewManager } from "@/lib/contexts/preview-context"
import { useConnectionQuality } from "@/lib/hooks/use-connection-quality"
import { User } from "@/lib/types/user"
import { VideoCardConfig, DEFAULT_VIDEO_CARD_CONFIG } from "@/lib/types/video-card-config"
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
  user?: User
  onGenerateAI?: (videoId: string) => void
  config?: Partial<VideoCardConfig>
}

export function ImprovedVideoCard({ 
  video, 
  isFavorite, 
  onPlay, 
  onToggleFavorite, 
  user, 
  onGenerateAI,
  config: userConfig = {}
}: VideoCardProps) {
  const config = { ...DEFAULT_VIDEO_CARD_CONFIG, ...userConfig }
  const router = useRouter()
  const queryClient = useQueryClient()
  const { trackEvent } = usePerformanceMonitor()
  const { requestPreview, releasePreview, canShowPreview } = usePreviewManager()
  const connectionQuality = useConnectionQuality()
  
  // Component state
  const [isHovered, setIsHovered] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [prefetchError, setPrefetchError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  
  // Refs for cleanup and timing
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isUnmountedRef = useRef(false)
  const navigationStartRef = useRef<number>(0)
  const cardRef = useRef<HTMLDivElement>(null)

  // Prefetch with retry logic
  const prefetchWithRetry = useCallback(async () => {
    if (!config.enablePrefetch || isUnmountedRef.current) return

    try {
      trackEvent({ type: 'prefetch', videoId: video.id })
      await queryClient.prefetchQuery({
        queryKey: ["video", video.id],
        queryFn: () => apiGet(`/api/data/videos/${video.id}`),
        staleTime: 60_000,
      })
      setPrefetchError(false)
      setRetryCount(0)
    } catch (error) {
      console.warn('Prefetch failed for video:', video.id, error)
      
      if (config.enableErrorRecovery && retryCount < config.maxRetryAttempts) {
        setRetryCount(prev => prev + 1)
        setTimeout(() => {
          if (!isUnmountedRef.current) {
            prefetchWithRetry()
          }
        }, config.retryDelay * (retryCount + 1))
      } else {
        setPrefetchError(true)
        trackEvent({ type: 'prefetch_failed', videoId: video.id })
      }
    }
  }, [config, queryClient, video.id, trackEvent, retryCount])

  // Handle mouse/focus enter
  const handleInteractionStart = useCallback(() => {
    if (isUnmountedRef.current) return

    setIsHovered(true)
    
    // Get connection-aware delays
    const delays = connectionQuality.getRecommendedDelays()
    const shouldPrefetch = config.enablePrefetch && 
                          (config.enableConnectionQualityDetection ? !connectionQuality.isSlowConnection : true)
    
    // Prefetch after delay
    if (shouldPrefetch) {
      prefetchTimeoutRef.current = setTimeout(() => {
        if ((isHovered || isFocused) && !isUnmountedRef.current) {
          prefetchWithRetry()
        }
      }, delays.prefetch)
    }
    
    // Preview after longer delay (only on fast connections)
    const shouldShowPreview = config.enablePreview && 
                             connectionQuality.shouldEnablePreviews &&
                             canShowPreview(video.id)
    
    if (shouldShowPreview && delays.preview > 0) {
      previewTimeoutRef.current = setTimeout(() => {
        if ((isHovered || isFocused) && !isUnmountedRef.current && requestPreview(video.id)) {
          trackEvent({ type: 'preview', videoId: video.id })
          setIsPreviewLoading(true)
          setShowPreview(true)
        }
      }, delays.preview)
    }
  }, [
    config, 
    connectionQuality, 
    canShowPreview, 
    requestPreview, 
    video.id, 
    trackEvent, 
    prefetchWithRetry,
    isHovered,
    isFocused
  ])

  // Handle mouse/focus leave
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
    
    // Cancel requests and clean up preview
    queryClient.cancelQueries({ queryKey: ["video", video.id] })
    trackEvent({ type: 'cancel', videoId: video.id, bytesSaved: 2000000 })
    
    if (showPreview) {
      setShowPreview(false)
      setIsPreviewLoading(false)
      releasePreview(video.id)
    }
  }, [queryClient, video.id, trackEvent, showPreview, releasePreview])

  // Handle card click/activation
  const handleCardActivation = useCallback((event?: React.KeyboardEvent) => {
    // Prevent default for keyboard events
    if (event) {
      event.preventDefault()
    }

    navigationStartRef.current = performance.now()
    
    // Clean up before navigation
    handleInteractionEnd()
    queryClient.cancelQueries({ queryKey: ["video"] })
    
    // Track navigation
    const loadTime = performance.now() - navigationStartRef.current
    trackEvent({ type: 'navigation', videoId: video.id, loadTime })
    
    // Save scroll and navigate
    sessionStorage.setItem('mainPageScrollPosition', window.scrollY.toString())
    router.push(`/video/${video.id}`)
  }, [handleInteractionEnd, queryClient, trackEvent, video.id, router])

  // Keyboard event handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!config.enableKeyboardNavigation) return

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
  }, [config.enableKeyboardNavigation, handleCardActivation])

  // Focus handlers
  const handleFocus = useCallback(() => {
    setIsFocused(true)
    handleInteractionStart()
  }, [handleInteractionStart])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    // Don't immediately end interaction - user might be using keyboard navigation
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
      
      if (showPreview) {
        releasePreview(video.id)
      }
    }
  }, [queryClient, video.id, showPreview, releasePreview])

  // Reset unmounted flag
  useEffect(() => {
    isUnmountedRef.current = false
  }, [])

  // Accessibility attributes
  const ariaLabel = config.enableScreenReaderSupport 
    ? `${video.title} by ${video.preacher}, duration ${video.duration}. ${video.topic} topic.`
    : undefined

  return (
    <div 
      ref={cardRef}
      className={`cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl ${
        isFocused ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      role="article"
      tabIndex={config.enableKeyboardNavigation ? 0 : -1}
      aria-label={ariaLabel}
      onMouseEnter={handleInteractionStart}
      onMouseLeave={handleInteractionEnd}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={() => handleCardActivation()}
      onKeyDown={handleKeyDown}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-muted mb-3">
        {/* Thumbnail Image with Lazy Loading */}
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={`Thumbnail for ${video.title}`}
            fill
            className="object-cover"
            loading={config.enableLazyLoading ? "lazy" : "eager"}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={(e) => {
              console.warn('Thumbnail failed to load for video:', video.id)
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <Play className="w-16 h-16 text-muted-foreground/50" aria-hidden="true" />
          </div>
        )}

        {/* Preview Overlay */}
        {showPreview && connectionQuality.shouldEnablePreviews && (
          <div className="absolute inset-0 z-10 bg-black animate-in fade-in-0 duration-300">
            {isPreviewLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" aria-hidden="true"></div>
                <span className="sr-only">Loading video preview</span>
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
                  aria-label={`Video preview for ${video.title}`}
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

        {/* Error State */}
        {prefetchError && (
          <div className="absolute top-2 left-2 bg-red-500/90 text-white text-xs px-2 py-1 rounded">
            <span className="sr-only">Error loading video data</span>
            ⚠️
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
          <span aria-label={`Duration: ${video.duration}`}>{video.duration}</span>
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
            {((video.sermonNotes?.length ?? 0) > 0 || (video.scriptureReferences?.length ?? 0) > 0) && (
              <>
                <span aria-hidden="true">•</span>
                <div className="flex items-center gap-2">
                  {(video.sermonNotes?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-1" title={`${video.sermonNotes?.length ?? 0} sermon notes`}>
                      <BookOpen className="w-3 h-3" aria-hidden="true" />
                      <span>{video.sermonNotes?.length ?? 0}</span>
                    </div>
                  )}
                  {(video.scriptureReferences?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-1" title={`${video.scriptureReferences?.length ?? 0} scripture references`}>
                      <Quote className="w-3 h-3" aria-hidden="true" />
                      <span>{video.scriptureReferences?.length ?? 0}</span>
                    </div>
                  )}
                </div>
              </>
            )}
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
}

export default ImprovedVideoCard
