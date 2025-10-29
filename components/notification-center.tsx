'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Bell, Settings, Check, CheckCheck, X, Clock } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'

import { notificationApi, Notification, NotificationListResponse, NotificationPreferences } from '@/lib/notification-api'
import { useNotifications, useToastNotifications } from '@/lib/hooks/use-notifications'

const NOTIFICATION_TYPE_COLORS = {
  info: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500'
}

const NOTIFICATION_TYPE_ICONS = {
  info: Bell,
  success: Check,
  warning: Clock,
  error: X
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const queryClient = useQueryClient()
  const { showToast } = useToastNotifications()

  // Real-time notifications
  useNotifications({
    enabled: true,
    onNotification: (notification) => {
      // Show toast for new notifications
      showToast(notification.title, notification.type)

      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  // Fetch notifications
  const { data: notificationData, isLoading } = useQuery<NotificationListResponse>({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getNotifications({ unread_only: true, limit: 10 }),
    refetchInterval: 30000 // Refetch every 30 seconds as backup
  })

  // Fetch preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery<NotificationPreferences>({
    queryKey: ['notification-preferences'],
    queryFn: notificationApi.getPreferences
  })

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: notificationApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: notificationApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: notificationApi.updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
    }
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowPreferences(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notificationData?.unread_count || 0
  const notifications = notificationData?.notifications || []

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Preferences Panel */}
          {showPreferences ? (
            <NotificationPreferencesPanel
              preferences={preferences}
              isLoading={preferencesLoading}
              onUpdate={(newPrefs) => updatePreferencesMutation.mutate(newPrefs)}
              isUpdating={updatePreferencesMutation.isPending}
            />
          ) : (
            /* Notifications List */
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No new notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
                    isMarkingRead={markAsReadMutation.isPending}
                  />
                ))
              )}

              {/* Load More / View All */}
              {notificationData && notificationData.total > notificationData.notifications.length && (
                <div className="p-4 border-t border-gray-200 text-center">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    View all notifications
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NotificationItem({
  notification,
  onMarkAsRead,
  isMarkingRead
}: {
  notification: Notification
  onMarkAsRead: (id: string) => void
  isMarkingRead: boolean
}) {
  const IconComponent = NOTIFICATION_TYPE_ICONS[notification.type]
  const isUnread = notification.status !== 'read'

  return (
    <div className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${isUnread ? 'bg-blue-50' : ''}`}>
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-full ${NOTIFICATION_TYPE_COLORS[notification.type]} text-white flex-shrink-0`}>
          <IconComponent className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={`text-sm font-medium ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                {notification.title}
              </h4>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {notification.message}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </p>
            </div>

            {isUnread && (
              <button
                onClick={() => onMarkAsRead(notification.id)}
                disabled={isMarkingRead}
                className="ml-2 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                title="Mark as read"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function NotificationPreferencesPanel({
  preferences,
  isLoading,
  onUpdate,
  isUpdating
}: {
  preferences?: NotificationPreferences
  isLoading: boolean
  onUpdate: (prefs: Partial<NotificationPreferences>) => void
  isUpdating: boolean
}) {
  const [localPrefs, setLocalPrefs] = useState<Partial<NotificationPreferences>>({})

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences)
    }
  }, [preferences])

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h4 className="font-medium text-gray-900">Notification Preferences</h4>

      <div className="space-y-3">
        {/* Channel Preferences */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Channels</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localPrefs.in_app_enabled || false}
                onChange={(e) => setLocalPrefs(prev => ({ ...prev, in_app_enabled: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm">In-app notifications</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localPrefs.email_enabled || false}
                onChange={(e) => setLocalPrefs(prev => ({ ...prev, email_enabled: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm">Email notifications</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localPrefs.push_enabled || false}
                onChange={(e) => setLocalPrefs(prev => ({ ...prev, push_enabled: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm">Push notifications</span>
            </label>
          </div>
        </div>

        {/* Alert Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Alert Types</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localPrefs.video_processing_alerts || false}
                onChange={(e) => setLocalPrefs(prev => ({ ...prev, video_processing_alerts: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm">Video processing updates</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localPrefs.new_content_alerts || false}
                onChange={(e) => setLocalPrefs(prev => ({ ...prev, new_content_alerts: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm">New content alerts</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localPrefs.preacher_upload_alerts || false}
                onChange={(e) => setLocalPrefs(prev => ({ ...prev, preacher_upload_alerts: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm">Preacher upload alerts</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localPrefs.system_alerts || false}
                onChange={(e) => setLocalPrefs(prev => ({ ...prev, system_alerts: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm">System alerts</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={() => onUpdate(localPrefs)}
            disabled={isUpdating}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}
