// Notification API functions
import { API_BASE_URL } from '@/lib/api'
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read'
  created_at: string
  read_at?: string
  data?: Record<string, any>
}

export interface NotificationListResponse {
  notifications: Notification[]
  total: number
  page: number
  page_size: number
  unread_count: number
}

export interface NotificationPreferences {
  email_enabled: boolean
  in_app_enabled: boolean
  push_enabled: boolean
  video_processing_alerts: boolean
  new_content_alerts: boolean
  preacher_upload_alerts: boolean
  system_alerts: boolean
  marketing_emails: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
  timezone: string
}

export interface SendNotificationRequest {
  user_id: string
  type: 'info' | 'success' | 'warning' | 'error'
  channels: ('email' | 'in_app' | 'webhook' | 'push')[]
  title: string
  message: string
  data?: Record<string, any>
  template_name?: string
  template_data?: Record<string, any>
}

export interface BulkNotificationRequest {
  user_ids: string[]
  type: 'info' | 'success' | 'warning' | 'error'
  channels: ('email' | 'in_app' | 'webhook' | 'push')[]
  title: string
  message: string
  data?: Record<string, any>
  template_name?: string
  template_data?: Record<string, any>
}

export interface NotificationStats {
  total_notifications: number
  pending_notifications: number
  sent_notifications: number
  delivered_notifications: number
  failed_notifications: number
  read_notifications: number
  unread_notifications: number
}

// API Functions
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('access_token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

export const notificationApi = {
  // Get user notifications
  async getNotifications(params?: {
    skip?: number
    limit?: number
    status?: string
    unread_only?: boolean
  }): Promise<NotificationListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.skip !== undefined) searchParams.set('skip', params.skip.toString())
    if (params?.limit !== undefined) searchParams.set('limit', params.limit.toString())
    if (params?.status) searchParams.set('status_filter', params.status)
    if (params?.unread_only) searchParams.set('unread_only', 'true')

    const response = await fetch(`${API_BASE_URL}/api/v1/notifications/?${searchParams}`, {
      headers: getAuthHeaders()
    })
    if (!response.ok) throw new Error('Failed to fetch notifications')
    return response.json()
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/api/v1/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    })
    if (!response.ok) throw new Error('Failed to mark notification as read')
    return response.json()
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/api/v1/notifications/read-all`, {
      method: 'PUT',
      headers: getAuthHeaders()
    })
    if (!response.ok) throw new Error('Failed to mark all notifications as read')
    return response.json()
  },

  // Get notification preferences
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await fetch(`${API_BASE_URL}/api/v1/notifications/preferences`, {
      headers: getAuthHeaders()
    })
    if (!response.ok) throw new Error('Failed to fetch notification preferences')
    return response.json()
  },

  // Update notification preferences
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await fetch(`${API_BASE_URL}/api/v1/notifications/preferences`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(preferences)
    })
    if (!response.ok) throw new Error('Failed to update notification preferences')
    return response.json()
  },

  // Send notification (admin only)
  async sendNotification(request: SendNotificationRequest): Promise<Notification> {
    const response = await fetch(`${API_BASE_URL}/api/v1/notifications/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request)
    })
    if (!response.ok) throw new Error('Failed to send notification')
    return response.json()
  },

  // Send bulk notifications (admin only)
  async sendBulkNotifications(request: BulkNotificationRequest): Promise<Notification[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/notifications/send-bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request)
    })
    if (!response.ok) throw new Error('Failed to send bulk notifications')
    return response.json()
  },

  // Get notification stats (admin only)
  async getStats(): Promise<NotificationStats> {
    const response = await fetch(`${API_BASE_URL}/api/v1/notifications/admin/stats`, {
      headers: getAuthHeaders()
    })
    if (!response.ok) throw new Error('Failed to fetch notification stats')
    return response.json()
  }
}
