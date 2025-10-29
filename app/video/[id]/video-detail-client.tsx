"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Heart,
  Sparkles,
  Users,
  Eye,
  BookOpen,
  Quote,
  Share2,
  Bookmark,
  ChevronDown,
  ChevronUp,
  FileText,
  Globe,
  Check,
  Copy,
  Mic,
  Brain,
  StickyNote,
  Play,
  Trash2,
  Edit,
  Save,
  X,
  MessageSquare
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog"
import { AppHeader } from "@/components/app-header"
import { CustomVideoPlayer } from '@/components/custom-video-player'
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { useAuth } from "@/lib/auth-context"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { debugLog } from "@/lib/utils/debug"
import { Video } from "@/lib/types"
import { formatDuration, getPreacherName } from "@/lib/utils/video-helpers"
import { AIGenerationModal } from "@/components/ai-generation-modal"
import { ScriptureVerseCard } from "@/components/scripture-verse-card"
import { ShareDialog } from "@/components/share-dialog"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

interface VideoDetailClientProps {
  initialVideo: Video | null
}

export default function VideoDetailPage({ initialVideo }: VideoDetailClientProps) {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { toast } = useToast()

  const [favorites, setFavorites] = useState<string[]>([])
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({})
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({})
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set())
  const [userNotes, setUserNotes] = useState<Array<{
    id: string
    video_time: number
    start_time: number
    end_time: number
    transcript_text: string
    created_at: string
    comments: Array<{
      id: string
      text: string
      created_at: string
    }>
  }>>([])
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState<string>("")
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editingNoteText, setEditingNoteText] = useState<string>("")

  const videoId = params.id as string

  // Set responsive defaults for sermon notes
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 768 // md breakpoint
      setExpandedSections(prev => ({
        ...prev,
        'sermon-notes': isDesktop, // Visible on desktop, hidden on mobile
        'scripture-references': prev['scripture-references'] || false, // Keep scripture collapsed by default
        'key-points': prev['key-points'] || false // Keep key points collapsed by default
      }))
    }

    handleResize() // Set initial state
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Helper function to update action loading state
  const setActionLoadingState = (action: string, loading: boolean) => {
    setActionLoading(prev => ({ ...prev, [action]: loading }))
  }

  // Fetch video details - use initial data if available
  const videoQuery = useQuery({
    queryKey: ["video", videoId],
    queryFn: () => {
      console.log(`🌐 CLIENT: Fetching video ${videoId} from client-side`)
      return apiGet(`/api/v1/videos/${videoId}`)
    },
    initialData: initialVideo,
    staleTime: 5 * 60 * 1000, // 5 minutes - matches server revalidation
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnMount: false, // Don't refetch if we have fresh server data
    refetchOnWindowFocus: false, // Avoid unnecessary refetches
    enabled: !!videoId,
  })

  console.log('Video query data:', videoQuery.data)
  // Fetch video comments first
  const commentsQuery = useQuery({
    queryKey: ["video-comments", videoId],
    queryFn: async () => {
      const response = await apiGet(`/api/v1/videos/${videoId}/comments`)
      return response || []
    },
    enabled: !!videoId,
  })

  // Fetch user notes for this video
  const notesQuery = useQuery({
    queryKey: ["video-notes", videoId],
    queryFn: async () => {
      const accessToken = await getAccessTokenCached()
      const response = await apiGet(`/api/v1/notes/video/${videoId}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      return response || []
    },
    enabled: !!user?.id && !!videoId,
  })

  // Combine notes with comments using useMemo
  const notesWithComments = useMemo(() => {
    if (!notesQuery.data) return []

    return notesQuery.data.map((note: any) => ({
      ...note,
      comments: [
        // Legacy comments from user_note
        ...(note.user_note ? [{
          id: `${note.id}-legacy`,
          text: note.user_note,
          content: note.user_note,
          created_at: note.updated_at || note.created_at
        }] : []),
        // Real comments associated with this note
        ...(commentsQuery.data?.filter((comment: any) => comment.note_id === note.id) || []).map((comment: any) => ({
          id: comment.id,
          text: comment.content,
          content: comment.content,
          created_at: comment.created_at
        }))
      ]
    }))
  }, [notesQuery.data, commentsQuery.data])

  useEffect(() => {
    // Favorites are managed locally, no need to fetch from API
  }, [])

  const toggleFavorite = async () => {
    if (!user) {
      router.push("/auth/login")
      return
    }
    if (!videoQuery.data) return

    const actionKey = 'favorite'
    setActionLoadingState(actionKey, true)

    const isFavorite = favorites.includes(videoId)
    const accessToken = await getAccessTokenCached()
    const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {}

    try {
      if (isFavorite) {
        await apiDelete(`/api/v1/favorites/${videoId}`, { headers })
      } else {
        await apiPost("/api/v1/favorites", { video_id: videoId }, { headers })
      }
      await queryClient.invalidateQueries({ queryKey: ["favorites", user.id] })
    } catch (error) {
      console.error("Error toggling favorite:", error)
    } finally {
      setActionLoadingState(actionKey, false)
    }
  }

  const handleGenerateAI = () => {
    if (videoQuery.data) {
      setAiModalOpen(true)
    }
  }

  const handleNoteTaken = async (note: {
    startTime: number
    endTime: number
    transcriptText: string
    videoTime: number
  }) => {
    try {
      const accessToken = await getAccessTokenCached()

      const noteData = {
        video_id: videoId,
        video_time: note.videoTime,
        start_time: note.startTime,
        end_time: note.endTime,
        transcript_text: note.transcriptText,
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          timestamp: new Date().toISOString()
        }
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/notes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        },
        body: JSON.stringify(noteData)
      })

      if (!response.ok) {
        throw new Error(`Failed to save note: ${response.status}`)
      }

      const savedNote = await response.json()

      toast({
        title: "Note saved!",
        description: `Captured transcript from ${formatDuration(note.startTime)} to ${formatDuration(note.endTime)}`,
      })

      // Refresh notes data
      queryClient.invalidateQueries({ queryKey: ["video-notes", videoId] })
    } catch (error) {
      console.error('Error saving note:', error)
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
      })
    }
  }

  const handleEditNote = (note: any) => {
    setEditingNoteId(note.id)
    setEditingNoteText("")
  }

  const handleAddComment = async (noteId: number) => {
    if (!editingNoteText.trim()) return

    try {
      const accessToken = await getAccessTokenCached()
      await apiPost(`/api/v1/videos/${videoId}/comments`, {
        content: editingNoteText.trim(),
        note_id: noteId
      }, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })

      toast({
        title: "Comment added!",
        description: "Your comment has been saved.",
      })

      // Refresh notes data
      queryClient.invalidateQueries({ queryKey: ["video-notes", videoId] })
      queryClient.invalidateQueries({ queryKey: ["video-comments", videoId] })

      // Reset editing state
      setEditingNoteId(null)
      setEditingNoteText("")
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
      })
    }
  }

  const handleEditComment = (comment: any) => {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.content)
  }

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return

    try {
      const accessToken = await getAccessTokenCached()

      // Check if this is a legacy comment (contains "-legacy")
      const isLegacyComment = commentId.includes('-legacy')

      if (isLegacyComment) {
        // For legacy comments, update the note itself
        const noteId = commentId.replace('-legacy', '')
        await apiPut(`/api/v1/notes/${noteId}`, {
          user_note: editingCommentText.trim()
        }, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        })
      } else {
        // For real comments, update via comments endpoint
        await apiPut(`/api/v1/videos/comments/${commentId}`, {
          content: editingCommentText.trim()
        }, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        })
      }

      toast({
        title: "Comment updated!",
        description: "Your comment has been updated.",
      })

      // Refresh notes data
      queryClient.invalidateQueries({ queryKey: ["video-notes", videoId] })
      queryClient.invalidateQueries({ queryKey: ["video-comments", videoId] })

      // Reset editing state
      setEditingCommentId(null)
      setEditingCommentText("")
    } catch (error) {
      console.error('Error updating comment:', error)
      toast({
        title: "Error",
        description: "Failed to update comment. Please try again.",
      })
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return

    try {
      const accessToken = await getAccessTokenCached()

      // Check if this is a legacy comment (contains "-legacy")
      const isLegacyComment = commentId.includes('-legacy')

      if (isLegacyComment) {
        // For legacy comments, clear the user_note field
        const noteId = commentId.replace('-legacy', '')
        await apiPut(`/api/v1/notes/${noteId}`, {
          user_note: null // Clear the user_note field
        }, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        })
      } else {
        // For real comments, delete via comments endpoint
        await apiDelete(`/api/v1/videos/comments/${commentId}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        })
      }

      toast({
        title: "Comment deleted",
        description: "Your comment has been removed.",
      })

      // Refresh notes data
      queryClient.invalidateQueries({ queryKey: ["video-notes", videoId] })
      queryClient.invalidateQueries({ queryKey: ["video-comments", videoId] })
    } catch (error: any) {
      console.error('Error deleting comment:', error)

      // Check if it's a 404 (comment not found, possibly already deleted)
      if (error?.message?.includes('404') || error?.message?.includes('Not Found')) {
        toast({
          title: "Comment deleted",
          description: "Your comment has been removed.",
        })

        // Still refresh the data in case the UI needs updating
        queryClient.invalidateQueries({ queryKey: ["video-notes", videoId] })
        queryClient.invalidateQueries({ queryKey: ["video-comments", videoId] })

        // Reset editing state
        setEditingCommentId(null)
        setEditingCommentText("")
      } else {
        toast({
          title: "Error",
          description: "Failed to delete comment. Please try again.",
        })
      }
    }
  }

  const handleCancelEdit = () => {
    setEditingNoteId(null)
    setEditingNoteText("")
    setEditingCommentId(null)
    setEditingCommentText("")
  }

  const handleDeleteNote = async (noteId: number) => {

    try {
      const accessToken = await getAccessTokenCached()
      await apiDelete(`/api/v1/notes/${noteId}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })

      toast({
        title: "Note deleted",
        description: "Your note has been removed.",
      })

      // Refresh notes data
      queryClient.invalidateQueries({ queryKey: ["video-notes", videoId] })
    } catch (error) {
      console.error('Error deleting note:', error)
      toast({
        title: "Error",
        description: "Failed to delete note. Please try again.",
      })
    }
  }

  const handleAIContentGenerated = (content: any) => {
    queryClient.invalidateQueries({ queryKey: ["video", videoId] })
  }

  const handleTranscribeVideo = async () => {
    if (!videoQuery.data || !videoQuery.data.id) return

    const actionKey = 'transcribe'
    setActionLoadingState(actionKey, true)

    try {
      const accessToken = await getAccessTokenCached()
      const youtubeUrl = videoQuery.data.audio_url ? videoQuery.data.audio_url : videoQuery.data.video_url

      if (!youtubeUrl || youtubeUrl.includes('undefined')) {
        toast({
          title: "Error",
          description: "Video URL is not available for transcription.",
        })
        return
      }

      console.log("Transcribing video:", videoQuery.data, "URL:", youtubeUrl)

      // Send as form data since the backend expects Form parameters
      const formData = new FormData()
      formData.append('audio_url', youtubeUrl)
      formData.append('video_id', videoQuery.data.id)

      console.log("Video detail transcription - audio_url:", youtubeUrl, "video_id:", videoQuery.data.id)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/v1/transcription/transcribe-url`, {
        method: 'POST',
        headers: {
          ...accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
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
      console.error("Transcription error:", error)
      toast({
        title: "Error",
        description: "Failed to send video for transcription.",
      })
    } finally {
      setActionLoadingState(actionKey, false)
    }
  }

  const handleAIAnalysis = async () => {
    if (!videoQuery.data || !videoQuery.data.id) return

    const actionKey = 'ai-analysis'
    setActionLoadingState(actionKey, true)

    try {
      const accessToken = await getAccessTokenCached()


      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/v1/admin/videos/${videoQuery.data.id}/ai-analysis`, {
        method: 'POST',
        headers: {
          ...accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      toast({
        title: "Success",
        description: "AI analysis has been queued. The video will be analyzed for summary and scripture extraction.",
      })

      console.log("AI analysis queued:", result)
    } catch (error) {
      console.error("AI analysis error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start AI analysis.",
      })
    } finally {
      setActionLoadingState(actionKey, false)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItems(prev => new Set(prev).add(itemId))
      // Remove the checkmark after 2 seconds
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(itemId)
          return newSet
        })
      }, 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  // Show loading only if we don't have initial data and are fetching
  if (videoQuery.isLoading && !initialVideo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        {/* Header skeleton */}
        <div className="h-16 bg-background/80 backdrop-blur-lg border-b border-border/50" />

        <div className="container mx-auto px-4 max-w-5xl">
          <div className="space-y-8">
            {/* Main content skeleton */}
            <div>
              {/* Video player skeleton */}
              <div className="aspect-video w-full bg-muted animate-pulse rounded-lg"></div>

              {/* Action bar skeleton */}
              <div className="bg-card/30 rounded-xl p-4 md:p-6 mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Skeleton className="h-9 w-32" />
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                  <div className="flex items-center gap-2 justify-center sm:justify-end">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-16" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </div>
              </div>

              {/* Info skeleton */}
              <div className="space-y-6 mt-6 md:mt-8">
                <Skeleton className="h-6 md:h-8 w-48" />
                <Skeleton className="h-10 md:h-12 w-full" />
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (videoQuery.isError || !videoQuery.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        <Card className="max-w-md w-full text-center border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10 shadow-xl">
          <CardContent className="pt-8 pb-6">
            <div className="text-7xl mb-6 animate-bounce">😔</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Video Not Found</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              The video you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push("/")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const video = videoQuery.data
  const isFavorite = favorites.includes(videoId)


  if (!video) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
        <Card className="max-w-md w-full text-center border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10 shadow-xl">
          <CardContent className="pt-8 pb-6">
            <div className="text-7xl mb-6 animate-bounce">😔</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Video Not Found</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              The video you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push("/")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* App Header */}
      <AppHeader
        favorites={favorites}
        showActions={false}
        backButton={{
          label: "← Back",
          href: "/",
          scroll: false
        }}
      />

      {/* Mobile-First Responsive Layout */}
      <div className="min-h-[calc(100vh-4rem)]">
        {/* Desktop: 3-column grid, Mobile: Single column */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] xl:grid-cols-[320px_1fr_360px] gap-6 px-4 py-6 max-w-screen-2xl mx-auto">

          {/* Left Sidebar - Table of Contents / Navigation */}
          <aside className="hidden lg:block space-y-6">
            {/* Sermon Outline / Table of Contents */}
            <Card className="sticky top-6 border-primary/20 shadow-lg bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardHeader className="pb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-primary" />
                  Content Guide
                </h3>
              </CardHeader>
              <CardContent className="pt-0">
                <nav className="space-y-2">
                  {video?.sermon_notes?.length > 0 && (
                    <button
                      onClick={() => document.getElementById('sermon-notes')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors text-sm"
                    >
                      📖 Sermon Notes
                    </button>
                  )}
                  {video?.scripture_references?.length > 0 && (
                    <button
                      onClick={() => document.getElementById('scripture-references')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors text-sm"
                    >
                      📜 Scripture References
                    </button>
                  )}
                  {video?.key_points?.length > 0 && (
                    <button
                      onClick={() => document.getElementById('key-points')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors text-sm"
                    >
                      💡 Key Points
                    </button>
                  )}
                  {user && notesWithComments && notesWithComments.length > 0 && (
                    <button
                      onClick={() => document.getElementById('user-notes')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors text-sm"
                    >
                      📝 My Notes ({notesWithComments.reduce((total: number, note: any) => total + (note.comments?.length || 0), 0)} comments)
                    </button>
                  )}
                </nav>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="sticky top-80 border-secondary/20 shadow-lg">
              <CardHeader className="pb-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-secondary" />
                  Quick Actions
                </h3>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <Button
                  onClick={handleGenerateAI}
                  className="w-full justify-start"
                  size="sm"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Content
                </Button>
                <ShareDialog
                  content={{
                    title: video.title,
                    text: `Check out this sermon: ${video.title}`,
                    url: window.location.href,
                    type: 'video'
                  }}
                >
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </ShareDialog>
                <Button
                  onClick={toggleFavorite}
                  variant={isFavorite ? "default" : "outline"}
                  className="w-full justify-start"
                  size="sm"
                  disabled={actionLoading['favorite']}
                >
                  <Heart className={`w-4 h-4 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
                  {isFavorite ? 'Favorited' : 'Favorite'}
                </Button>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content Area */}
          <main className="space-y-8 lg:col-span-1">
            {/* Video Player Section */}
            <section id="video-player" className="scroll-mt-20">
              {/* Video Player */}
              <div className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm rounded-lg mb-6">
                <div className="bg-gradient-to-br from-muted/50 to-muted relative overflow-hidden">
                  {video?.hls_master_url ? (
                    <CustomVideoPlayer
                      src={video?.hls_master_url}
                      hlsVariants={video?.hls_playlist_url || []}
                      poster={video?.thumbnail_url || undefined}
                      autoPlay={true}
                      startTime={video?.start_time_seconds || 0}
                      endTime={video?.end_time_seconds || undefined}
                      transcriptSegments={video?.transcript_segments || []}
                      onNoteTaken={handleNoteTaken}
                      watermark={{
                        src: "",
                        position: "bottom-right",
                        opacity: 0.8,
                        size: "small",
                        clickUrl: ""
                      }}
                      onTimeUpdate={(currentTime: number) => {
                        debugLog.video('Time update', currentTime)
                      }}
                      onEnded={() => {
                        debugLog.video('Video ended')
                      }}
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 min-h-[300px] lg:min-h-[400px]">
                      <div className="text-center">
                        <div className="text-6xl mb-4">🎥</div>
                        <p className="text-muted-foreground text-lg">Video URL not available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Title and Preacher Info */}
              <div className="text-center lg:text-left mb-8">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight tracking-tight mb-4">
                  {video.title}
                </h1>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 md:gap-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    <span className="font-medium text-foreground text-sm md:text-base">{getPreacherName(video) || "Unknown"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm md:text-base">{video.view_count?.toLocaleString() || 'N/A'} views</span>
                  </div>
                </div>
              </div>

              {/* Admin Controls - Only visible to admin users */}
              {user?.user_type === 'admin' && (
                <Card className="border-destructive/20 shadow-lg bg-gradient-to-br from-destructive/5 to-destructive/10 mb-8">
                  <CardHeader className="pb-4">
                    <h2 className="text-xl font-bold text-foreground flex items-center">
                      <Sparkles className="w-5 h-5 mr-3 text-destructive" />
                      Admin Controls
                    </h2>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={handleTranscribeVideo}
                        disabled={actionLoading['transcribe'] || !videoQuery.data}
                        variant="outline"
                        className="flex items-center gap-2 border-destructive/30 hover:bg-destructive/10"
                      >
                        <Mic className="w-4 h-4" />
                        {actionLoading['transcribe'] ? 'Transcribing...' : 'Transcribe Video'}
                      </Button>
                      <Button
                        onClick={handleAIAnalysis}
                        disabled={actionLoading['ai-analysis'] || !videoQuery.data}
                        variant="outline"
                        className="flex items-center gap-2 border-destructive/30 hover:bg-destructive/10"
                      >
                        <Brain className="w-4 h-4" />
                        {actionLoading['ai-analysis'] ? 'Analyzing...' : 'Generate AI Summary'}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      Use these controls to generate transcriptions and AI-powered summaries for this video.
                    </p>
                  </CardContent>
                </Card>
              )}

            </section>

              {/* Sermon Notes - Primary Focus */}
              {video.sermon_notes && video.sermon_notes.length > 0 && (
                <section id="sermon-notes" className="scroll-mt-20 mb-8">
                  <Card className="border-primary/20 shadow-lg bg-gradient-to-br from-primary/5 to-secondary/5">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-foreground flex items-center">
                          <BookOpen className="w-6 h-6 mr-3 text-primary" />
                          Sermon Notes
                        </h2>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSection('sermon-notes')}
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                          >
                            {expandedSections['sermon-notes'] ?
                              <ChevronUp className="w-4 h-4" /> :
                              <ChevronDown className="w-4 h-4" />
                            }
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {(expandedSections['sermon-notes'] ? video.sermon_notes : []).map((note: string, index: number) => (
                          <div key={index} className="bg-card/60 rounded-lg p-6 border border-primary/10 shadow-sm relative group">
                            <div className="absolute top-3 right-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(note, `sermon-note-${index}`)}
                                className="h-6 w-6 p-0 hover:bg-primary/10 opacity-60 hover:opacity-100"
                                title="Copy sermon note"
                              >
                                {copiedItems.has(`sermon-note-${index}`) ? (
                                  <Check className="w-3 h-3 text-green-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                            <p className="text-foreground leading-relaxed text-base whitespace-pre-wrap pr-8">
                              {note}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </section>
              )}

              {/* Scripture References - Primary Focus */}
              {video.scripture_references && video.scripture_references.length > 0 && (
                <section id="scripture-references" className="scroll-mt-20 mb-8">
                  <Card className="border-secondary/20 shadow-lg bg-gradient-to-br from-secondary/5 to-primary/5">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-foreground flex items-center">
                          <Quote className="w-6 h-6 mr-3 text-secondary" />
                          Scripture References
                        </h2>
                        <div className="flex items-center gap-2">
                          {video.scripture_references.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSection('scripture-references')}
                              className="h-8 w-8 p-0 hover:bg-secondary/10"
                            >
                              {expandedSections['scripture-references'] ?
                                <ChevronUp className="w-4 h-4" /> :
                                <ChevronDown className="w-4 h-4" />
                              }
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid gap-6 md:grid-cols-1">
                        {(expandedSections['scripture-references'] ? video.scripture_references : []).map((scripture: {reference: string, verse: string}, index: number) => {
                          // Parse reference like "John 3:16" into components
                          const referenceParts = scripture.reference.split(' ')
                          const book = referenceParts.slice(0, -1).join(' ')
                          const chapterVerse = referenceParts[referenceParts.length - 1].split(':')
                          const chapter = parseInt(chapterVerse[0])
                          const verse = parseInt(chapterVerse[1])

                          return (
                            <div key={index} className="overflow-hidden">
                              <ScriptureVerseCard
                                reference={{
                                  book,
                                  chapter,
                                  verse,
                                  text: scripture.verse
                                }}
                                className="w-full"
                              />
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </section>
              )}

              {/* Key Points - Primary Focus */}
              {video.key_points && video.key_points.length > 0 && (
                <section id="key-points" className="scroll-mt-20 mb-8">
                  <Card className="border-secondary/20 shadow-lg bg-gradient-to-br from-secondary/5 to-primary/5">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-foreground flex items-center">
                          <FileText className="w-6 h-6 mr-3 text-secondary" />
                          Key Points
                        </h2>
                        <div className="flex items-center gap-2">
                          {video.key_points.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSection('key-points')}
                              className="h-8 w-8 p-0 hover:bg-secondary/10"
                            >
                              {expandedSections['key-points'] ?
                                <ChevronUp className="w-4 h-4" /> :
                                <ChevronDown className="w-4 h-4" />
                              }
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid gap-4 md:grid-cols-1">
                        {(expandedSections['key-points'] ? video.key_points : []).map((keyPoint: string, index: number) => (
                          <div key={index} className="bg-card/60 rounded-lg p-5 border border-secondary/10 shadow-sm hover:shadow-md transition-shadow">
                            <div className="mb-3 flex items-center justify-between">
                              <Badge variant="outline" className="bg-secondary/10 border-secondary/30 text-secondary font-semibold px-3 py-1">
                                Key Point {index + 1}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(keyPoint, `key-point-${index}`)}
                                  className="h-6 w-6 p-0 hover:bg-secondary/10 opacity-60 hover:opacity-100"
                                  title="Copy key point"
                                >
                                  {copiedItems.has(`key-point-${index}`) ? (
                                    <Check className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                                <ShareDialog
                                  content={{
                                    title: `Key Point ${index + 1} from ${video.title}`,
                                    text: keyPoint,
                                    url: window.location.href,
                                    type: 'key-point'
                                  }}
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-secondary/10 opacity-60 hover:opacity-100"
                                    title="Share key point"
                                  >
                                    <Share2 className="w-3 h-3" />
                                  </Button>
                                </ShareDialog>
                              </div>
                            </div>
                            <p className="text-foreground leading-relaxed text-base whitespace-pre-wrap">
                              {keyPoint}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </section>
              )}
          </main>

          {/* Right Sidebar - Notes and Comments */}
          <aside className="space-y-6">
            {/* User Notes - Personal notes taken during viewing */}
            {user && notesWithComments && notesWithComments.length > 0 && (
              <section id="user-notes" className="scroll-mt-20">
                <Card className="border-blue-200/50 shadow-lg bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 lg:sticky lg:top-6">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-foreground flex items-center">
                        <StickyNote className="w-5 h-5 mr-2 text-blue-600" />
                        My Notes
                        <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                          {notesWithComments.reduce((total: number, note: any) => total + (note.comments?.length || 0), 0)} comments
                        </Badge>
                      </h2>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 max-h-[600px] overflow-y-auto">
                    <div className="space-y-4">
                      {notesWithComments.map((note: any) => (
                        <div key={note.id} className="bg-card/80 rounded-lg p-4 border border-blue-200/30 shadow-sm hover:shadow-md transition-all duration-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                {formatDuration(note.video_time)}
                              </Badge>
                              {note.note_category && (
                                <Badge variant="secondary" className="text-xs">
                                  {note.note_category}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Jump to note time in video
                                  const videoElement = document.querySelector('video') as HTMLVideoElement
                                  if (videoElement) {
                                    videoElement.currentTime = note.video_time
                                  }
                                }}
                                className="h-6 w-6 p-0 hover:bg-blue-100"
                                title="Jump to this time in video"
                              >
                                <Play className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3 border-l-4 border-blue-400">
                              <p className="text-xs text-blue-800 dark:text-blue-200 italic leading-relaxed line-clamp-3">
                                "{note.transcript_text}"
                              </p>
                            </div>

                            {/* Display all comments */}
                            {note.comments && note.comments.length > 0 && (
                              <div className="space-y-2">
                                {note.comments.map((comment: any) => (
                                  <div key={comment.id} className="bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200/30 dark:border-amber-800/30">
                                    <div className="flex items-start justify-between mb-2">
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(comment.created_at).toLocaleDateString()}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEditComment(comment)}
                                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                          title="Edit comment"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteComment(comment.id)}
                                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                          title="Delete comment"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    {editingCommentId === comment.id ? (
                                      <div className="space-y-2">
                                        <Textarea
                                          value={editingCommentText}
                                          onChange={(e) => setEditingCommentText(e.target.value)}
                                          className="bg-white dark:bg-gray-800 border-amber-200 resize-none text-xs"
                                          rows={2}
                                        />
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() => handleUpdateComment(comment.id)}
                                            className="h-6 px-2 bg-amber-600 hover:bg-amber-700 text-xs"
                                          >
                                            <Save className="w-3 h-3 mr-1" />
                                            Save
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              setEditingCommentId(null)
                                              setEditingCommentText("")
                                            }}
                                            className="h-6 px-2 hover:bg-gray-100 text-xs"
                                          >
                                            <X className="w-3 h-3 mr-1" />
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                                        {comment.content}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditNote(note)}
                                className="h-6 px-2 text-xs hover:bg-blue-100"
                                title="Add a comment"
                              >
                                <MessageSquare className="w-3 h-3 mr-1" />
                                Add Comment
                              </Button>
                            </div>

                            {editingNoteId === note.id ? (
                              <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-3 border-l-4 border-amber-400 space-y-3">
                                <Textarea
                                  value={editingNoteText}
                                  onChange={(e) => setEditingNoteText(e.target.value)}
                                  placeholder="Add your thoughts, insights, or notes about this transcript segment..."
                                  className="bg-white dark:bg-gray-800 border-amber-200 resize-none text-xs"
                                  rows={2}
                                />
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleAddComment(note.id)}
                                    className="h-6 px-2 bg-amber-600 hover:bg-amber-700 text-xs"
                                  >
                                    <Save className="w-3 h-3 mr-1" />
                                    Add Comment
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCancelEdit}
                                    className="h-6 px-2 hover:bg-gray-100 text-xs"
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
                            <span className="text-xs">
                              {new Date(note.created_at).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1 text-xs hover:bg-red-100 hover:text-red-700"
                                title="Delete note"
                                onClick={() => handleDeleteNote(note.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Mobile Actions - Show on mobile when sidebar is hidden */}
            <div className="lg:hidden space-y-4">
              <Card className="border-secondary/20 shadow-lg">
                <CardHeader className="pb-3">
                  <h3 className="text-lg font-semibold text-foreground flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-secondary" />
                    Actions
                  </h3>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <Button
                    onClick={handleGenerateAI}
                    className="w-full justify-start"
                    size="sm"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Content
                  </Button>
                  <ShareDialog
                    content={{
                      title: video.title,
                      text: `Check out this sermon: ${video.title}`,
                      url: window.location.href,
                      type: 'video'
                    }}
                  >
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      size="sm"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </ShareDialog>
                  <Button
                    onClick={toggleFavorite}
                    variant={isFavorite ? "default" : "outline"}
                    className="w-full justify-start"
                    size="sm"
                    disabled={actionLoading['favorite']}
                  >
                    <Heart className={`w-4 h-4 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
                    {isFavorite ? 'Favorited' : 'Favorite'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>

      {/* AI Generation Modal */}
      {video && (
        <AIGenerationModal
          isOpen={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          videoId={video.id}
          videoTitle={video.title}
          videoDescription={video.description || undefined}
          preacherName={video.preachers?.name}
          onContentGenerated={handleAIContentGenerated}
        />
      )}
    </div>
  )
}
