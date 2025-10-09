"use client"

import { CustomVideoPlayer } from "./custom-video-player"

export const VideoPlayerDemo = () => {
  // Sample HLS variants for testing
  const sampleHlsVariants = [
    { url: "https://example.com/video_720p.m3u8", quality: "720p", bandwidth: 2000000 },
    { url: "https://example.com/video_480p.m3u8", quality: "480p", bandwidth: 1000000 },
    { url: "https://example.com/video_360p.m3u8", quality: "360p", bandwidth: 500000 }
  ]

  // Sample ads for testing
  const sampleAds = [
    {
      id: "pre-roll-1",
      type: "pre-roll" as const,
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      duration: 15,
      skipAfter: 5,
      title: "Christian Book Store",
      advertiser: "Faith Books",
      clickUrl: "https://example.com/christian-books"
    },
    {
      id: "mid-roll-1", 
      type: "mid-roll" as const,
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      duration: 30,
      skipAfter: 10,
      triggerTime: 120, // 2 minutes
      title: "Christian Conference 2024",
      advertiser: "Faith Events"
    }
  ]

  // Sample watermark
  const sampleWatermark = {
    src: "/yomistream-logo.png",
    position: "bottom-right" as const,
    opacity: 0.7,
    size: "small" as const,
    clickUrl: "https://yomistream.com"
  }

  // Sample logo
  const sampleLogo = {
    src: "/pastor-logo.png", 
    position: "top-left" as const,
    size: "medium" as const,
    showDuration: 10, // Show for 10 seconds
    clickUrl: "https://pastorwebsite.com"
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Custom Video Player Demo</h1>
        <p className="text-muted-foreground">
          YouTube-like video player with HLS support for Yomistream
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Features Included:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h3 className="font-medium text-primary">Core Features</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• HLS streaming support</li>
                <li>• Multiple video formats (MP4, WebM, HLS)</li>
                <li>• Auto-quality selection</li>
                <li>• Manual quality control</li>
                <li>• Playback speed control (0.25x - 2x)</li>
                <li>• Custom watermarks & logos</li>
                <li>• Ad serving (pre-roll, mid-roll, post-roll)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-primary">YouTube-like Controls</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Play/pause with large center button</li>
                <li>• Seekable progress bar with buffer display</li>
                <li>• Volume control with slider</li>
                <li>• Fullscreen toggle</li>
                <li>• Picture-in-Picture mode</li>
                <li>• Auto-hiding controls</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-primary">Keyboard Shortcuts</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Space: Play/Pause</li>
                <li>• ← →: Seek backward/forward (10s)</li>
                <li>• ↑ ↓: Volume up/down</li>
                <li>• M: Mute/unmute</li>
                <li>• F: Fullscreen toggle</li>
                <li>• P: Picture-in-Picture toggle</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-primary">Mobile & Accessibility</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Touch-friendly controls</li>
                <li>• Responsive design</li>
                <li>• Double-tap for fullscreen</li>
                <li>• Loading states & error handling</li>
                <li>• ARIA labels for accessibility</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border">
          <h3 className="text-lg font-semibold mb-4">Sample Player</h3>
          <div className="aspect-video">
            <CustomVideoPlayer
              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
              hlsVariants={sampleHlsVariants}
              poster="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg"
              autoPlay={false}
              startTime={0}
              ads={sampleAds}
              watermark={sampleWatermark}
              logo={sampleLogo}
              onTimeUpdate={(time) => console.log('Time:', time)}
              onEnded={() => console.log('Video ended')}
              onAdStart={(ad) => console.log('Ad started:', ad.title)}
              onAdEnd={(ad) => console.log('Ad ended:', ad.title)}
              onAdSkip={(ad) => console.log('Ad skipped:', ad.title)}
              onAdClick={(ad) => console.log('Ad clicked:', ad.title)}
              className="w-full h-full"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            * This demo uses a sample video. In production, it will work with your HLS streams and video files.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Integration Guide</h3>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Basic Usage:</h4>
              <pre className="bg-background rounded p-3 overflow-x-auto">
{`<CustomVideoPlayer
  src="video.m3u8"
  hlsVariants={[
    { url: "720p.m3u8", quality: "720p" },
    { url: "480p.m3u8", quality: "480p" }
  ]}
  poster="thumbnail.jpg"
  autoPlay={true}
  startTime={30}
  onTimeUpdate={(time) => console.log(time)}
  className="w-full h-full"
/>`}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">Required Dependencies:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• hls.js (already installed) - For HLS streaming</li>
                <li>• @radix-ui/react-slider (already installed) - For volume control</li>
                <li>• @radix-ui/react-dropdown-menu (already installed) - For settings menu</li>
                <li>• lucide-react (already installed) - For control icons</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
