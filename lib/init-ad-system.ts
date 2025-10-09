// Initialize Ad System
// Call this once at app startup to initialize the ad service

import { createAdService } from '@/lib/services/ad-service'
import { AD_SYSTEM_CONFIG, API_ENDPOINTS } from '@/lib/config/ad-config'

let isInitialized = false

export const initializeAdSystem = () => {
  if (isInitialized) {
    console.log('Ad system already initialized')
    return
  }

  try {
    const adService = createAdService(
      API_ENDPOINTS.base_url,
      process.env.NEXT_PUBLIC_AD_API_KEY || 'demo-key',
      AD_SYSTEM_CONFIG
    )
    
    isInitialized = true
    console.log('Ad system initialized successfully')
    
    return adService
  } catch (error) {
    console.error('Failed to initialize ad system:', error)
    throw error
  }
}

export const isAdSystemInitialized = () => isInitialized

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  initializeAdSystem()
}
