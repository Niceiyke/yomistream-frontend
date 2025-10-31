"use client"

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Loader2, AlertCircle, SkipBack, SkipForward } from "lucide-react"
import type Hls from 'hls.js'
import { Button } from "@/components/ui/button"
import {ProgressBar} from './video-player/ProgressBar'
import {VideoControls} from './video-player/VideoControls'
import {AdOverlay} from './video-player/AdOverlay'
import type { Ad, Chapter, TranscriptSegment, VideoState } from './video-player/types'

// Constants
const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const SEEK_STEP = 10 // seconds
const STATE_UPDATE_THROTTLE = 250 // ms - throttle state updates to reduce re-renders
const PROGRESS_HOVER_THROTTLE = 50 // ms - throttle progress bar hover updates

// Utility functions
const getDeviceType = (): string => {
  if (typeof navigator === 'undefined') return 'desktop'
  const userAgent = navigator.userAgent
  if (/Mobi|Android/i.test(userAgent)) return 'mobile'
  if (/Tablet|iPad/i.test(userAgent)) return 'tablet'
  return 'desktop'
}

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

// Interfaces
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
  ads?: Ad[]
  watermark?: {
    src: string
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
    opacity: number
    size: 'small' | 'medium' | 'large'
    clickUrl?: string
  }
  chapters?: Chapter[]
  onChapterChange?: (chapter: Chapter) => void
  onAdStart?: (ad: Ad) => void
  onAdEnd?: (ad: Ad) => void
  onAdSkip?: (ad: Ad) => void
  onAdClick?: (ad: Ad) => void
  transcriptSegments?: TranscriptSegment[]
  onNoteTaken?: (note: {
    startTime: number
    endTime: number
    transcriptText: string
    videoTime: number
  }) => void
  videoId?: string
  onViewTracked?: (viewData: {
    video_id: string
    session_id: string
    device_type: string
    quality_watched: string
  }) => void
}

const CustomVideoPlayerV2 = ({
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
  videoId,
  onViewTracked
}: VideoPlayerProps) => {
  // Refs
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
  
  // State
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
    currentAd: null,
    isPlayingAd: false,
    adTimeRemaining: 0,
    canSkipAd: false,
    playedAds: [],
    retryCount: 0,
    canRetry: false,
    showThumbnailPreview: false,
    thumbnailPreviewTime: 0,
    thumbnailPreviewPosition: 0,
    seekFeedback: null,
    seekFeedbackTimeout: null,
    isCapturingNote: false,
    noteCaptureStartTime: 0,
    noteCaptureEndTime: 0,
    hasTrackedView: false,
    viewStartTime: 0,
    watchTime: 0
  })
  
  const [showControls, setShowControls] = useState(true)
  const [showProgressBar, setShowProgressBar] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [announcements, setAnnouncements] = useState<Array<{id: string, text: string}>>([])

  // Utility functions
  const announce = useCallback((message: string) => {
    const id = `announcement-${Date.now()}-${Math.random()}`
    setAnnouncements(prev => [...prev, { id, text: message }])
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    }, 1000)
  }, [])

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }, [])

  // View tracking functions
  const trackView = useCallback(async () => {
    if (!videoId || state.hasTrackedView || !videoRef.current) return

    try {
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

      if (onViewTracked) {
        onViewTracked(viewData)
      } else {
        try {
          const response = await fetch(`/api/v1/videos/${videoId}/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(viewData)
          })
          if (!response.ok) {
            console.warn('Failed to track view:', response.status)
          }
        } catch (error) {
          console.warn('Error tracking view:', error)
        }
      }

      setState(prev => ({ ...prev, hasTrackedView: true }))
    } catch (error) {
      console.error('Error in trackView:', error)
    }
  }, [videoId, state.hasTrackedView, state.quality, onViewTracked])

  const checkViewThreshold = useCallback(() => {
    if (!videoRef.current || state.hasTrackedView) return
    const duration = videoRef.current.duration
    if (!duration || duration === 0) return
    const timeThreshold = Math.min(30, duration * 0.5)
    if (watchTimeRef.current >= timeThreshold) {
      trackView()
    }
  }, [state.hasTrackedView, trackView])

  // Ad management functions
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
      playedAds: [...prev.playedAds, ad.id]
    }))
    
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
    
    videoRef.current.src = ad.url
    videoRef.current.play().catch(console.error)
    onAdStart?.(ad)
  }, [onAdStart])

  const skipAd = useCallback(() => {
    if (!state.currentAd || !state.canSkipAd) return
    
    const ad = state.currentAd
    onAdSkip?.(ad)
    
    setState(prev => ({ 
      ...prev, 
      currentAd: null,
      isPlayingAd: false,
      adTimeRemaining: 0,
      canSkipAd: false,
      playedAds: [...prev.playedAds, ad.id]
    }))
    
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

  // Control functions
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
        const targetQuality = quality.replace('p', '')
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

  const takeNote = useCallback(() => {
    if (!videoRef.current || !transcriptSegments.length || !onNoteTaken) return

    const currentTime = videoRef.current.currentTime
    const captureDuration = 20
    const startTime = Math.max(0, currentTime - 5)
    const endTime = startTime + captureDuration

    const relevantSegments = transcriptSegments.filter(segment => 
      segment.end > startTime && segment.start < endTime
    )

    const transcriptText = relevantSegments
      .map(segment => segment.text.trim())
      .join(' ')
      .substring(0, 500)

    setState(prev => ({ 
      ...prev, 
      isCapturingNote: true,
      noteCaptureStartTime: startTime,
      noteCaptureEndTime: endTime
    }))

    announce(`Taking note from ${formatTime(startTime)} to ${formatTime(endTime)}`)

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
  const handleProgressClick = useCallback((e: React.MouseEvent, progressBarElement?: HTMLDivElement | null) => {
    if (!progressBarElement || !state.duration) return
    
    const rect = progressBarElement.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const time = percent * state.duration
    seek(time)
  }, [state.duration, seek])

  const handleProgressDrag = useCallback((e: React.MouseEvent, progressBarElement?: HTMLDivElement | null) => {
    if (!progressBarElement || !state.duration) return
    
    setIsDragging(true)
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!progressBarElement) return
      
      const rect = progressBarElement.getBoundingClientRect()
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

  const handleProgressHover = useCallback((e: React.MouseEvent, progressBarElement?: HTMLDivElement | null) => {
    if (!progressBarElement || !state.duration) return
    
    const now = Date.now()
    if (now - lastProgressHoverRef.current < PROGRESS_HOVER_THROTTLE) return
    lastProgressHoverRef.current = now
    
    const rect = progressBarElement.getBoundingClientRect()
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

  // Mouse event handlers
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
      }, 8000)
    }
  }, [state.isPlaying])

  // Double-click seeking
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const containerWidth = rect.width
    
    const isLeftSide = clickX < containerWidth / 2
    
    if (isLeftSide) {
      seek(Math.max(0, state.currentTime - SEEK_STEP))
      announce(`Seeked backward ${SEEK_STEP} seconds`)
    } else {
      seek(Math.min(state.duration, state.currentTime + SEEK_STEP))
      announce(`Seeked forward ${SEEK_STEP} seconds`)
    }
    
    setState(prev => ({ ...prev, seekFeedback: isLeftSide ? 'backward' : 'forward' }))
    
    if (state.seekFeedbackTimeout) {
      clearTimeout(state.seekFeedbackTimeout)
    }
    
    const timeout = setTimeout(() => {
      setState(prev => ({ ...prev, seekFeedback: null, seekFeedbackTimeout: null }))
    }, 600)
    
    setState(prev => ({ ...prev, seekFeedbackTimeout: timeout }))
  }, [state.currentTime, state.duration, seek, announce])

  // Utility functions
  const getCurrentChapter = useCallback(() => {
    return chapters.find(chapter => 
      state.currentTime >= chapter.startTime && 
      (!chapter.endTime || state.currentTime < chapter.endTime)
    )
  }, [chapters, state.currentTime])

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

  // Video description for screen readers
  const videoDescription = useMemo(() => {
    const roundedTime = Math.floor(state.currentTime)
    return state.isPlayingAd 
      ? `Currently playing advertisement: ${state.currentAd?.advertiser || 'Unknown advertiser'}. Duration: ${Math.ceil(state.adTimeRemaining)} seconds remaining. ${state.canSkipAd ? 'Skip button available.' : ''}`
      : `Video player. ${state.isPlaying ? 'Playing' : 'Paused'} at ${formatTime(roundedTime)} of ${formatTime(state.duration)}. Volume: ${Math.round(state.volume * 100)}%. Playback rate: ${state.playbackRate}x. Quality: ${state.quality}.`
  }, [state.isPlayingAd, state.currentAd?.advertiser, state.adTimeRemaining, state.canSkipAd, state.isPlaying, Math.floor(state.currentTime), state.duration, state.volume, state.playbackRate, state.quality, formatTime])

  // Initialize HLS
  useEffect(() => {
    const initializePlayer = async () => {
      if (!videoRef.current) return

      const video = videoRef.current
      
      if (src.includes('.m3u8') || hlsVariants.length > 0) {
        try {
          const Hls = (await import('hls.js')).default
          
          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 30,
              maxBufferLength: 30,
              maxMaxBufferLength: 60,
              maxBufferSize: 60 * 1000 * 1000,
              maxBufferHole: 0.5,
              startLevel: -1,
              abrEwmaDefaultEstimate: 5e5,
            })
            
            hlsRef.current = hls
            hls.loadSource(src)
            hls.attachMedia(video)
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setState(prev => ({ ...prev, isLoading: false }))
              if (autoPlay) {
                video.play().catch(console.error)
              }
            })

            hls.on(Hls.Events.FRAG_BUFFERED, (event, data) => {
              if (autoPlay && !state.isPlaying && data.stats.buffering.end > 5) {
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
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              const levels = hls.levels
              if (levels.length > 0) {
                const sevenTwentyLevel = levels.findIndex(level => level.height === 720)
                if (sevenTwentyLevel !== -1) {
                  hls.currentLevel = sevenTwentyLevel
                } else {
                  hls.currentLevel = -1
                }
              }
            })
            
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
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
        
        if (now - lastStateUpdateRef.current > STATE_UPDATE_THROTTLE) {
          setState(prev => ({ ...prev, currentTime }))
          lastStateUpdateRef.current = now
        }
        
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
          
          if (timeRemaining <= 0) {
            endCurrentAd()
          }
        } else if (!state.isPlayingAd) {
          const midRollAd = ads.find(ad => 
            ad.type === 'mid-roll' && 
            ad.triggerTime && 
            currentTime >= ad.triggerTime &&
            currentTime < ad.triggerTime + 1 &&
            !state.playedAds.includes(ad.id)
          )
          
          if (midRollAd) {
            announce("Advertisement starting")
            playAd(midRollAd)
            return
          }
        }
        
        if (endTime && currentTime >= endTime) {
          video.pause()
          announce("Video ended")
          onEnded?.()
        }

        if (state.isPlaying && !state.hasTrackedView) {
          checkViewThreshold()
        }
      }
    }

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }))
      if (!state.hasTrackedView && viewStartTimeRef.current === 0) {
        viewStartTimeRef.current = Date.now() / 1000
      }
      announce(state.isPlayingAd ? "Advertisement playing" : "Video playing")
    }

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }))
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
  }, [startTime, endTime, onTimeUpdate, onEnded, state.isPlayingAd, state.currentAd, state.playedAds, ads, playAd, endCurrentAd, checkViewThreshold, isDragging, announce, formatTime, onAdStart, onAdEnd, onAdSkip, onAdClick, autoPlay, state.isPlaying, state.hasTrackedView, src])

  // Watch time tracking
  useEffect(() => {
    if (!state.isPlaying || state.hasTrackedView || state.isPlayingAd) return

    const interval = setInterval(() => {
      watchTimeRef.current += 1
      checkViewThreshold()
    }, 1000)

    return () => clearInterval(interval)
  }, [state.isPlaying, state.hasTrackedView, state.isPlayingAd, checkViewThreshold])

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

  // Page unload tracking
  useEffect(() => {
    if (!videoId || !videoRef.current) return

    const handleBeforeUnload = () => {
      if (state.isPlaying && !state.hasTrackedView && videoRef.current) {
        const duration = videoRef.current.duration
        if (!duration || duration === 0) return

        const currentTime = Date.now() / 1000
        const finalWatchTime = watchTimeRef.current + (viewStartTimeRef.current > 0 ? currentTime - viewStartTimeRef.current : 0)
        
        const timeThreshold = Math.min(30, duration * 0.5)
        
        if (finalWatchTime >= timeThreshold) {
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

          const blob = new Blob([JSON.stringify(viewData)], { type: 'application/json' })
          navigator.sendBeacon(`/api/v1/videos/${videoId}/view`, blob)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [videoId, state.isPlaying, state.hasTrackedView, state.quality])

  // Pre-roll ads
  useEffect(() => {
    if (!videoRef.current) return
    
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

  // Cleanup drag listeners
  useEffect(() => {
    return () => {
      if (dragCleanupRef.current) {
        dragCleanupRef.current()
      }
    }
  }, [])

  // Error state
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

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden group w-full max-w-full mx-auto ${className}`}
      style={{
        aspectRatio: '16 / 9',
        maxHeight: 'min(70vh, 100vw * 9 / 16)',
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

      {/* Watermark */}
      {watermark && (
        <div 
          className={`absolute ${getPositionClasses(watermark.position, watermark.size)} cursor-pointer transition-opacity duration-300 hover:opacity-80`}
          style={{ opacity: watermark.opacity }}
          onClick={() => watermark.clickUrl && window.open(watermark.clickUrl, '_blank')}
        >
          <img 
            src={watermark.src} 
            alt="Watermark"
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Ad Overlay */}
      {state.isPlayingAd && state.currentAd && (
        <AdOverlay
          currentAd={state.currentAd}
          adTimeRemaining={state.adTimeRemaining}
          canSkipAd={state.canSkipAd}
          onAdClick={handleAdClick}
          onSkipAd={skipAd}
        />
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
            <span className="w-8 h-8 md:w-10 md:h-10 ml-1">▶</span>
          </Button>
        </div>
      )}

      {/* Progress Bar */}
      <ProgressBar
        currentTime={state.currentTime}
        duration={state.duration}
        buffered={state.buffered}
        poster={poster}
        chapters={chapters}
        showProgressBar={showProgressBar}
        showThumbnailPreview={state.showThumbnailPreview}
        thumbnailPreviewTime={state.thumbnailPreviewTime}
        thumbnailPreviewPosition={state.thumbnailPreviewPosition}
        onSeek={seek}
        onChapterChange={onChapterChange}
        onProgressHover={handleProgressHover}
        onProgressLeave={handleProgressLeave}
        onProgressClick={handleProgressClick}
        onProgressDrag={handleProgressDrag}
        onShowControls={() => setShowControls(true)}
        formatTime={formatTime}
      />

      {/* Controls */}
      <VideoControls
        isPlaying={state.isPlaying}
        currentTime={state.currentTime}
        duration={state.duration}
        volume={state.volume}
        isMuted={state.isMuted}
        isFullscreen={state.isFullscreen}
        isPictureInPicture={state.isPictureInPicture}
        playbackRate={state.playbackRate}
        quality={state.quality}
        onTogglePlay={togglePlay}
        onSeek={seek}
        onVolumeChange={setVolume}
        onToggleMute={toggleMute}
        onToggleFullscreen={toggleFullscreen}
        onTogglePictureInPicture={togglePictureInPicture}
        onPlaybackRateChange={setPlaybackRate}
        onQualityChange={setQuality}
        chapters={chapters}
        currentChapter={getCurrentChapter()}
        onChapterChange={onChapterChange}
        availableQualities={getAvailableQualities()}
        transcriptSegments={transcriptSegments}
        onNoteTaken={takeNote}
        isCapturingNote={state.isCapturingNote}
        formatTime={formatTime}
        showControls={showControls}
      />
    </div>
  )
}

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
  return true
}

export { CustomVideoPlayerV2 }
export default React.memo(CustomVideoPlayerV2, arePropsEqual)
