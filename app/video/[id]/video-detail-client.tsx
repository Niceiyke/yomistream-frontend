"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Heart,
  Sparkles,
  Tv,
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
  MessageSquare,
  Menu
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AppHeader } from "@/components/app-header"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api"
import { getAccessTokenCached } from "@/lib/auth-cache"
import { useAuth } from "@/lib/auth-context"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { debugLog } from "@/lib/utils/debug"
import { Video } from "@/lib/types"
import { formatDuration, getPreacherName, getChannelName, getPreacherImageUrl } from "@/lib/utils/video-helpers"
import { AIGenerationModal } from "@/components/ai-generation-modal"
import { ScriptureVerseCard } from "@/components/scripture-verse-card"
import { ShareDialog } from "@/components/share-dialog"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { CustomVideoPlayerV2 as CustomVideoPlayer } from '@/components/custom-video-player-v2'
import { NoteQuickAdd, NoteCard } from '@/components/notes'
import { VideoLikeDislike } from '@/components/video-like-dislike'

interface VideoDetailClientProps {
  initialVideo: Video | null
}

export default function VideoDetailPage({ initialVideo }: VideoDetailClientProps) {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { toast } = useToast()

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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [showQuickNote, setShowQuickNote] = useState(false)
  const [quickNoteData, setQuickNoteData] = useState<{
    videoTime: number
    transcriptText: string
    startTime: number
    endTime: number
  } | null>(null)

  const videoId = params.id as string

  // Set responsive defaults for sermon notes
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024 // lg breakpoint
      setExpandedSections(prev => ({
        ...prev,
        'sermon-notes': isDesktop, // Visible on desktop, hidden on mobile
        'scripture-references': prev['scripture-references'] || false, // Keep scripture collapsed by default
        'key-points': prev['key-points'] || false, // Keep key points collapsed by default
        'user-notes': prev['user-notes'] || false // Keep user notes collapsed by default
      }))
      // Close mobile sidebar when switching to desktop
      if (isDesktop) {
        setMobileSidebarOpen(false)
      }
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
    staleTime: 15 * 1000, // 15 seconds - very responsive for view counts
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnMount: false, // Don't refetch if we have fresh server data
    refetchOnWindowFocus: true, // Refetch when window regains focus to show updated view counts
    enabled: !!videoId,
  })
  // Fetch video comments first
  const commentsQuery = useQuery({
    queryKey: ["video-comments", videoId],
    queryFn: async () => {
      const response = await apiGet(`/api/v1/videos/${videoId}/comments`)
      return response || []
    },
    enabled: !!videoId,
  })
  // Fetch user notes
  const notesQuery = useQuery({
    queryKey: ["notes", videoId],
    queryFn: async () => {
      const response = await apiGet(`/api/v1/notes/video/${videoId}`)
      return response || []
    },
    enabled: !!videoId,
  })


  // Fetch user favorites
  const favoritesQuery = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const accessToken = await getAccessTokenCached()
      const favs = await apiGet("/api/v1/favorites", {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
      return favs?.video_ids || []
    },
    enabled: !!user?.id,
  })

  // Combine notes with comments using useMemo
  const notesWithComments = useMemo(() => {
    if (!notesQuery.data) return []

    return notesQuery.data.map((note: any) => ({
      ...note,
      // Keep user_note as a separate field for the NoteCard component
      user_note: note.user_note,
      comments: [
        // Real comments associated with this note (not including user_note)
        ...(commentsQuery.data?.filter((comment: any) => comment.note_id === note.id) || []).map((comment: any) => ({
          id: comment.id,
          text: comment.content,
          content: comment.content,
          created_at: comment.created_at
        }))
      ]
    }))
  }, [notesQuery.data, commentsQuery.data])

  const toggleFavorite = async () => {
    if (!user) {
      router.push("/auth/login")
      return
    }
    if (!videoQuery.data) return

    const actionKey = 'favorite'
    setActionLoadingState(actionKey, true)

    const currentFavorites = Array.isArray(favoritesQuery.data) ? favoritesQuery.data : []
    const isFavorite = currentFavorites.includes(videoId)
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
    userNote?: string
    templateType?: string
  }) => {
    try {
      const accessToken = await getAccessTokenCached()

      const noteData = {
        video_id: videoId,
        video_time: note.videoTime,
        start_time: note.startTime,
        end_time: note.endTime,
        transcript_text: note.transcriptText,
        user_note: note.userNote,
        template_type: note.templateType,
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
      queryClient.invalidateQueries({ queryKey: ["notes", videoId] })
    } catch (error) {
      console.error('Error saving note:', error)
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
      })
    }
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
      queryClient.invalidateQueries({ queryKey: ["notes", videoId] })
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/30 dark:to-purple-950/20">
        {/* Header skeleton */}
        <div className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800" />

        <div className="container mx-auto px-4 lg:px-6 max-w-[1600px] py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 lg:gap-8">
            {/* Sidebar skeleton */}
            <div className="hidden lg:block space-y-6">
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
            
            {/* Main content skeleton */}
            <div className="space-y-8">
              {/* Video player skeleton */}
              <div className="aspect-video w-full bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl shadow-2xl"></div>

              {/* Title skeleton */}
              <div className="space-y-4">
                <Skeleton className="h-12 w-3/4 rounded-xl" />
                <Skeleton className="h-12 w-1/2 rounded-xl" />
              </div>

              {/* Action bar skeleton */}
              <div className="flex gap-4">
                <Skeleton className="h-24 flex-1 rounded-2xl" />
                <Skeleton className="h-24 flex-1 rounded-2xl" />
              </div>

              {/* Content sections skeleton */}
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (videoQuery.isError || !videoQuery.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/30 dark:to-purple-950/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center border-red-200 dark:border-red-800 bg-gradient-to-br from-white via-red-50/50 to-orange-50/30 dark:from-slate-900 dark:via-red-950/50 dark:to-orange-950/30 shadow-2xl">
          <CardContent className="pt-12 pb-10 px-8">
            <div className="text-7xl mb-6 animate-bounce">😔</div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Video Not Found</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed text-lg">
              The video you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push("/")} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const video = videoQuery.data
  const favorites = Array.isArray(favoritesQuery.data) ? favoritesQuery.data : []
  const isFavorite = favorites.includes(videoId)


  if (!video) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/30 dark:to-purple-950/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center border-red-200 dark:border-red-800 bg-gradient-to-br from-white via-red-50/50 to-orange-50/30 dark:from-slate-900 dark:via-red-950/50 dark:to-orange-950/30 shadow-2xl">
          <CardContent className="pt-12 pb-10 px-8">
            <div className="text-7xl mb-6 animate-bounce">😔</div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Video Not Found</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed text-lg">
              The video you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push("/")} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleGoBack = () => {
    router.back()
  }

  // Keyboard shortcut for quick note (N key)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not in an input/textarea and not using modifiers
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        // Get current video time and transcript
        const videoElement = document.querySelector('video') as HTMLVideoElement
        if (videoElement && videoQuery.data?.transcript_segments) {
          const currentTime = videoElement.currentTime
          const segments = videoQuery.data.transcript_segments
          
          // Find current transcript segment
          const segment = segments.find((seg: any) => 
            currentTime >= seg.start && currentTime <= seg.end
          )
          
          setQuickNoteData({
            videoTime: currentTime,
            transcriptText: segment?.text || '',
            startTime: segment?.start || currentTime,
            endTime: segment?.end || currentTime
          })
          setShowQuickNote(true)
          
          // Optionally pause video
          if (!videoElement.paused) {
            videoElement.pause()
          }
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [videoQuery.data])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/30 dark:to-purple-950/20">
      {/* App Header */}
      <AppHeader
        favorites={favorites}
        showActions={false}
        backButton={{
          label: "← Back",
          href: "#",
          scroll: false,
          onClick: handleGoBack
        }}
      />

      {/* Mobile-First Responsive Layout */}
      <div className="min-h-[calc(100vh-4rem)]">
        {/* Desktop: 2-column grid, Mobile: Single column */}
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 lg:gap-8 px-4 lg:px-6 py-6 lg:py-8 max-w-[1600px] mx-auto relative">
          {/* Mobile overlay when sidebar is open */}
          {mobileSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}

          {/* Left Sidebar - Table of Contents / Navigation */}
          <aside className={cn("space-y-6 lg:block z-50 lg:sticky lg:top-6 lg:self-start", mobileSidebarOpen ? "fixed inset-y-0 left-0 w-80 bg-background shadow-2xl p-6 overflow-y-auto" : "hidden lg:block")}>
            {/* Sermon Outline / Table of Contents */}
            <Card className="border-blue-200/60 dark:border-blue-800/40 shadow-xl bg-gradient-to-br from-white via-blue-50/50 to-purple-50/30 dark:from-slate-900 dark:via-blue-950/50 dark:to-purple-950/30 backdrop-blur-sm">
              <CardHeader className="pb-4 border-b border-blue-100 dark:border-blue-900/50">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span>Content Guide</span>
                </h3>
              </CardHeader>
              <CardContent className="pt-4">
                <nav className="space-y-1.5">
                  {video?.sermon_notes?.length > 0 && (
                    <button
                      onClick={() => document.getElementById('sermon-notes')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 hover:shadow-sm flex items-center gap-3 group"
                    >
                      <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                      <span>Sermon Notes</span>
                    </button>
                  )}
                  {video?.scripture_references?.length > 0 && (
                    <button
                      onClick={() => document.getElementById('scripture-references')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all duration-200 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-300 hover:shadow-sm flex items-center gap-3 group"
                    >
                      <Quote className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                      <span>Scripture References</span>
                    </button>
                  )}
                  {video?.key_points?.length > 0 && (
                    <button
                      onClick={() => document.getElementById('key-points')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all duration-200 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 hover:shadow-sm flex items-center gap-3 group"
                    >
                      <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                      <span>Key Points</span>
                    </button>
                  )}
                  {user && notesWithComments && notesWithComments.length > 0 && (
                    <button
                      onClick={() => document.getElementById('user-notes')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-all duration-200 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-green-700 dark:hover:text-green-300 hover:shadow-sm flex items-center gap-3 group"
                    >
                      <StickyNote className="w-4 h-4 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
                      <span>My Notes ({notesWithComments.length})</span>
                    </button>
                  )}
                </nav>
              </CardContent>
            </Card>

            {/* User Notes - Personal notes taken during viewing */}
            {user && notesWithComments && notesWithComments.length > 0 && (
              <section id="user-notes" className="scroll-mt-20">
                <Card className="border-blue-200/50 shadow-lg bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-foreground flex items-center">
                        <StickyNote className="w-5 h-5 mr-2 text-blue-600" />
                        My Notes
                        <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                          {notesWithComments.length} notes
                        </Badge>
                      </h2>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection('user-notes')}
                          className="h-8 w-8 p-0 hover:bg-blue-100"
                        >
                          {expandedSections['user-notes'] ?
                            <ChevronUp className="w-4 h-4" /> :
                            <ChevronDown className="w-4 h-4" />
                          }
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {expandedSections['user-notes'] && (
                    <CardContent className="pt-0 max-h-[600px] overflow-y-auto">
                      <div className="space-y-4">
                        {notesWithComments.map((note: any) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            onJumpToTime={(time) => {
                              const videoElement = document.querySelector('video') as HTMLVideoElement
                              if (videoElement) {
                                videoElement.currentTime = time
                              }
                            }}
                            onDelete={handleDeleteNote}
                          />
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </section>
            )}

            {/* Admin Controls - Only visible to admin users */}
            {user?.user_type === 'admin' && (
              <Card className="border-red-200/60 dark:border-red-800/40 shadow-xl bg-gradient-to-br from-white via-red-50/50 to-orange-50/30 dark:from-slate-900 dark:via-red-950/50 dark:to-orange-950/30 backdrop-blur-sm">
                <CardHeader className="pb-4 border-b border-red-100 dark:border-red-900/50">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                      <Sparkles className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <span>Admin Controls</span>
                  </h2>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={handleTranscribeVideo}
                      disabled={actionLoading['transcribe'] || !videoQuery.data}
                      variant="outline"
                      className="flex items-center justify-center gap-2 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all rounded-xl py-2.5"
                    >
                      <Mic className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span className="font-semibold">{actionLoading['transcribe'] ? 'Transcribing...' : 'Transcribe Video'}</span>
                    </Button>
                    <Button
                      onClick={handleAIAnalysis}
                      disabled={actionLoading['ai-analysis'] || !videoQuery.data}
                      variant="outline"
                      className="flex items-center justify-center gap-2 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all rounded-xl py-2.5"
                    >
                      <Brain className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span className="font-semibold">{actionLoading['ai-analysis'] ? 'Analyzing...' : 'Generate AI Summary'}</span>
                    </Button>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-4 leading-relaxed">
                    Use these controls to generate transcriptions and AI-powered summaries for this video.
                  </p>
                </CardContent>
              </Card>
            )}
          </aside>

          {/* Mobile Hamburger Menu Button */}
          <div className="lg:hidden flex justify-start mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="flex items-center gap-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-all rounded-xl px-4 py-2"
            >
              <Menu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{mobileSidebarOpen ? 'Hide Menu' : 'Content Guide'}</span>
            </Button>
          </div>

          {/* Main Content Area */}
          <main className="space-y-8 lg:col-span-1">
            {/* Video Player Section */}
            <section id="video-player" className="scroll-mt-20">
              {/* Video Player */}
              <div className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 backdrop-blur-sm rounded-2xl mb-8 ring-1 ring-slate-700/50">
                <div className="bg-black relative overflow-hidden">
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
                      videoId={videoId}
                      onViewTracked={async (viewData) => {
                        try {
                          const accessToken = await getAccessTokenCached()
                          await apiPost(`/api/v1/videos/${videoId}/view`, viewData, {
                            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
                          })
                          debugLog.video('View tracked successfully', viewData)
                          
                          // Invalidate and refetch the video query to update the view count in the UI
                          queryClient.invalidateQueries({ queryKey: ["video", videoId] })
                        } catch (error) {
                          console.error('Failed to track view:', error)
                        }
                      }}
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
              <div className="text-center  lg:text-left mb-10">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight mb-6 bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
                  {video.title}
                </h1>

                {/* Combined Info & Actions Card */}
                <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 backdrop-blur-sm px-4 py-3">
                  {/* Info Row - Always horizontal */}
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-x-auto lg:overflow-visible">
                      {/* Channel Info */}
                      <button
                        onClick={() => video.channel?.id && router.push(`/channel/${video.channel.id}`)}
                        className="flex items-center gap-2 flex-shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg px-2 py-1 transition-all duration-200 group"
                      >
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/70 transition-colors">
                          <Tv className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">Channel</span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">{getChannelName(video) || "Unknown"}</span>
                        </div>
                      </button>

                      {video.preacher && (
                        <>
                          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0"></div>
                          <button
                            onClick={() => router.push(`/preacher/${video.preacher.id}`)}
                            className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg px-2 py-1 transition-all duration-200 group flex-shrink-0"
                          >
                            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-lg group-hover:bg-amber-200 dark:group-hover:bg-amber-900/70 transition-colors">
                              <div className="w-4 h-4 rounded-full bg-amber-600 dark:bg-amber-400 flex items-center justify-center">
                                {getPreacherImageUrl(video.preacher) ? (
                                  <img 
                                    src={getPreacherImageUrl(video.preacher)!} 
                                    alt={video.preacher.name}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-[8px] text-white font-bold">
                                    {video.preacher.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="hidden lg:flex flex-col">
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">Preacher</span>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                                {video.preacher.name}
                              </span>
                            </div>
                          </button>
                        </>
                      )}

                      <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0"></div>

                      {/* Views Info */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                          <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">Views</span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{video.view_count?.toLocaleString() || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex items-center gap-2 overflow-x-auto lg:overflow-visible pt-3 border-t border-slate-200 dark:border-slate-700 lg:pt-0 lg:border-0">
                      {/* Like/Dislike */}
                      <VideoLikeDislike
                        videoId={videoId}
                        likeCount={video?.like_count ?? 0}
                        dislikeCount={video?.dislike_count ?? 0}
                        variant="compact"
                        onCountsUpdate={(newLikeCount, newDislikeCount) => {
                          queryClient.setQueryData(['video', videoId], (oldData: any) => {
                            if (!oldData) return oldData
                            return {
                              ...oldData,
                              like_count: newLikeCount,
                              dislike_count: newDislikeCount
                            }
                          })
                        }}
                      />

                      <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0"></div>

                      {user && (
                        <Button
                          onClick={() => {
                            const videoElement = document.querySelector('video') as HTMLVideoElement
                            if (videoElement && videoQuery.data?.transcript_segments) {
                              const currentTime = videoElement.currentTime
                              const segments = videoQuery.data.transcript_segments
                              const segment = segments.find((seg: any) => 
                                currentTime >= seg.start && currentTime <= seg.end
                              )
                              setQuickNoteData({
                                videoTime: currentTime,
                                transcriptText: segment?.text || '',
                                startTime: segment?.start || currentTime,
                                endTime: segment?.end || currentTime
                              })
                              setShowQuickNote(true)
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200 rounded-lg group flex-shrink-0"
                          title="Take note (Press N)"
                        >
                          <StickyNote className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Note</span>
                        </Button>
                      )}

                      <Button
                        onClick={handleGenerateAI}
                        variant="ghost"
                        size="sm"
                        className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all duration-200 rounded-lg group flex-shrink-0"
                      >
                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">AI</span>
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
                          variant="ghost"
                          size="sm"
                          className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 hover:bg-green-100 dark:hover:bg-green-900/30 transition-all duration-200 rounded-lg group flex-shrink-0"
                        >
                          <Share2 className="w-4 h-4 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Share</span>
                        </Button>
                      </ShareDialog>

                      <Button
                        onClick={toggleFavorite}
                        variant="ghost"
                        size="sm"
                        className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-2.5 hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-all duration-200 rounded-lg group flex-shrink-0"
                        disabled={actionLoading['favorite']}
                      >
                        <Heart className={`w-4 h-4 transition-all duration-200 ${isFavorite ? 'text-pink-600 dark:text-pink-400 fill-current scale-110' : 'text-pink-600 dark:text-pink-400 group-hover:scale-110'}`} />
                        <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">{isFavorite ? 'Saved' : 'Save'}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

            </section>

              {/* Sermon Notes - Primary Focus */}
              {video.sermon_notes && video.sermon_notes.length > 0 && (
                <section id="sermon-notes" className="scroll-mt-20 mb-10">
                  <Card className="border-blue-200/60 dark:border-blue-800/40 shadow-xl bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/30 dark:from-slate-900 dark:via-blue-950/50 dark:to-indigo-950/30 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="pb-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-b border-blue-100 dark:border-blue-900/50">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                          <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl shadow-sm">
                            <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span>Sermon Notes</span>
                        </h2>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSection('sermon-notes')}
                            className="h-10 w-10 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                          >
                            {expandedSections['sermon-notes'] ?
                              <ChevronUp className="w-5 h-5 text-blue-600 dark:text-blue-400" /> :
                              <ChevronDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            }
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-5">
                        {(expandedSections['sermon-notes'] ? video.sermon_notes : []).map((note: string, index: number) => (
                          <div key={index} className="bg-white/80 dark:bg-slate-800/80 rounded-2xl p-6 md:p-8 border border-blue-100 dark:border-blue-900/30 shadow-md hover:shadow-lg transition-all duration-200 relative group">
                            <div className="absolute top-4 right-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(note, `sermon-note-${index}`)}
                                className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30 opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                                title="Copy sermon note"
                              >
                                {copiedItems.has(`sermon-note-${index}`) ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                )}
                              </Button>
                            </div>
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{index + 1}</span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base md:text-lg whitespace-pre-wrap pr-8 flex-1">
                                {note}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </section>
              )}

              {/* Scripture References - Primary Focus */}
              {video.scripture_references && video.scripture_references.length > 0 && (
                <section id="scripture-references" className="scroll-mt-20 mb-10">
                  <Card className="border-purple-200/60 dark:border-purple-800/40 shadow-xl bg-gradient-to-br from-white via-purple-50/50 to-pink-50/30 dark:from-slate-900 dark:via-purple-950/50 dark:to-pink-950/30 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="pb-5 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 border-b border-purple-100 dark:border-purple-900/50">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                          <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl shadow-sm">
                            <Quote className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <span>Scripture References</span>
                        </h2>
                        <div className="flex items-center gap-2">
                          {video.scripture_references.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSection('scripture-references')}
                              className="h-10 w-10 p-0 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-xl transition-all"
                            >
                              {expandedSections['scripture-references'] ?
                                <ChevronUp className="w-5 h-5 text-purple-600 dark:text-purple-400" /> :
                                <ChevronDown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
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
                <section id="key-points" className="scroll-mt-20 mb-10">
                  <Card className="border-amber-200/60 dark:border-amber-800/40 shadow-xl bg-gradient-to-br from-white via-amber-50/50 to-orange-50/30 dark:from-slate-900 dark:via-amber-950/50 dark:to-orange-950/30 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="pb-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 border-b border-amber-100 dark:border-amber-900/50">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                          <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl shadow-sm">
                            <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                          </div>
                          <span>Key Points</span>
                        </h2>
                        <div className="flex items-center gap-2">
                          {video.key_points.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSection('key-points')}
                              className="h-10 w-10 p-0 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-xl transition-all"
                            >
                              {expandedSections['key-points'] ?
                                <ChevronUp className="w-5 h-5 text-amber-600 dark:text-amber-400" /> :
                                <ChevronDown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                              }
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid gap-5 md:grid-cols-1">
                        {(expandedSections['key-points'] ? video.key_points : []).map((keyPoint: string, index: number) => (
                          <div key={index} className="bg-white/80 dark:bg-slate-800/80 rounded-2xl p-6 md:p-8 border border-amber-100 dark:border-amber-900/30 shadow-md hover:shadow-lg transition-all duration-200 group">
                            <div className="mb-4 flex items-center justify-between">
                              <Badge variant="outline" className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 font-bold px-4 py-1.5 text-sm">
                                Key Point {index + 1}
                              </Badge>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(keyPoint, `key-point-${index}`)}
                                  className="h-8 w-8 p-0 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg"
                                  title="Copy key point"
                                >
                                  {copiedItems.has(`key-point-${index}`) ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
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
                                    className="h-8 w-8 p-0 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg"
                                    title="Share key point"
                                  >
                                    <Share2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                  </Button>
                                </ShareDialog>
                              </div>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base md:text-lg whitespace-pre-wrap">
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
        </div>
      </div>

      {/* Quick Note Panel */}
      {showQuickNote && quickNoteData && (
        <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-[550px] z-50 animate-in slide-in-from-bottom-4 shadow-2xl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-200 dark:border-blue-800 overflow-hidden">
            <NoteQuickAdd
              videoTime={quickNoteData.videoTime}
              transcriptText={quickNoteData.transcriptText}
              startTime={quickNoteData.startTime}
              endTime={quickNoteData.endTime}
              onSave={async (note) => {
                await handleNoteTaken({
                  startTime: note.startTime,
                  endTime: note.endTime,
                  transcriptText: note.transcriptText,
                  videoTime: note.videoTime,
                  userNote: note.userNote,
                  templateType: note.templateType
                })
                setShowQuickNote(false)
                setQuickNoteData(null)
              }}
              onCancel={() => {
                setShowQuickNote(false)
                setQuickNoteData(null)
              }}
            />
          </div>
        </div>
      )}

      {/* AI Generation Modal */}
      {video && (
        <AIGenerationModal
          isOpen={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          videoId={video.id}
          videoTitle={video.title}
          videoDescription={video.description || undefined}
          preacherName={getChannelName(video) || undefined}
          onContentGenerated={handleAIContentGenerated}
        />
      )}
    </div>
  )
}
