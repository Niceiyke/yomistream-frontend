// Yomistream Ad System Types
// Comprehensive type definitions for the ad serving platform

export interface AdCampaign {
  id: string
  name: string
  advertiser_id: string
  status: 'active' | 'paused' | 'completed' | 'draft'
  budget: {
    total: number
    daily: number
    spent: number
    currency: 'USD' | 'EUR' | 'GBP'
  }
  targeting: AdTargeting
  schedule: {
    start_date: string
    end_date?: string
    timezone: string
  }
  created_at: string
  updated_at: string
}

export interface AdCreative {
  id: string
  campaign_id: string
  name: string
  type: 'video' | 'banner' | 'overlay' | 'sponsored_content'
  format: AdFormat
  assets: AdAssets
  call_to_action?: CallToAction
  compliance: ChristianContentCompliance
  status: 'active' | 'under_review' | 'rejected' | 'paused'
  created_at: string
}

export interface AdFormat {
  video?: {
    url: string
    duration: number
    resolution: string
    file_size: number
    thumbnail_url: string
  }
  banner?: {
    image_url: string
    width: number
    height: number
    alt_text: string
  }
  overlay?: {
    html_content: string
    css_styles: string
    position: 'top' | 'bottom' | 'center'
  }
}

export interface AdAssets {
  primary_media: string
  thumbnail?: string
  logo?: string
  background_music?: string
  captions?: string
  alternative_formats?: string[]
}

export interface CallToAction {
  text: string
  url: string
  type: 'visit_website' | 'download_app' | 'sign_up' | 'learn_more' | 'donate'
  tracking_params?: Record<string, string>
}

export interface ChristianContentCompliance {
  is_family_friendly: boolean
  content_rating: 'G' | 'PG' | 'PG-13'
  theological_alignment: 'evangelical' | 'catholic' | 'orthodox' | 'non_denominational' | 'general_christian'
  ministry_type?: 'church' | 'parachurch' | 'educational' | 'media' | 'charity'
  approved_by: string
  approval_date: string
  notes?: string
}

export interface AdTargeting {
  demographics: {
    age_range?: [number, number]
    gender?: 'male' | 'female' | 'all'
    languages?: string[]
  }
  geographic: {
    countries?: string[]
    regions?: string[]
    cities?: string[]
    radius_targeting?: {
      latitude: number
      longitude: number
      radius_km: number
    }
  }
  interests: {
    christian_denominations?: string[]
    ministry_interests?: string[]
    life_stages?: string[]
    topics?: string[]
  }
  behavioral: {
    engagement_level?: 'high' | 'medium' | 'low'
    donation_history?: boolean
    content_preferences?: string[]
    device_types?: ('mobile' | 'tablet' | 'desktop')[]
  }
  contextual: {
    content_categories?: string[]
    preacher_ids?: string[]
    video_topics?: string[]
    exclude_content?: string[]
  }
  schedule: {
    days_of_week?: number[]
    hours_of_day?: [number, number]
    timezone: string
  }
}

export interface AdPlacement {
  id: string
  type: 'pre_roll' | 'mid_roll' | 'post_roll' | 'banner' | 'overlay' | 'sponsored'
  position?: {
    timing: number // seconds for video ads
    frequency?: number // for recurring ads
  }
  video_id?: string
  content_category?: string
  preacher_id?: string
  priority: number
  max_frequency: {
    per_user: number
    per_session: number
    per_day: number
  }
}

export interface AdServing {
  id: string
  user_id?: string
  session_id: string
  video_id: string
  campaign_id: string
  creative_id: string
  placement: AdPlacement
  targeting_match: AdTargetingMatch
  bid_amount: number
  served_at: string
  user_agent: string
  ip_address: string
  geographic_data: {
    country: string
    region: string
    city: string
  }
}

export interface AdTargetingMatch {
  demographic_score: number
  geographic_score: number
  interest_score: number
  behavioral_score: number
  contextual_score: number
  overall_score: number
  matched_criteria: string[]
}

export interface AdInteraction {
  id: string
  serving_id: string
  type: 'impression' | 'click' | 'view_25' | 'view_50' | 'view_75' | 'view_100' | 'skip' | 'close' | 'cta_click'
  timestamp: string
  duration_watched?: number
  interaction_data?: Record<string, any>
  user_id?: string
  session_id: string
}

export interface AdRevenue {
  id: string
  serving_id: string
  campaign_id: string
  advertiser_id: string
  amount: number
  currency: string
  pricing_model: 'cpm' | 'cpc' | 'cpv' | 'cpa'
  calculated_at: string
  paid_at?: string
  status: 'pending' | 'paid' | 'disputed'
}

export interface AdAnalytics {
  campaign_id: string
  period: {
    start_date: string
    end_date: string
  }
  metrics: {
    impressions: number
    clicks: number
    views: number
    completions: number
    skip_rate: number
    ctr: number // click-through rate
    vtr: number // view-through rate
    engagement_rate: number
    cost_per_impression: number
    cost_per_click: number
    cost_per_view: number
    total_spend: number
    revenue_generated: number
  }
  demographic_breakdown: Record<string, number>
  geographic_breakdown: Record<string, number>
  content_performance: Record<string, number>
}

// Frontend-specific types for the video player
export interface FrontendAd {
  id: string
  type: 'pre_roll' | 'mid_roll' | 'post_roll'
  url: string
  duration: number
  skipAfter?: number
  title?: string
  advertiser?: string
  clickUrl?: string
  triggerTime?: number // for mid-roll ads
  tracking: {
    impression_url: string
    click_url?: string
    completion_url?: string
    skip_url?: string
    quartile_urls?: {
      q1: string
      q2: string
      q3: string
      q4: string
    }
  }
}

export interface AdRequest {
  user_id?: string
  session_id: string
  video_id: string
  content_metadata: {
    title: string
    preacher_id: string
    category: string
    duration: number
    topics: string[]
  }
  user_context: {
    device_type: 'mobile' | 'tablet' | 'desktop'
    browser: string
    location?: {
      country: string
      region: string
      city: string
      latitude?: number
      longitude?: number
    }
    preferences?: {
      denominations: string[]
      interests: string[]
    }
  }
  placement_types: ('pre_roll' | 'mid_roll' | 'post_roll')[]
  max_ads_per_type: number
}

export interface AdResponse {
  ads: FrontendAd[]
  tracking: {
    request_id: string
    session_id: string
    served_at: string
  }
  fallback_ads?: FrontendAd[]
  debug_info?: {
    targeting_scores: Record<string, number>
    selected_campaigns: string[]
    filtered_campaigns: string[]
  }
}

// Error types
export interface AdError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: string
  request_id?: string
}

// Configuration types
export interface AdSystemConfig {
  max_ad_duration: number
  skip_threshold: number
  frequency_caps: {
    global: number
    per_advertiser: number
    per_campaign: number
  }
  content_safety: {
    auto_approval_threshold: number
    manual_review_required: boolean
    blocked_keywords: string[]
  }
  revenue_sharing: {
    platform_percentage: number
    content_creator_percentage: number
    ministry_percentage: number
  }
}
