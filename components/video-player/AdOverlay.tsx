"use client"

import React from 'react'
import { Button } from "@/components/ui/button"

interface Ad {
  id: string
  type: 'pre-roll' | 'mid-roll' | 'post-roll'
  url: string
  duration: number
  skipAfter?: number
  clickUrl?: string
  title?: string
  advertiser?: string
  triggerTime?: number
}

interface AdOverlayProps {
  currentAd: Ad
  adTimeRemaining: number
  canSkipAd: boolean
  onAdClick: () => void
  onSkipAd: () => void
}

export const AdOverlay = React.memo(({
  currentAd,
  adTimeRemaining,
  canSkipAd,
  onAdClick,
  onSkipAd
}: AdOverlayProps) => {
  return (
    <div className="absolute inset-0 z-20">
      {/* Ad Click Area */}
      <div 
        className="absolute inset-0 cursor-pointer"
        onClick={onAdClick}
      />
      
      {/* Ad Info */}
      <div className="absolute top-4 left-4 bg-black/70 rounded px-3 py-2 text-white text-sm">
        <div className="font-semibold">Advertisement</div>
        {currentAd.advertiser && (
          <div className="text-xs opacity-75">{currentAd.advertiser}</div>
        )}
      </div>

      {/* Ad Timer */}
      <div className="absolute top-4 right-4 bg-black/70 rounded px-3 py-2 text-white text-sm font-mono">
        {Math.ceil(adTimeRemaining)}s
      </div>

      {/* Skip Ad Button */}
      {canSkipAd && (
        <div className="absolute bottom-20 right-4">
          <Button
            onClick={onSkipAd}
            className="bg-white/90 hover:bg-white text-black font-semibold"
            size="sm"
          >
            Skip Ad
          </Button>
        </div>
      )}
    </div>
  )
})

AdOverlay.displayName = 'AdOverlay'
