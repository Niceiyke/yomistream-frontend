import { StartSyncRequest, StartSyncResponse, SyncStatus, PaginatedVideos, VideoFilters, VideoItem } from '@/lib/types/youtube-sync'
import { getAccessTokenCached } from '@/lib/auth-cache'

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

function toQuery(params: Record<string, any>): string {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || v === 'all') return
    q.set(k, String(v))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  // Build headers with JSON type and JWT auth token (if available)
  const headers = new Headers({ 'Content-Type': 'application/json' })

  try {
    const token = await getAccessTokenCached()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  } catch {
    // ignore token errors; request will proceed unauthenticated
  }

  // Merge any incoming headers
  if (init?.headers) {
    const incoming = init.headers as any
    if (incoming instanceof Headers) {
      incoming.forEach((v: string, k: string) => headers.set(k, v))
    } else if (Array.isArray(incoming)) {
      incoming.forEach(([k, v]) => headers.set(k, v as string))
    } else {
      Object.entries(incoming).forEach(([k, v]) => headers.set(k, String(v)))
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      message = data?.message || data?.error || message
    } catch {}
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export async function startYoutubeSync(payload: StartSyncRequest): Promise<StartSyncResponse> {
  // Backend path: /api/youtube-sync/channels/sync
  // Backend expects ChannelSyncRequest shape
  const body = {
    channel_ids: payload.channelIds,
    min_duration_minutes: payload.minDuration,
    max_videos_per_channel: payload.maxVideos,
    sync_mode: payload.syncMode ?? 'new_only',
    // preacher_mapping optional, not exposed in UI yet
  }
  const res = await http<any>('/api/youtube-sync/channels/sync', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  // Map backend response to StartSyncResponse
  return {
    job_id: res.job_id,
    queued: res.status === 'queued' || !!res.job_id,
    message: res.message,
  }
}

export async function getYoutubeSyncStatus(): Promise<SyncStatus> {
  // Backend path: /api/youtube-sync/statistics
  const stats = await http<any>('/api/youtube-sync/statistics')
  return {
    last_sync_at: stats.last_sync_at ?? null,
    active_jobs: stats.active_jobs ?? 0,
    completed_today: stats.completed_jobs_today ?? 0,
    failed_today: stats.failed_jobs_today ?? 0,
  }
}

export type GetVideosParams = VideoFilters & { page?: number; pageSize?: number }

export async function getYoutubeSyncedVideos(params: GetVideosParams = {}): Promise<PaginatedVideos> {
  // Backend path: /api/youtube-sync/source-videos with limit/offset
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 10
  const limit = pageSize
  const offset = (page - 1) * pageSize
  const q = new URLSearchParams()
  q.set('limit', String(limit))
  q.set('offset', String(offset))
  if (params.channel) q.set('channel_id', params.channel)
  const items = await http<any[]>(`/api/youtube-sync/source-videos?${q.toString()}`)
  // Map backend SourceVideo -> VideoItem
  const mapped: VideoItem[] = (items || []).map((v: any) => ({
    id: v.id,
    title: v.title,
    channel: v.channel_name ?? v.channel_id ?? '',
    duration: v.duration_seconds ?? v.duration ?? 0,
    published_at: v.published_at ?? v.created_at ?? null,
    status: 'synced',
    thumbnail_url: v.thumbnail_url,
  }))
  // Backend does not return total; approximate with current page
  return {
    items: mapped,
    total: offset + mapped.length,
    page,
    pageSize,
  }
}
