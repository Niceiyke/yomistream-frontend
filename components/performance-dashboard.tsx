"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  Zap, 
  Wifi, 
  Download, 
  X, 
  BarChart3,
  Clock,
  Database
} from 'lucide-react'
import { usePerformanceMonitor } from '@/lib/hooks/use-performance-monitor'

interface PerformanceDashboardProps {
  isOpen: boolean
  onClose: () => void
}

export function PerformanceDashboard({ isOpen, onClose }: PerformanceDashboardProps) {
  const { metrics, getMetricsSummary, resetMetrics } = usePerformanceMonitor()
  const [summary, setSummary] = useState(getMetricsSummary())

  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setSummary(getMetricsSummary())
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isOpen, getMetricsSummary])

  if (!isOpen) return null

  const getConnectionColor = (quality: string) => {
    switch (quality) {
      case 'fast': return 'bg-green-500'
      case 'medium': return 'bg-yellow-500'
      case 'slow': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency > 0.7) return 'text-green-600'
    if (efficiency > 0.4) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Performance Dashboard</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Connection Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Wifi className="w-4 h-4" />
                <span>Connection Quality</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${getConnectionColor(summary.connectionQuality)}`} />
                <Badge variant="outline" className="capitalize">
                  {summary.connectionQuality}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Optimizations active based on network speed
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <Download className="w-4 h-4 text-blue-500" />
                  <span>Prefetches</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.prefetchCount}</div>
                <p className="text-xs text-muted-foreground">API calls made</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-purple-500" />
                  <span>Previews</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.previewCount}</div>
                <p className="text-xs text-muted-foreground">Videos loaded</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <X className="w-4 h-4 text-red-500" />
                  <span>Cancelled</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.cancelledRequests}</div>
                <p className="text-xs text-muted-foreground">Requests stopped</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <Database className="w-4 h-4 text-green-500" />
                  <span>Saved</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.bandwidthSavedMB}MB</div>
                <p className="text-xs text-muted-foreground">Bandwidth saved</p>
              </CardContent>
            </Card>
          </div>

          {/* Efficiency Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span>Efficiency</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getEfficiencyColor(summary.efficiency)}`}>
                  {Math.round(summary.efficiency * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Cancelled vs Total requests
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>Avg Load Time</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(summary.averageLoadTime)}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  Navigation performance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-green-500" />
                  <span>Recent Events</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.recentEvents}</div>
                <p className="text-xs text-muted-foreground">
                  Last 5 minutes
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Performance Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.efficiency > 0.7 && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">Excellent efficiency! Most requests are being cancelled appropriately.</span>
                </div>
              )}
              
              {summary.bandwidthSavedMB > 10 && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <Database className="w-4 h-4" />
                  <span className="text-sm">Great bandwidth savings! You've saved {summary.bandwidthSavedMB}MB of data.</span>
                </div>
              )}
              
              {summary.connectionQuality === 'slow' && (
                <div className="flex items-center space-x-2 text-orange-600">
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm">Slow connection detected. Previews are disabled to improve performance.</span>
                </div>
              )}
              
              {summary.averageLoadTime < 100 && summary.averageLoadTime > 0 && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Fast navigation! Average load time is under 100ms.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={resetMetrics}>
              Reset Metrics
            </Button>
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PerformanceDashboard
