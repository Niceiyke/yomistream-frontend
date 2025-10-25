import { Suspense } from 'react'
import HomepageClient from './homepage-client'
import { fetchPublicVideos, fetchPublicPreachers } from '@/lib/server-api'
import { Video, Preacher } from '@/lib/types'

// Page-level cache control - revalidate every 2 minutes for homepage
export const revalidate = 120

// Loading component for Suspense fallback
function HomepageLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="text-foreground text-xl mb-4">Loading divine content...</div>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  )
}

// Error component for when server-side fetching fails
function HomepageError({ error }: { error: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-destructive text-xl mb-4">Connection Error</div>
        <p className="text-muted-foreground mb-6">{error}</p>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-muted-foreground mt-4">Retrying...</p>
      </div>
    </div>
  )
}

export default async function GospelPlatformPage() {
  try {
    // Fetch data server-side for SSR
    const [videos, preachers] = await Promise.allSettled([
      fetchPublicVideos(),
      fetchPublicPreachers(),
    ])

    // Handle partial failures - continue with available data
    const initialVideos: Video[] = videos.status === 'fulfilled' ? videos.value : []
    const initialPreachers: Preacher[] = preachers.status === 'fulfilled' ? preachers.value : []

    // If both requests failed, show error
    if (videos.status === 'rejected' && preachers.status === 'rejected') {
      console.error('Failed to fetch initial data:', videos.reason, preachers.reason)
      return <HomepageError error="Failed to load gospel content. Please refresh the page." />
    }

    // If one request failed, log but continue
    if (videos.status === 'rejected') {
      console.error('Failed to fetch videos:', videos.reason)
    }
    if (preachers.status === 'rejected') {
      console.error('Failed to fetch preachers:', preachers.reason)
    }

    return (
      <Suspense fallback={<HomepageLoading />}>
        <HomepageClient
          initialVideos={initialVideos}
          initialPreachers={initialPreachers}
        />
      </Suspense>
    )
  } catch (error) {
    console.error('Unexpected error in homepage:', error)
    return <HomepageError error="An unexpected error occurred. Please refresh the page." />
  }
}
