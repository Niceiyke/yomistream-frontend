"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, Plus, X, AlertCircle, CheckCircle, FileVideo, Youtube } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppHeader } from "@/components/app-header"
import { apiPost } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { useToast } from "@/components/ui/use-toast"

interface ImportResult {
  queued: boolean
  imported?: number
  updated?: number
  skipped?: number
  errors?: string[]
  channels?: string[]
  videos?: string[]
  playlists?: string[]
  file_urls?: string[]
  job_id?: string
}

export default function ImportSourceVideosPage() {
  const [channels, setChannels] = useState<string[]>([])
  const [channelInput, setChannelInput] = useState("")
  const [videos, setVideos] = useState<string[]>([])
  const [videoInput, setVideoInput] = useState("")
  const [playlists, setPlaylists] = useState<string[]>([])
  const [playlistInput, setPlaylistInput] = useState("")
  const [fileUrls, setFileUrls] = useState<string[]>([])
  const [fileUrlInput, setFileUrlInput] = useState("")
  const [activeTab, setActiveTab] = useState("youtube")
  const [runAsync, setRunAsync] = useState(true)
  const [minDuration, setMinDuration] = useState("")
  const [maxDuration, setMaxDuration] = useState("")
  const [publishedAfter, setPublishedAfter] = useState("")
  const [publishedBefore, setPublishedBefore] = useState("")
  const [tagsAny, setTagsAny] = useState<string[]>([])
  const [tagsAll, setTagsAll] = useState<string[]>([])
  const [tagsAnyInput, setTagsAnyInput] = useState("")
  const [tagsAllInput, setTagsAllInput] = useState("")
  const [maxResultsPerChannel, setMaxResultsPerChannel] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { user, signOut } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleSignOut = async () => {
    await signOut()
    router.refresh()
  }

  const addChannel = () => {
    if (channelInput.trim() && !channels.includes(channelInput.trim())) {
      setChannels([...channels, channelInput.trim()])
      setChannelInput("")
    }
  }

  const removeChannel = (index: number) => {
    setChannels(channels.filter((_, i) => i !== index))
  }

  const addVideo = () => {
    if (videoInput.trim() && !videos.includes(videoInput.trim())) {
      setVideos([...videos, videoInput.trim()])
      setVideoInput("")
    }
  }

  const removeVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index))
  }

  const addPlaylist = () => {
    if (playlistInput.trim() && !playlists.includes(playlistInput.trim())) {
      setPlaylists([...playlists, playlistInput.trim()])
      setPlaylistInput("")
    }
  }

  const removePlaylist = (index: number) => {
    setPlaylists(playlists.filter((_, i) => i !== index))
  }

  const addFileUrl = () => {
    if (fileUrlInput.trim() && !fileUrls.includes(fileUrlInput.trim())) {
      setFileUrls([...fileUrls, fileUrlInput.trim()])
      setFileUrlInput("")
    }
  }

  const removeFileUrl = (index: number) => {
    setFileUrls(fileUrls.filter((_, i) => i !== index))
  }

  const addTag = (tagInput: string, setTags: (tags: string[]) => void, tags: string[], setTagInput: (input: string) => void) => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const removeTag = (index: number, setTags: (tags: string[]) => void, tags: string[]) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (channels.length === 0 && videos.length === 0 && playlists.length === 0 && fileUrls.length === 0) {
      setError("At least one channel, video, playlist, or file URL is required")
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const payload: any = {
        run_async: runAsync,
        ...(minDuration && { min_duration: parseInt(minDuration) }),
        ...(maxDuration && { max_duration: parseInt(maxDuration) }),
        ...(publishedAfter && { published_after: publishedAfter }),
        ...(publishedBefore && { published_before: publishedBefore }),
        ...(tagsAny.length > 0 && { tags_any: tagsAny }),
        ...(tagsAll.length > 0 && { tags_all: tagsAll }),
      }

      // Add sources based on active tab
      if (activeTab === "youtube") {
        if (channels.length > 0) payload.channels = channels
        if (videos.length > 0) payload.videos = videos
        if (playlists.length > 0) payload.playlists = playlists
        payload.max_results_per_channel = maxResultsPerChannel ? parseInt(maxResultsPerChannel) : undefined
      } else if (activeTab === "files" && fileUrls.length > 0) {
        payload.file_urls = fileUrls
      } else {
        // Mixed sources
        if (channels.length > 0) payload.channels = channels
        if (videos.length > 0) payload.videos = videos
        if (playlists.length > 0) payload.playlists = playlists
        if (fileUrls.length > 0) payload.file_urls = fileUrls
        payload.max_results_per_channel = maxResultsPerChannel ? parseInt(maxResultsPerChannel) : undefined
      }

      const token = await getAccessTokenCached()
      const headers: Record<string, string> = {}
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await apiPost("/api/v1/admin/source-videos/import", payload, { headers })
      setResult(response)

      if (response.queued) {
        toast({
          title: "Import Started",
          description: "Your import job has been queued and will run in the background.",
        })
      } else {
        toast({
          title: "Import Completed",
          description: `Imported ${response.imported || 0}, Updated ${response.updated || 0} videos.`,
        })
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.detail || err.message || "Failed to import source videos"
      setError(errorMessage)
      toast({
        title: "Import Failed",
        description: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setChannels([])
    setChannelInput("")
    setVideos([])
    setVideoInput("")
    setPlaylists([])
    setPlaylistInput("")
    setFileUrls([])
    setFileUrlInput("")
    setActiveTab("youtube")
    setRunAsync(true)
    setMinDuration("")
    setMaxDuration("")
    setPublishedAfter("")
    setPublishedBefore("")
    setTagsAny([])
    setTagsAll([])
    setTagsAnyInput("")
    setTagsAllInput("")
    setMaxResultsPerChannel("")
    setResult(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        favorites={[]}
        onSignOut={handleSignOut}
        showActions={false}
        backButton={{
          label: "Back to Source Videos",
          href: "/source-videos",
          scroll: false
        }}
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 flex items-center justify-center gap-3">
            <Upload className="w-8 h-8 text-primary" />
            Import Source Videos
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Import videos from YouTube channels, single videos, playlists, or direct file URLs into your source video library.
            Videos will be automatically processed and made available for trimming and content creation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Import Source Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="youtube" className="flex items-center gap-2">
                <Youtube className="w-4 h-4" />
                YouTube Channels
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-2">
                <FileVideo className="w-4 h-4" />
                File URLs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="youtube">
              {/* YouTube Sources - Multiple sections */}
              <div className="space-y-6">
                {/* YouTube Channels Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">YouTube Channels</CardTitle>
                    <CardDescription>
                      Enter YouTube channel IDs, handles (@username), or URLs. One per line or separated by commas.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. UCxxxxx, @channelname, https://youtube.com/@channelname"
                        value={channelInput}
                        onChange={(e) => setChannelInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChannel())}
                        className="flex-1"
                      />
                      <Button type="button" onClick={addChannel} variant="outline">
                        <Plus className="w-4 h-4" />
                        Add
                      </Button>
                    </div>

                    {channels.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {channels.map((channel, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {channel}
                            <button
                              type="button"
                              onClick={() => removeChannel(index)}
                              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* YouTube Videos Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Single YouTube Videos</CardTitle>
                    <CardDescription>
                      Enter individual YouTube video IDs or URLs. One per line.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. HdKU1aXxD5w or https://www.youtube.com/watch?v=HdKU1aXxD5w"
                        value={videoInput}
                        onChange={(e) => setVideoInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVideo())}
                        className="flex-1"
                      />
                      <Button type="button" onClick={addVideo} variant="outline">
                        <Plus className="w-4 h-4" />
                        Add
                      </Button>
                    </div>

                    {videos.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {videos.map((video, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {video}
                            <button
                              type="button"
                              onClick={() => removeVideo(index)}
                              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* YouTube Playlists Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">YouTube Playlists</CardTitle>
                    <CardDescription>
                      Enter YouTube playlist IDs or URLs. One per line.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. PLxxxxx or https://www.youtube.com/playlist?list=PLxxxxx"
                        value={playlistInput}
                        onChange={(e) => setPlaylistInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPlaylist())}
                        className="flex-1"
                      />
                      <Button type="button" onClick={addPlaylist} variant="outline">
                        <Plus className="w-4 h-4" />
                        Add
                      </Button>
                    </div>

                    {playlists.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {playlists.map((playlist, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {playlist}
                            <button
                              type="button"
                              onClick={() => removePlaylist(index)}
                              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="files">
              {/* File URLs Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">File URLs</CardTitle>
                  <CardDescription>
                    Enter direct URLs to video files. Supported formats: MP4, AVI, MOV, WMV, FLV, WebM, MKV, MP3, WAV, OGG, M4A, FLAC.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. https://example.com/videos/sermon.mp4"
                      value={fileUrlInput}
                      onChange={(e) => setFileUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFileUrl())}
                      className="flex-1"
                    />
                    <Button type="button" onClick={addFileUrl} variant="outline">
                      <Plus className="w-4 h-4" />
                      Add
                    </Button>
                  </div>

                  {fileUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {fileUrls.map((url, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1 max-w-xs">
                          <span className="truncate">{url}</span>
                          <button
                            type="button"
                            onClick={() => removeFileUrl(index)}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 flex-shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Filters Section - Only for YouTube */}
          {activeTab === "youtube" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Filters (Optional)</CardTitle>
                <CardDescription>
                  Apply filters to limit which videos are imported from the specified channels.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Duration Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minDuration">Minimum Duration (seconds)</Label>
                    <Input
                      id="minDuration"
                      type="number"
                      placeholder="e.g. 300 (5 minutes)"
                      value={minDuration}
                      onChange={(e) => setMinDuration(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxDuration">Maximum Duration (seconds)</Label>
                    <Input
                      id="maxDuration"
                      type="number"
                      placeholder="e.g. 3600 (1 hour)"
                      value={maxDuration}
                      onChange={(e) => setMaxDuration(e.target.value)}
                    />
                  </div>
                </div>

                {/* Date Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="publishedAfter">Published After (YYYY-MM-DD)</Label>
                    <Input
                      id="publishedAfter"
                      type="date"
                      value={publishedAfter}
                      onChange={(e) => setPublishedAfter(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="publishedBefore">Published Before (YYYY-MM-DD)</Label>
                    <Input
                      id="publishedBefore"
                      type="date"
                      value={publishedBefore}
                      onChange={(e) => setPublishedBefore(e.target.value)}
                    />
                  </div>
                </div>

                {/* Tags Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Tags (Any) - Match any of these tags</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Add tag..."
                        value={tagsAnyInput}
                        onChange={(e) => setTagsAnyInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(tagsAnyInput, setTagsAny, tagsAny, setTagsAnyInput))}
                      />
                      <Button
                        type="button"
                        onClick={() => addTag(tagsAnyInput, setTagsAny, tagsAny, setTagsAnyInput)}
                        variant="outline"
                        size="sm"
                      >
                        Add
                      </Button>
                    </div>
                    {tagsAny.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tagsAny.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(index, setTagsAny, tagsAny)}
                              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                            >
                              <X className="w-2 h-2" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Tags (All) - Match all of these tags</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Add tag..."
                        value={tagsAllInput}
                        onChange={(e) => setTagsAllInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(tagsAllInput, setTagsAll, tagsAll, setTagsAllInput))}
                      />
                      <Button
                        type="button"
                        onClick={() => addTag(tagsAllInput, setTagsAll, tagsAll, setTagsAllInput)}
                        variant="outline"
                        size="sm"
                      >
                        Add
                      </Button>
                    </div>
                    {tagsAll.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tagsAll.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(index, setTagsAll, tagsAll)}
                              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                            >
                              <X className="w-2 h-2" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Max Results */}
                <div>
                  <Label htmlFor="maxResults">Max Results Per Channel</Label>
                  <Input
                    id="maxResults"
                    type="number"
                    placeholder="e.g. 50 (leave empty for all)"
                    value={maxResultsPerChannel}
                    onChange={(e) => setMaxResultsPerChannel(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Import Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="runAsync"
                  checked={runAsync}
                  onCheckedChange={(checked) => setRunAsync(checked as boolean)}
                />
                <Label htmlFor="runAsync" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Run asynchronously (recommended for large imports)
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                When enabled, the import will run in the background. You can check the status later in the admin panel.
              </p>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Result Display */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Import {result.queued ? "Queued" : "Completed"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.queued ? (
                  <div>
                    <p className="text-muted-foreground">
                      Your import job has been queued with ID: <code className="bg-muted px-1 rounded">{result.job_id}</code>
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      You can check the status in the admin panel or continue with other tasks.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">{result.imported || 0}</div>
                        <div className="text-sm text-muted-foreground">Imported</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{result.updated || 0}</div>
                        <div className="text-sm text-muted-foreground">Updated</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-600">{result.skipped || 0}</div>
                        <div className="text-sm text-muted-foreground">Skipped</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">{result.errors?.length || 0}</div>
                        <div className="text-sm text-muted-foreground">Errors</div>
                      </div>
                    </div>

                    {result.errors && result.errors.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-destructive mb-2">Errors:</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {result.errors.map((err, index) => (
                            <li key={index}>• {err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              type="submit"
              disabled={isLoading || (activeTab === "youtube" && channels.length === 0 && videos.length === 0 && playlists.length === 0) || (activeTab === "files" && fileUrls.length === 0)}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  {runAsync ? "Queueing Import..." : "Importing..."}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Start Import
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={isLoading}
            >
              Reset Form
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
