
"use client"

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings, 
  SkipBack,
  SkipForward,
  Loader2,
  AlertCircle,
  PictureInPicture,
  PictureInPicture2,
  StickyNote
} from "lucide-react"
import type Hls from 'hls.js'
import type { Events } from 'hls.js'
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"

interface Ad {
  id: string
  type: 'pre-roll' | 'mid-roll' | 'post-roll'
  url: string
  duration: number
  skipAfter?: number // seconds after which skip button appears
  clickUrl?: string
  title?: string
  advertiser?: string
  triggerTime?: number // for mid-roll ads
}

interface Watermark {
  src: string
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  opacity: number
  size: 'small' | 'medium' | 'large'
  clickUrl?: string
}


interface Chapter {
  id: string
  title: string
  startTime: number
  endTime?: number
  thumbnail?: string
}

interface VideoPlayerProps {
  src: string
  hlsVariants?: Array<{
    url: string
    quality: string
    bandwidth?: number
  }>
  poster?: string
  autoPlay?: boolean
  startTime?: number
  endTime?: number
  onTimeUpdate?: (currentTime: number) => void
  onEnded?: () => void
  className?: string
  // New features
  ads?: Ad[]
  watermark?: Watermark
  chapters?: Chapter[]
  onChapterChange?: (chapter: Chapter) => void
  onAdStart?: (ad: Ad) => void
  onAdEnd?: (ad: Ad) => void
  onAdSkip?: (ad: Ad) => void
  onAdClick?: (ad: Ad) => void
  // Note-taking feature
  transcriptSegments?: Array<{
    start: number
    end: number
    text: string
    confidence?: number
  }>
  onNoteTaken?: (note: {
    startTime: number
    endTime: number
    transcriptText: string
    videoTime: number
  }) => void
  // View tracking
  videoId?: string
  onViewTracked?: (viewData: {
    video_id: string
    session_id: string
    device_type: string
    quality_watched: string
  }) => void
}

interface VideoState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isFullscreen: boolean
  isPictureInPicture: boolean
  isLoading: boolean
  error: string | null
  buffered: number
  quality: string
  playbackRate: number
  // Ad state
  currentAd: Ad | null
  isPlayingAd: boolean
  adTimeRemaining: number
  canSkipAd: boolean
  playedAds: string[] // Track which ads have been played
  // Error recovery
  retryCount: number
  canRetry: boolean
  // Thumbnail preview
  showThumbnailPreview: boolean
  thumbnailPreviewTime: number
  thumbnailPreviewPosition: number
  // Double-click seeking
  seekFeedback: 'backward' | 'forward' | null
  seekFeedbackTimeout: NodeJS.Timeout | null
  // Note-taking
  isCapturingNote: boolean
  noteCaptureStartTime: number
  noteCaptureEndTime: number
  // View tracking
  hasTrackedView: boolean
  viewStartTime: number
  watchTime: number
}

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const SEEK_STEP = 10 // seconds
const STATE_UPDATE_THROTTLE = 250 // ms - throttle state updates to reduce re-renders
const PROGRESS_HOVER_THROTTLE = 50 // ms - throttle progress bar hover updates

// Utility functions for positioning
const getPositionClasses = (position: string, size: string) => {
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24', 
    large: 'w-32 h-32'
  }
  
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'center': 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
  }
  
  return `${sizeClasses[size as keyof typeof sizeClasses]} ${positionClasses[position as keyof typeof positionClasses]}`
}

// Device detection utility
const getDeviceType = (): string => {
  if (typeof navigator === 'undefined') return 'desktop'
  const userAgent = navigator.userAgent
  if (/Mobi|Android/i.test(userAgent)) return 'mobile'
  if (/Tablet|iPad/i.test(userAgent)) return 'tablet'
  return 'desktop'
}

const CustomVideoPlayer = ({
  src,
  hlsVariants = [],
  poster,
  autoPlay = false,
  startTime = 0,
  endTime,
  onTimeUpdate,
  onEnded,
  className = "",
  ads = [],
  watermark,
  chapters = [],
  onChapterChange,
  onAdStart,
  onAdEnd,
  onAdSkip,
  onAdClick,
  transcriptSegments = [],
  onNoteTaken,
  // View tracking
  videoId,
  onViewTracked
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dragCleanupRef = useRef<(() => void) | null>(null)
  const lastTimeUpdateRef = useRef<number>(0)
  const watchTimeRef = useRef<number>(0)
  const viewStartTimeRef = useRef<number>(0)
  const lastStateUpdateRef = useRef<number>(0)
  const lastProgressHoverRef = useRef<number>(0)
  
  const [state, setState] = useState<VideoState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    isFullscreen: false,
    isPictureInPicture: false,
    isLoading: true,
    error: null,
    buffered: 0,
    quality: '720',
    playbackRate: 1,
    // Ad state
    currentAd: null,
    isPlayingAd: false,
    adTimeRemaining: 0,
    canSkipAd: false,
    playedAds: [],
    // Error recovery
    retryCount: 0,
    canRetry: false,
    // Thumbnail preview
    showThumbnailPreview: false,
    thumbnailPreviewTime: 0,
    thumbnailPreviewPosition: 0,
    // Double-click seeking
    seekFeedback: null,
    seekFeedbackTimeout: null,
    // Note-taking
    isCapturingNote: false,
    noteCaptureStartTime: 0,
    noteCaptureEndTime: 0,
    // View tracking
    hasTrackedView: false,
    viewStartTime: 0,
    watchTime: 0
  })
  
  const [announcements, setAnnouncements] = useState<Array<{id: string, text: string}>>([])

  const [showControls, setShowControls] = useState(true)
  const [showProgressBar, setShowProgressBar] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const announce = useCallback((message: string) => {
    const id = `announcement-${Date.now()}-${Math.random()}`
    setAnnouncements(prev => [...prev, { id, text: message }])

    // Remove announcement after screen reader has time to read it
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    }, 1000)
  }, [])

  const trackView = useCallback(async () => {
    if (!videoId || state.hasTrackedView || !videoRef.current) return

    try {
      // Generate session ID if not exists
      let sessionId = localStorage.getItem('video_session_id')
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem('video_session_id', sessionId)
      }

      const viewData = {
        video_id: videoId,
        session_id: sessionId,
        device_type: getDeviceType(),
        quality_watched: state.quality
      }

      // Call the view tracking callback or API directly
      if (onViewTracked) {
        onViewTracked(viewData)
      } else {
        // Fallback: call API directly
        try {
          const response = await fetch(`/api/v1/videos/${videoId}/view`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(viewData)
          })

          if (!response.ok) {
            console.warn('Failed to track view:', response.status)
          }
        } catch (error) {
          console.warn('Error tracking view:', error)
        }
      }

      // Mark as tracked
      setState(prev => ({ ...prev, hasTrackedView: true }))
    } catch (error) {
      console.error('Error in trackView:', error)
    }
  }, [videoId, state.hasTrackedView, state.quality, onViewTracked])

  // Check if view should be tracked based on watch time
  const checkViewThreshold = useCallback(() => {
    if (!videoRef.current || state.hasTrackedView) return

    const duration = videoRef.current.duration
    if (!duration || duration === 0) return

    // View threshold: 30 seconds OR 50% of video duration (whichever is shorter)
    const timeThreshold = Math.min(30, duration * 0.5)

    if (watchTimeRef.current >= timeThreshold) {
      trackView()
    }
  }, [state.hasTrackedView, trackView])

  // Continuous watch time tracking while playing (optimized with refs)
  useEffect(() => {
    if (!state.isPlaying || state.hasTrackedView || state.isPlayingAd) return

    const interval = setInterval(() => {
      // Use ref to avoid state updates every second
      watchTimeRef.current += 1
      
      // Check threshold without triggering re-render
      checkViewThreshold()
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [state.isPlaying, state.hasTrackedView, state.isPlayingAd, checkViewThreshold])

  // Ad management functions (declared early to avoid reference errors)
  const endCurrentAd = useCallback(() => {
    if (!videoRef.current || !state.currentAd) return
    
    const ad = state.currentAd
    onAdEnd?.(ad)
    
    setState(prev => ({ 
      ...prev, 
      currentAd: null,
      isPlayingAd: false,
      adTimeRemaining: 0,
      canSkipAd: false,
      playedAds: [...prev.playedAds, ad.id] // Mark ad as played
    }))
    
    // Return to main video
    videoRef.current.src = src
    if (startTime > 0) {
      videoRef.current.currentTime = startTime
    }
    videoRef.current.play().catch(console.error)
  }, [state.currentAd, onAdEnd, src, startTime])

  const playAd = useCallback((ad: Ad) => {
    if (!videoRef.current) return
    
    setState(prev => ({ 
      ...prev, 
      currentAd: ad,
      isPlayingAd: true,
      adTimeRemaining: ad.duration,
      canSkipAd: false
    }))
    
    // Switch video source to ad
    videoRef.current.src = ad.url
    videoRef.current.play().catch(console.error)
    onAdStart?.(ad)
  }, [onAdStart])

  const skipAd = useCallback(() => {
    if (!state.currentAd || !state.canSkipAd) return
    
    const ad = state.currentAd
    onAdSkip?.(ad)
    
    // Mark ad as played when skipped
    setState(prev => ({ 
      ...prev, 
      currentAd: null,
      isPlayingAd: false,
      adTimeRemaining: 0,
      canSkipAd: false,
      playedAds: [...prev.playedAds, ad.id]
    }))
    
    // Return to main video
    if (videoRef.current) {
      videoRef.current.src = src
      if (startTime > 0) {
        videoRef.current.currentTime = startTime
      }
      videoRef.current.play().catch(console.error)
    }
  }, [state.currentAd, state.canSkipAd, onAdSkip, src, startTime])

  const handleAdClick = useCallback(() => {
    if (!state.currentAd) return
    
    onAdClick?.(state.currentAd)
    if (state.currentAd.clickUrl) {
      window.open(state.currentAd.clickUrl, '_blank')
    }
  }, [state.currentAd, onAdClick])

  // Error recovery function
  const retryVideo = useCallback(() => {
    if (!videoRef.current || state.retryCount >= 3) return
    
    setState(prev => ({ 
      ...prev, 
      error: null, 
      isLoading: true,
      retryCount: prev.retryCount + 1,
      canRetry: false
    }))
    
    // Retry loading the video
    videoRef.current.load()
  }, [state.retryCount])

  // Initialize HLS
  useEffect(() => {
    const initializePlayer = async () => {
      if (!videoRef.current) return

      const video = videoRef.current
      
      // Check if source is HLS
      if (src.includes('.m3u8') || hlsVariants.length > 0) {
        try {
          const Hls = (await import('hls.js')).default
          
          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 30,
              maxBufferLength: 30, // Increased from 10 to prevent buffering
              maxMaxBufferLength: 60, // Increased from 20 for better experience
              maxBufferSize: 60 * 1000 * 1000, // 60MB max buffer size
              maxBufferHole: 0.5,
              startLevel: -1, // Start with auto quality selection
              abrEwmaDefaultEstimate: 5e5,
            })
            
            hlsRef.current = hls
            hls.loadSource(src)
            hls.attachMedia(video)
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setState(prev => ({ ...prev, isLoading: false }))
              if (autoPlay) {
                // Start playing immediately when manifest is parsed
                video.play().catch(console.error)
              }
            })

            // Start playing as soon as we have enough audio buffered
            hls.on(Hls.Events.FRAG_BUFFERED, (event, data) => {
              if (autoPlay && !state.isPlaying && data.stats.buffering.end > 5) {
                // If we have 5+ seconds buffered and autoplay is enabled, start playing
                video.play().catch(console.error)
              }
            })
            
            hls.on(Hls.Events.ERROR, (event, data) => {
              if (data.fatal) {
                setState(prev => ({ 
                  ...prev, 
                  error: `HLS Error: ${data.details}`,
                  isLoading: false 
                }))
              }
            })
            
            // Handle quality levels
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              const levels = hls.levels
              if (levels.length > 0) {
                // Set initial quality to 720p if available, otherwise auto
                const sevenTwentyLevel = levels.findIndex(level => level.height === 720)
                if (sevenTwentyLevel !== -1) {
                  hls.currentLevel = sevenTwentyLevel
                } else {
                  hls.currentLevel = -1
                }
              }
            })
            
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = src
            setState(prev => ({ ...prev, isLoading: false }))
          } else {
            setState(prev => ({ 
              ...prev, 
              error: 'HLS not supported in this browser',
              isLoading: false 
            }))
          }
        } catch (error) {
          setState(prev => ({ 
            ...prev, 
            error: 'Failed to load HLS library',
            isLoading: false 
          }))
        }
      } else {
        // Regular video file
        video.src = src
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    initializePlayer()

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src, autoPlay])

// Video event handlers
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setState(prev => ({ 
        ...prev, 
        duration: video.duration,
        isLoading: false 
      }))
      announce(`Video loaded, duration ${formatTime(video.duration)}`)
      
      if (startTime > 0) {
        video.currentTime = startTime
      }
    }

    const handleTimeUpdate = () => {
      if (!isDragging) {
        const currentTime = video.currentTime
        const now = Date.now()
        
        // Throttle state updates to reduce re-renders (max once per 250ms)
        if (now - lastStateUpdateRef.current > STATE_UPDATE_THROTTLE) {
          setState(prev => ({ ...prev, currentTime }))
          lastStateUpdateRef.current = now
        }
        
        // Throttle onTimeUpdate callback to prevent excessive calls
        if (onTimeUpdate && now - lastTimeUpdateRef.current > STATE_UPDATE_THROTTLE) {
          onTimeUpdate(currentTime)
          lastTimeUpdateRef.current = now
        }
        
        // Handle ad timing
        if (state.isPlayingAd && state.currentAd) {
          const timeRemaining = state.currentAd.duration - currentTime
          setState(prev => ({ 
            ...prev, 
            adTimeRemaining: Math.max(0, timeRemaining),
            canSkipAd: state.currentAd?.skipAfter ? currentTime >= state.currentAd.skipAfter : false
          }))
          
          // End ad when duration reached
          if (timeRemaining <= 0) {
            endCurrentAd()
          }
        } else if (!state.isPlayingAd) {
          // Check for mid-roll ads that haven't been played yet
          // Use a more precise timing mechanism to avoid multiple triggers
          const midRollAd = ads.find(ad => 
            ad.type === 'mid-roll' && 
            ad.triggerTime && 
            currentTime >= ad.triggerTime &&
            currentTime < ad.triggerTime + 1 && // 1-second window after trigger
            !state.playedAds.includes(ad.id)
          )
          
          if (midRollAd) {
            announce("Advertisement starting")
            playAd(midRollAd)
            return
          }
        }
        
        // Check end time
        if (endTime && currentTime >= endTime) {
          video.pause()
          announce("Video ended")
          onEnded?.()
        }

        // Check view tracking threshold
        if (state.isPlaying && !state.hasTrackedView) {
          checkViewThreshold()
        }
      }
    }

  const handlePlay = () => {
    setState(prev => ({ ...prev, isPlaying: true }))
    // Use ref for view start time to avoid state updates
    if (!state.hasTrackedView && viewStartTimeRef.current === 0) {
      viewStartTimeRef.current = Date.now() / 1000
    }
    announce(state.isPlayingAd ? "Advertisement playing" : "Video playing")
  }

  const handlePause = () => {
    setState(prev => ({ ...prev, isPlaying: false }))
    // Update watch time using refs
    if (viewStartTimeRef.current > 0) {
      const currentTime = Date.now() / 1000
      watchTimeRef.current += (currentTime - viewStartTimeRef.current)
      viewStartTimeRef.current = 0
    }
    announce(state.isPlayingAd ? "Advertisement paused" : "Video paused")
  }
    const handleEnded = () => {
      if (state.isPlayingAd) {
        endCurrentAd()
        announce("Advertisement completed")
        return
      }
      
      // Check for post-roll ads that haven't been played yet
      const postRollAd = ads.find(ad => ad.type === 'post-roll' && !state.playedAds.includes(ad.id))
      if (postRollAd) {
        announce("Post-roll advertisement starting")
        playAd(postRollAd)
        return
      }
      
      setState(prev => ({ ...prev, isPlaying: false }))
      announce("Video ended")
      onEnded?.()
    }

    const handleVolumeChange = () => {
      setState(prev => ({ 
        ...prev, 
        volume: video.volume,
        isMuted: video.muted 
      }))
    }

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const buffered = (video.buffered.end(video.buffered.length - 1) / video.duration) * 100
        setState(prev => ({ ...prev, buffered }))
      }
    }

    const handleWaiting = () => setState(prev => ({ ...prev, isLoading: true }))
    const handleCanPlay = () => setState(prev => ({ ...prev, isLoading: false }))
    
    const handleEnterPiP = () => setState(prev => ({ ...prev, isPictureInPicture: true }))
    const handleLeavePiP = () => setState(prev => ({ ...prev, isPictureInPicture: false }))
    
    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement
      setState(prev => ({ ...prev, isFullscreen }))
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('volumechange', handleVolumeChange)
    video.addEventListener('progress', handleProgress)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('enterpictureinpicture', handleEnterPiP)
    video.addEventListener('leavepictureinpicture', handleLeavePiP)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('volumechange', handleVolumeChange)
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('enterpictureinpicture', handleEnterPiP)
      video.removeEventListener('leavepictureinpicture', handleLeavePiP)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [startTime, endTime, onTimeUpdate, onEnded, state.isPlayingAd, state.currentAd, state.playedAds, ads, playAd, endCurrentAd, checkViewThreshold])

  // Handle page unload - track view if threshold met
  useEffect(() => {
    if (!videoId || !videoRef.current) return

    const handleBeforeUnload = () => {
      if (state.isPlaying && !state.hasTrackedView && videoRef.current) {
        const duration = videoRef.current.duration
        if (!duration || duration === 0) return

        // Calculate final watch time using refs
        const currentTime = Date.now() / 1000
        const finalWatchTime = watchTimeRef.current + (viewStartTimeRef.current > 0 ? currentTime - viewStartTimeRef.current : 0)
        
        // Check if threshold is met
        const timeThreshold = Math.min(30, duration * 0.5)
        
        if (finalWatchTime >= timeThreshold) {
          // Generate session ID if not exists
          let sessionId = localStorage.getItem('video_session_id')
          if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            localStorage.setItem('video_session_id', sessionId)
          }

          const viewData = {
            video_id: videoId,
            session_id: sessionId,
            device_type: getDeviceType(),
            quality_watched: state.quality
          }

          // Use sendBeacon for guaranteed delivery on page unload
          const blob = new Blob([JSON.stringify(viewData)], { type: 'application/json' })
          navigator.sendBeacon(`/api/v1/videos/${videoId}/view`, blob)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [videoId, state.isPlaying, state.hasTrackedView, state.quality])


  // Handle pre-roll ads and logo timing
  useEffect(() => {
    if (!videoRef.current) return
    
    // Check for pre-roll ads when video is ready to play
    const handleCanPlay = () => {
      const preRollAd = ads.find(ad => ad.type === 'pre-roll' && !state.playedAds.includes(ad.id))
      if (preRollAd && !state.isPlayingAd && autoPlay) {
        playAd(preRollAd)
        return
      }
    }

    
    videoRef.current.addEventListener('canplay', handleCanPlay)
    
    return () => {
      videoRef.current?.removeEventListener('canplay', handleCanPlay)
    }
  }, [ads, autoPlay, state.isPlayingAd, state.playedAds, playAd])

  // Auto-hide controls with proper cleanup
 // Auto-hide controls
useEffect(() => {
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    
    setShowControls(true)
    
    if (state.isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
        setShowProgressBar(false)
      }, 3000)
    }
  }

  resetControlsTimeout()
  
  return () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
  }
}, [state.isPlaying])
  // Optimized control handlers with useCallback
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    
    if (state.isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch(console.error)
    }
  }, [state.isPlaying])

  const seek = useCallback((time: number) => {
    if (!videoRef.current) return
    
    const clampedTime = Math.max(0, Math.min(time, state.duration))
    videoRef.current.currentTime = clampedTime
    setState(prev => ({ ...prev, currentTime: clampedTime }))
  }, [state.duration])

  const setVolume = useCallback((volume: number) => {
    if (!videoRef.current) return
    
    const clampedVolume = Math.max(0, Math.min(1, volume))
    videoRef.current.volume = clampedVolume
    videoRef.current.muted = clampedVolume === 0
  }, [])

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return
    
    videoRef.current.muted = !videoRef.current.muted
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error)
    } else {
      document.exitFullscreen().catch(console.error)
    }
  }, [])

  const togglePictureInPicture = useCallback(async () => {
    if (!videoRef.current) return
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture()
      }
    } catch (error) {
      console.error('Picture-in-Picture error:', error)
    }
  }, [])

  const setPlaybackRate = useCallback((rate: number) => {
    if (!videoRef.current) return
    
    videoRef.current.playbackRate = rate
    setState(prev => ({ ...prev, playbackRate: rate }))
  }, [])

  const setQuality = useCallback((quality: string) => {
    if (!hlsRef.current?.levels) return
    
    const hls = hlsRef.current
    if (quality === 'auto') {
      hls.currentLevel = -1
    } else {
      const levelIndex = hls.levels.findIndex(level => {
        if (!level.height) return false
        
        const levelHeight = level.height.toString()
        const targetQuality = quality.replace('p', '') // Handle both "720p" and "720"
        
        return levelHeight === targetQuality || 
               levelHeight === quality ||
               `${levelHeight}p` === quality
      })
      
      if (levelIndex !== -1) {
        hls.currentLevel = levelIndex
      } else {
        console.warn(`Quality ${quality} not found in available levels`)
      }
    }
    
    setState(prev => ({ ...prev, quality }))
  }, [])

  // Memoized values to prevent unnecessary re-renders
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return
      
      const video = videoRef.current
      
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          seek(video.currentTime - SEEK_STEP)
          break
        case 'ArrowRight':
          e.preventDefault()
          seek(video.currentTime + SEEK_STEP)
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume(Math.min(1, video.volume + 0.1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume(Math.max(0, video.volume - 0.1))
          break
        case 'KeyM':
          e.preventDefault()
          toggleMute()
          break
        case 'KeyF':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'KeyP':
          e.preventDefault()
          togglePictureInPicture()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, seek, setVolume, toggleMute, toggleFullscreen, togglePictureInPicture])

  // Note-taking function
  const takeNote = useCallback(() => {
    if (!videoRef.current || !transcriptSegments.length || !onNoteTaken) return

    const currentTime = videoRef.current.currentTime
    const captureDuration = 20 // 20 seconds of transcript
    const startTime = Math.max(0, currentTime - 5) // Start 5 seconds before current time
    const endTime = startTime + captureDuration

    // Find transcript segments within the time range
    const relevantSegments = transcriptSegments.filter(segment => 
      segment.end > startTime && segment.start < endTime
    )

    // Extract transcript text for the time range
    const transcriptText = relevantSegments
      .map(segment => segment.text.trim())
      .join(' ')
      .substring(0, 500) // Limit to 500 characters

    // Start note capture
    setState(prev => ({ 
      ...prev, 
      isCapturingNote: true,
      noteCaptureStartTime: startTime,
      noteCaptureEndTime: endTime
    }))

    // Announce note taking started
    announce(`Taking note from ${formatTime(startTime)} to ${formatTime(endTime)}`)

    // Complete note capture after the duration
    setTimeout(() => {
      setState(prev => ({ ...prev, isCapturingNote: false }))
      
      onNoteTaken({
        startTime,
        endTime,
        transcriptText: transcriptText || 'No transcript available for this time range',
        videoTime: currentTime
      })
      
      announce('Note captured successfully')
    }, captureDuration * 1000)
  }, [transcriptSegments, onNoteTaken, announce, formatTime])

  // Progress bar handlers
  const handleProgressClick = useCallback((e: React.MouseEvent) => {
    if (!progressRef.current || !state.duration) return
    
    const rect = progressRef.current.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const time = percent * state.duration
    seek(time)
  }, [state.duration, seek])

  const handleProgressDrag = useCallback((e: React.MouseEvent) => {
    if (!progressRef.current || !state.duration) return
    
    setIsDragging(true)
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!progressRef.current) return
      
      const rect = progressRef.current.getBoundingClientRect()
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const time = percent * state.duration
      
      setState(prev => ({ ...prev, currentTime: time }))
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    const cleanup = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    dragCleanupRef.current = cleanup
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [state.duration, setIsDragging])

  // Thumbnail preview handlers (throttled)
  const handleProgressHover = useCallback((e: React.MouseEvent) => {
    if (!progressRef.current || !state.duration) return
    
    const now = Date.now()
    // Throttle hover updates to reduce re-renders
    if (now - lastProgressHoverRef.current < PROGRESS_HOVER_THROTTLE) return
    lastProgressHoverRef.current = now
    
    const rect = progressRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const time = percent * state.duration
    
    setState(prev => ({ 
      ...prev, 
      showThumbnailPreview: true,
      thumbnailPreviewTime: time,
      thumbnailPreviewPosition: percent * 100
    }))
  }, [state.duration])

  const handleProgressLeave = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      showThumbnailPreview: false
    }))
  }, [])

  // Cleanup drag listeners on unmount
  useEffect(() => {
    return () => {
      if (dragCleanupRef.current) {
        dragCleanupRef.current()
      }
    }
  }, [])

  // Get current chapter
  const getCurrentChapter = useCallback(() => {
    return chapters.find(chapter => 
      state.currentTime >= chapter.startTime && 
      (!chapter.endTime || state.currentTime < chapter.endTime)
    )
  }, [chapters, state.currentTime])

  // Get available qualities
  const getAvailableQualities = useCallback(() => {
    const qualities = ['auto']
    
    if (hlsRef.current?.levels) {
      hlsRef.current.levels.forEach((level: any) => {
        if (level.height) {
          qualities.push(`${level.height}`)
        }
      })
    }
    
    return qualities
  }, [])

  // Video description for screen readers (optimized - only update on major state changes)
  const videoDescription = useMemo(() => {
    // Round currentTime to avoid updates every 250ms
    const roundedTime = Math.floor(state.currentTime)
    return state.isPlayingAd 
      ? `Currently playing advertisement: ${state.currentAd?.advertiser || 'Unknown advertiser'}. Duration: ${Math.ceil(state.adTimeRemaining)} seconds remaining. ${state.canSkipAd ? 'Skip button available.' : ''}`
      : `Video player. ${state.isPlaying ? 'Playing' : 'Paused'} at ${formatTime(roundedTime)} of ${formatTime(state.duration)}. Volume: ${Math.round(state.volume * 100)}%. Playback rate: ${state.playbackRate}x. Quality: ${state.quality}.`
  }, [state.isPlayingAd, state.currentAd?.advertiser, state.adTimeRemaining, state.canSkipAd, state.isPlaying, Math.floor(state.currentTime), state.duration, state.volume, state.playbackRate, state.quality, formatTime])

  if (state.error) {
    return (
      <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <p className="text-lg font-semibold mb-2">Playback Error</p>
            <p className="text-sm opacity-75">{state.error}</p>
          </div>
        </div>
      </div>
    )
  }

  // Handle mouse events for controls visibility (memoized)
  const handleMouseEnter = useCallback(() => {
    setShowControls(true)
    setShowProgressBar(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (state.isPlaying) {
      setShowControls(false)
      setShowProgressBar(false)
    }
  }, [state.isPlaying])

  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    // Auto-hide controls after 3 seconds of no mouse movement
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    if (state.isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
        setShowProgressBar(false)
      }, 3000)
    }
  }, [state.isPlaying])

  // Handle touch events for mobile (memoized)
  const handleTouchStart = useCallback(() => {
    setShowControls(true)
    setShowProgressBar(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    if (state.isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
        setShowProgressBar(false)
      }, 8000) // Extended from 6000ms to 8000ms for better mobile UX
    }
  }, [state.isPlaying])

  // Double-click seeking with visual feedback
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    // ... (rest of the code remains the same)
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const containerWidth = rect.width
    
    // Determine if click is on left or right side (left: backward, right: forward)
    const isLeftSide = clickX < containerWidth / 2
    
    if (isLeftSide) {
      // Seek backward
      seek(Math.max(0, state.currentTime - SEEK_STEP))
      announce(`Seeked backward ${SEEK_STEP} seconds`)
    } else {
      // Seek forward
      seek(Math.min(state.duration, state.currentTime + SEEK_STEP))
      announce(`Seeked forward ${SEEK_STEP} seconds`)
    }
    
    // Show visual feedback
    setState(prev => ({ ...prev, seekFeedback: isLeftSide ? 'backward' : 'forward' }))
    
    // Clear feedback after animation
    if (state.seekFeedbackTimeout) {
      clearTimeout(state.seekFeedbackTimeout)
    }
    
    const timeout = setTimeout(() => {
      setState(prev => ({ ...prev, seekFeedback: null, seekFeedbackTimeout: null }))
    }, 600)
    
    setState(prev => ({ ...prev, seekFeedbackTimeout: timeout }))
  }, [state.currentTime, state.duration, seek, announce])

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden group w-full max-w-full mx-auto ${className}`}
      style={{
        aspectRatio: '16 / 9',
        maxHeight: 'min(70vh, 100vw * 9 / 16)', // Responsive max height based on viewport
      }}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      role="region"
      aria-label="Video player"
      aria-live="polite"
    >
      {/* Hidden video description for screen readers */}
      <div id="video-description" className="sr-only">
        {videoDescription}
      </div>

      {/* Screen reader announcements */}
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcements.map(msg => (
          <div key={msg.id}>{msg.text}</div>
        ))}
      </div>
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={poster}
        playsInline
        preload="auto"
        aria-label={state.isPlayingAd ? "Advertisement video" : "Main video content"}
        aria-describedby="video-description"
        role="application"
        tabIndex={0}
      />



      {/* Ad Overlay */}
      {state.isPlayingAd && state.currentAd && (
        <div className="absolute inset-0 z-20">
          {/* Ad Click Area */}
          <div 
            className="absolute inset-0 cursor-pointer"
            onClick={handleAdClick}
          />
          
          {/* Ad Info */}
          <div className="absolute top-4 left-4 bg-black/70 rounded px-3 py-2 text-white text-sm">
            <div className="font-semibold">Advertisement</div>
            {state.currentAd.advertiser && (
              <div className="text-xs opacity-75">{state.currentAd.advertiser}</div>
            )}
          </div>

          {/* Ad Timer */}
          <div className="absolute top-4 right-4 bg-black/70 rounded px-3 py-2 text-white text-sm font-mono">
            {Math.ceil(state.adTimeRemaining)}s
          </div>

          {/* Skip Ad Button */}
          {state.canSkipAd && (
            <div className="absolute bottom-20 right-4">
              <Button
                onClick={skipAd}
                className="bg-white/90 hover:bg-white text-black font-semibold"
                size="sm"
              >
                Skip Ad
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Loading Spinner */}
      {state.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {/* Double-click Seek Feedback */}
      {state.seekFeedback && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className={`flex items-center space-x-4 bg-black/70 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300 ${
            state.seekFeedback === 'backward' ? 'text-blue-400' : 'text-red-400'
          }`}>
            {state.seekFeedback === 'backward' ? (
              <>
                <SkipBack className="w-8 h-8" />
                <div className="text-center">
                  <div className="text-xl font-bold">10s</div>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-xl font-bold">10s</div>
                  
                </div>
                <SkipForward className="w-8 h-8" />
              </>
            )}
          </div>
        </div>
      )}

      {/* Big Play Button */}
      {!state.isPlaying && !state.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            variant="ghost"
            size="lg"
            onClick={togglePlay}
            className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-black/60 hover:bg-black/80 text-white border-2 border-white/30 backdrop-blur-sm shadow-2xl hover:scale-110 transition-all duration-300 active:scale-95"
          >
            <Play className="w-8 h-8 md:w-10 md:h-10 ml-1" />
          </Button>
        </div>
      )}

      {/* Progress Bar - Shows on video container hover */}
      <div className={`absolute bottom-10 md:bottom-15 left-0 right-0 px-3 md:px-6 pb-2 transition-opacity duration-300 ${showProgressBar ? 'opacity-100' : 'opacity-0'}`}>
        <div
          ref={progressRef}
          className="relative h-1 md:h-1 bg-white/20 rounded-full cursor-pointer group/progress hover:h-1 md:hover:h-1.5 transition-all duration-200"
          onClick={handleProgressClick}
          onMouseDown={handleProgressDrag}
          onMouseMove={handleProgressHover}
          onMouseLeave={handleProgressLeave}
          onTouchStart={() => setShowControls(true)}
        >
          {/* Buffer Progress */}
          <div 
            className="absolute top-0 left-0 h-full bg-white/40 rounded-full transition-all duration-300"
            style={{ width: `${state.buffered}%` }}
          />
          
          {/* Play Progress */}
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg transition-all duration-300"
            style={{ width: `${(state.currentTime / state.duration) * 100}%` }}
          />
          
          {/* Progress Handle */}
          {state.duration > 0 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 bg-white rounded-full shadow-lg border-2 border-red-500 transition-all duration-200 hover:scale-110 z-10"
              style={{
                left: `${Math.min(100, Math.max(0, (state.currentTime / state.duration) * 100))}%`,
                marginLeft: '-6px'
              }}
            />
          )}
          
          {/* Chapter Markers */}
          {chapters.map(chapter => (
            <div
              key={chapter.id}
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-400 rounded-full opacity-70 hover:opacity-100 cursor-pointer transition-all duration-200 hover:scale-125"
              style={{ left: `${(chapter.startTime / state.duration) * 100}%`, marginLeft: '-3px' }}
              onClick={(e) => {
                e.stopPropagation()
                seek(chapter.startTime)
                onChapterChange?.(chapter)
              }}
              title={`${chapter.title} (${formatTime(chapter.startTime)})`}
            />
          ))}
        </div>
        
        {/* Thumbnail Preview */}
        {state.showThumbnailPreview && poster && (
          <div 
            className="absolute bottom-8 md:bottom-10 left-0 transform -translate-x-1/2 pointer-events-none z-50"
            style={{ left: `${state.thumbnailPreviewPosition}%` }}
          >
            <div className="bg-black/95 rounded-xl p-2 md:p-3 shadow-2xl border border-white/20 backdrop-blur-sm">
              <img 
                src={poster} 
                alt="Video thumbnail"
                className="w-32 h-18 md:w-40 md:h-24 object-cover rounded-lg"
              />
              <div className="text-white text-xs md:text-sm text-center mt-2 font-mono bg-black/50 rounded px-2 py-1">
                {formatTime(state.thumbnailPreviewTime)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent backdrop-blur-sm transition-all duration-300 rounded-t-xl ${
          showControls || !state.isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >

        {/* Control Bar */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 md:px-6 py-1.5 md:py-3 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border-t border-white/10 rounded-t-2xl shadow-2xl z-10">
          {/* Left Controls - Play, Volume */}
          <div className="flex items-center space-x-0.5 md:space-x-2">
            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlay}
              className="text-white/90 hover:text-white hover:bg-white/10 hover:scale-105 p-1 md:p-2.5 rounded-xl transition-all duration-300 active:scale-95 min-w-[32px] min-h-[32px] md:min-w-[40px] md:min-h-[40px] group"
              aria-label={state.isPlaying ? "Pause video" : "Play video"}
              title={state.isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              <div className="relative">
                {state.isPlaying ? 
                  <Pause className="w-3.5 h-3.5 md:w-6 md:h-6 drop-shadow-lg group-hover:drop-shadow-xl transition-all duration-300" /> : 
                  <Play className="w-3.5 h-3.5 md:w-6 md:h-6 ml-0.5 drop-shadow-lg group-hover:drop-shadow-xl transition-all duration-300" />
                }
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </Button>

            {/* Volume */}
            <div className="flex items-center space-x-0.5 md:space-x-3 group/volume ml-0.5 md:ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white/80 hover:text-white hover:bg-gradient-to-br hover:from-green-500/20 hover:to-blue-500/20 hover:scale-105 p-1 md:p-2.5 rounded-xl transition-all duration-300 active:scale-95 min-w-[28px] min-h-[28px] md:min-w-[36px] md:min-h-[36px] group"
                aria-label={state.isMuted || state.volume === 0 ? "Unmute (M)" : "Mute (M)"}
                title={state.isMuted || state.volume === 0 ? "Unmute (M)" : "Mute (M)"}
              >
                {state.isMuted || state.volume === 0 ? 
                  <VolumeX className="w-3 h-3 md:w-5 md:h-5 group-hover:scale-110 transition-transform duration-300" /> : 
                  <Volume2 className="w-3 h-3 md:w-5 md:h-5 group-hover:scale-110 transition-transform duration-300" />
                }
              </Button>
              
              <div className="hidden md:block w-20 opacity-70 hover:opacity-100 transition-opacity duration-300">
                <Slider
                  value={[state.isMuted ? 0 : state.volume * 100]}
                  onValueChange={([value]: number[]) => setVolume(value / 100)}
                  max={100}
                  step={1}
                  className="cursor-pointer [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-blue-400 [&_[role=slider]]:to-purple-400 [&_[role=slider]]:border-white/20 [&_[role=slider]]:shadow-lg [&_[role=slider]]:hover:shadow-xl"
                />
              </div>
              
              {/* Mobile volume - visible by default */}
              <div className="md:hidden w-10 opacity-70 transition-opacity duration-300">
                <Slider
                  value={[state.isMuted ? 0 : state.volume * 100]}
                  onValueChange={([value]: number[]) => setVolume(value / 100)}
                  max={100}
                  step={1}
                  className="cursor-pointer [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-blue-400 [&_[role=slider]]:to-purple-400 [&_[role=slider]]:border-white/20 [&_[role=slider]]:shadow-lg"
                />
              </div>
            </div>
          </div>

          {/* Right Controls - Settings, Fullscreen, Time */}
          <div className="flex items-center space-x-0.5 md:space-x-2">
            {/* Time - Mobile: Compact, visible on small screens */}
            <div className="flex md:hidden px-1.5 py-0.5 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <span className="text-white/90 text-xs font-mono font-medium">
                {formatTime(state.currentTime)}<span className="text-white/60">/</span>{formatTime(state.duration)}
              </span>
            </div>

            {/* Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:text-white hover:bg-gradient-to-br hover:from-purple-500/20 hover:to-pink-500/20 hover:scale-105 p-1 md:p-2.5 rounded-xl transition-all duration-300 active:scale-95 min-w-[28px] min-h-[28px] md:min-w-[36px] md:min-h-[36px] group"
                  aria-label="Settings menu"
                  title="Settings"
                >
                  <Settings className="w-3 h-3 md:w-5 md:h-5 group-hover:rotate-90 transition-transform duration-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 md:w-32 bg-slate-900/95 backdrop-blur-xl border-white/20 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
                <DropdownMenuLabel className="text-white font-semibold text-sm">Playback Speed</DropdownMenuLabel>
                {PLAYBACK_RATES.map(rate => (
                  <DropdownMenuItem
                    key={rate}
                    onClick={() => setPlaybackRate(rate)}
                    className={`text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-500/20 rounded-lg mx-1 my-0.5 px-2 md:px-3 py-1.5 md:py-2 transition-all duration-200 text-sm md:text-base ${state.playbackRate === rate ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-white/20' : ''}`}
                  >
                    <span className="font-medium">{rate}x</span> {rate === 1 ? <span className="text-white/60 ml-1">(Normal)</span> : ''}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-white/20 my-2" />
                
                <DropdownMenuLabel className="text-white font-semibold text-sm">Chapters</DropdownMenuLabel>
                {chapters.map(chapter => (
                  <DropdownMenuItem
                    key={chapter.id}
                    onClick={() => {
                      seek(chapter.startTime)
                      onChapterChange?.(chapter)
                    }}
                    className={`text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-green-500/20 hover:to-blue-500/20 rounded-lg mx-1 my-0.5 px-2 md:px-3 py-1.5 md:py-2 transition-all duration-200 ${getCurrentChapter()?.id === chapter.id ? 'bg-gradient-to-r from-green-500/30 to-blue-500/30 border border-white/20' : ''}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{chapter.title}</span>
                      <span className="text-xs text-white/60">{formatTime(chapter.startTime)}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator className="bg-white/20 my-2" />
                
                <DropdownMenuLabel className="text-white font-semibold text-sm">Quality</DropdownMenuLabel>
                {getAvailableQualities().map(quality => (
                  <DropdownMenuItem
                    key={quality}
                    onClick={() => setQuality(quality)}
                    className={`text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-500/20 rounded-lg mx-1 my-0.5 px-2 md:px-3 py-1.5 md:py-2 transition-all duration-200 text-sm md:text-base ${state.quality === quality ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-white/20' : ''}`}
                  >
                    <span className="font-medium">{quality === 'auto' ? 'Auto' : `${quality}p`}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Note Taking */}
            {transcriptSegments && transcriptSegments.length > 0 && onNoteTaken && (
              <Button
                variant="ghost"
                size="sm"
                onClick={takeNote}
                disabled={state.isCapturingNote}
                className={`text-white/80 hover:text-white hover:bg-gradient-to-br hover:from-yellow-500/20 hover:to-orange-500/20 hover:scale-105 p-1 md:p-2.5 rounded-xl transition-all duration-300 active:scale-95 min-w-[28px] min-h-[28px] md:min-w-[36px] md:min-h-[36px] group ${
                  state.isCapturingNote ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border border-white/20' : ''
                }`}
                aria-label={state.isCapturingNote ? "Capturing note..." : "Take note (next 20 seconds)"}
                title={state.isCapturingNote ? "Capturing note..." : "Take note (next 20 seconds)"}
              >
                <StickyNote className={`w-3 h-3 md:w-5 md:h-5 group-hover:scale-110 transition-transform duration-300 ${
                  state.isCapturingNote ? 'animate-pulse' : ''
                }`} />
              </Button>
            )}

            {/* Picture-in-Picture - Hidden on very small screens */}
            {typeof window !== 'undefined' && 'pictureInPictureEnabled' in document && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePictureInPicture}
                  className="flex text-white/80 hover:text-white hover:bg-gradient-to-br hover:from-cyan-500/20 hover:to-blue-500/20 hover:scale-105 p-1 md:p-2.5 rounded-xl transition-all duration-300 active:scale-95 min-w-[28px] min-h-[28px] md:min-w-[36px] md:min-h-[36px] group"
                  title="Picture-in-Picture"
                  aria-label={state.isPictureInPicture ? "Exit picture-in-picture mode" : "Enter picture-in-picture mode"}
                >
                  {state.isPictureInPicture ? 
                    <PictureInPicture2 className="w-3 h-3 md:w-5 md:h-5 group-hover:scale-110 transition-transform duration-300" /> : 
                    <PictureInPicture className="w-3 h-3 md:w-5 md:h-5 group-hover:scale-110 transition-transform duration-300" />
                  }
                </Button>
            )}

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white/80 hover:text-white hover:bg-gradient-to-br hover:from-orange-500/20 hover:to-red-500/20 hover:scale-105 p-1 md:p-2.5 rounded-xl transition-all duration-300 active:scale-95 min-w-[28px] min-h-[28px] md:min-w-[36px] md:min-h-[36px] group"
              aria-label={state.isFullscreen ? "Exit fullscreen (F)" : "Enter fullscreen (F)"}
              title={state.isFullscreen ? "Exit fullscreen (F)" : "Enter fullscreen (F)"}
            >
              {state.isFullscreen ? 
                <Minimize className="w-3 h-3 md:w-5 md:h-5 group-hover:scale-110 transition-transform duration-300" /> : 
                <Maximize className="w-3 h-3 md:w-5 md:h-5 group-hover:scale-110 transition-transform duration-300" />
              }
            </Button>

            {/* Time - Desktop: Full display */}
            <div className="hidden md:block ml-2 md:ml-4 px-3 md:px-4 py-1.5 md:py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <span className="text-white/90 text-sm font-mono font-medium tracking-wide">
                {formatTime(state.currentTime)} <span className="text-white/60">/</span> {formatTime(state.duration)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { CustomVideoPlayer }

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: VideoPlayerProps, nextProps: VideoPlayerProps) => {
  // Compare primitive props
  if (
    prevProps.src !== nextProps.src ||
    prevProps.poster !== nextProps.poster ||
    prevProps.autoPlay !== nextProps.autoPlay ||
    prevProps.startTime !== nextProps.startTime ||
    prevProps.endTime !== nextProps.endTime ||
    prevProps.className !== nextProps.className ||
    prevProps.videoId !== nextProps.videoId
  ) {
    return false
  }

  // Compare arrays by length and reference (shallow comparison)
  if (
    prevProps.hlsVariants?.length !== nextProps.hlsVariants?.length ||
    prevProps.ads?.length !== nextProps.ads?.length ||
    prevProps.chapters?.length !== nextProps.chapters?.length ||
    prevProps.transcriptSegments?.length !== nextProps.transcriptSegments?.length
  ) {
    return false
  }

  // Compare watermark object
  if (prevProps.watermark !== nextProps.watermark) {
    if (!prevProps.watermark || !nextProps.watermark) return false
    if (
      prevProps.watermark.src !== nextProps.watermark.src ||
      prevProps.watermark.position !== nextProps.watermark.position ||
      prevProps.watermark.opacity !== nextProps.watermark.opacity ||
      prevProps.watermark.size !== nextProps.watermark.size
    ) {
      return false
    }
  }

  // Callbacks are expected to be stable (memoized by parent)
  // If they change, it's intentional, so we allow re-render
  return true
}

export default React.memo(CustomVideoPlayer, arePropsEqual)
