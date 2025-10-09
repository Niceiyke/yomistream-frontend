"use client"

import { useState, useEffect } from 'react'

export type ConnectionQuality = 'slow' | 'medium' | 'fast'

interface ConnectionInfo {
  quality: ConnectionQuality
  effectiveType?: string
  downlink?: number
  saveData?: boolean
}

export function useConnectionQuality(): ConnectionInfo & {
  isSlowConnection: boolean
  isFastConnection: boolean
  shouldEnablePreviews: boolean
  getRecommendedDelays: () => { prefetch: number; preview: number }
} {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    quality: 'medium'
  })

  useEffect(() => {
    const updateConnectionInfo = () => {
      // @ts-ignore - Navigator connection API
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection

      if (!connection) {
        setConnectionInfo({ quality: 'medium' })
        return
      }

      const { effectiveType, downlink, saveData } = connection
      let quality: ConnectionQuality = 'medium'

      // If user has data saver on, treat as slow
      if (saveData) {
        quality = 'slow'
      } else if (effectiveType === 'slow-2g' || effectiveType === '2g' || (downlink && downlink < 1)) {
        quality = 'slow'
      } else if (effectiveType === '3g' || (downlink && downlink < 5)) {
        quality = 'medium'
      } else {
        quality = 'fast'
      }

      setConnectionInfo({
        quality,
        effectiveType,
        downlink,
        saveData
      })
    }

    updateConnectionInfo()

    // @ts-ignore - Navigator connection API
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (connection && connection.addEventListener) {
      connection.addEventListener('change', updateConnectionInfo)
      return () => connection.removeEventListener('change', updateConnectionInfo)
    }
  }, [])

  const getRecommendedDelays = () => {
    switch (connectionInfo.quality) {
      case 'slow':
        return { prefetch: 5000, preview: 0 }
      case 'medium':
        return { prefetch: 3000, preview: 0 }
      case 'fast':
        return { prefetch: 2500, preview: 3000 }
      default:
        return { prefetch: 2500, preview: 3000 }
    }
  }

  return {
    ...connectionInfo,
    isSlowConnection: connectionInfo.quality === 'slow',
    isFastConnection: connectionInfo.quality === 'fast',
    shouldEnablePreviews: connectionInfo.quality === 'fast' && !connectionInfo.saveData,
    getRecommendedDelays
  }
}
