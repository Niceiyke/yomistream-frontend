// Yomistream Ad System Configuration
// Central configuration for the ad serving platform

import { AdSystemConfig } from '@/lib/types/ad-system'

export const AD_SYSTEM_CONFIG: AdSystemConfig = {
  // Maximum duration for any ad (in seconds)
  max_ad_duration: 60,
  
  // Minimum time before skip button appears (in seconds)
  skip_threshold: 5,
  
  // Frequency caps to prevent ad fatigue
  frequency_caps: {
    global: 10, // Max 10 ads per user per day
    per_advertiser: 3, // Max 3 ads per advertiser per day
    per_campaign: 2 // Max 2 ads per campaign per day
  },
  
  // Content safety and approval settings
  content_safety: {
    auto_approval_threshold: 0.95, // Auto-approve if confidence > 95%
    manual_review_required: true, // Require manual review for new advertisers
    blocked_keywords: [
      // Add inappropriate keywords that should block ads
      'gambling',
      'alcohol',
      'tobacco',
      'adult',
      'violence',
      'hate',
      'discrimination'
    ]
  },
  
  // Revenue sharing model
  revenue_sharing: {
    platform_percentage: 30, // Yomistream takes 30%
    content_creator_percentage: 50, // Content creator gets 50%
    ministry_percentage: 20 // Supporting ministry gets 20%
  }
}

// No-ads behavior configuration
export const NO_ADS_CONFIG = {
  // What to do when no ads are available
  fallback_behavior: 'skip', // 'skip' | 'show_message' | 'show_fallback_content'
  
  // Show a brief message when no ads are available
  show_no_ads_message: false,
  no_ads_message: 'Enjoying ad-free content!',
  message_duration: 3000, // 3 seconds
  
  // Show fallback content instead of ads
  show_fallback_content: false,
  fallback_content: {
    type: 'ministry_spotlight',
    title: 'Ministry Spotlight',
    description: 'Discover more Christian content on Yomistream',
    duration: 10,
    image_url: '/ministry-spotlight.jpg',
    click_url: 'https://yomistream.com/ministries'
  },
  
  // Analytics tracking for no-ads scenarios
  track_no_ads_events: true,
  
  // Revenue alternatives when no ads
  alternative_monetization: {
    show_donation_prompt: false,
    show_subscription_prompt: false,
    show_merchandise_prompt: false
  }
}

// Ad placement configuration
export const AD_PLACEMENT_CONFIG = {
  pre_roll: {
    max_duration: 30, // Max 30 seconds for pre-roll
    skip_after: 5, // Allow skip after 5 seconds
    max_per_video: 1 // Only 1 pre-roll per video
  },
  mid_roll: {
    max_duration: 45, // Max 45 seconds for mid-roll
    skip_after: 10, // Allow skip after 10 seconds
    max_per_video: 3, // Max 3 mid-rolls per video
    min_video_duration: 600, // Only show mid-rolls on videos > 10 minutes
    spacing: 300 // Minimum 5 minutes between mid-rolls
  },
  post_roll: {
    max_duration: 60, // Max 60 seconds for post-roll
    skip_after: 5, // Allow skip after 5 seconds
    max_per_video: 1 // Only 1 post-roll per video
  }
}

// Christian content guidelines
export const CHRISTIAN_CONTENT_GUIDELINES = {
  approved_categories: [
    'christian_books',
    'bible_study',
    'christian_music',
    'ministry_tools',
    'christian_education',
    'church_services',
    'christian_events',
    'missionary_work',
    'christian_counseling',
    'christian_media',
    'christian_retail',
    'christian_technology'
  ],
  
  required_approvals: [
    'theological_review', // Ensure theological alignment
    'content_review', // Ensure family-friendly content
    'brand_safety' // Ensure brand safety for Christian audience
  ],
  
  targeting_preferences: {
    family_friendly: true,
    theological_alignment: 'evangelical', // Default alignment
    content_rating: 'G', // Default to G-rated content
    exclude_controversial: true // Exclude controversial topics by default
  }
}

// Analytics configuration
export const ANALYTICS_CONFIG = {
  tracking_events: [
    'impression',
    'click',
    'view_25',
    'view_50',
    'view_75',
    'view_100',
    'skip',
    'close',
    'cta_click',
    'conversion'
  ],
  
  batch_size: 20, // Send analytics in batches of 20 events
  batch_interval: 10000, // Send batch every 10 seconds
  
  retention_period: {
    raw_events: 90, // Keep raw events for 90 days
    aggregated_data: 730, // Keep aggregated data for 2 years
    user_data: 365 // Keep user-specific data for 1 year
  },
  
  privacy_settings: {
    anonymize_ip: true, // Anonymize IP addresses
    respect_do_not_track: true, // Respect Do Not Track headers
    gdpr_compliant: true, // GDPR compliance
    ccpa_compliant: true // CCPA compliance
  }
}

// Targeting configuration
export const TARGETING_CONFIG = {
  demographic_weights: {
    age: 0.15,
    gender: 0.10,
    language: 0.25
  },
  
  geographic_weights: {
    country: 0.30,
    region: 0.20,
    city: 0.10,
    radius: 0.15
  },
  
  interest_weights: {
    denomination: 0.25,
    ministry_interests: 0.20,
    topics: 0.15,
    life_stage: 0.10
  },
  
  behavioral_weights: {
    engagement: 0.25,
    device_type: 0.10,
    donation_history: 0.20,
    content_preferences: 0.15
  },
  
  contextual_weights: {
    content_category: 0.30,
    preacher: 0.20,
    video_topics: 0.25,
    time_of_day: 0.10
  }
}

// Pricing configuration
export const PRICING_CONFIG = {
  models: {
    cpm: {
      name: 'Cost Per Mille (CPM)',
      description: 'Pay per 1000 impressions',
      min_bid: 1.00, // Minimum $1 CPM
      max_bid: 50.00 // Maximum $50 CPM
    },
    cpc: {
      name: 'Cost Per Click (CPC)',
      description: 'Pay per click',
      min_bid: 0.10, // Minimum $0.10 per click
      max_bid: 10.00 // Maximum $10 per click
    },
    cpv: {
      name: 'Cost Per View (CPV)',
      description: 'Pay per completed view',
      min_bid: 0.05, // Minimum $0.05 per view
      max_bid: 5.00 // Maximum $5 per view
    },
    cpa: {
      name: 'Cost Per Action (CPA)',
      description: 'Pay per conversion',
      min_bid: 1.00, // Minimum $1 per action
      max_bid: 100.00 // Maximum $100 per action
    }
  },
  
  discounts: {
    volume: {
      tier1: { min_spend: 1000, discount: 0.05 }, // 5% discount for $1000+ spend
      tier2: { min_spend: 5000, discount: 0.10 }, // 10% discount for $5000+ spend
      tier3: { min_spend: 10000, discount: 0.15 } // 15% discount for $10000+ spend
    },
    
    ministry: {
      registered_ministry: 0.20, // 20% discount for registered ministries
      missionary_organization: 0.25, // 25% discount for missionary organizations
      church_plant: 0.30 // 30% discount for church plants
    }
  }
}

// API endpoints configuration
export const API_ENDPOINTS = {
  base_url: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8002',
  
  ads: {
    request: '/api/v1/ads/request',
    track: '/api/v1/ads/track',
    track_batch: '/api/v1/ads/track/batch'
  },
  
  campaigns: {
    list: '/api/v1/campaigns',
    create: '/api/v1/campaigns',
    update: '/api/v1/campaigns/:id',
    delete: '/api/v1/campaigns/:id',
    analytics: '/api/v1/campaigns/:id/analytics'
  },
  
  analytics: {
    events: '/api/v1/analytics/events',
    events_batch: '/api/v1/analytics/events/batch',
    realtime: '/api/v1/analytics/realtime',
    reports: '/api/v1/analytics/reports',
    audience: '/api/v1/analytics/audience/:id',
    revenue: '/api/v1/analytics/revenue/:id',
    content: '/api/v1/analytics/content'
  }
}

// Error messages
export const ERROR_MESSAGES = {
  AD_REQUEST_FAILED: 'Failed to load advertisements. Please try again.',
  TRACKING_FAILED: 'Failed to track advertisement interaction.',
  INVALID_AD_FORMAT: 'Invalid advertisement format received.',
  AD_BLOCKED: 'Advertisement was blocked by content filters.',
  QUOTA_EXCEEDED: 'Advertisement quota exceeded for this period.',
  TARGETING_FAILED: 'Failed to determine appropriate advertisements.',
  ANALYTICS_FAILED: 'Failed to record analytics data.'
}

// Success messages
export const SUCCESS_MESSAGES = {
  AD_LOADED: 'Advertisements loaded successfully.',
  TRACKING_SENT: 'Advertisement interaction tracked.',
  CAMPAIGN_CREATED: 'Advertisement campaign created successfully.',
  ANALYTICS_RECORDED: 'Analytics data recorded successfully.'
}

export default {
  AD_SYSTEM_CONFIG,
  AD_PLACEMENT_CONFIG,
  CHRISTIAN_CONTENT_GUIDELINES,
  ANALYTICS_CONFIG,
  TARGETING_CONFIG,
  PRICING_CONFIG,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
}
