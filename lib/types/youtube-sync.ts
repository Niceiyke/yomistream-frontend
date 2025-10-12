export type SyncMode = 'new_only' | 'full'

export interface StartSyncRequest {
  channelIds: string[]
  minDuration?: number
  maxVideos?: number
  syncMode?: SyncMode
}

export interface StartSyncResponse {
  job_id: string
  queued: boolean
  message?: string
}

export interface SyncStatus {
  last_sync_at: string | null
  active_jobs: number
  completed_today: number
  failed_today: number
}

export interface VideoItem {
  id: string
  title: string
  channel: string
  duration: number
  published_at: string
  status: 'synced' | 'pending' | 'error'
  thumbnail_url?: string
}

export interface PaginatedVideos {
  items: VideoItem[]
  total: number
  page: number
  pageSize: number
}

export interface VideoFilters {
  query?: string
  status?: 'synced' | 'pending' | 'error' | 'all'
  channel?: string
  from?: string
  to?: string
}
