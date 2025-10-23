"use client"

import React, { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { API_BASE_URL, apiGet, apiPost, apiPut, apiDelete } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plus, Edit, Trash2, Search, Filter, Mic } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Video {
  id: string
  title: string
  description?: string
  youtube_id: string
  video_url: string
  preacher?: { id: string; name: string }
  topic?: string
  duration?: number
  tags?: string[]
  created_at: string
}

interface Preacher {
  id: string
  name: string
  bio?: string
  image_url?: string
}

export function AdminContentManager() {
  const [activeTab, setActiveTab] = useState("videos")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [selectedPreacher, setSelectedPreacher] = useState<Preacher | null>(null)
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false)
  const [isPreacherDialogOpen, setIsPreacherDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteType, setDeleteType] = useState<"video" | "preacher">("video")
  const [deleteId, setDeleteId] = useState<string>("")

  const queryClient = useQueryClient()
  const { toast } = useToast()

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await getAccessTokenCached()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Fetch videos
  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ["admin", "videos"],
    queryFn: async () => {
      const headers = await authHeaders()
      return apiGet("/api/v1/admin/videos", { headers })
    },
  })

  // Fetch preachers
  const { data: preachersData, isLoading: preachersLoading } = useQuery({
    queryKey: ["admin", "preachers"],
    queryFn: async () => {
      const headers = await authHeaders()
      return apiGet("/api/v1/admin/preachers", { headers })
    },
  })

  const videos = videosData || []
  const preachers = preachersData || []

  // Filter videos based on search term
  const filteredVideos = videos.filter((video: Video) =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    video.preacher?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Filter preachers based on search term
  const filteredPreachers = preachers.filter((preacher: Preacher) =>
    preacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    preacher.bio?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEditVideo = (video: Video) => {
    setSelectedVideo(video)
    setIsVideoDialogOpen(true)
  }

  const handleEditPreacher = (preacher: Preacher) => {
    setSelectedPreacher(preacher)
    setIsPreacherDialogOpen(true)
  }

  const handleDelete = (type: "video" | "preacher", id: string) => {
    setDeleteType(type)
    setDeleteId(id)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    try {
      const headers = await authHeaders()
      const endpoint = deleteType === "video" ? `/api/v1/admin/videos/${deleteId}` : `/api/v1/admin/preachers/${deleteId}`

      await apiDelete(endpoint, { headers })

      queryClient.invalidateQueries({ queryKey: ["admin", deleteType === "video" ? "videos" : "preachers"] })

      toast({
        title: "Success",
        description: `${deleteType === "video" ? "Video" : "Preacher"} deleted successfully.`,
      })

      setIsDeleteDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete ${deleteType}.`,
      })
    }
  }

  const handleSaveVideo = async (videoData: any) => {
    try {
      const headers = await authHeaders()
      const isEditing = selectedVideo !== null

      if (isEditing) {
        await apiPut(`/api/v1/admin/videos/${selectedVideo.id}`, videoData, { headers })
      } else {
        await apiPost("/api/v1/admin/videos", videoData, { headers })
      }

      queryClient.invalidateQueries({ queryKey: ["admin", "videos"] })

      toast({
        title: "Success",
        description: `Video ${isEditing ? "updated" : "created"} successfully.`,
      })

      setIsVideoDialogOpen(false)
      setSelectedVideo(null)
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${selectedVideo ? "update" : "create"} video.`,
      })
    }
  }

  const handleTranscribeVideo = async (video: Video) => {
    try {
      const headers = await authHeaders()
      const youtubeUrl = video.video_url ? video.video_url : `https://www.youtube.com/watch?v=${video.youtube_id}`

      console.log("Transcribing video:", video.id, "URL:", youtubeUrl)

      // Send as form data since the backend expects Form parameters
      const formData = new FormData()
      formData.append('audio_url', youtubeUrl)
      formData.append('video_id', video.id)

      console.log("Content manager transcription - audio_url:", youtubeUrl, "video_id:", video.id)
      console.log("Content manager transcription Form data:", formData)

      const response = await fetch(`${API_BASE_URL}/api/v1/transcription/transcribe-url`, {
        method: 'POST',
        headers: {
          ...headers,
          // Don't set Content-Type, let browser set it for FormData
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      toast({
        title: "Success",
        description: "Video sent for transcription successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send video for transcription.",
      })
    }
  }

  const handleSavePreacher = async (preacherData: any) => {
    try {
      const headers = await authHeaders()
      const isEditing = selectedPreacher !== null

      if (isEditing) {
        await apiPut(`/api/v1/admin/preachers/${selectedPreacher.id}`, preacherData, { headers })
      } else {
        await apiPost("/api/v1/admin/preachers", preacherData, { headers })
      }

      queryClient.invalidateQueries({ queryKey: ["admin", "preachers"] })

      toast({
        title: "Success",
        description: `Preacher ${isEditing ? "updated" : "created"} successfully.`,
      })

      setIsPreacherDialogOpen(false)
      setSelectedPreacher(null)
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${selectedPreacher ? "update" : "create"} preacher.`,
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Content Management</h1>
          <p className="text-muted-foreground">
            Manage videos, preachers, and other platform content.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setSelectedVideo(null)
              setIsVideoDialogOpen(true)
            }}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Video
          </Button>
          <Button
            onClick={() => {
              setSelectedPreacher(null)
              setIsPreacherDialogOpen(true)
            }}
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Preacher
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted border-border">
          <TabsTrigger value="videos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Videos ({filteredVideos.length})
          </TabsTrigger>
          <TabsTrigger value="preachers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Preachers ({filteredPreachers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-4">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle>Videos</CardTitle>
              <CardDescription>
                Manage video content and metadata
              </CardDescription>
            </CardHeader>
            <CardContent>
              {videosLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading videos...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Title</TableHead>
                      <TableHead>Preacher</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVideos.map((video: Video) => (
                      <TableRow key={video.id} className="border-border">
                        <TableCell className="font-medium">{video.title}</TableCell>
                        <TableCell>{video.preacher?.name || "Unknown"}</TableCell>
                        <TableCell>{video.topic || "—"}</TableCell>
                        <TableCell>{new Date(video.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditVideo(video)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTranscribeVideo(video)}
                              title="Send for transcription"
                            >
                              <Mic className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete("video", video.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preachers" className="space-y-4">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle>Preachers</CardTitle>
              <CardDescription>
                Manage preacher profiles and information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {preachersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading preachers...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Name</TableHead>
                      <TableHead>Bio</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPreachers.map((preacher: Preacher) => (
                      <TableRow key={preacher.id} className="border-border">
                        <TableCell className="font-medium">{preacher.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{preacher.bio || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPreacher(preacher)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete("preacher", preacher.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Video Dialog */}
      <VideoDialog
        video={selectedVideo}
        isOpen={isVideoDialogOpen}
        onClose={() => {
          setIsVideoDialogOpen(false)
          setSelectedVideo(null)
        }}
        onSave={handleSaveVideo}
        preachers={preachers}
      />

      {/* Preacher Dialog */}
      <PreacherDialog
        preacher={selectedPreacher}
        isOpen={isPreacherDialogOpen}
        onClose={() => {
          setIsPreacherDialogOpen(false)
          setSelectedPreacher(null)
        }}
        onSave={handleSavePreacher}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {deleteType}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Video Dialog Component
function VideoDialog({ video, isOpen, onClose, onSave, preachers }: {
  video: Video | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  preachers: Preacher[]
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    youtube_id: "",
    preacher_id: "",
    topic: "",
    duration: 0,
    tags: "",
    start_time_seconds: null as number | null,
    end_time_seconds: null as number | null,
    video_url: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update form when video changes
  React.useEffect(() => {
    if (video) {
      setFormData({
        title: video.title || "",
        description: video.description || "",
        youtube_id: video.youtube_id || "",
        preacher_id: video.preacher?.id || "",
        topic: video.topic || "",
        duration: video.duration || 0,
        tags: video.tags?.join(", ") || "",
        start_time_seconds: null,
        end_time_seconds: null,
        video_url: "",
      })
    } else {
      setFormData({
        title: "",
        description: "",
        youtube_id: "",
        preacher_id: "",
        topic: "",
        duration: 0,
        tags: "",
        start_time_seconds: null,
        end_time_seconds: null,
        video_url: "",
      })
    }
  }, [video])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const submitData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(",").map(tag => tag.trim()) : [],
        duration: Number(formData.duration) || 0,
      }

      await onSave(submitData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{video ? "Edit Video" : "Add New Video"}</DialogTitle>
          <DialogDescription>
            {video ? "Update video information" : "Create a new video entry"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtube_id">YouTube ID *</Label>
              <Input
                id="youtube_id"
                value={formData.youtube_id}
                onChange={(e) => setFormData({ ...formData, youtube_id: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preacher">Preacher</Label>
              <Select
                value={formData.preacher_id}
                onValueChange={(value) => setFormData({ ...formData, preacher_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select preacher" />
                </SelectTrigger>
                <SelectContent>
                  {preachers.map((preacher) => (
                    <SelectItem key={preacher.id} value={preacher.id}>
                      {preacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="sermon, faith, christian"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {video ? "Update" : "Create"} Video
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Preacher Dialog Component
function PreacherDialog({ preacher, isOpen, onClose, onSave }: {
  preacher: Preacher | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
}) {
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    image_url: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update form when preacher changes
  React.useEffect(() => {
    if (preacher) {
      setFormData({
        name: preacher.name || "",
        bio: preacher.bio || "",
        image_url: preacher.image_url || "",
      })
    } else {
      setFormData({
        name: "",
        bio: "",
        image_url: "",
      })
    }
  }, [preacher])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSave(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{preacher ? "Edit Preacher" : "Add New Preacher"}</DialogTitle>
          <DialogDescription>
            {preacher ? "Update preacher information" : "Create a new preacher profile"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Profile Image URL</Label>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {preacher ? "Update" : "Create"} Preacher
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
