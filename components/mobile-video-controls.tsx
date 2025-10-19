"use client"

import { useState } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, SkipBack, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface MobileVideoControlsProps {
  isPlaying: boolean
  volume: number
  isMuted: boolean
  currentTime: number
  duration: number
  onPlayPause: () => void
  onVolumeChange: (value: number[]) => void
  onToggleMute: () => void
  onSeek: (time: number) => void
  onFullscreen: () => void
  onSkip: (seconds: number) => void
  className?: string
}

export function MobileVideoControls({
  isPlaying,
  volume,
  isMuted,
  currentTime,
  duration,
  onPlayPause,
  onVolumeChange,
  onToggleMute,
  onSeek,
  onFullscreen,
  onSkip,
  className
}: MobileVideoControlsProps) {
  const [showVolume, setShowVolume] = useState(false)

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={cn("bg-black/80 backdrop-blur-sm p-4 space-y-4", className)}>
      {/* Progress Bar */}
      <div className="space-y-2">
        <Slider
          value={[progress]}
          max={100}
          step={0.1}
          className="w-full"
          onValueChange={(value) => {
            const newTime = (value[0] / 100) * duration
            onSeek(newTime)
          }}
        />
        <div className="flex justify-between text-xs text-white/80">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Skip Backward */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSkip(-10)}
          className="text-white hover:text-white hover:bg-white/10 p-3"
        >
          <SkipBack className="w-5 h-5" />
        </Button>

        {/* Play/Pause - Larger button */}
        <Button
          onClick={onPlayPause}
          className="bg-white/20 hover:bg-white/30 text-white border-0 p-4 rounded-full w-14 h-14"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-1" />
          )}
        </Button>

        {/* Skip Forward */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSkip(10)}
          className="text-white hover:text-white hover:bg-white/10 p-3"
        >
          <SkipForward className="w-5 h-5" />
        </Button>
      </div>

      {/* Secondary Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMute}
              className="text-white hover:text-white hover:bg-white/10 p-2"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>

            {showVolume && (
              <div className="w-20">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={100}
                  step={1}
                  className="w-full"
                  onValueChange={onVolumeChange}
                />
              </div>
            )}
          </div>

          {/* Volume slider toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowVolume(!showVolume)}
            className="text-white hover:text-white hover:bg-white/10 p-2"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Fullscreen */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onFullscreen}
          className="text-white hover:text-white hover:bg-white/10 p-2"
        >
          <Maximize className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
