import React from 'react'
import { NavigatorWithConnection, ConnectionQuality, ConnectionInfo } from '@/lib/types/network'

export class ConnectionQualityDetector {
  private static instance: ConnectionQualityDetector
  private listeners: ((info: ConnectionInfo) => void)[] = []
  private currentInfo: ConnectionInfo = { quality: 'medium' }

  private constructor() {
    this.initialize()
  }

  public static getInstance(): ConnectionQualityDetector {
    if (!ConnectionQualityDetector.instance) {
      ConnectionQualityDetector.instance = new ConnectionQualityDetector()
    }
    return ConnectionQualityDetector.instance
  }

  private initialize() {
    this.updateConnectionInfo()
    this.setupEventListeners()
  }

  private setupEventListeners() {
    const nav = navigator as NavigatorWithConnection
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection

    if (connection && connection.addEventListener) {
      connection.addEventListener('change', () => {
        this.updateConnectionInfo()
      })
    }

    // Fallback: Check periodically if no event support
    if (!connection?.addEventListener) {
      setInterval(() => {
        this.updateConnectionInfo()
      }, 30000) // Check every 30 seconds
    }
  }

  private updateConnectionInfo() {
    const nav = navigator as NavigatorWithConnection
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection

    const newInfo: ConnectionInfo = {
      quality: this.determineQuality(connection),
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      saveData: connection?.saveData
    }

    // Only notify if quality changed
    if (newInfo.quality !== this.currentInfo.quality) {
      this.currentInfo = newInfo
      this.notifyListeners(newInfo)
    } else {
      this.currentInfo = newInfo
    }
  }

  private determineQuality(connection?: any): ConnectionQuality {
    if (!connection) {
      return 'medium' // Default fallback
    }

    const { effectiveType, downlink, saveData } = connection

    // If user has data saver on, treat as slow
    if (saveData) {
      return 'slow'
    }

    // Classify based on effective type and downlink speed
    if (effectiveType === 'slow-2g' || effectiveType === '2g' || (downlink && downlink < 1)) {
      return 'slow'
    } else if (effectiveType === '3g' || (downlink && downlink < 5)) {
      return 'medium'
    } else {
      return 'fast'
    }
  }

  public getConnectionInfo(): ConnectionInfo {
    return { ...this.currentInfo }
  }

  public getConnectionQuality(): ConnectionQuality {
    return this.currentInfo.quality
  }

  public subscribe(callback: (info: ConnectionInfo) => void): () => void {
    this.listeners.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners(info: ConnectionInfo) {
    this.listeners.forEach(callback => {
      try {
        callback(info)
      } catch (error) {
        console.warn('Error in connection quality listener:', error)
      }
    })
  }

  public isSlowConnection(): boolean {
    return this.currentInfo.quality === 'slow'
  }

  public isFastConnection(): boolean {
    return this.currentInfo.quality === 'fast'
  }

  public shouldEnablePreviews(): boolean {
    return this.currentInfo.quality === 'fast' && !this.currentInfo.saveData
  }

  public getRecommendedDelays(): { prefetch: number; preview: number } {
    switch (this.currentInfo.quality) {
      case 'slow':
        return { prefetch: 5000, preview: 0 } // No previews on slow
      case 'medium':
        return { prefetch: 3000, preview: 0 } // No previews on medium
      case 'fast':
        return { prefetch: 2500, preview: 3000 }
      default:
        return { prefetch: 2500, preview: 3000 }
    }
  }
}

// Hook for React components
export function useConnectionQuality() {
  const [connectionInfo, setConnectionInfo] = React.useState<ConnectionInfo>(
    () => ConnectionQualityDetector.getInstance().getConnectionInfo()
  )

  React.useEffect(() => {
    const detector = ConnectionQualityDetector.getInstance()
    const unsubscribe = detector.subscribe(setConnectionInfo)
    
    return unsubscribe
  }, [])

  return {
    ...connectionInfo,
    isSlowConnection: connectionInfo.quality === 'slow',
    isFastConnection: connectionInfo.quality === 'fast',
    shouldEnablePreviews: connectionInfo.quality === 'fast' && !connectionInfo.saveData,
    getRecommendedDelays: () => ConnectionQualityDetector.getInstance().getRecommendedDelays()
  }
}

export default ConnectionQualityDetector
