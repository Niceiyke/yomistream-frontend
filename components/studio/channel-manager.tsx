"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost, apiPut } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Tv,
  Edit,
  Save,
  X,
  Users,
  Eye,
  Video,
  TrendingUp,
  Plus,
  Loader2
} from "lucide-react"
import { toast } from "sonner"

interface Channel {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

interface ChannelStats {
  total_videos: number
  total_views: number
  total_likes: number
}

export function ChannelManager() {
  const [isEditing, setIsEditing] = useState(false)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    description: ""
  })
  const queryClient = useQueryClient()

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await getAccessTokenCached()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Fetch user's channels
  const { data: channels, isLoading: channelsLoading, error: channelsError } = useQuery({
    queryKey: ["channels", "my"],
    queryFn: async () => {
      const headers = await authHeaders()
      return apiGet("/api/channels/my", { headers }) as Promise<Channel[]>
    },
    retry: false
  })

  // State for selected channel
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const selectedChannel = channels?.find(c => c.id === selectedChannelId) || channels?.[0]

  // Fetch stats for selected channel
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["channel", "stats", selectedChannel?.id],
    queryFn: async () => {
      if (!selectedChannel?.id) return null
      const headers = await authHeaders()
      return apiGet(`/api/channels/${selectedChannel.id}/stats`, { headers }) as Promise<ChannelStats>
    },
    enabled: !!selectedChannel?.id
  })

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const headers = await authHeaders()
      return apiPost("/api/channels/", data, { headers })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] })
      toast.success("Channel created successfully!")
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create channel")
    }
  })

  // Update channel mutation
  const updateChannelMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      if (!selectedChannel?.id) throw new Error("No channel selected")
      const headers = await authHeaders()
      return apiPut(`/api/channels/${selectedChannel.id}`, data, { headers })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] })
      setIsEditing(false)
      toast.success("Channel updated successfully!")
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update channel")
    }
  })

  const handleCreateChannel = () => {
    if (!editForm.name.trim()) {
      toast.error("Channel name is required")
      return
    }
    createChannelMutation.mutate(editForm, {
      onSuccess: () => {
        setEditForm({ name: "", description: "" })
        setShowCreateChannel(false)
      }
    })
  }

  const handleUpdateChannel = () => {
    if (!editForm.name.trim()) {
      toast.error("Channel name is required")
      return
    }
    updateChannelMutation.mutate(editForm)
  }

  const startEditing = () => {
    if (selectedChannel) {
      setEditForm({
        name: selectedChannel.name,
        description: selectedChannel.description || ""
      })
    }
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditForm({ name: "", description: "" })
  }

  if (channelsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading channels...</span>
      </div>
    )
  }

  if (channelsError && (!channels || channels.length === 0)) {
    // User doesn't have any channels yet
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Tv className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Create Your First Channel</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome to YomiStream Studio</CardTitle>
            <CardDescription>
              Create your first channel to start sharing Christian content with the world.
              Your channel will be your home base for managing videos, engaging with viewers, and growing your ministry.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel-name">Channel Name *</Label>
              <Input
                id="channel-name"
                placeholder="Enter your channel name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel-description">Description</Label>
              <Textarea
                id="channel-description"
                placeholder="Tell viewers about your channel and what they can expect..."
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>

            <Button
              onClick={handleCreateChannel}
              disabled={createChannelMutation.isPending}
              className="w-full"
            >
              {createChannelMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Channel
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!channels || channels.length === 0) return null

  // selectedChannel should always be defined here since we check channels.length > 0 above
  if (!selectedChannel) return null

  return (
    <div className="space-y-6">
      {/* Channel Selector */}
      {channels.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Tv className="h-5 w-5 text-primary" />
              <span className="font-medium">Select Channel:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {channels.map((ch) => (
                <Button
                  key={ch.id}
                  variant={selectedChannelId === ch.id || (!selectedChannelId && ch === channels[0]) ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedChannelId(ch.id)}
                  className="text-xs"
                >
                  {ch.name}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateChannel(true)}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                New Channel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tv className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">{selectedChannel!.name}</h2>
            <p className="text-sm text-muted-foreground">
              Created {new Date(selectedChannel!.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {channels.length === 1 && (
            <Button onClick={() => setShowCreateChannel(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Another Channel
            </Button>
          )}
          {!isEditing && (
            <Button onClick={startEditing} variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Channel
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Videos</p>
                    <p className="text-2xl font-bold">{stats?.total_videos || 0}</p>
                  </div>
                  <Video className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                    <p className="text-2xl font-bold">{(stats?.total_views || 0).toLocaleString()}</p>
                  </div>
                  <Eye className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Likes</p>
                    <p className="text-2xl font-bold">{(stats?.total_likes || 0).toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Channel Info */}
          <Card>
            <CardHeader>
              <CardTitle>About Your Channel</CardTitle>
              <CardDescription>
                This information appears on your channel page and in search results.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Channel Name</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedChannel.name}</p>
                </div>

                {selectedChannel.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedChannel.description}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    Creator
                  </Badge>
                  <Badge variant="outline">
                    Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Channel Settings</CardTitle>
              <CardDescription>
                Update your channel information and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Channel Name *</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter channel name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your channel..."
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdateChannel}
                      disabled={updateChannelMutation.isPending}
                    >
                      {updateChannelMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={cancelEditing}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Channel Name</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedChannel.name}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedChannel.description || "No description set"}
                    </p>
                  </div>

                  <Button onClick={startEditing} variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Channel Info
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Channel Dialog */}
      <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Channel</DialogTitle>
            <DialogDescription>
              Create a new channel to share different types of Christian content with your audience.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-channel-name">Channel Name *</Label>
              <Input
                id="new-channel-name"
                placeholder="Enter your channel name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-channel-description">Description</Label>
              <Textarea
                id="new-channel-description"
                placeholder="Tell viewers about this channel and what they can expect..."
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreateChannel}
                disabled={createChannelMutation.isPending}
                className="flex-1"
              >
                {createChannelMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Channel
              </Button>
              <Button variant="outline" onClick={() => setShowCreateChannel(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
