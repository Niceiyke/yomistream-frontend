// Yomistream Ad System Hook
// React hook for integrating the ad system with video player

import { useState, useEffect, useCallback, useRef } from 'react'
import { getAdService } from '@/lib/services/ad-service'
import AdAnalyticsService from '@/lib/services/ad-analytics'
import { FrontendAd, AdInteraction } from '@/lib/types/ad-system'

export interface UseAdSystemProps {
  videoId: string
  userId?: string
  sessionId?: string
  enableAnalytics?: boolean
  maxAdsPerType?: number
  adTypes?: ('pre_roll' | 'mid_roll' | 'post_roll')[]
}

export interface AdSystemState {
  ads: FrontendAd[]
  currentAd: FrontendAd | null
  isLoading: boolean
  error: string | null
  playedAds: string[]
  adMetrics: {
    impressions: number
    clicks: number
    completions: number
    skips: number
  }
}

export const useAdSystem = ({
  videoId,
  userId,
  sessionId,
  enableAnalytics = true,
  maxAdsPerType = 2,
  adTypes = ['pre_roll', 'mid_roll', 'post_roll']
}: UseAdSystemProps) => {
  const [state, setState] = useState<AdSystemState>({
    ads: [],
    currentAd: null,
    isLoading: true,
    error: null,
    playedAds: [],
    adMetrics: {
      impressions: 0,
      clicks: 0,
      completions: 0,
      skips: 0
    }
  })

  const adService = useRef(getAdService())
  const analyticsService = useRef<AdAnalyticsService | null>(null)
  const currentSessionId = useRef(sessionId || generateSessionId())

  // Initialize analytics service
  useEffect(() => {
    if (enableAnalytics) {
      analyticsService.current = new AdAnalyticsService(
        process.env.NEXT_PUBLIC_API_BASE_URL || '',
        process.env.NEXT_PUBLIC_AD_API_KEY || ''
      )
    }
  }, [enableAnalytics])

  // Load ads for video
  const loadAds = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const ads = await adService.current.getAdsForVideo(
        videoId,
        userId,
        currentSessionId.current
      )

      // Filter by requested ad types
      const filteredAds = ads.filter(ad => adTypes.includes(ad.type))

      // Limit ads per type
      const limitedAds = limitAdsByType(filteredAds, maxAdsPerType)

      setState(prev => ({
        ...prev,
        ads: limitedAds,
        isLoading: false
      }))

      // Track ad request
      if (analyticsService.current) {
        analyticsService.current.trackEvent({
          event_type: 'ad_request',
          campaign_id: 'multiple',
          creative_id: 'multiple',
          user_id: userId,
          session_id: currentSessionId.current,
          timestamp: new Date().toISOString(),
          properties: {
            video_id: videoId,
            requested_types: adTypes,
            ads_returned: limitedAds.length
          }
        })
      }

      // If no ads are available, track this event and don't retry
      if (limitedAds.length === 0) {
        console.log('No ads available for video:', videoId)
        if (analyticsService.current) {
          analyticsService.current.trackEvent({
            event_type: 'no_ads_available',
            campaign_id: 'none',
            creative_id: 'none',
            user_id: userId,
            session_id: currentSessionId.current,
            timestamp: new Date().toISOString(),
            properties: {
              video_id: videoId,
              requested_types: adTypes
            }
          })
        }
      }

    } catch (error) {
      console.error('Failed to load ads:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load ads',
        isLoading: false
      }))
    }
  }, [videoId, userId, adTypes, maxAdsPerType])

  // Get ads by type
  const getAdsByType = useCallback((type: 'pre_roll' | 'mid_roll' | 'post_roll') => {
    return state.ads.filter(ad => 
      ad.type === type && 
      !state.playedAds.includes(ad.id)
    )
  }, [state.ads, state.playedAds])

  // Get next ad for specific type
  const getNextAd = useCallback((type: 'pre_roll' | 'mid_roll' | 'post_roll') => {
    const availableAds = getAdsByType(type)
    return availableAds.length > 0 ? availableAds[0] : null
  }, [getAdsByType])

  // Track ad impression
  const trackImpression = useCallback((ad: FrontendAd) => {
    setState(prev => ({
      ...prev,
      currentAd: ad,
      adMetrics: {
        ...prev.adMetrics,
        impressions: prev.adMetrics.impressions + 1
      }
    }))

    // Send tracking to ad service
    adService.current.trackInteraction({
      serving_id: ad.id,
      type: 'impression',
      user_id: userId,
      session_id: currentSessionId.current
    })

    // Send to analytics
    if (analyticsService.current) {
      analyticsService.current.trackVideoAdInteraction({
        id: generateId(),
        serving_id: ad.id,
        type: 'impression',
        timestamp: new Date().toISOString(),
        user_id: userId,
        session_id: currentSessionId.current
      })
    }

    // Call ad's impression tracking URL
    if (ad.tracking.impression_url) {
      fetch(ad.tracking.impression_url, { method: 'GET' }).catch(console.error)
    }
  }, [userId])

  // Track ad click
  const trackClick = useCallback((ad: FrontendAd) => {
    setState(prev => ({
      ...prev,
      adMetrics: {
        ...prev.adMetrics,
        clicks: prev.adMetrics.clicks + 1
      }
    }))

    // Send tracking to ad service
    adService.current.trackInteraction({
      serving_id: ad.id,
      type: 'click',
      user_id: userId,
      session_id: currentSessionId.current
    })

    // Send to analytics
    if (analyticsService.current) {
      analyticsService.current.trackVideoAdInteraction({
        id: generateId(),
        serving_id: ad.id,
        type: 'click',
        timestamp: new Date().toISOString(),
        user_id: userId,
        session_id: currentSessionId.current
      })
    }

    // Call ad's click tracking URL
    if (ad.tracking.click_url) {
      fetch(ad.tracking.click_url, { method: 'GET' }).catch(console.error)
    }

    // Open click URL if provided
    if (ad.clickUrl) {
      window.open(ad.clickUrl, '_blank')
    }
  }, [userId])

  // Track ad completion
  const trackCompletion = useCallback((ad: FrontendAd) => {
    setState(prev => ({
      ...prev,
      playedAds: [...prev.playedAds, ad.id],
      currentAd: null,
      adMetrics: {
        ...prev.adMetrics,
        completions: prev.adMetrics.completions + 1
      }
    }))

    // Send tracking to ad service
    adService.current.trackInteraction({
      serving_id: ad.id,
      type: 'view_100',
      user_id: userId,
      session_id: currentSessionId.current,
      duration_watched: ad.duration
    })

    // Send to analytics
    if (analyticsService.current) {
      analyticsService.current.trackVideoAdInteraction({
        id: generateId(),
        serving_id: ad.id,
        type: 'view_100',
        timestamp: new Date().toISOString(),
        duration_watched: ad.duration,
        user_id: userId,
        session_id: currentSessionId.current
      })
    }

    // Call ad's completion tracking URL
    if (ad.tracking.completion_url) {
      fetch(ad.tracking.completion_url, { method: 'GET' }).catch(console.error)
    }
  }, [userId])

  // Track ad skip
  const trackSkip = useCallback((ad: FrontendAd, watchedDuration: number) => {
    setState(prev => ({
      ...prev,
      playedAds: [...prev.playedAds, ad.id],
      currentAd: null,
      adMetrics: {
        ...prev.adMetrics,
        skips: prev.adMetrics.skips + 1
      }
    }))

    // Send tracking to ad service
    adService.current.trackInteraction({
      serving_id: ad.id,
      type: 'skip',
      user_id: userId,
      session_id: currentSessionId.current,
      duration_watched: watchedDuration
    })

    // Send to analytics
    if (analyticsService.current) {
      analyticsService.current.trackVideoAdInteraction({
        id: generateId(),
        serving_id: ad.id,
        type: 'skip',
        timestamp: new Date().toISOString(),
        duration_watched: watchedDuration,
        user_id: userId,
        session_id: currentSessionId.current
      })
    }

    // Call ad's skip tracking URL
    if (ad.tracking.skip_url) {
      fetch(ad.tracking.skip_url, { method: 'GET' }).catch(console.error)
    }
  }, [userId])

  // Track ad quartiles (25%, 50%, 75%)
  const trackQuartile = useCallback((ad: FrontendAd, quartile: 'q1' | 'q2' | 'q3') => {
    const eventType = quartile === 'q1' ? 'view_25' : 
                     quartile === 'q2' ? 'view_50' : 'view_75'

    // Send tracking to ad service
    adService.current.trackInteraction({
      serving_id: ad.id,
      type: eventType,
      user_id: userId,
      session_id: currentSessionId.current,
      duration_watched: (ad.duration * (quartile === 'q1' ? 0.25 : quartile === 'q2' ? 0.5 : 0.75))
    })

    // Send to analytics
    if (analyticsService.current) {
      analyticsService.current.trackVideoAdInteraction({
        id: generateId(),
        serving_id: ad.id,
        type: eventType,
        timestamp: new Date().toISOString(),
        duration_watched: (ad.duration * (quartile === 'q1' ? 0.25 : quartile === 'q2' ? 0.5 : 0.75)),
        user_id: userId,
        session_id: currentSessionId.current
      })
    }

    // Call quartile tracking URL if available
    if (ad.tracking.quartile_urls?.[quartile]) {
      fetch(ad.tracking.quartile_urls[quartile], { method: 'GET' }).catch(console.error)
    }
  }, [userId])

  // Check if ad should be shown at current time
  const shouldShowAd = useCallback((currentTime: number, adType: 'mid_roll') => {
    if (adType !== 'mid_roll') return false

    const midRollAds = getAdsByType('mid_roll')
    return midRollAds.some(ad => 
      ad.triggerTime && 
      Math.abs(currentTime - ad.triggerTime) < 1 &&
      !state.playedAds.includes(ad.id)
    )
  }, [getAdsByType, state.playedAds])

  // Get ad for specific trigger time
  const getAdForTime = useCallback((currentTime: number) => {
    const midRollAds = getAdsByType('mid_roll')
    return midRollAds.find(ad => 
      ad.triggerTime && 
      Math.abs(currentTime - ad.triggerTime) < 1 &&
      !state.playedAds.includes(ad.id)
    ) || null
  }, [getAdsByType, state.playedAds])

  // Reset ad system (useful for new video)
  const reset = useCallback(() => {
    setState({
      ads: [],
      currentAd: null,
      isLoading: false,
      error: null,
      playedAds: [],
      adMetrics: {
        impressions: 0,
        clicks: 0,
        completions: 0,
        skips: 0
      }
    })
    currentSessionId.current = generateSessionId()
  }, [])

  // Load ads asynchronously when videoId changes (don't block video loading)
  useEffect(() => {
    if (videoId) {
      // Use setTimeout to defer ad loading and not block video
      const timeoutId = setTimeout(() => {
        loadAds()
      }, 100) // Small delay to let video start loading first
      
      return () => clearTimeout(timeoutId)
    }
  }, [videoId, loadAds])

  return {
    // State
    ...state,
    
    // Actions
    loadAds,
    getAdsByType,
    getNextAd,
    trackImpression,
    trackClick,
    trackCompletion,
    trackSkip,
    trackQuartile,
    shouldShowAd,
    getAdForTime,
    reset,
    
    // Utilities
    hasPreRollAds: getAdsByType('pre_roll').length > 0,
    hasMidRollAds: getAdsByType('mid_roll').length > 0,
    hasPostRollAds: getAdsByType('post_roll').length > 0,
    totalAdsRemaining: state.ads.length - state.playedAds.length
  }
}

// Utility functions
function limitAdsByType(ads: FrontendAd[], maxPerType: number): FrontendAd[] {
  const result: FrontendAd[] = []
  const typeCount: Record<string, number> = {}

  for (const ad of ads) {
    const currentCount = typeCount[ad.type] || 0
    if (currentCount < maxPerType) {
      result.push(ad)
      typeCount[ad.type] = currentCount + 1
    }
  }

  return result
}

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export default useAdSystem
