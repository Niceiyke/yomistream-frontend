"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Clock,
  Video,
  Image as ImageIcon,
  Calendar,
  Download
} from "lucide-react"

export function AnalyticsDashboard() {
  // Mock analytics data - replace with real API data
  const stats = {
    totalViews: 15420,
    totalVideos: 45,
    totalImages: 28,
    totalUsers: 1234,
    avgWatchTime: "12m 34s",
    topPerforming: {
      video: "Sunday Sermon: Faith in Action",
      views: 2840,
      growth: 23.5
    }
  }

  const recentActivity = [
    { action: "Video uploaded", item: "Youth Ministry Update", time: "2 hours ago", type: "video" },
    { action: "Image uploaded", item: "Church Banner", time: "5 hours ago", type: "image" },
    { action: "Video published", item: "Prayer Service", time: "1 day ago", type: "video" },
    { action: "Image downloaded", item: "Pastor Profile", time: "2 days ago", type: "image" },
  ]

  const weeklyData = [
    { day: "Mon", views: 1200, uploads: 3 },
    { day: "Tue", views: 1800, uploads: 2 },
    { day: "Wed", views: 1400, uploads: 4 },
    { day: "Thu", views: 2200, uploads: 1 },
    { day: "Fri", views: 1900, uploads: 2 },
    { day: "Sat", views: 2800, uploads: 5 },
    { day: "Sun", views: 3200, uploads: 6 },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Analytics</h2>
          <p className="text-muted-foreground mt-1">
            Track your content performance and audience engagement
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 days
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.totalViews.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">+12.5% from last month</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <Eye className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Videos</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.totalVideos}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">+3 this week</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <Video className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Images Uploaded</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.totalImages}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">+5 this week</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-purple-500/10">
                <ImageIcon className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Watch Time</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.avgWatchTime}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-red-600">-2.1% from last month</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-orange-500/10">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Performance */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Weekly Performance
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Views and uploads over the past week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weeklyData.map((day) => (
                <div key={day.day} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-8 text-sm font-medium text-foreground">{day.day}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Eye className="h-3 w-3 text-blue-500" />
                        <span className="text-sm text-muted-foreground">{day.views} views</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Video className="h-3 w-3 text-green-500" />
                        <span className="text-sm text-muted-foreground">{day.uploads} uploads</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-20 bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${(day.views / 3200) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Content */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Top Performing Content</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your most viewed content this month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-accent/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{stats.topPerforming.video}</h4>
                  <p className="text-sm text-muted-foreground">{stats.topPerforming.views.toLocaleString()} views</p>
                </div>
              </div>
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                +{stats.topPerforming.growth}%
              </Badge>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Other Top Videos</h4>
              {[
                { title: "Prayer and Worship Night", views: 1840, growth: 15.2 },
                { title: "Youth Ministry Update", views: 1420, growth: 8.7 },
                { title: "Bible Study: Romans 8", views: 1280, growth: 22.1 },
              ].map((video, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {index + 2}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{video.title}</p>
                      <p className="text-xs text-muted-foreground">{video.views} views</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    +{video.growth}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Activity</CardTitle>
          <CardDescription className="text-muted-foreground">
            Latest uploads and interactions with your content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-accent/30">
                <div className="p-2 rounded-full bg-primary/10">
                  {activity.type === "video" ? (
                    <Video className="h-4 w-4 text-primary" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {activity.action}: <span className="font-normal">{activity.item}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
