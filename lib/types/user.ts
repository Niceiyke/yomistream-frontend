export interface User {
  id: string
  email?: string
  name?: string
  full_name?: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
  is_verified?: boolean
  is_active?: boolean
  is_premium?: boolean
  user_type?: string
  auth_provider?: string
}

export interface UserPreferences {
  autoplay: boolean
  quality: 'auto' | '720p' | '480p' | '360p'
  volume: number
  playback_speed: number
}
