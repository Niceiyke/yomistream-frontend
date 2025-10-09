// Yomistream Ad Service
// Core service for ad serving, tracking, and management

import { 
  AdRequest, 
  AdResponse, 
  FrontendAd, 
  AdInteraction, 
  AdError,
  AdSystemConfig 
} from '@/lib/types/ad-system'

class AdService {
  private baseUrl: string
  private apiKey: string
  private config: AdSystemConfig
  private cache: Map<string, AdResponse> = new Map()
  private trackingQueue: AdInteraction[] = []

  constructor(baseUrl: string, apiKey: string, config: AdSystemConfig) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.config = config
    
    // Debug logging
    console.log('AdService initialized with baseUrl:', baseUrl)
    
    // Start tracking queue processor
    this.startTrackingProcessor()
  }

  /**
   * Request ads for a video
   */
  async requestAds(request: AdRequest): Promise<AdResponse> {
    try {
      // Check cache first
      const cacheKey = `${request.video_id}_${request.user_id}_${request.placement_types.join(',')}`
      const cached = this.cache.get(cacheKey)
      if (cached) {
        return cached
      }

      // Prioritize video metadata, make user context optional to avoid blocking
      const videoMetadata = await this.getVideoMetadata(request.video_id)
      
      // Get user context with timeout to prevent blocking
      const userContextPromise = Promise.race([
        this.getUserContext(request.user_id),
        new Promise(resolve => setTimeout(() => resolve(undefined), 2000)) // 2s timeout
      ])
      
      const userContext = await userContextPromise
      
      // Make API request
      const response = await fetch(`${this.baseUrl}/api/v1/ads/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Session-ID': request.session_id
        },
        body: JSON.stringify({
          ...request,
          video_metadata: videoMetadata,
          user_context: userContext
        })
      })

      if (!response.ok) {
        throw new Error(`Ad request failed: ${response.status}`)
      }

      const adResponse: AdResponse = await response.json()
      
      // Cache the response
      this.cache.set(cacheKey, adResponse)
      
      // Clean old cache entries
      this.cleanCache()

      return adResponse
    } catch (error) {
      console.error('Ad request failed:', error)
      return this.getFallbackAds(request)
    }
  }

  /**
   * Track ad interaction
   */
  trackInteraction(interaction: Omit<AdInteraction, 'id' | 'timestamp'>): void {
    const trackingEvent: AdInteraction = {
      ...interaction,
      id: this.generateId(),
      timestamp: new Date().toISOString()
    }

    // Add to queue for batch processing
    this.trackingQueue.push(trackingEvent)

    // Send immediately for critical events
    if (['impression', 'click', 'cta_click'].includes(interaction.type)) {
      this.sendTrackingEvent(trackingEvent)
    }
  }

  /**
   * Get ads for specific video and user context
   */
  async getAdsForVideo(
    videoId: string, 
    userId?: string, 
    sessionId?: string,
    userPreferences?: any
  ): Promise<FrontendAd[]> {
    const request: AdRequest = {
      user_id: userId,
      session_id: sessionId || this.generateSessionId(),
      video_id: videoId,
      content_metadata: await this.getVideoMetadata(videoId),
      user_context: await this.getUserContext(userId),
      placement_types: ['pre_roll', 'mid_roll', 'post_roll'],
      max_ads_per_type: 2
    }

    const response = await this.requestAds(request)
    return response.ads
  }

  /**
   * Filter ads based on Christian content guidelines
   */
  private filterChristianContent(ads: FrontendAd[]): FrontendAd[] {
    return ads.filter(ad => {
      // Apply Christian content filtering logic
      return this.isChristianContentCompliant(ad)
    })
  }

  /**
   * Check if ad content is compliant with Christian values
   */
  private isChristianContentCompliant(ad: FrontendAd): boolean {
    // Implement content compliance checking
    // This would check against approved advertisers, content guidelines, etc.
    return true // Simplified for now
  }

  /**
   * Get video metadata for ad targeting
   */
  private async getVideoMetadata(videoId: string) {
    try {
      const url = `${this.baseUrl}/api/v1/videos/${videoId}/metadata`
      console.log('Fetching video metadata from:', url)
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn('Failed to get video metadata, using defaults:', errorMessage)
      console.warn('Base URL was:', this.baseUrl)
      return {
        title: 'Unknown',
        preacher_id: 'unknown',
        category: 'general',
        duration: 0,
        topics: []
      }
    }
  }

  /**
   * Get user context for ad targeting
   */
  private async getUserContext(userId?: string) {
    return {
      device_type: this.getDeviceType(),
      browser: this.getBrowser(),
      location: await this.getLocation(),
      preferences: userId ? await this.getUserPreferences(userId) : undefined
    }
  }

  /**
   * Get user preferences for targeting
   */
  private async getUserPreferences(userId: string) {
    try {
      const url = `${this.baseUrl}/api/v1/users/${userId}/preferences`
      console.log('Fetching user preferences from:', url)
      const response = await fetch(url)
      
      if (!response.ok) {
        // Handle 403 Forbidden gracefully - user may not have preferences set
        if (response.status === 403) {
          console.log('User preferences access denied - using defaults')
          return undefined
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn('Failed to get user preferences, using defaults:', errorMessage)
      return undefined
    }
  }

  /**
   * Send tracking event to analytics
   */
  private async sendTrackingEvent(event: AdInteraction): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/v1/ads/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(event)
      })
    } catch (error) {
      console.error('Failed to send tracking event:', error)
      // Re-queue for retry
      this.trackingQueue.push(event)
    }
  }

  /**
   * Process tracking queue in batches
   */
  private startTrackingProcessor(): void {
    setInterval(() => {
      if (this.trackingQueue.length > 0) {
        const batch = this.trackingQueue.splice(0, 10) // Process 10 at a time
        this.sendTrackingBatch(batch)
      }
    }, 5000) // Every 5 seconds
  }

  /**
   * Send tracking events in batch
   */
  private async sendTrackingBatch(events: AdInteraction[]): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/v1/ads/track/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ events })
      })
    } catch (error) {
      console.error('Failed to send tracking batch:', error)
      // Re-queue failed events
      this.trackingQueue.push(...events)
    }
  }

  /**
   * Get fallback ads when main request fails
   */
  private getFallbackAds(request: AdRequest): AdResponse {
    // Option 1: Return empty ads for clean experience
    const fallbackAds: FrontendAd[] = []
    
    // Option 2: Return default Christian content ads (uncomment to enable)
    /*
    const fallbackAds: FrontendAd[] = [
      {
        id: 'fallback-1',
        type: 'pre_roll',
        url: '/ads/fallback/christian-books.mp4',
        duration: 15,
        skipAfter: 5,
        title: 'Christian Resources',
        advertiser: 'Yomistream Partners',
        tracking: {
          impression_url: `${this.baseUrl}/api/v1/ads/fallback/impression`,
          click_url: `${this.baseUrl}/api/v1/ads/fallback/click`
        }
      }
    ]
    */

    return {
      ads: fallbackAds,
      tracking: {
        request_id: this.generateId(),
        session_id: request.session_id,
        served_at: new Date().toISOString()
      }
    }
  }

  /**
   * Utility methods
   */
  private generateCacheKey(request: AdRequest): string {
    return `${request.video_id}-${request.user_id || 'anonymous'}-${request.placement_types.join(',')}`
  }

  private isCacheValid(response: AdResponse): boolean {
    const cacheTime = new Date(response.tracking.served_at).getTime()
    const now = Date.now()
    return (now - cacheTime) < 300000 // 5 minutes
  }

  private cleanCache(): void {
    const now = Date.now()
    for (const [key, response] of this.cache.entries()) {
      if (!this.isCacheValid(response)) {
        this.cache.delete(key)
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private generateSessionId(): string {
    return `session-${this.generateId()}`
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  private getBrowser(): string {
    return navigator.userAgent.split(' ')[0] || 'unknown'
  }

  private async getLocation() {
    // Remove external API dependency to avoid CORS issues
    // In production, this could be handled server-side or use a different approach
    try {
      // Use browser's built-in geolocation API or return default
      return {
        country: 'Unknown',
        region: 'Unknown', 
        city: 'Unknown'
      }
    } catch (error) {
      return undefined
    }
  }
}

// Singleton instance
let adServiceInstance: AdService | null = null

export const createAdService = (baseUrl: string, apiKey: string, config: AdSystemConfig): AdService => {
  if (!adServiceInstance) {
    adServiceInstance = new AdService(baseUrl, apiKey, config)
  }
  return adServiceInstance
}

export const getAdService = (): AdService => {
  if (!adServiceInstance) {
    console.warn('Ad service not initialized. Creating with default config.')
    // Create with default configuration as fallback
    adServiceInstance = new AdService(
      process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8002',
      process.env.NEXT_PUBLIC_AD_API_KEY || 'demo-key',
      {
        max_ad_duration: 60,
        skip_threshold: 5,
        frequency_caps: {
          global: 10,
          per_advertiser: 3,
          per_campaign: 2
        },
        content_safety: {
          auto_approval_threshold: 0.95,
          manual_review_required: true,
          blocked_keywords: []
        },
        revenue_sharing: {
          platform_percentage: 30,
          content_creator_percentage: 50,
          ministry_percentage: 20
        }
      }
    )
  }
  return adServiceInstance
}

export default AdService
