/**
 * Utility functions for working with video data
 */

import { Video, Tag } from '@/lib/types'

/**
 * Normalize tags to string array
 * Handles both string[] and Tag[] formats
 */
export function normalizeVideoTags(tags: Tag[] | string[] | null | undefined): string[] {
  if (!tags || !Array.isArray(tags)) {
    return []
  }
  
  // Check if first element is a string or Tag object
  if (tags.length === 0) {
    return []
  }
  
  const firstTag = tags[0]
  
  // If it's already a string array
  if (typeof firstTag === 'string') {
    return tags as string[]
  }
  
  // If it's a Tag array, extract names
  return (tags as Tag[]).map(tag => tag.name)
}

/**
 * Get tag name whether it's a string or Tag object
 */
export function getTagName(tag: string | Tag): string {
  return typeof tag === 'string' ? tag : tag.name
}

/**
 * Check if video has a specific tag
 */
export function videoHasTag(video: Video, tagToFind: string): boolean {
  if (!video.tags) {
    return false
  }
  
  const normalizedTags = normalizeVideoTags(video.tags)
  return normalizedTags.includes(tagToFind)
}

/**
 * Get all unique tags from a list of videos as strings
 */
export function getAllUniqueTags(videos: Video[]): string[] {
  const tagSet = new Set<string>()
  
  videos.forEach(video => {
    const normalizedTags = normalizeVideoTags(video.tags)
    normalizedTags.forEach(tag => {
      if (tag && tag.trim() !== '') {
        tagSet.add(tag)
      }
    })
  })
  
  return Array.from(tagSet).sort()
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00'
  
  const totalSeconds = Math.round(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Get preacher name from video (handles different naming conventions)
 */
export function getPreacherName(video: Video): string | null {
  if (video.preacher) {
    return video.preacher.name
  }
  if (video.preachers) {
    return video.preachers.name
  }
  return null
}

/**
 * Get preacher image URL from video (handles different naming conventions)
 */
export function getPreacherImageUrl(video: Video): string | null {
  if (video.preacher) {
    return video.preacher.image_url || video.preacher.profile_image_url || null
  }
  if (video.preachers) {
    return video.preachers.image_url || video.preachers.profile_image_url || null
  }
  return null
}

/**
 * Get preacher ID from video
 */
export function getPreacherId(video: Video): string | null {
  if (video.preacher) {
    return video.preacher.id
  }
  if (video.preachers) {
    return video.preachers.id
  }
  return video.preacher_id
}

/**
 * Get channel name from video (handles different naming conventions)
 */
export function getChannelName(video: Video): string | null {
  if (video.channel) {
    return video.channel.name
  }
  return null
}

/**
 * Get channel ID from video
 */
export function getChannelId(video: Video): string | null {
  if (video.channel) {
    return video.channel.id
  }
  return video.channel_id
}
