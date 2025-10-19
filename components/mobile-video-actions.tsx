"use client"

import { useState } from "react"
import { Heart, Share2, Plus, Sparkles, MoreVertical, Download, Bookmark, MessageCircle, ThumbsUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog"

interface MobileVideoActionsProps {
  videoId: string
  isFavorite: boolean
  user: any
  onToggleFavorite: () => void
  onGenerateAI: () => void
  onShare: () => void
  className?: string
}

export function MobileVideoActions({
  videoId,
  isFavorite,
  user,
  onToggleFavorite,
  onGenerateAI,
  onShare,
  className
}: MobileVideoActionsProps) {
  const [showMoreActions, setShowMoreActions] = useState(false)

  return (
    <div className={cn("flex items-center gap-2 w-full", className)}>
      {/* Primary Actions - Always Visible */}
      <div className="flex items-center gap-2 flex-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFavorite}
          className={cn(
            "flex-1 border-border/50 hover:border-accent transition-all duration-200",
            isFavorite ? "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20" : "hover:bg-accent/80"
          )}
        >
          <Heart className={cn("w-4 h-4 mr-2 transition-all", isFavorite && "fill-current scale-110")} />
          {isFavorite ? "Saved" : "Save"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onShare}
          className="flex-1 border-border/50 hover:bg-accent/80 hover:border-accent transition-all duration-200"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>

      {/* Secondary Actions - Collapsible */}
      <Sheet open={showMoreActions} onOpenChange={setShowMoreActions}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-border/50 hover:bg-accent/80 hover:border-accent transition-all duration-200"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-lg">
          <SheetHeader>
            <SheetTitle>Video Actions</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            {/* Social Actions */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Engage</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start h-12">
                  <ThumbsUp className="w-4 h-4 mr-3" />
                  Like
                </Button>
                <Button variant="outline" className="justify-start h-12">
                  <MessageCircle className="w-4 h-4 mr-3" />
                  Comment
                </Button>
              </div>
            </div>

            <Separator />

            {/* User Actions */}
            {user && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Manage</h3>
                <div className="space-y-2">
                  <AddToCollectionDialog videoId={videoId}>
                    <Button variant="outline" className="w-full justify-start h-12">
                      <Plus className="w-4 h-4 mr-3" />
                      Add to Collection
                    </Button>
                  </AddToCollectionDialog>

                  <Button
                    variant="outline"
                    onClick={onGenerateAI}
                    className="w-full justify-start h-12"
                  >
                    <Sparkles className="w-4 h-4 mr-3" />
                    Generate AI Content
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            {/* General Actions */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">More</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start h-12">
                  <Download className="w-4 h-4 mr-3" />
                  Download
                </Button>
                <Button variant="outline" className="w-full justify-start h-12">
                  <Bookmark className="w-4 h-4 mr-3" />
                  Save for Later
                </Button>
                <Button variant="outline" className="w-full justify-start h-12 text-destructive hover:text-destructive">
                  Report Video
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
