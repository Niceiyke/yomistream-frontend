export interface VideoCardConfig {
  // Timing Configuration
  prefetchDelay?: number
  previewDelay?: number
  hoverDebounceDelay?: number
  
  // Feature Toggles
  enablePrefetch?: boolean
  enablePreview?: boolean
  enableConnectionQualityDetection?: boolean
  enablePerformanceTracking?: boolean
  
  // Accessibility
  enableKeyboardNavigation?: boolean
  enableScreenReaderSupport?: boolean
  
  // Error Handling
  maxRetryAttempts?: number
  retryDelay?: number
  enableErrorRecovery?: boolean
  
  // Performance
  enableLazyLoading?: boolean
  preloadThumbnails?: boolean
  
  // Preview Behavior
  maxConcurrentPreviews?: number
  previewOnlyOnFastConnection?: boolean
  
  // Analytics
  trackUserInteractions?: boolean
  trackPerformanceMetrics?: boolean
}

export const DEFAULT_VIDEO_CARD_CONFIG: Required<VideoCardConfig> = {
  // Timing Configuration
  prefetchDelay: 2500,
  previewDelay: 3000,
  hoverDebounceDelay: 100,
  
  // Feature Toggles
  enablePrefetch: true,
  enablePreview: true,
  enableConnectionQualityDetection: true,
  enablePerformanceTracking: true,
  
  // Accessibility
  enableKeyboardNavigation: true,
  enableScreenReaderSupport: true,
  
  // Error Handling
  maxRetryAttempts: 2,
  retryDelay: 1000,
  enableErrorRecovery: true,
  
  // Performance
  enableLazyLoading: true,
  preloadThumbnails: false,
  
  // Preview Behavior
  maxConcurrentPreviews: 1,
  previewOnlyOnFastConnection: true,
  
  // Analytics
  trackUserInteractions: true,
  trackPerformanceMetrics: true
}
