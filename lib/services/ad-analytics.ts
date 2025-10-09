// Yomistream Ad Analytics Service
// Comprehensive analytics and reporting for ad performance

import { 
  AdInteraction, 
  AdAnalytics, 
  AdRevenue, 
  AdServing 
} from '@/lib/types/ad-system'

export interface AnalyticsEvent {
  event_type: string
  campaign_id: string
  creative_id: string
  user_id?: string
  session_id: string
  timestamp: string
  properties: Record<string, any>
}

export interface RealtimeMetrics {
  active_campaigns: number
  current_impressions: number
  current_clicks: number
  current_revenue: number
  top_performing_ads: Array<{
    campaign_id: string
    impressions: number
    ctr: number
  }>
}

export class AdAnalyticsService {
  private baseUrl: string
  private apiKey: string
  private eventQueue: AnalyticsEvent[] = []
  private metricsCache: Map<string, any> = new Map()

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    
    // Start event processor
    this.startEventProcessor()
  }

  /**
   * Track ad event with detailed analytics
   */
  trackEvent(event: AnalyticsEvent): void {
    // Add to queue for batch processing
    this.eventQueue.push({
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    })

    // Send critical events immediately
    if (['impression', 'click', 'conversion'].includes(event.event_type)) {
      this.sendEvent(event)
    }
  }

  /**
   * Track video ad interaction with enhanced metrics
   */
  trackVideoAdInteraction(
    interaction: AdInteraction,
    additionalData?: Record<string, any>
  ): void {
    const event: AnalyticsEvent = {
      event_type: interaction.type,
      campaign_id: 'unknown', // Would be resolved from serving_id
      creative_id: 'unknown', // Would be resolved from serving_id
      user_id: interaction.user_id,
      session_id: interaction.session_id,
      timestamp: interaction.timestamp,
      properties: {
        serving_id: interaction.serving_id,
        duration_watched: interaction.duration_watched,
        interaction_data: interaction.interaction_data,
        ...additionalData
      }
    }

    this.trackEvent(event)
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(
    campaignId: string,
    startDate: string,
    endDate: string
  ): Promise<AdAnalytics> {
    const cacheKey = `campaign-${campaignId}-${startDate}-${endDate}`
    const cached = this.metricsCache.get(cacheKey)
    
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/analytics/campaigns/${campaignId}?start=${startDate}&end=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Analytics request failed: ${response.status}`)
      }

      const analytics: AdAnalytics = await response.json()
      
      // Cache the result
      this.metricsCache.set(cacheKey, {
        data: analytics,
        timestamp: Date.now()
      })

      return analytics
    } catch (error) {
      console.error('Failed to get campaign analytics:', error)
      throw error
    }
  }

  /**
   * Get realtime metrics dashboard
   */
  async getRealtimeMetrics(): Promise<RealtimeMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/analytics/realtime`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`Realtime metrics request failed: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get realtime metrics:', error)
      throw error
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(
    campaignIds: string[],
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/analytics/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          campaign_ids: campaignIds,
          start_date: startDate,
          end_date: endDate,
          group_by: groupBy,
          metrics: [
            'impressions',
            'clicks',
            'views',
            'completions',
            'revenue',
            'ctr',
            'vtr',
            'cost_per_click',
            'cost_per_view'
          ]
        })
      })

      if (!response.ok) {
        throw new Error(`Report generation failed: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to generate performance report:', error)
      throw error
    }
  }

  /**
   * Track conversion events
   */
  trackConversion(
    servingId: string,
    conversionType: string,
    conversionValue?: number,
    additionalData?: Record<string, any>
  ): void {
    const event: AnalyticsEvent = {
      event_type: 'conversion',
      campaign_id: 'unknown', // Would be resolved from serving_id
      creative_id: 'unknown', // Would be resolved from serving_id
      session_id: 'unknown', // Would be resolved from serving_id
      timestamp: new Date().toISOString(),
      properties: {
        serving_id: servingId,
        conversion_type: conversionType,
        conversion_value: conversionValue,
        ...additionalData
      }
    }

    this.trackEvent(event)
  }

  /**
   * Get audience insights
   */
  async getAudienceInsights(
    campaignId: string,
    startDate: string,
    endDate: string
  ): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/analytics/audience/${campaignId}?start=${startDate}&end=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Audience insights request failed: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get audience insights:', error)
      throw error
    }
  }

  /**
   * Track A/B test performance
   */
  trackABTest(
    testId: string,
    variant: string,
    eventType: string,
    userId?: string,
    additionalData?: Record<string, any>
  ): void {
    const event: AnalyticsEvent = {
      event_type: 'ab_test',
      campaign_id: testId,
      creative_id: variant,
      user_id: userId,
      session_id: this.generateSessionId(),
      timestamp: new Date().toISOString(),
      properties: {
        test_id: testId,
        variant: variant,
        test_event_type: eventType,
        ...additionalData
      }
    }

    this.trackEvent(event)
  }

  /**
   * Calculate revenue metrics
   */
  async calculateRevenue(
    campaignId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    total_revenue: number
    revenue_by_day: Array<{ date: string; revenue: number }>
    revenue_by_placement: Record<string, number>
    average_cpm: number
    average_cpc: number
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/analytics/revenue/${campaignId}?start=${startDate}&end=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Revenue calculation failed: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to calculate revenue:', error)
      throw error
    }
  }

  /**
   * Get content performance insights
   */
  async getContentPerformance(
    startDate: string,
    endDate: string,
    contentType?: string
  ): Promise<{
    top_performing_content: Array<{
      content_id: string
      title: string
      impressions: number
      engagement_rate: number
      revenue: number
    }>
    content_categories: Record<string, {
      impressions: number
      clicks: number
      revenue: number
    }>
    preacher_performance: Record<string, {
      name: string
      impressions: number
      engagement_rate: number
    }>
  }> {
    try {
      const params = new URLSearchParams({
        start: startDate,
        end: endDate
      })
      
      if (contentType) {
        params.append('type', contentType)
      }

      const response = await fetch(
        `${this.baseUrl}/api/v1/analytics/content?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Content performance request failed: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get content performance:', error)
      throw error
    }
  }

  /**
   * Private methods
   */
  private async sendEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/v1/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(event)
      })
    } catch (error) {
      console.error('Failed to send analytics event:', error)
      // Re-queue for retry
      this.eventQueue.push(event)
    }
  }

  private startEventProcessor(): void {
    setInterval(() => {
      if (this.eventQueue.length > 0) {
        const batch = this.eventQueue.splice(0, 20) // Process 20 at a time
        this.sendEventBatch(batch)
      }
    }, 10000) // Every 10 seconds
  }

  private async sendEventBatch(events: AnalyticsEvent[]): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/v1/analytics/events/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ events })
      })
    } catch (error) {
      console.error('Failed to send analytics batch:', error)
      // Re-queue failed events
      this.eventQueue.push(...events)
    }
  }

  private isCacheValid(timestamp: number): boolean {
    return (Date.now() - timestamp) < 300000 // 5 minutes
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

export default AdAnalyticsService
