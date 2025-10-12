// app/admin/youtube-sync/page.tsx
'use client'

import { YoutubeSyncDashboard } from '@/components/admin/youtube-sync/dashboard'
import { ToastProvider } from '@/components/ui/use-toast'

export default function YoutubeSyncPage() {
  return (
    <ToastProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold">YouTube Sync</h1>
          <p className="text-muted-foreground">
            Synchronize YouTube channels and videos with Yomistream
          </p>
        </div>
        <YoutubeSyncDashboard />
      </div>
    </ToastProvider>
  )
}