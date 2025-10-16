"use client"

import { useState, useRef, useEffect, useCallback, memo } from "react"
import { Play, Clock, ExternalLink, Calendar, Globe, Tag as TagIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SourceVideo } from "@/lib/types/content"
import Image from "next/image"

interface SourceVideoCardProps {
  video: SourceVideo
  onPlay: () => void
}

export const SourceVideoCard = memo(function SourceVideoCard({
  video,
  onPlay
}: SourceVideoCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "0:00"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Format published date
  const formatPublishedDate = (dateString: string | null): string => {
    if (!dateString) return "Unknown"
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        onPlay()
        break
      case 'Escape':
        if (cardRef.current) {
          cardRef.current.blur()
        }
        break
    }
  }, [onPlay])

  return (
    <div
      ref={cardRef}
      className={`cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl ${
        isHovered ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      role="article"
      tabIndex={0}
      aria-label={`${video.title} from ${video.channel_name || 'Unknown channel'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onPlay}
      onKeyDown={handleKeyDown}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-muted mb-3">
        {/* Thumbnail Image */}
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={`Thumbnail for ${video.title}`}
            fill
            className="object-cover"
            loading="lazy"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
            unoptimized={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <Play className="w-16 h-16 text-muted-foreground/50" aria-hidden="true" />
          </div>
        )}

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-semibold px-2 py-1 rounded">
          <Clock className="w-3 h-3 inline mr-1" aria-hidden="true" />
          <span>{formatDuration(video.duration)}</span>
        </div>

        {/* External Link Indicator */}
        <div className="absolute top-2 right-2">
          <Badge className="bg-red-500/90 text-white backdrop-blur-sm">
            <ExternalLink className="w-3 h-3 mr-1" aria-hidden="true" />
            YouTube
          </Badge>
        </div>

        {/* Play Button Overlay */}
        {(isHovered) && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center animate-in fade-in-0 duration-200">
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center transform transition-transform group-hover:scale-110">
              <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" aria-hidden="true" />
            </div>
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="flex gap-3">
        {/* Channel Avatar */}
        <div className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500/30 to-red-600/30 flex items-center justify-center">
            <span className="text-sm font-semibold text-foreground" aria-hidden="true">
              {(video.channel_name || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Title and Metadata */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
            {video.title}
          </h3>

          <p className="text-sm text-muted-foreground mb-1">
            {video.channel_name || 'Unknown Channel'}
          </p>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" aria-hidden="true" />
              <span>{formatPublishedDate(video.published_at)}</span>
            </div>

            {video.language && (
              <>
                <span aria-hidden="true">•</span>
                <div className="flex items-center gap-1">
                  <Globe className="w-3 h-3" aria-hidden="true" />
                  <span>{video.language.toUpperCase()}</span>
                </div>
              </>
            )}
          </div>

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1" role="list" aria-label="Video tags">
              {video.tags.slice(0, 2).map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs bg-muted/50 border-border/50 text-muted-foreground"
                  role="listitem"
                >
                  <TagIcon className="w-2 h-2 mr-1" aria-hidden="true" />
                  {tag}
                </Badge>
              ))}
              {video.tags.length > 2 && (
                <Badge
                  variant="outline"
                  className="text-xs bg-muted/50 border-border/50 text-muted-foreground"
                  title={`${video.tags.length - 2} more tags`}
                >
                  +{video.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default SourceVideoCard
