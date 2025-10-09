// Enhanced Video Player with Integrated Ad System
// Example integration of the ad system with the custom video player

"use client"

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { CustomVideoPlayer } from './custom-video-player'
import { useAdSystem } from '@/lib/hooks/use-ad-system'
import { FrontendAd } from '@/lib/types/ad-system'
import { initializeAdSystem } from '@/lib/init-ad-system'
import { NoAdsHandler, FallbackContent } from './no-ads-handler'
import { NO_ADS_CONFIG } from '@/lib/config/ad-config'
import { User } from '@/lib/types/user'

interface EnhancedVideoPlayerProps {
  videoId: string
  videoUrl: string
  hlsVariants?: Array<{
    url: string
    quality: string
    bandwidth?: number
  }>
  poster?: string
  autoPlay?: boolean
  startTime?: number
  endTime?: number
  userId?: string
  sessionId?: string
  user?: User
  watermark?: {
    src: string
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
    opacity: number
    size: 'small' | 'medium' | 'large'
    clickUrl?: string
  }
  logo?: {
    src: string
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    size: 'small' | 'medium' | 'large'
    clickUrl?: string
    showDuration?: number
  }
  onTimeUpdate?: (currentTime: number) => void
  onEnded?: () => void
  className?: string
}

export const EnhancedVideoPlayer: React.FC<EnhancedVideoPlayerProps> = ({
  videoId,
  videoUrl,
  hlsVariants,
  poster,
  autoPlay = false,
  startTime = 0,
  endTime,
  userId,
  sessionId,
  user,
  watermark,
  logo,
  onTimeUpdate,
  onEnded,
  className
}) => {
  // Temporarily disable ad system initialization for performance
  useEffect(() => {
    // Ad system disabled for performance optimization
    console.log('Ad system temporarily disabled for performance')
  }, [])

  // Memoize stable values to prevent unnecessary re-renders
  const adSystemConfig = useMemo(() => ({
    videoId,
    userId,
    sessionId,
    enableAnalytics: true,
    maxAdsPerType: 2,
    adTypes: ['pre_roll', 'mid_roll', 'post_roll'] as ('pre_roll' | 'mid_roll' | 'post_roll')[]
  }), [videoId, userId, sessionId])

  // Temporarily disable ad system for performance - return empty/default values
  const ads: FrontendAd[] = []
  const currentAd: FrontendAd | null = null
  const adsLoading = false
  const adError: string | null = null
  const playedAds: FrontendAd[] = []
  const adMetrics = { impressions: 0, clicks: 0, completions: 0, skips: 0 }
  const getNextAd = (type: string) => null
  const trackImpression = (ad: FrontendAd) => {
    console.log('Ad impression:', ad.id)
  }
  const trackClick = (ad: FrontendAd) => {
    console.log('Ad click:', ad.id)
  }
  const trackCompletion = (ad: FrontendAd) => {
    console.log('Ad completion:', ad.id)
  }
  const trackSkip = (ad: FrontendAd, watchedDuration?: number) => {
    console.log('Ad skip:', ad.id, 'watched:', watchedDuration)
  }
  const trackQuartile = (ad: FrontendAd, quartile: number) => {
    console.log('Ad quartile:', ad.id, 'quartile:', quartile)
  }
  const shouldShowAd = (time?: number, type?: string) => false
  const getAdForTime = (time: number) => null
  const hasPreRollAds = false
  const hasMidRollAds = false
  const hasPostRollAds = false

  // State for current video playback
  const [currentVideoTime, setCurrentVideoTime] = useState(0)
  const [isPlayingMainVideo, setIsPlayingMainVideo] = useState(true)
  const [showNoAdsHandler, setShowNoAdsHandler] = useState(false)
  const [showFallbackContent, setShowFallbackContent] = useState(false)
  const [noAdsHandled, setNoAdsHandled] = useState(false)

  // Convert frontend ads to player format
  const convertToPlayerAds = useCallback((frontendAds: FrontendAd[]) => {
    return frontendAds.map(ad => ({
      id: ad.id,
      type: ad.type.replace('_', '-') as 'pre-roll' | 'mid-roll' | 'post-roll',
      url: ad.url,
      duration: ad.duration,
      skipAfter: ad.skipAfter,
      title: ad.title,
      advertiser: ad.advertiser,
      clickUrl: ad.clickUrl,
      triggerTime: ad.triggerTime
    }))
  }, [])

  // Handle ad start
  const handleAdStart = useCallback((ad: any) => {
    console.log('Ad started:', ad.title)
    setIsPlayingMainVideo(false)
    
    // Find the corresponding frontend ad and track impression
    const frontendAd = ads.find(a => a.id === ad.id)
    if (frontendAd) {
      trackImpression(frontendAd)
    }
  }, [ads, trackImpression])

  // Handle ad end
  const handleAdEnd = useCallback((ad: any) => {
    console.log('Ad completed:', ad.title)
    setIsPlayingMainVideo(true)
    
    // Find the corresponding frontend ad and track completion
    const frontendAd = ads.find(a => a.id === ad.id)
    if (frontendAd) {
      trackCompletion(frontendAd)
    }
  }, [ads, trackCompletion])

  // Handle ad skip
  const handleAdSkip = useCallback((ad: any) => {
    console.log('Ad skipped:', ad.title)
    setIsPlayingMainVideo(true)
    
    // Find the corresponding frontend ad and track skip
    const frontendAd = ads.find(a => a.id === ad.id)
    if (frontendAd) {
      // Estimate watched duration (would be more accurate with actual player data)
      const watchedDuration = ad.skipAfter || 5
      trackSkip(frontendAd, watchedDuration)
    }
  }, [ads, trackSkip])

  // Handle ad click
  const handleAdClick = useCallback((ad: any) => {
    console.log('Ad clicked:', ad.title)
    
    // Find the corresponding frontend ad and track click
    const frontendAd = ads.find(a => a.id === ad.id)
    if (frontendAd) {
      trackClick(frontendAd)
    }
  }, [ads, trackClick])

  // Handle main video time updates
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentVideoTime(time)
    
    // Check for mid-roll ads
    if (isPlayingMainVideo && shouldShowAd(time, 'mid_roll')) {
      const midRollAd = getAdForTime(time)
      if (midRollAd) {
        console.log('Triggering mid-roll ad at', time, 'seconds')
      }
    }
    
    // Call original onTimeUpdate
    onTimeUpdate?.(time)
  }, [isPlayingMainVideo, shouldShowAd, getAdForTime, onTimeUpdate])

  // Handle main video end
  const handleVideoEnd = useCallback(() => {
    console.log('Main video ended')
    
    // Check for post-roll ads
    if (hasPostRollAds) {
      const postRollAd = getNextAd('post_roll')
      if (postRollAd) {
        console.log('Will show post-roll ad')
      }
    }
    
    // Call original onEnded
    onEnded?.()
  }, [hasPostRollAds, getNextAd, onEnded])

  // Handle no ads scenarios
  useEffect(() => {
    if (!adsLoading && ads.length === 0 && !noAdsHandled) {
      console.log('No ads available for this video')
      
      // Track no-ads event
      if (NO_ADS_CONFIG.track_no_ads_events) {
        console.log('Tracking no-ads event for video:', videoId)
        // Could send analytics event here
      }
      
      // Ensure video plays normally when no ads are available
      setIsPlayingMainVideo(true)
      
      // Show no-ads handler based on configuration
      if (NO_ADS_CONFIG.fallback_behavior === 'show_message') {
        setShowNoAdsHandler(true)
      } else if (NO_ADS_CONFIG.fallback_behavior === 'show_fallback_content') {
        setShowFallbackContent(true)
      }
      // If 'skip', do nothing - video plays normally
      
      // Mark as handled to prevent re-running
      setNoAdsHandled(true)
    }
  }, [adsLoading, ads.length, videoId, noAdsHandled])

  // Reset no-ads handled flag when video changes
  useEffect(() => {
    setNoAdsHandled(false)
  }, [videoId])

  // Enhanced watermark with ad metrics
  const enhancedWatermark = watermark ? {
    ...watermark,
    clickUrl: watermark.clickUrl || `https://yomistream.com/analytics?video=${videoId}`
  } : undefined

  // Don't block video loading with ad loading - prioritize video playback
  const shouldShowLoadingState = false // Disabled to improve performance
  
  if (shouldShowLoadingState) {
    return (
      <div className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading advertisements...</p>
        </div>
      </div>
    )
  }

  // Show error state if ad loading failed
  if (adError) {
    console.warn('Ad loading failed:', adError)
    // Continue with video playback even if ads fail
  }

  return (
    <div className="relative">
      <CustomVideoPlayer
        src={videoUrl}
        hlsVariants={hlsVariants}
        poster={poster}
        autoPlay={autoPlay}
        startTime={startTime}
        endTime={endTime}
        ads={convertToPlayerAds(ads)}
        watermark={enhancedWatermark}
        logo={logo}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnd}
        onAdStart={handleAdStart}
        onAdEnd={handleAdEnd}
        onAdSkip={handleAdSkip}
        onAdClick={handleAdClick}
        className={className}
      />
      
      {/* No Ads Handler */}
      {showNoAdsHandler && (
        <NoAdsHandler
          videoId={videoId}
          showAlternatives={true}
          onComplete={() => setShowNoAdsHandler(false)}
        />
      )}
      
      {/* Fallback Content */}
      {showFallbackContent && (
        <FallbackContent
          content={NO_ADS_CONFIG.fallback_content}
          onComplete={() => setShowFallbackContent(false)}
        />
      )}
      
      
    </div>
  )
}

export default EnhancedVideoPlayer
