"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Heart, Clock, MoreVertical, Plus, Sparkles, BookOpen, Quote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { apiGet } from "@/lib/api"
import Image from "next/image"

interface Video {
  id: string
  title: string
  preacher: string
  duration: string
  views: string
  video_url: string
  topic: string
  description: string
  sermonNotes?: string[]
  scriptureReferences?: any[]
  tags?: string[]
  thumbnail_url?: string
}

interface VideoCardProps {
  video: Video
  isFavorite: boolean
  onPlay: () => void
  onToggleFavorite: () => void
  user?: any
  onGenerateAI?: (videoId: string) => void
}

export function VideoCard({ video, isFavorite, onPlay, onToggleFavorite, user, onGenerateAI }: VideoCardProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isHovered, setIsHovered] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (window.matchMedia('(hover: hover)').matches) {
      setIsHovered(true)
      
      queryClient.prefetchQuery({
        queryKey: ["video", video.id],
        queryFn: () => apiGet(`/api/data/videos/${video.id}`),
        staleTime: 60_000,
      })
      
      hoverTimeoutRef.current = setTimeout(() => {
        setShowPreview(true)
      }, 1000)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setShowPreview(false)
    setShowMenu(false)
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
  }

  const handleCardClick = () => {
    sessionStorage.setItem('mainPageScrollPosition', window.scrollY.toString())
    router.push(`/video/${video.id}`)
  }

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div 
      className="cursor-pointer group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-muted mb-3">
        {/* Thumbnail Image */}
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <Play className="w-16 h-16 text-muted-foreground/50" />
          </div>
        )}

        {/* Hover Preview Overlay */}
        {showPreview && (
          <div className="absolute inset-0 z-10 bg-black animate-in fade-in-0 duration-300">
            {video.video_url && (
              video.video_url.match(/\.(mp4|webm|ogg|m3u8)(\?|$)/i) ? (
                <video
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                >
                  <source src={video.video_url} type="video/mp4" />
                </video>
              ) : (
                <iframe
                  src={`${video.video_url}&autoplay=1&mute=1`}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  title={`Preview: ${video.title}`}
                />
              )
            )}
          </div>
        )}

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-semibold px-2 py-1 rounded">
          {video.duration}
        </div>

        {/* Topic Badge */}
        <div className="absolute top-2 left-2">
          <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-sm">
            {video.topic}
          </Badge>
        </div>

        {/* Play Button Overlay on Hover */}
        {isHovered && !showPreview && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center animate-in fade-in-0 duration-200">
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center transform transition-transform group-hover:scale-110">
              <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
            </div>
          </div>
        )}

        {/* Quick Actions Menu */}
        {isHovered && (
          <div className="absolute top-2 right-2 flex gap-1 animate-in slide-in-from-top-2 duration-200">
            {user && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleFavorite()
                  }}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? "fill-current text-red-500" : ""}`} />
                </Button>
                <div onClick={(e) => e.stopPropagation()}>
                  <AddToCollectionDialog videoId={video.id}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </AddToCollectionDialog>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="flex gap-3">
        {/* Preacher Avatar Placeholder */}
        <div className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
            <span className="text-sm font-semibold text-foreground">
              {video.preacher.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Title and Metadata */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-1">{video.preacher}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{video.views} views</span>
            {(video.sermonNotes?.length || video.scriptureReferences?.length) && (
              <>
                <span>•</span>
                <div className="flex items-center gap-2">
                  {video.sermonNotes?.length > 0 && (
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      <span>{video.sermonNotes.length}</span>
                    </div>
                  )}
                  {video.scriptureReferences?.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Quote className="w-3 h-3" />
                      <span>{video.scriptureReferences.length}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {video.tags.slice(0, 2).map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs bg-muted/50 border-border/50 text-muted-foreground"
                >
                  {tag}
                </Badge>
              ))}
              {video.tags.length > 2 && (
                <Badge variant="outline" className="text-xs bg-muted/50 border-border/50 text-muted-foreground">
                  +{video.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* More Options */}
        {user && onGenerateAI && (
          <div className="flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                onGenerateAI(video.id)
              }}
              title="Generate AI content"
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
