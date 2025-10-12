'use client'

import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { columns, Video } from './video-columns'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { useVideos } from '@/lib/hooks/use-youtube-sync'

export function VideoList() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'synced' | 'pending' | 'error'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data, isLoading, isError, error, refetch, isFetching } = useVideos({
    query,
    status,
    page,
    pageSize,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Synced Videos</h3>
        <div className="flex gap-2 ml-auto">
          <Input
            placeholder="Search title or channel..."
            value={query}
            onChange={(e) => {
              setPage(1)
              setQuery(e.target.value)
            }}
            className="w-56"
          />
          <select
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={status}
            onChange={(e) => {
              setPage(1)
              setStatus(e.target.value as any)
            }}
          >
            <option value="all">All</option>
            <option value="synced">Synced</option>
            <option value="pending">Pending</option>
            <option value="error">Error</option>
          </select>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading videos...</div>
      ) : isError ? (
        <div className="text-sm text-destructive">{error?.message}</div>
      ) : (
        <>
          <DataTable columns={columns} data={(data?.items as any[]) ?? []} />
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              {data ? `${(data.page - 1) * data.pageSize + 1}-${Math.min(data.page * data.pageSize, data.total)} of ${data.total}` : '0 of 0'}
            </div>
            <div className="flex items-center gap-2">
              <select
                className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={pageSize}
                onChange={(e) => {
                  setPage(1)
                  setPageSize(Number(e.target.value))
                }}
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                disabled={!!data && page >= Math.ceil(data.total / data.pageSize)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
