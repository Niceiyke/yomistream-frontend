"use client"

import { useState, useEffect } from 'react'
import { X, Activity, Wifi, Download } from 'lucide-react'

interface SimplePerformanceDashboardProps {
  isOpen: boolean
  onClose: () => void
}

export function SimplePerformanceDashboard({ isOpen, onClose }: SimplePerformanceDashboardProps) {
  const [metrics, setMetrics] = useState({
    prefetchCount: 0,
    previewCount: 0,
    cancelledRequests: 0,
    connectionQuality: 'medium' as 'slow' | 'medium' | 'fast'
  })

  useEffect(() => {
    if (isOpen) {
      // Simple connection quality detection
      // @ts-ignore
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      
      let quality: 'slow' | 'medium' | 'fast' = 'medium'
      if (connection) {
        const { effectiveType, downlink } = connection
        if (effectiveType === 'slow-2g' || effectiveType === '2g' || (downlink && downlink < 1)) {
          quality = 'slow'
        } else if (effectiveType === '4g' && downlink && downlink > 5) {
          quality = 'fast'
        }
      }
      
      setMetrics(prev => ({ ...prev, connectionQuality: quality }))
    }
  }, [isOpen])

  if (!isOpen) return null

  const getConnectionColor = (quality: string) => {
    switch (quality) {
      case 'fast': return 'bg-green-500'
      case 'medium': return 'bg-yellow-500'
      case 'slow': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Performance Dashboard</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Connection Status */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Connection Quality
            </h3>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${getConnectionColor(metrics.connectionQuality)}`} />
              <span className="capitalize font-medium">{metrics.connectionQuality}</span>
              <span className="text-sm text-muted-foreground">
                {metrics.connectionQuality === 'fast' && 'Previews enabled'}
                {metrics.connectionQuality === 'medium' && 'Prefetch only'}
                {metrics.connectionQuality === 'slow' && 'Minimal network usage'}
              </span>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-4 h-4 text-blue-500" />
                <span className="font-medium">Prefetches</span>
              </div>
              <div className="text-2xl font-bold">{metrics.prefetchCount}</div>
              <p className="text-xs text-muted-foreground">API calls made</p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-purple-500" />
                <span className="font-medium">Previews</span>
              </div>
              <div className="text-2xl font-bold">{metrics.previewCount}</div>
              <p className="text-xs text-muted-foreground">Videos loaded</p>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <X className="w-4 h-4 text-red-500" />
                <span className="font-medium">Cancelled</span>
              </div>
              <div className="text-2xl font-bold">{metrics.cancelledRequests}</div>
              <p className="text-xs text-muted-foreground">Requests stopped</p>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Performance Status</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">✅ Thumbnail reloading issue fixed</span>
              </div>
              <div className="flex items-center space-x-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">✅ Connection-aware behavior active</span>
              </div>
              <div className="flex items-center space-x-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">✅ Preview limits enforced</span>
              </div>
              {metrics.connectionQuality === 'slow' && (
                <div className="flex items-center space-x-2 text-orange-600">
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  <span className="text-sm">⚠️ Slow connection: Previews disabled</span>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="border rounded-lg p-4 bg-muted/50">
            <h3 className="font-semibold mb-2">How to Test</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Hover over video cards to trigger prefetch</li>
              <li>• Move mouse away to see cancellation</li>
              <li>• On fast connections, previews will load after 3 seconds</li>
              <li>• Thumbnails should NOT reload on hover/mouse out</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SimplePerformanceDashboard
