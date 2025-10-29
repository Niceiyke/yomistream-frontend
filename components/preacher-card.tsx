"use client"

import { Users, Play, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Preacher {
  id: string
  name: string
  church: string
  description: string
  videoCount: number
  image: string
}

interface PreacherCardProps {
  preacher: Preacher
  isFavorite?: boolean
  onViewSermons: (preacherId: string, preacherName: string) => void
  onToggleFavorite?: (preacherId: string) => void
  user?: any
}

export function PreacherCard({
  preacher,
  isFavorite = false,
  onViewSermons,
  onToggleFavorite,
  user,
}: PreacherCardProps) {
  const handleViewSermons = () => {
    onViewSermons(preacher.id, preacher.name)
  }

  const handleToggleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite(preacher.id)
    }
  }

  return (
    <Card className="bg-card border-border hover:bg-accent/20 transition-all duration-300 group shadow-lg hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 hover:-translate-y-1 backdrop-blur-sm">
      <CardHeader className="text-center pb-3">
        <Avatar className="w-20 h-20 mx-auto mb-4 ring-2 ring-primary/30 shadow-lg group-hover:ring-primary/50 group-hover:shadow-xl transition-all duration-300">
          <AvatarImage src={preacher.image || "/placeholder.svg"} alt={preacher.name} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-lg font-bold">
            {preacher.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <CardTitle className="text-foreground text-xl group-hover:text-primary transition-colors duration-300 font-bold line-clamp-2">
          {preacher.name}
        </CardTitle>
        <CardDescription className="text-muted-foreground group-hover:text-secondary/80 transition-colors duration-300">{preacher.church}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground line-clamp-3">{preacher.description}</p>

        <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground group-hover:text-secondary/80 transition-colors duration-300">
          <Play className="w-3 h-3 text-secondary/70 group-hover:text-secondary transition-colors" />
          <span>{preacher.videoCount.toLocaleString()} videos</span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 border-border hover:bg-secondary/10 hover:border-secondary/50 hover:text-secondary shadow-md hover:shadow-lg hover:shadow-secondary/10 transition-all duration-300 transform hover:scale-[1.02] font-semibold"
            onClick={handleViewSermons}
          >
            <Users className="w-4 h-4 mr-2" />
            View Profile
          </Button>

          {user && onToggleFavorite && (
            <Button
              variant="outline"
              size="icon"
              className={`border-border hover:bg-accent shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-[1.05] ${
                isFavorite ? "text-destructive border-destructive/50 hover:border-destructive" : ""
              }`}
              onClick={handleToggleFavorite}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
