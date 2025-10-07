"use client"

import React, { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { apiGet, apiPost, apiDelete } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { X, Loader2, ExternalLink } from "lucide-react"

interface JobStatus {
  job_id: string
  status: string
  progress: string
  video_id?: string | null
  video_url?: string | null
  error?: string | null
  created_at: string
  completed_at?: string | null
}

function formatDuration(totalSeconds?: number) {
  if (typeof totalSeconds !== "number" || Number.isNaN(totalSeconds)) return "Unknown length"
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`
  }
  return `${seconds}s`
}

function formatSecondsToTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const hh = String(hours).padStart(2, "0")
  const mm = String(minutes).padStart(2, "0")
  const ss = String(seconds).padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}

interface JobsResponse {
  jobs: JobStatus[]
}

interface SourceVideoDetails {
  id: string
  source_video_id?: string
  title: string
  description: string
  youtube_url: string
  thumbnail_url?: string
  duration?: number
  channel_name?: string
  tags?: string[]
  published_at?: string
}

export default function AdminClipPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [videoUrl, setVideoUrl] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [categoryId, setCategoryId] = useState("22")
  const [privacyStatus, setPrivacyStatus] = useState("unlisted")
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailMode, setThumbnailMode] = useState<"auto" | "url" | "upload">("auto")
  const [webhookUrl, setWebhookUrl] = useState("")
  const [sourceVideos, setSourceVideos] = useState<SourceVideoDetails[]>([])
  const [isPrefilling, setIsPrefilling] = useState(false)
  const [prefillError, setPrefillError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const playerRef = React.useRef<any>(null)
  const playerContainerRef = React.useRef<HTMLDivElement | null>(null)

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await getAccessTokenCached()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const extractYoutubeId = (url: string): string | null => {
    if (!url) return null
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const parseTimeToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0
    if (/^\d+$/.test(timeStr)) return parseInt(timeStr, 10)
    const parts = timeStr.split(":").map((p) => parseInt(p, 10))
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]
    }
    return parseInt(timeStr, 10) || 0
  }

  const setStartFromPlayer = () => {
    setStartTime(formatSecondsToTimestamp(Math.floor(currentTime)))
  }

  const setEndFromPlayer = () => {
    setEndTime(formatSecondsToTimestamp(Math.floor(currentTime)))
  }

  const jumpToStart = () => {
    const seconds = parseTimeToSeconds(startTime)
    try {
      playerRef.current?.seekTo?.(seconds, true)
      playerRef.current?.playVideo?.()
    } catch {}
  }

  const jumpToEnd = () => {
    const seconds = parseTimeToSeconds(endTime)
    if (seconds > 0) {
      try {
        playerRef.current?.seekTo?.(Math.max(0, seconds - 2), true)
        playerRef.current?.playVideo?.()
      } catch {}
    }
  }

  useEffect(() => {
    const sourceParam = searchParams?.get("source")
    if (!sourceParam) {
      setSourceVideos([])
      return
    }
    const ids = sourceParam.split(",").map((id) => id.trim()).filter(Boolean)
    if (ids.length === 0) {
      setSourceVideos([])
      return
    }
    let cancelled = false
    setIsPrefilling(true)
    setPrefillError(null)
    ;(async () => {
      try {
        const headers = await authHeaders()
        const fetched = await Promise.all(
          ids.map(async (id) => {
            try {
              const data = await apiGet(`/api/admin/source-videos/${encodeURIComponent(id)}`, { headers })
              return data as SourceVideoDetails
            } catch (error) {
              console.error(`Failed to fetch source video ${id}`, error)
              return null
            }
          }),
        )
        if (cancelled) return
        const valid = fetched.filter((item): item is SourceVideoDetails => Boolean(item))
        setSourceVideos(valid)
        if (valid.length === 0) {
          setPrefillError("No metadata found for selected source videos.")
          return
        }
        const primary = valid[0]
        let url = ""
        if (primary.youtube_url) {
          url = primary.youtube_url
          setVideoUrl(primary.youtube_url)
        } else if (primary.source_video_id) {
          url = `https://www.youtube.com/watch?v=${primary.source_video_id}`
          setVideoUrl(url)
        }
        const vidId = extractYoutubeId(url)
        if (vidId) setYoutubeVideoId(vidId)
        if (primary.title) setTitle(primary.title)
        if (primary.description) setDescription(primary.description)
        if (primary.tags && primary.tags.length > 0) setTags(primary.tags)
        if (primary.thumbnail_url) {
          setThumbnailMode("url")
          setThumbnailUrl(primary.thumbnail_url)
        }
        if (typeof primary.duration === "number" && !Number.isNaN(primary.duration) && primary.duration > 0) {
          setStartTime(formatSecondsToTimestamp(0))
          setEndTime(formatSecondsToTimestamp(Math.floor(primary.duration)))
        } else {
          setStartTime("")
          setEndTime("")
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to prefill clip form", error)
          setPrefillError("Unable to load source metadata. You can still fill the form manually.")
        }
      } finally {
        if (!cancelled) setIsPrefilling(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    const vidId = extractYoutubeId(videoUrl)
    if (vidId !== youtubeVideoId) {
      setYoutubeVideoId(vidId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl])

  useEffect(() => {
    if (!youtubeVideoId) return
    let inited = false
    const init = () => {
      if (inited || !playerContainerRef.current || playerRef.current) return
      // @ts-ignore
      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId: youtubeVideoId,
        playerVars: { autoplay: 0, rel: 0, modestbranding: 1, playsinline: 1 },
      })
      inited = true
    }
    // @ts-ignore
    if (typeof window !== "undefined" && window.YT && window.YT.Player) {
      init()
    } else {
      const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
      if (!existing) {
        const script = document.createElement("script")
        script.src = "https://www.youtube.com/iframe_api"
        script.async = true
        document.body.appendChild(script)
      }
      const waitId = window.setInterval(() => {
        // @ts-ignore
        if (typeof window !== "undefined" && window.YT && window.YT.Player) {
          window.clearInterval(waitId)
          init()
        }
      }, 100)
    }
    const pollId = window.setInterval(() => {
      try {
        const t = playerRef.current?.getCurrentTime?.()
        if (typeof t === "number") setCurrentTime(t)
      } catch {}
    }, 500)
    return () => {
      window.clearInterval(pollId)
      try {
        playerRef.current?.destroy?.()
      } catch {}
      playerRef.current = null
    }
  }, [youtubeVideoId])

  useEffect(() => {
    if (!playerRef.current || !youtubeVideoId) return
    try {
      playerRef.current.loadVideoById({ videoId: youtubeVideoId })
    } catch {}
  }, [youtubeVideoId])

  const jobsQuery = useQuery<JobsResponse>({
    queryKey: ["admin", "clip", "jobs"],
    queryFn: async () => {
      return apiGet("/api/clip/jobs", { headers: await authHeaders() })
    },
    // keep previous data while refetching
    staleTime: 5 * 1000,
    // Poll while any job is pending/processing so UI updates automatically
    refetchInterval: (query) => {
      try {
        const data = (query.state as any)?.data as JobsResponse | undefined
        const jobs: JobStatus[] = data?.jobs || []
        const shouldPoll = jobs.some((j) => j.status === "processing" || j.status === "pending")
        return shouldPoll ? 3000 : false
      } catch {
        return false
      }
    },
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    // initial load handled by react-query
  }, [])

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const headers = await authHeaders()
      let created

      // Check if we need to use FormData (for file upload)
      if (thumbnailMode === "upload" && thumbnailFile) {
        const formData = new FormData()
        formData.append("video_url", videoUrl)
        formData.append("start_time", startTime)
        formData.append("end_time", endTime)
        formData.append("title", title || "Clipped Video")
        formData.append("description", description || "This is a clipped segment.")
        formData.append("tags", JSON.stringify(tags.length > 0 ? tags : ["clip"]))
        formData.append("category_id", categoryId)
        formData.append("privacy_status", privacyStatus)
        formData.append("thumbnail", thumbnailFile)
        if (webhookUrl) formData.append("webhook_url", webhookUrl)

        // Use fetch directly for FormData
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/clip`, {
          method: "POST",
          headers: headers,
          body: formData,
        })
        if (!response.ok) throw new Error("Upload failed")
        created = await response.json()
      } else {
        // Use regular JSON payload
        const payload: any = {
          video_url: videoUrl,
          start_time: startTime,
          end_time: endTime,
          title: title || "Clipped Video",
          description: description || "This is a clipped segment.",
          tags: tags.length > 0 ? tags : ["clip"],
          category_id: categoryId,
          privacy_status: privacyStatus,
        }
        if (thumbnailMode === "url" && thumbnailUrl) payload.thumbnail_url = thumbnailUrl
        if (webhookUrl) payload.webhook = { url: webhookUrl }
        created = await apiPost("/api/clip", payload, { headers })
      }

      // Optimistically insert the returned job into the cache so it appears immediately
      try {
        queryClient.setQueryData(["admin", "clip", "jobs"], (old: any) => {
          const existing = old?.jobs || []
          return { jobs: [created, ...existing] }
        })
      } catch {}
      // Kick off a revalidation (will poll automatically if job is processing)
      await queryClient.invalidateQueries({ queryKey: ["admin", "clip", "jobs"] })
      // clear form
      setVideoUrl("")
      setStartTime("")
      setEndTime("")
      setTitle("")
      setDescription("")
      setTags([])
      setTagInput("")
      setThumbnailUrl("")
      setThumbnailFile(null)
      setThumbnailMode("auto")
    } catch (err) {
      console.error("Create clip failed", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (jobId: string) => {
    try {
      await apiDelete(`/api/clip/job/${jobId}`, { headers: await authHeaders() })
      await queryClient.invalidateQueries({ queryKey: ["admin", "clip", "jobs"] })
    } catch (err) {
      console.error("Delete job failed", err)
    }
  }

  const jobs: JobStatus[] = (jobsQuery.data?.jobs ?? []) as JobStatus[]

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Clip Jobs</h1>
          <div className="text-muted-foreground">Create and monitor clipping jobs</div>
        </div>

        {prefillError && (
          <div className="mb-4 text-sm text-red-300 bg-red-950/40 border border-red-700/40 rounded-md px-4 py-2">
            {prefillError}
          </div>
        )}

        {isPrefilling && (
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Prefilling from source selection
              </CardTitle>
              <CardDescription className="text-gray-300">
                Fetching metadata from the selected AIke channel videos.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {sourceVideos.length > 0 && (
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Selected Source Videos</CardTitle>
              <CardDescription className="text-gray-300">
                Review the context for the clip. Adjust start/end times below as needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sourceVideos.map((video) => (
                <div key={video.source_video_id ?? video.id} className="flex gap-4 border border-white/10 rounded-lg p-4">
                  <img
                    src={video.thumbnail_url || "/placeholder.svg?height=120&width=160"}
                    alt={video.title}
                    className="w-40 h-24 object-cover rounded-md"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-foreground font-semibold text-lg line-clamp-2">{video.title}</h3>
                      {video.youtube_url && (
                        <a
                          href={video.youtube_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-purple-300 hover:text-purple-200 inline-flex items-center gap-1"
                        >
                          Watch
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-3">{video.description}</div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {video.channel_name && <span className="bg-white/10 px-2 py-1 rounded">{video.channel_name}</span>}
                      {typeof video.duration === "number" && (
                        <span className="bg-white/10 px-2 py-1 rounded">{formatDuration(video.duration)}</span>
                      )}
                      {video.published_at && (
                        <span className="bg-white/10 px-2 py-1 rounded">
                          Published {new Date(video.published_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {video.tags && video.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {video.tags.slice(0, 5).map((tag) => (
                          <Badge key={tag} className="bg-secondary/20 text-secondary-foreground text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {youtubeVideoId && (
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-foreground">Video Preview & Time Selection</CardTitle>
              <CardDescription className="text-muted-foreground">
                Watch the video and use the controls to set precise start/end times for your clip.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-black rounded-md overflow-hidden">
                <div ref={playerContainerRef} className="w-full h-full" />
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>Current time: {formatSecondsToTimestamp(Math.floor(currentTime))}</div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" className="border-border hover:bg-accent" onClick={setStartFromPlayer}>
                    Set Start
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="border-border hover:bg-accent" onClick={setEndFromPlayer}>
                    Set End
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={jumpToStart}>
                  Jump to Start
                </Button>
                <Button type="button" size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={jumpToEnd}>
                  Jump to End
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">Create YouTube-Ready Clip</CardTitle>
            <CardDescription className="text-muted-foreground">Configure all metadata for a professional YouTube upload</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              {/* Video Source Section */}
              <div className="space-y-3 pb-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Video Source</h3>
                <div>
                  <Label className="text-foreground">Video URL *</Label>
                  <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="bg-input border-border" placeholder="https://youtube.com/watch?v=..." required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-foreground">Start Time * (e.g. 00:01:30 or seconds)</Label>
                    <Input value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-input border-border" placeholder="00:01:30" required />
                  </div>
                  <div>
                    <Label className="text-foreground">End Time *</Label>
                    <Input value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-input border-border" placeholder="00:02:30" required />
                  </div>
                </div>
              </div>

              {/* YouTube Metadata Section */}
              <div className="space-y-3 pb-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">YouTube Metadata</h3>
                <div>
                  <Label className="text-foreground">Title *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-input border-border" placeholder="Enter a compelling video title" required />
                  <p className="text-xs text-muted-foreground mt-1">Max 100 characters recommended</p>
                </div>
                <div>
                  <Label className="text-foreground">Description *</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-input border-border min-h-[100px]" placeholder="Describe your video content, include relevant links and timestamps..." required />
                  <p className="text-xs text-muted-foreground mt-1">Max 5000 characters</p>
                </div>
                <div>
                  <Label className="text-foreground">Tags</Label>
                  <div className="flex gap-2">
                    <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())} className="bg-input border-border" placeholder="Add a tag and press Enter" />
                    <Button type="button" onClick={handleAddTag} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">Add</Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag) => (
                        <Badge key={tag} className="bg-primary text-primary-foreground flex items-center gap-1">
                          {tag}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Add relevant keywords to help viewers find your video</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-foreground">Category</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="1">Film & Animation</SelectItem>
                        <SelectItem value="2">Autos & Vehicles</SelectItem>
                        <SelectItem value="10">Music</SelectItem>
                        <SelectItem value="15">Pets & Animals</SelectItem>
                        <SelectItem value="17">Sports</SelectItem>
                        <SelectItem value="19">Travel & Events</SelectItem>
                        <SelectItem value="20">Gaming</SelectItem>
                        <SelectItem value="22">People & Blogs</SelectItem>
                        <SelectItem value="23">Comedy</SelectItem>
                        <SelectItem value="24">Entertainment</SelectItem>
                        <SelectItem value="25">News & Politics</SelectItem>
                        <SelectItem value="26">Howto & Style</SelectItem>
                        <SelectItem value="27">Education</SelectItem>
                        <SelectItem value="28">Science & Technology</SelectItem>
                        <SelectItem value="29">Nonprofits & Activism</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-foreground">Privacy Status</Label>
                    <Select value={privacyStatus} onValueChange={setPrivacyStatus}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="unlisted">Unlisted</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Thumbnail Section */}
              <div className="space-y-3 pb-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Thumbnail</h3>
                
                {/* Thumbnail Mode Selector */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => setThumbnailMode("auto")}
                    className={`flex-1 ${thumbnailMode === "auto" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"} hover:opacity-90`}
                  >
                    Auto-Extract
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setThumbnailMode("url")}
                    className={`flex-1 ${thumbnailMode === "url" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"} hover:opacity-90`}
                  >
                    URL
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setThumbnailMode("upload")}
                    className={`flex-1 ${thumbnailMode === "upload" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"} hover:opacity-90`}
                  >
                    Upload File
                  </Button>
                </div>

                {/* Auto Mode Info */}
                {thumbnailMode === "auto" && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-3">
                    <p className="text-xs text-blue-300">
                      💡 <strong>Auto-generated:</strong> A thumbnail will be automatically extracted from your video at the 3-second mark.
                    </p>
                  </div>
                )}

                {/* URL Mode */}
                {thumbnailMode === "url" && (
                  <div>
                    <Label className="text-foreground">Thumbnail URL</Label>
                    <Input 
                      value={thumbnailUrl} 
                      onChange={(e) => setThumbnailUrl(e.target.value)} 
                      className="bg-input border-border" 
                      placeholder="https://example.com/thumbnail.jpg"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">Recommended: 1280x720px, max 2MB (JPG, PNG)</p>
                  </div>
                )}

                {/* Upload Mode */}
                {thumbnailMode === "upload" && (
                  <div>
                    <Label className="text-foreground">Upload Thumbnail</Label>
                    <Input 
                      type="file" 
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                      className="bg-input border-border file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      required
                    />
                    {thumbnailFile && (
                      <p className="text-xs text-primary mt-1">✓ Selected: {thumbnailFile.name} ({(thumbnailFile.size / 1024).toFixed(1)} KB)</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Recommended: 1280x720px, max 2MB (JPG, PNG)</p>
                  </div>
                )}
              </div>

              {/* Advanced Options Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Webhook (Optional)</h3>
                <div>
                  <Label className="text-foreground">Webhook URL (optional)</Label>
                  <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="bg-input border-border" placeholder="https://your-webhook.com/endpoint" />
                  <p className="text-xs text-muted-foreground">Receive a notification when the clip job completes</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">{isSubmitting ? "Creating Job..." : "Create YouTube Clip"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
              <CardTitle className="text-foreground">Recent Jobs</CardTitle>
              <CardDescription className="text-muted-foreground">Monitor the status of your clip jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                      <TableHead className="text-muted-foreground">Job ID</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Progress</TableHead>
                    <TableHead className="text-muted-foreground">Video</TableHead>
                      <TableHead className="text-muted-foreground">Created</TableHead>
                      <TableHead className="text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => (
                    <TableRow key={j.job_id} className="border-border hover:bg-accent/50">
                      <TableCell>
                        <Badge className="uppercase text-xs" variant={j.status === "completed" ? "secondary" : "outline"}>{j.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{j.progress}{j.error ? ` — ${j.error}` : ""}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {j.video_url ? (
                          <a href={j.video_url} target="_blank" rel="noreferrer" className="text-secondary underline hover:text-secondary/80">Open</a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{new Date(j.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10">Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-foreground">Delete Job</AlertDialogTitle>
                                <div className="text-muted-foreground">Are you sure you want to delete this job? This cannot be undone.</div>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-border hover:bg-accent">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(j.job_id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
