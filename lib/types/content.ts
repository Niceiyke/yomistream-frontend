/**
 * Content-related TypeScript interfaces matching the backend ORM models.
 * Corresponds to app/database/models/content.py and app/database/schemas/videos.py
 */

// ============================================================================
// Video Types
// ============================================================================

export interface VideoVariant {
  id: string
  video_id: string
  quality_label: string | null // '1080p', '720p', '480p', '360p', '240p'
  resolution_width: number | null
  resolution_height: number | null
  bitrate: number | null // kbps
  fps: number
  codec: string | null // 'h264', 'vp9', 'av1'
  container_format: string | null // 'mp4', 'webm'
  file_url: string
  file_size: number | null // bytes
  hls_playlist_url: string | null
  is_default: boolean
  status: string // 'processing', 'ready', 'failed'
  created_at: string
}

export interface VideoMetadata {
  id: string
  video_id: string
  original_filename: string | null
  file_size: number | null
  format: string | null
  video_codec: string | null
  audio_codec: string | null
  sample_rate: number | null
  bit_depth: number | null
  ai_summary: string | null
  ai_topics: string[] | null
  ai_sentiment: string | null
  ai_language: string | null
  content_rating: string // 'G', 'PG', etc.
  safety_score: number | null // 0.0-1.0
  flagged_content: any | null
  custom_fields: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Video {
  id: string
  
  // Basic info
  title: string
  description: string | null
  slug: string | null
  
  // Source info
  youtube_id: string | null
  youtube_url: string | null
  original_url: string | null
  
  // Preacher/Creator
  preacher_id: string | null
  preacher?: PreacherMinimal | Preacher
  
  // Channel
  channel_id: string
  channel?: Channel
  
  // Topic and categorization
  topic_id: string | null
  topic: string | null
  topic_rel?: Topic
  
  // Sermon-specific data
  sermon_notes: string[] | null
  scripture_references: any[] | null
  key_points: string[] | null
  
  // Media files
  thumbnail_url: string | null
  thumbnail_high_res_url: string | null
  video_url: string | null
  
  // Video metadata
  duration: number | null // seconds
  start_time_seconds: number
  end_time_seconds: number | null
  aspect_ratio: string // '16:9'
  
  // Transcoding info (Netflix-style)
  hls_master_url: string | null
  dash_manifest_url: string | null
  provider_asset_id: string | null
  transcoding_provider: string | null // 'mux', 'bunny', 'cloudflare', 'internal'
  transcoding_status: string // 'not_started', 'processing', 'completed', 'failed'
  transcoding_started_at: string | null
  transcoding_completed_at: string | null
  transcoding_error: string | null
  transcoding_progress: number // 0-100
  
  // Transcription
  transcript: string | null
  transcript_language: string
  transcript_segments: Array<{
    start: number
    end: number
    text: string
    confidence?: number
  }> | null
  transcription_status: string // 'not_started', 'processing', 'completed', 'failed'
  
  // Status and visibility
  status: string // 'draft', 'processing', 'published', 'archived', 'deleted'
  visibility: string // 'public', 'unlisted', 'private'
  is_featured: boolean
  is_trending: boolean
  
  // Engagement metrics (denormalized for performance)
  view_count: number
  like_count: number
  comment_count: number
  share_count: number
  favorite_count: number
  
  // Analytics
  avg_watch_percentage: number
  completion_rate: number
  engagement_score: number
  
  // SEO
  meta_title: string | null
  meta_description: string | null
  keywords: string[] | null
  
  // Timestamps
  published_at: string | null
  created_at: string
  updated_at: string | null
  
  // Relationships (can be populated or just IDs/strings)
  tags?: Tag[] | string[] | null // Can be Tag objects or simple strings
  collections?: Collection[]
  variants?: VideoVariant[]
  extended_metadata?: VideoMetadata
  
  // Legacy fields (for backward compatibility)
  hls_variant_urls?: any[]
  preachers?: PreacherMinimal // Old naming convention
}

export interface VideoTranscoding {
  id: string
  video_id: string
  job_id: string | null
  provider: string | null // 'mux', 'bunny', 'cloudflare', 'internal'
  provider_job_id: string | null
  status: string // 'queued', 'processing', 'completed', 'failed'
  progress: number // 0-100
  error_message: string | null
  error_details: any | null
  queued_at: string
  started_at: string | null
  completed_at: string | null
  output_urls: Record<string, string> | null
  master_playlist_url: string | null
}

// ============================================================================
// Preacher Types
// ============================================================================

export interface PreacherStats {
  id: string
  preacher_id: string
  total_likes: number
  total_comments: number
  total_shares: number
  total_watch_time: number // seconds
  avg_view_duration: number
  views_last_30_days: number
  followers_last_30_days: number
  updated_at: string
}

export interface Preacher {
  id: string
  name: string
  slug: string | null
  bio: string | null
  image_url: string | null
  banner_url: string | null
  denomination: string | null
  church_affiliation: string | null
  ministry_focus: string[] | null
  theological_position: string | null
  website_url: string | null
  social_links: Record<string, string> | null
  is_verified: boolean
  is_featured: boolean
  status: string // 'active', 'inactive', 'suspended'
  video_count: number
  follower_count: number
  total_views: number
  created_at: string
  updated_at: string | null
  stats?: PreacherStats
  videos?: Video[]
  
  // Legacy fields (for backward compatibility)
  profile_image_url?: string | null // Old naming convention
}

export interface PreacherMinimal {
  id: string
  name: string
  slug: string | null
  image_url: string | null
  profile_image_url?: string | null // Legacy support
}

// ============================================================================
// Channel Types
// ============================================================================

export interface Channel {
  id: string
  name: string
  description: string | null
  owner_id: string
  owner?: any // User
  video_count: number
  view_count: number
  created_at: string
  updated_at: string | null
  videos?: Video[]
}

// ============================================================================
// Topic Types
// ============================================================================

export interface Topic {
  id: string
  name: string
  slug: string | null
  description: string | null
  icon: string | null
  color: string | null // Hex color
  parent_id: string | null
  video_count: number
  is_active: boolean
  created_at: string
  videos?: Video[]
  parent?: Topic
  children?: Topic[]
}

// ============================================================================
// Tag Types
// ============================================================================

export interface Tag {
  id: string
  name: string
  slug: string | null
  usage_count: number
  created_at: string
  videos?: Video[]
}

// ============================================================================
// Collection Types
// ============================================================================

export interface Collection {
  id: string
  title: string
  description: string | null
  slug: string | null
  creator_id: string
  visibility: string // 'public', 'unlisted', 'private'
  video_count: number
  view_count: number
  created_at: string
  updated_at: string | null
  videos?: Video[]
}

// ============================================================================
// Source Video Types
// ============================================================================

export interface SourceVideo {
  id: string
  source_video_id: string // e.g., YouTube video ID
  youtube_channel_id: string | null
  channel_name: string | null
  title: string
  description: string | null
  youtube_url: string
  thumbnail_url: string | null
  duration: number | null // seconds
  published_at: string | null
  language: string | null
  tags: string[]
  raw_metadata: Record<string, any> | null
  created_at: string
  updated_at: string
}

// ============================================================================
// Processed Sermon Types
// ============================================================================

export interface ProcessedSermon {
  id: string
  title: string
  youtube_url: string
  video_id: string
  user_id: string | null
  transcription: string | null
  summary: string | null
  sermon_notes: string[]
  scripture_references: any[]
  tags: string[]
  duration: number | null // seconds
  processed_at: string
  created_at: string
  updated_at: string
  video?: Video
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface VideoCreateRequest {
  title: string
  description?: string | null
  topic?: string | null
  preacher_id: string
  topic_id?: string | null
  youtube_id?: string | null
  youtube_url?: string | null
  thumbnail_url?: string | null
  video_url?: string | null
  duration?: number | null
  start_time_seconds?: number
  end_time_seconds?: number | null
  sermon_notes?: string[]
  scripture_references?: any[]
  tags?: string[]
  visibility?: string
}

export interface VideoUpdateRequest {
  title?: string
  description?: string | null
  topic?: string | null
  topic_id?: string | null
  preacher_id?: string
  duration?: number | null
  start_time_seconds?: number | null
  end_time_seconds?: number | null
  thumbnail_url?: string | null
  sermon_notes?: string[]
  scripture_references?: any[]
  tags?: string[]
  status?: string
  visibility?: string
  is_featured?: boolean
}

export interface VideoListResponse {
  videos: Video[]
  total: number
  page: number
  page_size: number
  has_next: boolean
}

export interface PreacherCreateRequest {
  name: string
  bio?: string | null
  image_url?: string | null
  denomination?: string | null
  church_affiliation?: string | null
  website_url?: string | null
  social_links?: Record<string, string>
}

export interface PreacherUpdateRequest {
  name?: string
  bio?: string | null
  image_url?: string | null
  banner_url?: string | null
  denomination?: string | null
  church_affiliation?: string | null
  website_url?: string | null
  social_links?: Record<string, string>
  is_featured?: boolean
}

export interface SourceVideoCreateRequest {
  source_video_id: string
  title: string
  youtube_channel_id?: string | null
  channel_name?: string | null
  description?: string | null
  youtube_url: string
  thumbnail_url?: string | null
  duration?: number | null
  published_at?: string | null
  language?: string | null
  tags?: string[]
  raw_metadata?: Record<string, any>
}

export interface ProcessedSermonCreateRequest {
  title: string
  youtube_url: string
  video_id: string
  user_id?: string | null
  transcription?: string | null
  summary?: string | null
  sermon_notes?: string[]
  scripture_references?: any[]
  tags?: string[]
  duration?: number | null
  processed_at: string
}

// ============================================================================
// Utility Types
// ============================================================================

export type VideoStatus = 'draft' | 'processing' | 'published' | 'archived' | 'deleted'
export type VideoVisibility = 'public' | 'unlisted' | 'private'
export type TranscodingStatus = 'not_started' | 'queued' | 'processing' | 'completed' | 'failed'
export type TranscriptionStatus = 'not_started' | 'processing' | 'completed' | 'failed'
export type PreacherStatus = 'active' | 'inactive' | 'suspended'
export type ContentRating = 'G' | 'PG' | 'PG-13' | 'R'
