// No Ads Demo Component
// Test different no-ads scenarios

"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EnhancedVideoPlayer } from './enhanced-video-player'

export const NoAdsDemo: React.FC = () => {
  const [scenario, setScenario] = useState<'normal' | 'no-ads' | 'failed-ads'>('no-ads')

  const demoVideo = {
    id: 'demo-video-123',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    poster: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg'
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>No Ads Behavior Demo</CardTitle>
          <p className="text-muted-foreground">
            Test how the video player handles different ad availability scenarios
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scenario Selector */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={scenario === 'no-ads' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScenario('no-ads')}
            >
              No Ads Available
              <Badge variant="secondary" className="ml-2">Current</Badge>
            </Button>
            <Button
              variant={scenario === 'failed-ads' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScenario('failed-ads')}
            >
              Ad Request Failed
            </Button>
            <Button
              variant={scenario === 'normal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScenario('normal')}
            >
              Normal (With Ads)
            </Button>
          </div>

          {/* Scenario Description */}
          <div className="bg-muted p-4 rounded-lg">
            {scenario === 'no-ads' && (
              <div>
                <h4 className="font-semibold mb-2">🎯 No Ads Available</h4>
                <p className="text-sm text-muted-foreground">
                  Backend returns empty ads array. Video plays immediately without interruption.
                  Based on configuration, may show brief message or fallback content.
                </p>
              </div>
            )}
            {scenario === 'failed-ads' && (
              <div>
                <h4 className="font-semibold mb-2">⚠️ Ad Request Failed</h4>
                <p className="text-sm text-muted-foreground">
                  Ad service is unreachable or returns error. Falls back to default behavior
                  and continues with video playback.
                </p>
              </div>
            )}
            {scenario === 'normal' && (
              <div>
                <h4 className="font-semibold mb-2">✅ Normal Operation</h4>
                <p className="text-sm text-muted-foreground">
                  Ads are successfully loaded and will play at appropriate times
                  (pre-roll, mid-roll, post-roll).
                </p>
              </div>
            )}
          </div>

          {/* Current Configuration */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">📋 Current No-Ads Configuration</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Fallback Behavior:</strong> Skip (immediate playback)
              </div>
              <div>
                <strong>Show Message:</strong> Disabled
              </div>
              <div>
                <strong>Show Fallback Content:</strong> Disabled
              </div>
              <div>
                <strong>Track Events:</strong> Enabled
              </div>
              <div>
                <strong>Donation Prompt:</strong> Disabled
              </div>
              <div>
                <strong>Subscription Prompt:</strong> Disabled
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Player */}
      <div className="aspect-video">
        <EnhancedVideoPlayer
          videoId={demoVideo.id}
          videoUrl={demoVideo.url}
          poster={demoVideo.poster}
          autoPlay={false}
          userId="demo-user"
          watermark={{
            src: "/yomistream-logo.png",
            position: "bottom-right",
            opacity: 0.8,
            size: "small"
          }}
        />
      </div>

      {/* Expected Behavior */}
      <Card>
        <CardHeader>
          <CardTitle>Expected Behavior</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <strong>Video Loads Immediately:</strong> No waiting for ads to load
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <strong>All Features Work:</strong> Watermark, controls, fullscreen, PiP
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <strong>Debug Info Shows:</strong> "Ads Loaded: 0" in development mode
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <strong>Console Logs:</strong> "No ads available for this video"
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <strong>Analytics:</strong> No-ads event tracked for reporting
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default NoAdsDemo
