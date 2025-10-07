"use client"

import { useEffect, useRef, useState } from "react"
import { X, BookOpen, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SermonNotes } from "@/components/sermon-notes"
import "plyr/dist/plyr.css"
import "@/styles/plyr-custom.css"

interface ScriptureReference {
  book: string
  chapter: number
  verse: number
  text: string
}

interface VideoPlayerProps {
  videoId: string
  videoTitle: string
  sermonNotes?: string[]
  scriptureReferences?: ScriptureReference[]
  onClose: () => void
  startTimeSeconds?: number
  endTimeSeconds?: number
  videoUrl?: string
}

export const VideoPlayer = ({
  videoId,
  videoTitle,
  sermonNotes = [],
  scriptureReferences = [],
  onClose,
  startTimeSeconds,
  endTimeSeconds,
  videoUrl,
}: VideoPlayerProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const videoElementRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<import("plyr").default | null>(null)
  const plyrCtorRef = useRef<typeof import("plyr")["default"] | null>(null)
  const frameHostRef = useRef<HTMLDivElement | null>(null)

  // Initialize Plyr player
  useEffect(() => {
    let isMounted = true
    if (!videoElementRef.current) return

    const setupPlayer = async () => {
      if (!videoElementRef.current || !isMounted) {
        return
      }

      if (!plyrCtorRef.current) {
        const mod = await import("plyr")
        plyrCtorRef.current = mod.default
      }

      if (!plyrCtorRef.current || !videoElementRef.current || !isMounted) {
        return
      }

      const PlyrCtor = plyrCtorRef.current

      const player = new PlyrCtor(videoElementRef.current, {
        autoplay: true,
        controls: [
          'play-large',
          'play',
          'progress',
          'current-time',
          'mute',
          'volume',
          'settings',
          'fullscreen',
        ],
        settings: ['quality', 'speed'],
        youtube: {
          noCookie: true, // Use youtube-nocookie.com for privacy
          autoplay: 1,
          rel: 0, // Don't show related videos
          modestbranding: 1, // Minimal YouTube branding
          playsinline: 1, // Play inline on mobile
          fs: 1, // Show fullscreen button
          controls: 1, // Show controls
          disablekb: 0, // Enable keyboard controls
          iv_load_policy: 3, // Hide annotations
          cc_load_policy: 0, // Hide captions by default
          showinfo: 0, // Hide video info
          origin: typeof window !== 'undefined' ? window.location.origin : '', // Security
        },
        ratio: '16:9',
      })

      playerRef.current = player

      // Handle ready event
      player.on('ready', () => {
        try {
          const start = typeof startTimeSeconds === "number" ? Math.max(0, startTimeSeconds) : 0
          if (start > 0) {
            setTimeout(() => {
              if (playerRef.current) {
                playerRef.current.currentTime = start
              }
            }, 500)
          }
        } catch (e) {
          console.error("Error setting start time:", e)
        }
      })

      // Handle time update for end time enforcement
      if (typeof endTimeSeconds === "number") {
        player.on('timeupdate', () => {
          try {
            if (playerRef.current && playerRef.current.currentTime >= endTimeSeconds) {
              playerRef.current.pause()
            }
          } catch {
            // Ignore
          }
        })
      }
    }

    setupPlayer()

    return () => {
      isMounted = false
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [videoId, startTimeSeconds, endTimeSeconds])

  // Handle entering/exiting native fullscreen and orientation for better mobile UX
  useEffect(() => {
    const container = frameHostRef.current
    const tryLockLandscape = async () => {
      try {
        // @ts-ignore
        if (screen.orientation && screen.orientation.lock) {
          // @ts-ignore
          await screen.orientation.lock("landscape")
        }
      } catch {}
    }
    const tryUnlockOrientation = async () => {
      try {
        // @ts-ignore
        if (screen.orientation && screen.orientation.unlock) {
          // @ts-ignore
          screen.orientation.unlock()
        }
      } catch {}
    }

    const enterFullscreen = async () => {
      if (!container) return
      try {
        if (!document.fullscreenElement && container.requestFullscreen) {
          await container.requestFullscreen()
        }
        await tryLockLandscape()
      } catch {}
    }

    const exitFullscreen = async () => {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen()
        }
      } catch {}
      await tryUnlockOrientation()
    }

    if (isExpanded) {
      enterFullscreen()
    } else {
      exitFullscreen()
    }

    return () => {
      // Ensure orientation is unlocked if component unmounts while expanded
      if (!isExpanded) return
      tryUnlockOrientation()
    }
  }, [isExpanded])

  // Unified layout that keeps a single player DOM node and only changes styles (no reparenting)
  return (
    <div
      className={
        isExpanded
          ? "fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col"
          : "fixed bottom-6 right-6 w-80 bg-card rounded-lg overflow-hidden shadow-2xl border border-border z-50 flex flex-col"
      }
      style={isExpanded ? { height: "100dvh", width: "100vw" } : undefined}
    >
      {/* Header (both modes, different styling) */}
      <div className={isExpanded ? "flex items-center justify-between p-4 bg-card/80 backdrop-blur-sm border-b border-border" : "flex items-center justify-between p-2 bg-card/90 border-b border-border"}>
        <div className="truncate pr-2">
          <span className={isExpanded ? "text-foreground text-lg font-semibold" : "text-foreground text-sm font-medium"}>{videoTitle}</span>
        </div>
        <div className="flex items-center space-x-2">
          {(sermonNotes.length > 0 || scriptureReferences.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotes(!showNotes)}
              className={isExpanded ? "text-foreground hover:bg-accent" : "text-foreground hover:bg-accent h-6 w-6 p-0"}
              title="Toggle Notes"
            >
              <BookOpen className={isExpanded ? "w-4 h-4 mr-2" : "w-3 h-3"} />
              {isExpanded ? (showNotes ? "Hide Notes" : "Show Notes") : null}
            </Button>
          )}
          {isExpanded ? (
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)} className="text-foreground hover:bg-accent">
              <Minimize2 className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="text-foreground hover:bg-accent h-6 w-6 p-0"
              title="Expand"
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className={isExpanded ? "text-foreground hover:bg-accent" : "text-foreground hover:bg-accent h-6 w-6 p-0"}>
            <X className={isExpanded ? "w-4 h-4" : "w-3 h-3"} />
          </Button>
        </div>
      </div>

      {/* Body (single stable container) */}
      <div className={isExpanded ? "flex-1 flex w-full" : "w-full"}>
        <div
          ref={frameHostRef}
          className={
            isExpanded
              ? `${showNotes ? "w-2/3" : "w-full"} bg-muted flex items-center justify-center`
              : "aspect-video w-full bg-muted"
          }
          style={isExpanded ? { height: "100%" } : undefined}
        >
          <div
            ref={videoElementRef}
            data-plyr-provider="youtube"
            data-plyr-embed-id={videoId}
          />
        </div>
        {isExpanded ? (
          showNotes && (
            <div className="w-1/3 bg-card border-l border-border p-4 overflow-y-auto">
              <SermonNotes notes={sermonNotes} scriptureReferences={scriptureReferences} />
            </div>
          )
        ) : (
          (showNotes && (sermonNotes.length > 0 || scriptureReferences.length > 0)) && (
            <div className="max-h-64 overflow-y-auto bg-card border-t border-border p-3">
              <SermonNotes notes={sermonNotes} scriptureReferences={scriptureReferences} />
            </div>
          )
        )}
      </div>
    </div>
  )
}
