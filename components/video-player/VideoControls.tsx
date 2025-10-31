"use client"

import React from 'react'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings, 
  PictureInPicture,
  PictureInPicture2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"

interface Chapter {
  id: string
  title: string
  startTime: number
  endTime?: number
  thumbnail?: string
}

interface VideoControlsProps {
  // Playback state
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isFullscreen: boolean
  isPictureInPicture: boolean
  playbackRate: number
  quality: string
  
  // Control handlers
  onTogglePlay: () => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onToggleMute: () => void
  onToggleFullscreen: () => void
  onTogglePictureInPicture: () => void
  onPlaybackRateChange: (rate: number) => void
  onQualityChange: (quality: string) => void
  
  // Optional features
  chapters?: Chapter[]
  currentChapter?: Chapter | undefined
  onChapterChange?: (chapter: Chapter) => void
  availableQualities?: string[]
  
  // Utility
  formatTime: (seconds: number) => string
  showControls: boolean
}

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

export const VideoControls = React.memo(({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isFullscreen,
  isPictureInPicture,
  playbackRate,
  quality,
  onTogglePlay,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onTogglePictureInPicture,
  onPlaybackRateChange,
  onQualityChange,
  onSeek,
  chapters = [],
  currentChapter,
  onChapterChange,
  availableQualities = ['auto'],
  formatTime,
  showControls
}: VideoControlsProps) => {
  return (
    <div 
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent backdrop-blur-sm transition-all duration-300 rounded-t-xl ${
        showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      {/* Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 md:px-6 py-1.5 md:py-3 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border-t border-white/10 rounded-t-2xl shadow-2xl z-10">
        {/* Left Controls - Play, Volume */}
        <div className="flex items-center space-x-0.5 md:space-x-2">
          {/* Play/Pause */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePlay}
            className="text-white/90 hover:text-white hover:bg-white/10 hover:scale-105 p-1 md:p-2.5 rounded-xl transition-all duration-300 active:scale-95 min-w-[32px] min-h-[32px] md:min-w-[40px] md:min-h-[40px] group"
            aria-label={isPlaying ? "Pause video" : "Play video"}
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            <div className="relative">
              {isPlaying ? 
                <Pause className="w-3.5 h-3.5 md:w-6 md:h-6 drop-shadow-lg group-hover:drop-shadow-xl transition-all duration-300" /> : 
                <Play className="w-3.5 h-3.5 md:w-6 md:h-6 ml-0.5 drop-shadow-lg group-hover:drop-shadow-xl transition-all duration-300" />
              }
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </Button>

          {/* Volume */}
          <div className="flex items-center space-x-0.5 md:space-x-3 group/volume ml-0.5 md:ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMute}
              className="text-white/80 hover:text-white hover:bg-gradient-to-br hover:from-green-500/20 hover:to-blue-500/20 hover:scale-105 p-1 md:p-2.5 rounded-xl transition-all duration-300 active:scale-95 min-w-[28px] min-h-[28px] md:min-w-[36px] md:min-h-[36px] group"
              aria-label={isMuted || volume === 0 ? "Unmute (M)" : "Mute (M)"}
              title={isMuted || volume === 0 ? "Unmute (M)" : "Mute (M)"}
            >
              {isMuted || volume === 0 ? 
                <VolumeX className="w-3 h-3 md:w-5 md:h-5 group-hover:scale-110 transition-transform duration-300" /> : 
                <Volume2 className="w-3 h-3 md:w-5 md:h-5 group-hover:scale-110 transition-transform duration-300" />
              }
            </Button>
            
            <div className="hidden md:block w-20 opacity-70 hover:opacity-100 transition-opacity duration-300">
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                onValueChange={([value]: number[]) => onVolumeChange(value / 100)}
                max={100}
                step={1}
                className="cursor-pointer [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-blue-400 [&_[role=slider]]:to-purple-400 [&_[role=slider]]:border-white/20 [&_[role=slider]]:shadow-lg [&_[role=slider]]:hover:shadow-xl"
              />
            </div>
            
            {/* Mobile volume - visible by default */}
            <div className="md:hidden w-10 opacity-70 transition-opacity duration-300">
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                onValueChange={([value]: number[]) => onVolumeChange(value / 100)}
                max={100}
                step={1}
                className="cursor-pointer [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-blue-400 [&_[role=slider]]:to-purple-400 [&_[role=slider]]:border-white/20 [&_[role=slider]]:shadow-lg"
              />
            </div>
          </div>
        </div>

        {/* Right Controls - Settings, Fullscreen, Time */}
        <div className="flex items-center space-x-0.5 md:space-x-2">
          {/* Time - Mobile: Compact, visible on small screens */}
          <div className="flex md:hidden px-1.5 py-0.5 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <span className="text-white/90 text-xs font-mono font-medium">
              {formatTime(currentTime)}<span className="text-white/60">/</span>{formatTime(duration)}
            </span>
          </div>

          {/* Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-gradient-to-br hover:from-purple-500/20 hover:to-pink-500/20 hover:scale-105 p-1 md:p-2.5 rounded-xl transition-all duration-300 active:scale-95 min-w-[28px] min-h-[28px] md:min-w-[36px] md:min-h-[36px] group"
                aria-label="Settings menu"
                title="Settings"
              >
                <Settings className="w-3 h-3 md:w-5 md:h-5 group-hover:rotate-90 transition-transform duration-300" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 md:w-32 bg-slate-900/95 backdrop-blur-xl border-white/20 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
              <DropdownMenuLabel className="text-white font-semibold text-sm">Playback Speed</DropdownMenuLabel>
              {PLAYBACK_RATES.map(rate => (
                <DropdownMenuItem
                  key={rate}
                  onClick={() => onPlaybackRateChange(rate)}
                  className={`text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-500/20 rounded-lg mx-1 my-0.5 px-2 md:px-3 py-1.5 md:py-2 transition-all duration-200 text-sm md:text-base ${playbackRate === rate ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 border border-white/20' : ''}`}
                >
                  <span className="font-medium">{rate}x</span> {rate === 1 ? <span className="text-white/60 ml-1">(Normal)</span> : ''}
                </DropdownMenuItem>
              ))}
              
              {chapters.length > 0 && (
                <>
                  <DropdownMenuSeparator className="bg-white/20 my-2" />
                  <DropdownMenuLabel className="text-white font-semibold text-sm">Chapters</DropdownMenuLabel>
                  {chapters.map(chapter => (
                    <DropdownMenuItem
                      key={chapter.id}
                      onClick={() => {
                        onSeek(chapter.startTime)
                        onChapterChange?.(chapter)
                      }}
                      className={`text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-green-500/20 hover:to-blue-500/20 rounded-lg mx-1 my-0.5 px-2 md:px-3 py-1.5 md:py-2 transition-all duration-200 ${currentChapter?.id === chapter.id ? 'bg-gradient-to-r from-green-500/30 to-blue-500/30 border border-white/20' : ''}`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{chapter.title}</span>
                        <span className="text-xs text-white/60">{formatTime(chapter.startTime)}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              
              <DropdownMenuSeparator className="bg-white/20 my-2" />
              
              <DropdownMenuLabel className="text-white font-semibold text-sm">Quality</DropdownMenuLabel>
              {availableQualities.map(q => (
                <DropdownMenuItem
                  key={q}
                  onClick={() => onQualityChange(q)}
                  className={`text-white/90 hover:text-white hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-500/20 rounded-lg mx-1 my-0.5 px-2 md:px-3 py-1.5 md:py-2 transition-all duration-200 text-sm md:text-base ${quality === q ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-white/20' : ''}`}
                >
                  <span className="font-medium">{q === 'auto' ? 'Auto' : `${q}p`}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Picture-in-Picture - Hidden on very small screens */}
          {typeof window !== 'undefined' && 'pictureInPictureEnabled' in document && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onTogglePictureInPicture}
                className="flex text-white/80 hover:text-white hover:bg-gradient-to-br hover:from-cyan-500/20 hover:to-blue-500/20 hover:scale-105 p-1 md:p-2.5 rounded-xl transition-all duration-300 active:scale-95 min-w-[28px] min-h-[28px] md:min-w-[36px] md:min-h-[36px] group"
                title="Picture-in-Picture"
                aria-label={isPictureInPicture ? "Exit picture-in-picture mode" : "Enter picture-in-picture mode"}
              >
                {isPictureInPicture ? 
                  <PictureInPicture2 className="w-3 h-3 md:w-5 md:h-5 group-hover:scale-110 transition-transform duration-300" /> : 
                  <PictureInPicture className="w-3 h-3 md:w-5 md:h-5 group-hover:scale-110 transition-transform duration-300" />
                }
              </Button>
          )}

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            className="text-white/80 hover:text-white hover:bg-gradient-to-br hover:from-orange-500/20 hover:to-red-500/20 hover:scale-105 p-1 md:p-2.5 rounded-xl transition-all duration-300 active:scale-95 min-w-[28px] min-h-[28px] md:min-w-[36px] md:min-h-[36px] group"
            aria-label={isFullscreen ? "Exit fullscreen (F)" : "Enter fullscreen (F)"}
            title={isFullscreen ? "Exit fullscreen (F)" : "Enter fullscreen (F)"}
          >
            {isFullscreen ? 
              <Minimize className="w-3 h-3 md:w-5 md:h-5 group-hover:scale-110 transition-transform duration-300" /> : 
              <Maximize className="w-3 h-3 md:w-5 md:h-5 group-hover:scale-110 transition-transform duration-300" />
            }
          </Button>

          {/* Time - Desktop: Full display */}
          <div className="hidden md:block ml-2 md:ml-4 px-3 md:px-4 py-1.5 md:py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
            <span className="text-white/90 text-sm font-mono font-medium tracking-wide">
              {formatTime(currentTime)} <span className="text-white/60">/</span> {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})

VideoControls.displayName = 'VideoControls'
