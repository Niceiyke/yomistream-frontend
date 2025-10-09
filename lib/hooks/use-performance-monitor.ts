import { useEffect, useRef, useState } from 'react'

interface PerformanceMetrics {
  prefetchCount: number
  previewCount: number
  cancelledRequests: number
  networkRequests: number
  connectionQuality: 'slow' | 'medium' | 'fast'
  averageLoadTime: number
  bandwidthSaved: number
}

interface PerformanceEvent {
  type: 'prefetch' | 'preview' | 'cancel' | 'navigation' | 'connection_change' | 'prefetch_failed' | 'prefetch_error' | 'ad_impression' | 'ad_click' | 'ad_completion' | 'ad_skip' | 'ad_quartile'
  timestamp: number
  videoId?: string
  connectionQuality?: string
  loadTime?: number
  bytesSaved?: number
  error?: any
  adId?: string
  watchedDuration?: number
  quartile?: number
}

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    prefetchCount: 0,
    previewCount: 0,
    cancelledRequests: 0,
    networkRequests: 0,
    connectionQuality: 'medium',
    averageLoadTime: 0,
    bandwidthSaved: 0
  })

  const eventsRef = useRef<PerformanceEvent[]>([])
  const loadTimesRef = useRef<number[]>([])

  const trackEvent = (event: Omit<PerformanceEvent, 'timestamp'>) => {
    const fullEvent: PerformanceEvent = {
      ...event,
      timestamp: Date.now()
    }
    
    eventsRef.current.push(fullEvent)
    
    // Update metrics based on event type
    setMetrics(prev => {
      const updated = { ...prev }
      
      switch (event.type) {
        case 'prefetch':
          updated.prefetchCount++
          updated.networkRequests++
          break
        case 'preview':
          updated.previewCount++
          updated.networkRequests++
          break
        case 'cancel':
          updated.cancelledRequests++
          // Estimate bandwidth saved (average video preview ~2MB)
          updated.bandwidthSaved += event.bytesSaved || 2000000
          break
        case 'navigation':
          if (event.loadTime) {
            loadTimesRef.current.push(event.loadTime)
            updated.averageLoadTime = loadTimesRef.current.reduce((a, b) => a + b, 0) / loadTimesRef.current.length
          }
          break
        case 'connection_change':
          if (event.connectionQuality) {
            updated.connectionQuality = event.connectionQuality as 'slow' | 'medium' | 'fast'
          }
          break
      }
      
      return updated
    })

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance Event:', fullEvent)
    }
  }

  const getMetricsSummary = () => {
    const recentEvents = eventsRef.current.filter(
      event => Date.now() - event.timestamp < 300000 // Last 5 minutes
    )

    return {
      ...metrics,
      recentEvents: recentEvents.length,
      efficiency: metrics.cancelledRequests / Math.max(metrics.networkRequests, 1),
      bandwidthSavedMB: Math.round(metrics.bandwidthSaved / 1000000 * 100) / 100
    }
  }

  const resetMetrics = () => {
    setMetrics({
      prefetchCount: 0,
      previewCount: 0,
      cancelledRequests: 0,
      networkRequests: 0,
      connectionQuality: 'medium',
      averageLoadTime: 0,
      bandwidthSaved: 0
    })
    eventsRef.current = []
    loadTimesRef.current = []
  }

  // Monitor connection changes
  useEffect(() => {
    const handleConnectionChange = () => {
      // @ts-ignore
      const connection = navigator.connection || navigator.mozConnection
      if (connection) {
        const quality = connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g' 
          ? 'slow' 
          : connection.effectiveType === '3g' 
          ? 'medium' 
          : 'fast'
        
        trackEvent({ type: 'connection_change', connectionQuality: quality })
      }
    }

    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection
    if (connection) {
      connection.addEventListener('change', handleConnectionChange)
      return () => connection.removeEventListener('change', handleConnectionChange)
    }
  }, [])

  return {
    metrics,
    trackEvent,
    getMetricsSummary,
    resetMetrics
  }
}

export default usePerformanceMonitor
