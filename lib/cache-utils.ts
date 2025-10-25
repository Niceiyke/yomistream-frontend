// Cache invalidation utilities for SSR
import { revalidatePath, revalidateTag } from 'next/cache'

export async function invalidateVideoCache(videoId?: string) {
  if (videoId) {
    // Invalidate specific video page
    revalidatePath(`/video/${videoId}`)
  }

  // Invalidate homepage (videos list might have changed)
  revalidatePath('/')

  // Invalidate all video-related tags
  revalidateTag('videos')
  revalidateTag('video')
}

export async function invalidatePreacherCache() {
  // Invalidate homepage (preachers list might have changed)
  revalidatePath('/')

  // Invalidate preacher-related tags
  revalidateTag('preachers')
}

export async function invalidateAllContentCache() {
  // Force revalidation of all content
  revalidatePath('/', 'layout')
  revalidateTag('videos')
  revalidateTag('preachers')
  revalidateTag('video')
}
