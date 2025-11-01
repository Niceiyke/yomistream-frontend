import { apiGet, apiPost, apiDelete } from "@/lib/api"
import { Preacher, Video } from "@/lib/types"

export const preacherApi = {
  // Get preacher details
  getPreacher: async (preacherId: string): Promise<Preacher> => {
    return apiGet(`/api/v1/preachers/${preacherId}`)
  },

  // Get preacher's videos (sermons)
  getPreacherVideos: async (
    preacherId: string,
    params?: {
      skip?: number
      limit?: number
      status_filter?: string
    }
  ): Promise<Video[]> => {
    const queryParams = new URLSearchParams()
    if (params?.skip !== undefined) queryParams.set('skip', params.skip.toString())
    if (params?.limit !== undefined) queryParams.set('limit', params.limit.toString())
    if (params?.status_filter) queryParams.set('status_filter', params.status_filter)

    const queryString = queryParams.toString()
    const url = `/api/v1/preachers/${preacherId}/videos${queryString ? `?${queryString}` : ''}`

    return apiGet(url)
  },

  // Get preacher stats
  getPreacherStats: async (preacherId: string) => {
    return apiGet(`/api/v1/preachers/${preacherId}/stats`)
  },

  // Follow a preacher
  followPreacher: async (preacherId: string, data: { notify_on_upload?: boolean }) => {
    return apiPost(`/api/v1/preachers/${preacherId}/follow`, data)
  },

  // Unfollow a preacher
  unfollowPreacher: async (preacherId: string) => {
    return apiDelete(`/api/v1/preachers/${preacherId}/follow`)
  },

  // Get follower count
  getFollowerCount: async (preacherId: string): Promise<number> => {
    return apiGet(`/api/v1/preachers/${preacherId}/followers`)
  },

  // Check if current user follows this preacher
  checkFollowStatus: async (preacherId: string): Promise<boolean> => {
    try {
      // Get list of preachers user follows and check if this one is in it
      const response = await apiGet(`/api/v1/preachers/me/following?limit=100`)
      return response.some((p: Preacher) => p.id === preacherId)
    } catch (error) {
      return false
    }
  }
}
