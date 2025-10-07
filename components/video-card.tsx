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
    <Card className="bg-card border-border hover:bg-accent/20 transition-all duration-300 group shadow-lg hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 hover:-translate-y-1 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Badge variant="secondary" className="bg-gradient-to-r from-secondary/30 to-secondary/20 text-secondary-foreground border-secondary/50 shadow-sm font-semibold">
            {video.topic}
          </Badge>
          <div className="flex items-center space-x-1">
            {user && onGenerateAI && (
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 text-muted-foreground hover:text-secondary hover:bg-secondary/10 transition-all duration-200"
                onClick={() => onGenerateAI(video.id)}
                title="Generate AI content"
              >
                <Sparkles className="w-4 h-4" />
              </Button>
            )}
            {user && (
              <AddToCollectionDialog videoId={video.id}>
                <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-secondary hover:bg-secondary/10 transition-all duration-200">
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
        <CardTitle className="text-foreground text-lg leading-tight group-hover:text-primary transition-colors duration-300 font-bold">
          {video.title}
        </CardTitle>
        <CardDescription className="text-muted-foreground group-hover:text-secondary/80 transition-colors duration-300">by {video.preacher}</CardDescription>
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
            <div className="flex items-center space-x-1 group/duration hover:text-secondary transition-colors">
              <Clock className="w-3 h-3 text-secondary/70 group-hover/duration:text-secondary" />
              <span>{video.duration}</span>
            </div>
            <div className="flex items-center space-x-1 group/views hover:text-secondary transition-colors">
              <Eye className="w-3 h-3 text-secondary/70 group-hover/views:text-secondary" />
              <span>{video.views}</span>
            </div>
          </div>
        </div>

        <Button
          onClick={onPlay}
          className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 transform hover:scale-[1.02]"
        >
          <Play className="w-4 h-4 mr-2" />
          Watch Now
        </Button>
      </CardContent>
    </Card>
  )
}
