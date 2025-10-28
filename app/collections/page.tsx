"use client"

import { useState, useEffect } from "react"
import { Plus, BookOpen, Play, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { VideoPlayer } from "@/components/video-player"
import { AppHeader } from "@/components/app-header"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

interface Collection {
  id: string
  name: string
  description: string | null
  created_at: string
  video_count?: number
}

interface CollectionVideo {
  id: string
  video_id: string
  added_at: string
  video: {
    id: string
    title: string
    youtube_id: string
    duration: number | null
    preacher: {
      name: string
    }
  }
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [collectionVideos, setCollectionVideos] = useState<CollectionVideo[]>([])
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState("")
  const [newCollectionDescription, setNewCollectionDescription] = useState("")

  const supabase = null // Temporarily disabled - collections functionality needs backend API migration
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
      return
    }
    if (!authLoading && user) {
      loadCollections(user.id)
      setLoading(false)
    }
  }, [user, authLoading, router])

  const loadCollections = async (userId: string) => {
    // TODO: Implement collections API when backend is ready
    setCollections([])
    setLoading(false)
  }

  const loadCollectionVideos = async (collectionId: string) => {
    // TODO: Implement collections API when backend is ready
    setCollectionVideos([])
  }

  const createCollection = async () => {
    // TODO: Implement collections API when backend is ready
    console.log("Collections functionality temporarily disabled")
  }

  const deleteCollection = async (collectionId: string) => {
    // TODO: Implement collections API when backend is ready
    console.log("Collections functionality temporarily disabled")
  }

  const removeVideoFromCollection = async (collectionVideoId: string) => {
    // TODO: Implement collections API when backend is ready
    console.log("Collections functionality temporarily disabled")
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-xl">Loading your collections...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        showActions={false}
        backButton={{
          label: "← Back to Home",
          href: "/"
        }}
      />
      
      {/* Page Header with Action */}
      <div className="border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-md">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">My Collections</h1>
                <p className="text-xs md:text-sm text-muted-foreground">Organize your favorite WordLyte content</p>
              </div>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  New Collection
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Create New Collection</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Create a new collection to organize your favorite videos.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="text-foreground">
                      Collection Name
                    </Label>
                    <Input
                      id="name"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      className="bg-input border-border"
                      placeholder="e.g., Sunday Sermons"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description" className="text-foreground">
                      Description (Optional)
                    </Label>
                    <Textarea
                      id="description"
                      value={newCollectionDescription}
                      onChange={(e) => setNewCollectionDescription(e.target.value)}
                      className="bg-input border-border"
                      placeholder="Describe what this collection is about..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={createCollection}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={!newCollectionName.trim()}
                  >
                    Create Collection
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Collections List */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold text-foreground mb-4">Your Collections</h2>
            <div className="space-y-3">
              {collections.map((collection) => (
                <Card
                  key={collection.id}
                  className={`bg-card border-border cursor-pointer transition-colors shadow-sm ${
                    selectedCollection?.id === collection.id ? "ring-2 ring-primary" : "hover:bg-accent/50"
                  }`}
                  onClick={() => {
                    setSelectedCollection(collection)
                    loadCollectionVideos(collection.id)
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-foreground text-lg">{collection.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteCollection(collection.id)
                        }}
                        className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {collection.description && <p className="text-muted-foreground text-sm mb-2 line-clamp-2">{collection.description}</p>}
                    <p className="text-muted-foreground text-xs">
                      {collection.video_count} video{collection.video_count !== 1 ? "s" : ""}
                    </p>
                  </CardContent>
                </Card>
              ))}

              {collections.length === 0 && (
                <Card className="bg-card border-border shadow-sm">
                  <CardContent className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-foreground mb-2">No collections yet</p>
                    <p className="text-muted-foreground text-sm">Create your first collection to get started</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Collection Videos */}
          <div className="lg:col-span-2">
            {selectedCollection ? (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-foreground mb-2">{selectedCollection.name}</h2>
                  {selectedCollection.description && <p className="text-muted-foreground line-clamp-3">{selectedCollection.description}</p>}
                  <p className="text-muted-foreground text-sm mt-2">
                    {collectionVideos.length} video{collectionVideos.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {collectionVideos.map((item) => (
                    <Card key={item.id} className="bg-card border-border shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-foreground font-medium mb-1 line-clamp-2">{item.video.title}</h3>
                            <p className="text-muted-foreground text-sm">
                              {item.video.preacher?.name} • {formatDuration(item.video.duration)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVideoFromCollection(item.id)}
                            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <Button
                          onClick={() => setSelectedVideo(item.video.youtube_id)}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Watch Video
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {collectionVideos.length === 0 && (
                  <Card className="bg-card border-border shadow-sm">
                    <CardContent className="text-center py-12">
                      <Play className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-foreground mb-2">No videos yet</h3>
                      <p className="text-muted-foreground mb-4">Add videos to this collection from the main page</p>
                      <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Link href="/">Browse Videos</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-card border-border shadow-sm">
                <CardContent className="text-center py-16">
                  <BookOpen className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-foreground mb-2">Select a Collection</h3>
                  <p className="text-muted-foreground">Choose a collection from the left to view its videos</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Video Player Modal */}
      {selectedVideo && <VideoPlayer videoId={selectedVideo} videoTitle="Collection Video" onClose={() => setSelectedVideo(null)} />}
    </div>
  )
}
