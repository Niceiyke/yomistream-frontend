"use client"

import React, { useRef, useCallback } from 'react'

interface Chapter {
  id: string
  title: string
  startTime: number
  endTime?: number
  thumbnail?: string
}

interface ProgressBarProps {
  currentTime: number
  duration: number
  buffered: number
  poster?: string
  chapters?: Chapter[]
  showProgressBar: boolean
  showThumbnailPreview: boolean
  thumbnailPreviewTime: number
  thumbnailPreviewPosition: number
  
  onSeek: (time: number) => void
  onChapterChange?: (chapter: Chapter) => void
  onProgressHover: (e: React.MouseEvent) => void
  onProgressLeave: () => void
  onProgressClick: (e: React.MouseEvent) => void
  onProgressDrag: (e: React.MouseEvent) => void
  onShowControls: () => void
  
  formatTime: (seconds: number) => string
}

export const ProgressBar = React.memo(({
  currentTime,
  duration,
  buffered,
  poster,
  chapters = [],
  showProgressBar,
  showThumbnailPreview,
  thumbnailPreviewTime,
  thumbnailPreviewPosition,
  onSeek,
  onChapterChange,
  onProgressHover,
  onProgressLeave,
  onProgressClick,
  onProgressDrag,
  onShowControls,
  formatTime
}: ProgressBarProps) => {
  const progressRef = useRef<HTMLDivElement>(null)

  return (
    <div className={`absolute bottom-10 md:bottom-15 left-0 right-0 px-3 md:px-6 pb-2 transition-opacity duration-300 ${showProgressBar ? 'opacity-100' : 'opacity-0'}`}>
      <div
        ref={progressRef}
        className="relative h-1 md:h-1 bg-white/20 rounded-full cursor-pointer group/progress hover:h-1 md:hover:h-1.5 transition-all duration-200"
        onClick={onProgressClick}
        onMouseDown={onProgressDrag}
        onMouseMove={onProgressHover}
        onMouseLeave={onProgressLeave}
        onTouchStart={onShowControls}
      >
        {/* Buffer Progress */}
        <div 
          className="absolute top-0 left-0 h-full bg-white/40 rounded-full transition-all duration-300"
          style={{ width: `${buffered}%` }}
        />
        
        {/* Play Progress */}
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg transition-all duration-300"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />
        
        {/* Progress Handle */}
        {duration > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 bg-white rounded-full shadow-lg border-2 border-red-500 transition-all duration-200 hover:scale-110 z-10"
            style={{
              left: `${Math.min(100, Math.max(0, (currentTime / duration) * 100))}%`,
              marginLeft: '-6px'
            }}
          />
        )}
        
        {/* Chapter Markers */}
        {chapters.map(chapter => (
          <div
            key={chapter.id}
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-400 rounded-full opacity-70 hover:opacity-100 cursor-pointer transition-all duration-200 hover:scale-125"
            style={{ left: `${(chapter.startTime / duration) * 100}%`, marginLeft: '-3px' }}
            onClick={(e) => {
              e.stopPropagation()
              onSeek(chapter.startTime)
              onChapterChange?.(chapter)
            }}
            title={`${chapter.title} (${formatTime(chapter.startTime)})`}
          />
        ))}
      </div>
      
      {/* Thumbnail Preview */}
      {showThumbnailPreview && poster && (
        <div 
          className="absolute bottom-8 md:bottom-10 left-0 transform -translate-x-1/2 pointer-events-none z-50"
          style={{ left: `${thumbnailPreviewPosition}%` }}
        >
          <div className="bg-black/95 rounded-xl p-2 md:p-3 shadow-2xl border border-white/20 backdrop-blur-sm">
            <img 
              src={poster} 
              alt="Video thumbnail"
              className="w-32 h-18 md:w-40 md:h-24 object-cover rounded-lg"
            />
            <div className="text-white text-xs md:text-sm text-center mt-2 font-mono bg-black/50 rounded px-2 py-1">
              {formatTime(thumbnailPreviewTime)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

ProgressBar.displayName = 'ProgressBar'
