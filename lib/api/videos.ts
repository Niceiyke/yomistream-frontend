/**
 * Video API functions
 */

import { apiGet, apiPost, apiDelete } from '@/lib/api'

export interface LikeStatusResponse {
  user_like_status: 'like' | 'dislike' | null
}

export interface LikeVideoRequest {
  video_id: string
  is_like: boolean
}

export interface LikeVideoResponse {
  id: string
  video_id: string
  user_id: string
  is_like: boolean
  created_at: string
}

/**
 * Get user's like/dislike status for a video
 */
export async function getUserLikeStatus(videoId: string): Promise<LikeStatusResponse> {
  return apiGet(`/api/v1/videos/${videoId}/like/status`)
}

/**
 * Like a video
 */
export async function likeVideo(videoId: string): Promise<LikeVideoResponse> {
  return apiPost(`/api/v1/videos/${videoId}/like`, {
    video_id: videoId,
    is_like: true
  })
}

/**
 * Dislike a video
 */
export async function dislikeVideo(videoId: string): Promise<LikeVideoResponse> {
  return apiPost(`/api/v1/videos/${videoId}/like`, {
    video_id: videoId,
    is_like: false
  })
}

/**
 * Remove like/dislike from a video
 */
export async function removeLike(videoId: string): Promise<void> {
  return apiDelete(`/api/v1/videos/${videoId}/like`)
}
