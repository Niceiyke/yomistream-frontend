import { Suspense } from 'react'
import PreacherDetailClient from './preacher-detail-client'
import { fetchPreacher } from '@/lib/server-api'
import { Preacher } from '@/lib/types'

// Page-level cache control - revalidate every 10 minutes for preacher pages
export const revalidate = 600

// Loading component for Suspense fallback
function PreacherDetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header skeleton */}
      <div className="h-16 bg-background/80 backdrop-blur-lg border-b border-border/50" />

      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-8">
          {/* Main content skeleton */}
          <div className="lg:col-span-8 space-y-8">
            {/* Banner skeleton */}
            <div className="aspect-[3/1] w-full bg-muted animate-pulse rounded-lg" />

            {/* Preacher info skeleton */}
            <div className="space-y-6">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 bg-muted animate-pulse rounded-full" />
                <div className="flex-1 space-y-4">
                  <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-6 w-full bg-muted animate-pulse rounded" />
                  <div className="flex gap-4">
                    <div className="h-9 w-20 bg-muted animate-pulse rounded" />
                    <div className="h-9 w-16 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              </div>
            </div>

            {/* Videos skeleton */}
            <div className="space-y-4">
              <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="aspect-video w-full bg-muted animate-pulse rounded" />
                    <div className="h-4 w-full bg-muted animate-pulse rounded" />
                    <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar skeleton */}
          <div className="lg:col-span-4 space-y-6">
            <div className="space-y-4">
              <div className="h-6 w-24 bg-muted animate-pulse rounded" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
                <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4/6 bg-muted animate-pulse rounded" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-6 w-20 bg-muted animate-pulse rounded" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-16 w-full bg-muted animate-pulse rounded" />
                <div className="h-16 w-full bg-muted animate-pulse rounded" />
                <div className="h-16 w-full bg-muted animate-pulse rounded" />
                <div className="h-16 w-full bg-muted animate-pulse rounded" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-6 w-28 bg-muted animate-pulse rounded" />
              <div className="space-y-2">
                <div className="h-8 w-full bg-muted animate-pulse rounded" />
                <div className="h-8 w-full bg-muted animate-pulse rounded" />
                <div className="h-8 w-3/4 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Error component for when server-side fetching fails
function PreacherDetailError({ error }: { error: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="text-7xl mb-6 animate-bounce">🙏</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Preacher Not Found</h2>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          {error}
        </p>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-muted-foreground mt-4">Retrying...</p>
      </div>
    </div>
  )
}

interface PreacherDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function PreacherDetailPage({ params }: PreacherDetailPageProps) {
  try {
    const { id: preacherId } = await params

    // Fetch preacher data server-side for SSR
    console.log(`🔥 SERVER: Fetching preacher ${preacherId} from server-side`)
    const preacher = await fetchPreacher(preacherId)

    console.log(`✅ SERVER: Successfully fetched preacher ${preacherId}: "${preacher?.name}"`)

    return (
      <Suspense fallback={<PreacherDetailLoading />}>
        <PreacherDetailClient initialPreacher={preacher} />
      </Suspense>
    )
  } catch (error) {
    console.error(`❌ SERVER: Error fetching preacher:`, error)

    // Return error component if preacher fetch fails
    return <PreacherDetailError error="The preacher you're looking for doesn't exist or has been removed." />
  }
}
