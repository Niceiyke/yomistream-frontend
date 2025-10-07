"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiGet } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowRight, Filter, RefreshCw, Database } from "lucide-react"

interface SourceVideo {
  id: string
  source_video_id: string
  channel_id: string
  channel_name: string
  title: string
  description: string
  duration: number
  published_at: string
  youtube_url: string
  thumbnail_url: string
  tags?: string[]
  language?: string
}

interface SourceVideoResponse {
  items: SourceVideo[]
  total: number
  page: number
  page_size: number
}

interface Filters {
  search: string
  channel: string
  durationBucket: "any" | "short" | "medium" | "long"
  fromDate: string
  toDate: string
  language: string
}

const PAGE_SIZE = 20

export default function SourceSelectionPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Filters>({
    search: "",
    channel: "",
    durationBucket: "any",
    fromDate: "",
    toDate: "",
    language: "",
  })
  const [selectedIds, setSelectedIds] = useState<Record<string, SourceVideo>>({})

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await getAccessTokenCached()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const queryKey = useMemo(
    () => [
      "admin",
      "source-videos",
      page,
      filters.search,
      filters.channel,
      filters.durationBucket,
      filters.fromDate,
      filters.toDate,
      filters.language,
    ],
    [page, filters],
  )

  const fetchSourceVideos = async (): Promise<SourceVideoResponse> => {
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("page_size", String(PAGE_SIZE))
    if (filters.search) params.set("search", filters.search)
    if (filters.channel) params.set("channel", filters.channel)
    if (filters.fromDate) params.set("from", filters.fromDate)
    if (filters.toDate) params.set("to", filters.toDate)
    if (filters.language) params.set("language", filters.language)
    if (filters.durationBucket !== "any") {
      switch (filters.durationBucket) {
        case "short":
          params.set("duration_max", "600")
          break
        case "medium":
          params.set("duration_min", "600")
          params.set("duration_max", "1800")
          break
        case "long":
          params.set("duration_min", "1800")
          break
      }
    }

    const path = `/api/admin/source-videos${params.toString() ? `?${params.toString()}` : ""}`
    const headers = await authHeaders()
    return apiGet(path, { headers })
  }

  const { data, isLoading, isFetching, refetch } = useQuery<SourceVideoResponse>({
    queryKey,
    queryFn: fetchSourceVideos,
    placeholderData: (previousData) => previousData,
  })

  const videos: SourceVideo[] = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1

  const toggleSelect = (video: SourceVideo, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = { ...prev }
      if (checked) {
        next[video.source_video_id || video.id] = video
      } else {
        delete next[video.source_video_id || video.id]
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds({})

  const handleSendToClip = () => {
    const ids = Object.keys(selectedIds)
    if (ids.length === 0) return
    const params = new URLSearchParams()
    params.set("source", ids.join(","))
    router.push(`/admin/clip?${params.toString()}`)
  }

  const resetFilters = () => {
    setFilters({ search: "", channel: "", durationBucket: "any", fromDate: "", toDate: "", language: "" })
    setPage(1)
    clearSelection()
    queryClient.invalidateQueries({ queryKey: ["admin", "source-videos"] })
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Source Video Selection</h1>
            <p className="text-muted-foreground">
              Curate AIke channel videos to feed the clipping pipeline and promote to the main platform.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="border-border hover:bg-accent"
              onClick={() => router.push("/admin/main")}
            >
              <Database className="h-4 w-4 mr-2" />
              Main Dashboard
            </Button>
            <Button
              disabled={Object.keys(selectedIds).length === 0}
              onClick={handleSendToClip}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Send to Clipper
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filters
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Refine the source catalog by channel, date, language, and duration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Search</Label>
                <Input
                  placeholder="Title or description keywords"
                  value={filters.search}
                  onChange={(e) => {
                    setPage(1)
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Channel</Label>
                <Input
                  placeholder="Channel name"
                  value={filters.channel}
                  onChange={(e) => {
                    setPage(1)
                    setFilters((prev) => ({ ...prev, channel: e.target.value }))
                  }}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Language</Label>
                <Input
                  placeholder="e.g. en, es"
                  value={filters.language}
                  onChange={(e) => {
                    setPage(1)
                    setFilters((prev) => ({ ...prev, language: e.target.value }))
                  }}
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Duration</Label>
                <Select
                  value={filters.durationBucket}
                  onValueChange={(value) => {
                    setPage(1)
                    setFilters((prev) => ({ ...prev, durationBucket: value as Filters["durationBucket"] }))
                  }}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="any">Any length</SelectItem>
                    <SelectItem value="short">Short (&lt; 10 min)</SelectItem>
                    <SelectItem value="medium">Medium (10-30 min)</SelectItem>
                    <SelectItem value="long">Long (&gt; 30 min)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">From</Label>
                <Input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => {
                    setPage(1)
                    setFilters((prev) => ({ ...prev, fromDate: e.target.value }))
                  }}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">To</Label>
                <Input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => {
                    setPage(1)
                    setFilters((prev) => ({ ...prev, toDate: e.target.value }))
                  }}
                  className="bg-input border-border"
                />
              </div>
              <div className="flex items-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-border hover:bg-accent"
                  onClick={resetFilters}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  disabled={isFetching}
                  onClick={() => {
                    setPage(1)
                    refetch()
                  }}
                >
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-foreground">Source Catalog</CardTitle>
              <CardDescription className="text-muted-foreground">
                {isFetching ? "Updating catalog..." : `Showing ${videos.length} of ${total} videos`}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground">
                {Object.keys(selectedIds).length} selected
              </Badge>
              {Object.keys(selectedIds).length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={clearSelection}
                >
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="h-6 w-6 mr-2 animate-spin" /> Loading source videos...
              </div>
            ) : videos.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">No videos found. Adjust filters and try again.</div>
            ) : (
              <Tabs defaultValue="table" className="space-y-6">
                <TabsList className="bg-muted border-border">
                  <TabsTrigger value="table" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Table</TabsTrigger>
                  <TabsTrigger value="cards" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Cards</TabsTrigger>
                </TabsList>

                <TabsContent value="table">
                  <Table className="table-fixed min-w-full">
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="text-muted-foreground">Title</TableHead>
                        <TableHead className="text-muted-foreground">Channel</TableHead>
                        <TableHead className="text-muted-foreground">Duration</TableHead>
                        <TableHead className="text-muted-foreground">Published</TableHead>
                        <TableHead className="text-muted-foreground">Tags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {videos.map((video: SourceVideo) => {
                        const key = video.source_video_id || video.id
                        const isChecked = Boolean(selectedIds[key])
                        return (
                          <TableRow key={key} className="border-border hover:bg-accent/50">
                            <TableCell>
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => toggleSelect(video, checked === true)}
                                aria-label="Select video"
                              />
                            </TableCell>
                            <TableCell className="text-foreground">
                              <div className="font-semibold line-clamp-2">{video.title}</div>
                              <div className="text-xs text-muted-foreground line-clamp-2">{video.description}</div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{video.channel_name}</TableCell>
                            <TableCell className="text-muted-foreground">{formatDuration(video.duration)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {video.published_at ? new Date(video.published_at).toLocaleDateString() : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              <div className="flex flex-wrap gap-1">
                                {(video.tags ?? []).slice(0, 3).map((tag: string) => (
                                  <Badge key={tag} variant="secondary" className="bg-secondary/20 text-secondary-foreground text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {video.tags && video.tags.length > 3 && (
                                  <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground text-xs">
                                    +{video.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="cards">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {videos.map((video) => {
                      const key = video.source_video_id || video.id
                      const isChecked = Boolean(selectedIds[key])
                      return (
                        <Card key={key} className="bg-white/5 border-white/10 relative overflow-hidden">
                          <div className="absolute top-3 right-3 z-10">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => toggleSelect(video, checked === true)}
                              aria-label="Select video"
                            />
                          </div>
                          <img
                            src={video.thumbnail_url || "/placeholder.svg?height=180&width=320"}
                            alt={video.title}
                            className="w-full h-44 object-cover"
                          />
                          <CardHeader className="space-y-1">
                            <CardTitle className="text-foreground text-lg line-clamp-2">{video.title}</CardTitle>
                            <CardDescription className="text-muted-foreground flex justify-between text-sm">
                              <span>{video.channel_name}</span>
                              <span>{formatDuration(video.duration)}</span>
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-muted-foreground text-sm line-clamp-3">{video.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {(video.tags ?? []).slice(0, 4).map((tag: string) => (
                                <Badge key={tag} variant="secondary" className="bg-secondary/20 text-secondary-foreground text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Published {video.published_at ? new Date(video.published_at).toLocaleDateString() : "—"}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-muted-foreground">
          <div>
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="border-border hover:bg-accent"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((prev) => prev + 1)}
              className="border-border hover:bg-accent"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDuration(seconds: number | undefined) {
  if (!seconds || Number.isNaN(seconds)) return "—"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (mins >= 60) {
    const hours = Math.floor(mins / 60)
    const remainderMinutes = mins % 60
    return `${hours}h ${remainderMinutes}m`
  }
  return `${mins}m ${secs.toString().padStart(2, "0")}s`
}
