"use client"

import { Play, Heart, Clock, Eye, Plus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog"
import { SermonNotesPreview } from "@/components/sermon-notes-preview"

interface Video {
  id: string
  title: string
  preacher: string
  duration: string
  views: string
  youtubeId: string
  topic: string
  description: string
  sermonNotes?: string[]
  scriptureReferences?: any[]
  tags?: string[]
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
  return (
    <Card className="bg-card border-border hover:bg-accent/20 transition-all duration-200 group shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground border-secondary/50">
            {video.topic}
          </Badge>
          <div className="flex items-center space-x-1">
            {user && onGenerateAI && (
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 text-muted-foreground hover:text-secondary"
                onClick={() => onGenerateAI(video.id)}
                title="Generate AI content"
              >
                <Sparkles className="w-4 h-4" />
              </Button>
            )}
            {user && (
              <AddToCollectionDialog videoId={video.id}>
                <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground">
                  <Plus className="w-4 h-4" />
                </Button>
              </AddToCollectionDialog>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFavorite}
              className={`w-8 h-8 ${isFavorite ? "text-destructive hover:text-destructive/80" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
            </Button>
          </div>
        </div>
        <CardTitle className="text-foreground text-lg leading-tight group-hover:text-primary transition-colors">
          {video.title}
        </CardTitle>
        <CardDescription className="text-muted-foreground">by {video.preacher}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>

        {video.tags && video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {video.tags.slice(0, 3).map((tag, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs bg-muted border-border text-muted-foreground hover:bg-accent"
              >
                {tag}
              </Badge>
            ))}
            {video.tags.length > 3 && (
              <Badge variant="outline" className="text-xs bg-muted border-border text-muted-foreground">
                +{video.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {(video.sermonNotes?.length || video.scriptureReferences?.length) && (
          <SermonNotesPreview
            notesCount={video.sermonNotes?.length || 0}
            scriptureCount={video.scriptureReferences?.length || 0}
          />
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{video.duration}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="w-3 h-3" />
              <span>{video.views}</span>
            </div>
          </div>
        </div>

        <Button
          onClick={onPlay}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-shadow"
        >
          <Play className="w-4 h-4 mr-2" />
          Watch Now
        </Button>
      </CardContent>
    </Card>
  )
}
