/**
 * Debug utilities for development logging
 * Helps prevent excessive console logs in production
 */

const isDevelopment = process.env.NODE_ENV === 'development'

export const debugLog = {
  /**
   * Log video events (time updates, state changes, etc.)
   * Only logs in development mode and throttles frequent events
   */
  video: (() => {
    let lastLogTime = 0
    const throttleMs = 10000 // Log at most once per second
    
    return (message: string, data?: any) => {
      if (!isDevelopment) return
      
      const now = Date.now()
      if (now - lastLogTime > throttleMs) {
        console.log(`[VIDEO] ${message}`, data || '')
        lastLogTime = now
      }
    }
  })(),

  /**
   * Log performance events (prefetch, preview, etc.)
   */
  performance: (message: string, data?: any) => {
    if (!isDevelopment) return
    console.log(`[PERF] ${message}`, data || '')
  },

  /**
   * Log ad system events
   */
  ads: (message: string, data?: any) => {
    if (!isDevelopment) return
    console.log(`[ADS] ${message}`, data || '')
  },

  /**
   * Log general debug information
   */
  info: (message: string, data?: any) => {
    if (!isDevelopment) return
    console.log(`[DEBUG] ${message}`, data || '')
  },

  /**
   * Log errors (always logs, even in production)
   */
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || '')
  },

  /**
   * Log warnings (always logs, even in production)
   */
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data || '')
  }
}

export default debugLog
