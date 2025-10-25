import { Suspense } from 'react'
import VideoDetailClient from './video-detail-client'
import { fetchVideo } from '@/lib/server-api'
import { Video } from '@/lib/types'

// Page-level cache control - revalidate every 5 minutes for video pages
export const revalidate = 300

// Loading component for Suspense fallback
function VideoDetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header skeleton */}
      <div className="h-16 bg-background/80 backdrop-blur-lg border-b border-border/50" />

      {/* Action bar skeleton */}
      <div className="border-b border-border/30 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <div className="h-9 w-32 bg-muted animate-pulse rounded" />
              <div className="h-9 w-24 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-20 bg-muted animate-pulse rounded" />
              <div className="h-9 w-16 bg-muted animate-pulse rounded" />
              <div className="h-9 w-9 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl lg:max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main content skeleton */}
          <div className="lg:col-span-8 space-y-8">
            {/* Video player skeleton */}
            <div className="aspect-video w-full bg-muted animate-pulse rounded-lg" />

            {/* Info skeleton */}
            <div className="space-y-6">
              <div className="h-8 w-48 bg-muted animate-pulse rounded" />
              <div className="h-12 w-full bg-muted animate-pulse rounded" />
              <div className="flex gap-4">
                <div className="h-6 w-24 bg-muted animate-pulse rounded" />
                <div className="h-6 w-20 bg-muted animate-pulse rounded" />
                <div className="h-6 w-16 bg-muted animate-pulse rounded" />
              </div>
              <div className="flex gap-4">
                <div className="h-9 w-16 bg-muted animate-pulse rounded" />
                <div className="h-9 w-20 bg-muted animate-pulse rounded" />
                <div className="h-9 w-16 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>

          {/* Sidebar skeleton */}
          <div className="lg:col-span-4 space-y-6">
            <div className="h-64 w-full bg-muted animate-pulse rounded-lg" />
            <div className="h-48 w-full bg-muted animate-pulse rounded-lg" />
            <div className="h-40 w-full bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Error component for when server-side fetching fails
function VideoDetailError({ error }: { error: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="text-7xl mb-6 animate-bounce">😔</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Video Not Found</h2>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          {error}
        </p>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-muted-foreground mt-4">Retrying...</p>
      </div>
    </div>
  )
}

interface VideoDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function VideoDetailPage({ params }: VideoDetailPageProps) {
  try {
    const { id: videoId } = await params

    // Fetch video data server-side for SSR
    console.log(`🔥 SERVER: Fetching video ${videoId} from server-side`)
    const video = await fetchVideo(videoId)

    console.log(`✅ SERVER: Successfully fetched video ${videoId}: "${video?.title}"`)

    return (
      <Suspense fallback={<VideoDetailLoading />}>
        <VideoDetailClient initialVideo={video} />
      </Suspense>
    )
  } catch (error) {
    console.error(`❌ SERVER: Error fetching video:`, error)

    // Return error component if video fetch fails
    return <VideoDetailError error="The video you're looking for doesn't exist or has been removed." />
  }
}
