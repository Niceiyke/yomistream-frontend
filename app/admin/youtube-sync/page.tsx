// app/admin/youtube-sync/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function YoutubeSyncPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin?tab=youtube-sync')
  }, [router])

  return (
    <div className="p-6 text-muted-foreground">
      Redirecting to unified Admin → YouTube Sync...
    </div>
  )
}