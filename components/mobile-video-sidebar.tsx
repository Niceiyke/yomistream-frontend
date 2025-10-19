"use client"

import { useState } from "react"
import { Users, Scroll, Quote, BookOpen, MapPin, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { MobileExpandableContent } from "./mobile-expandable-content"

interface MobileVideoSidebarProps {
  video: any
  expandedSections: Set<string>
  onToggleSection: (section: string) => void
  className?: string
}

export function MobileVideoSidebar({
  video,
  expandedSections,
  onToggleSection,
  className
}: MobileVideoSidebarProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Preacher Info - Always visible on mobile */}
      <Card className="border-border/50 shadow-lg bg-gradient-to-br from-card to-card/80">
        <CardHeader className="pb-4">
          <div className="flex items-center">
            <Users className="w-5 h-5 mr-3 text-primary" />
            <span className="font-semibold text-foreground">Preacher</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center space-y-4">
            <Avatar className="w-20 h-20 mx-auto border-4 border-primary/20 shadow-lg">
              <AvatarImage
                src={video.preachers?.profile_image_url || video.preachers?.image_url}
                alt={video.preachers?.name || "Unknown"}
              />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary text-lg font-semibold">
                {video.preachers?.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <div>
              <h3 className="font-bold text-lg text-foreground mb-2">
                {video.preachers?.name || "Unknown"}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {video.preachers?.bio || "Gospel preacher and teacher dedicated to sharing God's word."}
              </p>
            </div>

            {video.preachers?.church_affiliation && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{video.preachers.church_affiliation}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expandable Content Sections */}
      {video.description && (
        <MobileExpandableContent
          title="Sermon Summary"
          icon={<Scroll className="w-5 h-5 text-primary" />}
          className="bg-gradient-to-br from-primary/5 to-secondary/5"
        >
          <div className={cn(
            "text-sm text-muted-foreground leading-relaxed transition-all duration-300",
            expandedSections.has('summary') ? "" : "line-clamp-4"
          )}>
            {video.description}
          </div>
        </MobileExpandableContent>
      )}

      {video.scripture_references && video.scripture_references.length > 0 && (
        <MobileExpandableContent
          title={`Bible Excerpts (${video.scripture_references.length})`}
          icon={<Quote className="w-5 h-5 text-secondary" />}
          className="bg-gradient-to-br from-secondary/5 to-primary/5"
        >
          <div className="space-y-4">
            {(expandedSections.has('scripture') ? video.scripture_references : video.scripture_references.slice(0, 3)).map((ref: any, index: number) => (
              <div key={index} className="bg-card/50 rounded-lg p-4 border border-border/30 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                    {ref.book} {ref.chapter}:{ref.verse}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  "{ref.text}"
                </p>
              </div>
            ))}
          </div>
        </MobileExpandableContent>
      )}

      {video.sermon_notes && video.sermon_notes.length > 0 && (
        <MobileExpandableContent
          title={`Sermon Notes (${video.sermon_notes.length})`}
          icon={<BookOpen className="w-5 h-5 text-primary" />}
        >
          <div className="space-y-3">
            {(expandedSections.has('notes') ? video.sermon_notes : video.sermon_notes.slice(0, 3)).map((note: string, index: number) => (
              <div key={index} className="bg-muted/30 rounded-lg p-4 border-l-4 border-primary/30 shadow-sm">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {note}
                </p>
              </div>
            ))}
          </div>
        </MobileExpandableContent>
      )}
    </div>
  )
}
