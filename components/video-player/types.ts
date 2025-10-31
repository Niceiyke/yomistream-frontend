export interface Ad {
  id: string
  type: 'pre-roll' | 'mid-roll' | 'post-roll'
  url: string
  duration: number
  skipAfter?: number
  clickUrl?: string
  title?: string
  advertiser?: string
  triggerTime?: number
}

export interface Watermark {
  src: string
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  opacity: number
  size: 'small' | 'medium' | 'large'
  clickUrl?: string
}

export interface Chapter {
  id: string
  title: string
  startTime: number
  endTime?: number
  thumbnail?: string
}

export interface TranscriptSegment {
  start: number
  end: number
  text: string
  confidence?: number
}

export interface VideoState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isFullscreen: boolean
  isPictureInPicture: boolean
  isLoading: boolean
  error: string | null
  buffered: number
  quality: string
  playbackRate: number
  currentAd: Ad | null
  isPlayingAd: boolean
  adTimeRemaining: number
  canSkipAd: boolean
  playedAds: string[]
  retryCount: number
  canRetry: boolean
  showThumbnailPreview: boolean
  thumbnailPreviewTime: number
  thumbnailPreviewPosition: number
  seekFeedback: 'backward' | 'forward' | null
  seekFeedbackTimeout: NodeJS.Timeout | null
  isCapturingNote: boolean
  noteCaptureStartTime: number
  noteCaptureEndTime: number
  hasTrackedView: boolean
  viewStartTime: number
  watchTime: number
}
