import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  startYoutubeSync,
  getYoutubeSyncStatus,
  getYoutubeSyncedVideos,
  type GetVideosParams,
} from '@/lib/api/youtube-sync'
import type {
  StartSyncRequest,
  StartSyncResponse,
  SyncStatus,
  PaginatedVideos,
} from '@/lib/types/youtube-sync'

const qk = {
  status: ['youtube-sync', 'status'] as const,
  videos: (params: GetVideosParams) => ['youtube-sync', 'videos', params] as const,
}

export function useStartSync() {
  const qc = useQueryClient()
  return useMutation<StartSyncResponse, Error, StartSyncRequest>({
    mutationFn: startYoutubeSync,
    onSuccess: () => {
      // refresh status immediately after starting
      qc.invalidateQueries({ queryKey: qk.status })
    },
  })
}

export function useSyncStatus(options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery<SyncStatus, Error>({
    queryKey: qk.status,
    queryFn: getYoutubeSyncStatus,
    refetchInterval: options?.refetchInterval ?? 5000,
    enabled: options?.enabled ?? true,
  })
}

export function useVideos(params: GetVideosParams, options?: { enabled?: boolean }) {
  return useQuery<PaginatedVideos, Error>({
    queryKey: qk.videos(params),
    queryFn: () => getYoutubeSyncedVideos(params),
    enabled: options?.enabled ?? true,
    staleTime: 15_000,
  })
}
