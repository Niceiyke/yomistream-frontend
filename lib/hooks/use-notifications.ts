'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { API_BASE_URL } from '@/lib/api'

interface UseNotificationsOptions {
  enabled?: boolean
  onNotification?: (notification: any) => void
}

export function useNotifications({ enabled = true, onNotification }: UseNotificationsOptions = {}) {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectDelay = 1000 // Start with 1 second

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      // Create WebSocket connection to notification endpoint
      const protocol = API_BASE_URL.startsWith('https:') ? 'wss:' : 'ws:'
      const url = new URL(API_BASE_URL)

      // Get access token from localStorage
      const token = localStorage.getItem('access_token')
      const wsUrl = `${protocol}//${url.host}/api/v1/notifications/ws${token ? `?token=${token}` : ''}`

      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log('Notification WebSocket connected')
        reconnectAttempts.current = 0
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('Received notification:', data)

          // Invalidate and refetch notifications
          queryClient.invalidateQueries({ queryKey: ['notifications'] })

          // Call custom handler if provided
          if (onNotification) {
            onNotification(data)
          }
        } catch (error) {
          console.error('Failed to parse notification:', error)
        }
      }

      wsRef.current.onclose = (event) => {
        console.log('Notification WebSocket closed:', event.code, event.reason)
        wsRef.current = null

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = reconnectDelay * Math.pow(2, reconnectAttempts.current)
          console.log(`Attempting to reconnect in ${delay}ms...`)

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++
            connect()
          }, delay)
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('Notification WebSocket error:', error)
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
    }
  }, [enabled, onNotification, queryClient])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting')
      wsRef.current = null
    }
  }, [])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  // Reconnect when enabled changes
  useEffect(() => {
    if (enabled && !wsRef.current) {
      connect()
    } else if (!enabled) {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    connect,
    disconnect
  }
}

// Server-Sent Events fallback for browsers that don't support WebSocket well
export function useNotificationsSSE({ enabled = true, onNotification }: UseNotificationsOptions = {}) {
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!enabled) return

    // Check if SSE is available by making a test request
    fetch(`${API_BASE_URL}/api/v1/notifications/sse`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        console.warn('SSE not available:', data.error)
        return
      }

      // SSE is available, proceed with EventSource
      try {
        const eventSource = new EventSource(`${API_BASE_URL}/api/v1/notifications/sse`)
        eventSourceRef.current = eventSource

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('Received SSE notification:', data)

            // Invalidate and refetch notifications
            queryClient.invalidateQueries({ queryKey: ['notifications'] })

            // Call custom handler if provided
            if (onNotification) {
              onNotification(data)
            }
          } catch (error) {
            console.error('Failed to parse SSE notification:', error)
          }
        }

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error)
          // SSE will automatically attempt to reconnect
        }

        eventSource.onopen = () => {
          console.log('SSE connection opened')
        }

        return () => {
          eventSource.close()
          eventSourceRef.current = null
        }
      } catch (error) {
        console.error('Failed to create SSE connection:', error)
        return () => {}
      }
    })
    .catch(error => {
      console.warn('SSE availability check failed, falling back to WebSocket only:', error)
    })
  }, [enabled, onNotification, queryClient])

  return {
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN
  }
}

// Toast notification hook for showing temporary notifications
export function useToastNotifications() {
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    // This would integrate with your existing toast system
    // For now, we'll use a simple console.log and browser notification

    console.log(`[${type.toUpperCase()}] ${message}`)

    // Check if browser notifications are supported and permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(message, {
        icon: '/favicon.ico',
        tag: `wordlyte-${type}`
      })
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(message, {
            icon: '/favicon.ico',
            tag: `wordlyte-${type}`
          })
        }
      })
    }
  }, [])

  return { showToast }
}
