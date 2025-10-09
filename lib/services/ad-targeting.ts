// Yomistream Ad Targeting Engine
// Advanced targeting system for Christian content advertising

import { 
  AdTargeting, 
  AdTargetingMatch, 
  AdRequest, 
  AdCampaign 
} from '@/lib/types/ad-system'

export class AdTargetingEngine {
  /**
   * Calculate targeting match score for a campaign
   */
  calculateTargetingScore(
    campaign: AdCampaign, 
    request: AdRequest
  ): AdTargetingMatch {
    const targeting = campaign.targeting
    
    const demographicScore = this.calculateDemographicScore(targeting, request)
    const geographicScore = this.calculateGeographicScore(targeting, request)
    const interestScore = this.calculateInterestScore(targeting, request)
    const behavioralScore = this.calculateBehavioralScore(targeting, request)
    const contextualScore = this.calculateContextualScore(targeting, request)
    
    // Weighted overall score
    const weights = {
      demographic: 0.15,
      geographic: 0.20,
      interest: 0.25,
      behavioral: 0.20,
      contextual: 0.20
    }
    
    const overallScore = 
      (demographicScore * weights.demographic) +
      (geographicScore * weights.geographic) +
      (interestScore * weights.interest) +
      (behavioralScore * weights.behavioral) +
      (contextualScore * weights.contextual)
    
    return {
      demographic_score: demographicScore,
      geographic_score: geographicScore,
      interest_score: interestScore,
      behavioral_score: behavioralScore,
      contextual_score: contextualScore,
      overall_score: overallScore,
      matched_criteria: this.getMatchedCriteria(targeting, request)
    }
  }

  /**
   * Calculate demographic targeting score
   */
  private calculateDemographicScore(
    targeting: AdTargeting, 
    request: AdRequest
  ): number {
    let score = 1.0
    const demographics = targeting.demographics
    
    if (!demographics) return score
    
    // Age range matching (would need user age data)
    if (demographics.age_range) {
      // Placeholder - would integrate with user profile data
      score *= 0.8 // Assume partial match
    }
    
    // Gender matching (would need user gender data)
    if (demographics.gender && demographics.gender !== 'all') {
      // Placeholder - would integrate with user profile data
      score *= 0.8 // Assume partial match
    }
    
    // Language matching
    if (demographics.languages) {
      const userLanguage = this.getUserLanguage(request)
      if (demographics.languages.includes(userLanguage)) {
        score *= 1.2 // Boost for language match
      } else {
        score *= 0.6 // Penalty for language mismatch
      }
    }
    
    return Math.min(score, 1.0)
  }

  /**
   * Calculate geographic targeting score
   */
  private calculateGeographicScore(
    targeting: AdTargeting, 
    request: AdRequest
  ): number {
    let score = 1.0
    const geographic = targeting.geographic
    const userLocation = request.user_context.location
    
    if (!geographic || !userLocation) return score
    
    // Country matching
    if (geographic.countries) {
      if (geographic.countries.includes(userLocation.country)) {
        score *= 1.3 // Strong boost for country match
      } else {
        score *= 0.3 // Strong penalty for country mismatch
      }
    }
    
    // Region matching
    if (geographic.regions) {
      if (geographic.regions.includes(userLocation.region)) {
        score *= 1.2 // Boost for region match
      } else {
        score *= 0.7 // Penalty for region mismatch
      }
    }
    
    // City matching
    if (geographic.cities) {
      if (geographic.cities.includes(userLocation.city)) {
        score *= 1.1 // Small boost for city match
      }
    }
    
    // Radius targeting
    if (geographic.radius_targeting && userLocation) {
      const distance = this.calculateDistance(
        geographic.radius_targeting.latitude,
        geographic.radius_targeting.longitude,
        userLocation.latitude || 0,
        userLocation.longitude || 0
      )
      
      if (distance <= geographic.radius_targeting.radius_km) {
        score *= 1.2 // Boost for being within radius
      } else {
        score *= 0.5 // Penalty for being outside radius
      }
    }
    
    return Math.min(score, 1.0)
  }

  /**
   * Calculate interest-based targeting score
   */
  private calculateInterestScore(
    targeting: AdTargeting, 
    request: AdRequest
  ): number {
    let score = 1.0
    const interests = targeting.interests
    const userPreferences = request.user_context.preferences
    
    if (!interests || !userPreferences) return score
    
    // Christian denomination matching
    if (interests.christian_denominations && userPreferences.denominations) {
      const matches = interests.christian_denominations.filter(
        denom => userPreferences.denominations.includes(denom)
      ).length
      
      if (matches > 0) {
        score *= 1.0 + (matches * 0.2) // Boost based on denomination matches
      } else {
        score *= 0.8 // Small penalty for no denomination match
      }
    }
    
    // Ministry interest matching
    if (interests.ministry_interests && userPreferences.interests) {
      const matches = interests.ministry_interests.filter(
        interest => userPreferences.interests.includes(interest)
      ).length
      
      if (matches > 0) {
        score *= 1.0 + (matches * 0.15) // Boost based on interest matches
      }
    }
    
    // Topic matching
    if (interests.topics) {
      const contentTopics = request.content_metadata.topics
      const matches = interests.topics.filter(
        topic => contentTopics.includes(topic)
      ).length
      
      if (matches > 0) {
        score *= 1.0 + (matches * 0.1) // Boost based on topic matches
      }
    }
    
    return Math.min(score, 1.0)
  }

  /**
   * Calculate behavioral targeting score
   */
  private calculateBehavioralScore(
    targeting: AdTargeting, 
    request: AdRequest
  ): number {
    let score = 1.0
    const behavioral = targeting.behavioral
    
    if (!behavioral) return score
    
    // Device type matching
    if (behavioral.device_types) {
      if (behavioral.device_types.includes(request.user_context.device_type)) {
        score *= 1.1 // Boost for device match
      } else {
        score *= 0.9 // Small penalty for device mismatch
      }
    }
    
    // Engagement level (would need user engagement data)
    if (behavioral.engagement_level) {
      // Placeholder - would integrate with user analytics
      score *= 1.0 // Neutral for now
    }
    
    // Donation history (would need user donation data)
    if (behavioral.donation_history !== undefined) {
      // Placeholder - would integrate with donation system
      score *= 1.0 // Neutral for now
    }
    
    return Math.min(score, 1.0)
  }

  /**
   * Calculate contextual targeting score
   */
  private calculateContextualScore(
    targeting: AdTargeting, 
    request: AdRequest
  ): number {
    let score = 1.0
    const contextual = targeting.contextual
    const content = request.content_metadata
    
    if (!contextual) return score
    
    // Content category matching
    if (contextual.content_categories) {
      if (contextual.content_categories.includes(content.category)) {
        score *= 1.3 // Strong boost for category match
      } else {
        score *= 0.7 // Penalty for category mismatch
      }
    }
    
    // Preacher matching
    if (contextual.preacher_ids) {
      if (contextual.preacher_ids.includes(content.preacher_id)) {
        score *= 1.2 // Boost for preacher match
      }
    }
    
    // Video topic matching
    if (contextual.video_topics) {
      const matches = contextual.video_topics.filter(
        topic => content.topics.includes(topic)
      ).length
      
      if (matches > 0) {
        score *= 1.0 + (matches * 0.1) // Boost based on topic matches
      }
    }
    
    // Content exclusion
    if (contextual.exclude_content) {
      const hasExcluded = contextual.exclude_content.some(
        excluded => content.topics.includes(excluded) || 
                   content.category === excluded
      )
      
      if (hasExcluded) {
        score = 0 // Complete exclusion
      }
    }
    
    return Math.min(score, 1.0)
  }

  /**
   * Get list of matched targeting criteria
   */
  private getMatchedCriteria(
    targeting: AdTargeting, 
    request: AdRequest
  ): string[] {
    const matched: string[] = []
    
    // Check demographic matches
    if (targeting.demographics?.languages) {
      const userLanguage = this.getUserLanguage(request)
      if (targeting.demographics.languages.includes(userLanguage)) {
        matched.push(`language:${userLanguage}`)
      }
    }
    
    // Check geographic matches
    if (targeting.geographic?.countries && request.user_context.location) {
      if (targeting.geographic.countries.includes(request.user_context.location.country)) {
        matched.push(`country:${request.user_context.location.country}`)
      }
    }
    
    // Check contextual matches
    if (targeting.contextual?.content_categories) {
      if (targeting.contextual.content_categories.includes(request.content_metadata.category)) {
        matched.push(`category:${request.content_metadata.category}`)
      }
    }
    
    // Check device matches
    if (targeting.behavioral?.device_types) {
      if (targeting.behavioral.device_types.includes(request.user_context.device_type)) {
        matched.push(`device:${request.user_context.device_type}`)
      }
    }
    
    return matched
  }

  /**
   * Check if campaign schedule allows serving now
   */
  isScheduleActive(targeting: AdTargeting): boolean {
    const now = new Date()
    const schedule = targeting.schedule
    
    if (!schedule) return true
    
    // Check day of week
    if (schedule.days_of_week) {
      const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
      if (!schedule.days_of_week.includes(currentDay)) {
        return false
      }
    }
    
    // Check hour of day
    if (schedule.hours_of_day) {
      const currentHour = now.getHours()
      const [startHour, endHour] = schedule.hours_of_day
      
      if (currentHour < startHour || currentHour > endHour) {
        return false
      }
    }
    
    return true
  }

  /**
   * Utility methods
   */
  private getUserLanguage(request: AdRequest): string {
    // Extract from browser or user preferences
    return navigator.language.split('-')[0] || 'en'
  }

  private calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}

export default AdTargetingEngine
