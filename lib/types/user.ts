export interface User {
  id: string
  email?: string
  name?: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

export interface UserPreferences {
  autoplay: boolean
  quality: 'auto' | '720p' | '480p' | '360p'
  volume: number
  playback_speed: number
}
