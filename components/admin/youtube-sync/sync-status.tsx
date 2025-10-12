'use client'

import { Card } from '@/components/ui/card'
import { useSyncStatus } from '@/lib/hooks/use-youtube-sync'

export function SyncStatus() {
  const { data, isLoading, isError, error } = useSyncStatus({ refetchInterval: 5000 })
  const lastSync = data?.last_sync_at ? new Date(data.last_sync_at) : null

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="p-6">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Last Sync</h3>
          {isLoading ? (
            <>
              <p className="text-sm text-muted-foreground">Loading...</p>
            </>
          ) : isError ? (
            <p className="text-sm text-destructive">{error?.message}</p>
          ) : lastSync ? (
            <>
              <p className="text-2xl font-bold">{lastSync.toLocaleDateString()}</p>
              <p className="text-sm text-muted-foreground">{lastSync.toLocaleTimeString()}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No syncs yet</p>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Active Jobs</h3>
          <p className="text-2xl font-bold">{data?.active_jobs ?? 0}</p>
          <p className="text-sm text-muted-foreground">Currently running</p>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Completed Today</h3>
          <p className="text-2xl font-bold">{data?.completed_today ?? 0}</p>
          <p className="text-sm text-muted-foreground">Successful syncs</p>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Failed Today</h3>
          <p className="text-2xl font-bold">{data?.failed_today ?? 0}</p>
          <p className="text-sm text-muted-foreground">Sync errors</p>
        </div>
      </Card>
    </div>
  )
}

