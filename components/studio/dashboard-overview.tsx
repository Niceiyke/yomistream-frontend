"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Video,
  Image as ImageIcon,
  Users,
  TrendingUp,
  Clock,
  Eye,
  Upload
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardOverviewProps {
  stats?: {
    totalVideos: number
    totalViews: number
    totalLikes: number
    totalComments: number
    recentUploads: number
    channelSubscribers: number
  }
}

export function DashboardOverview({ stats }: DashboardOverviewProps) {
  // Mock data for recent activity - replace with real data
  const recentUploads = [
    { id: "1", type: "video", title: "Sunday Sermon - Faith in Action", date: "2 hours ago", status: "published" },
    { id: "2", type: "image", title: "Pastor John Portrait", date: "1 day ago", status: "uploaded" },
    { id: "3", type: "video", title: "Youth Ministry Update", date: "3 days ago", status: "processing" },
  ]

  const quickStats = [
    {
      label: "Total Videos",
      value: stats?.totalVideos || 0,
      icon: Video,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      label: "Total Views",
      value: stats?.totalViews || 0,
      icon: Eye,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      label: "Channel Subscribers",
      value: stats?.channelSubscribers || 0,
      icon: Users,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      label: "Recent Uploads",
      value: stats?.recentUploads || 0,
      icon: TrendingUp,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Welcome to Your Studio</h2>
          <p className="text-muted-foreground mt-1">
            Manage your Christian content, upload images, and track your impact
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Upload className="h-4 w-4 mr-2" />
          Upload Content
        </Button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="bg-card border-border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                  <div className={cn("p-3 rounded-full", stat.bgColor)}>
                    <Icon className={cn("h-6 w-6", stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your latest uploads and content updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentUploads.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    {item.type === "video" ? (
                      <Video className="h-4 w-4 text-primary" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                </div>
                <Badge
                  variant={item.status === "published" ? "default" : item.status === "processing" ? "secondary" : "outline"}
                  className="text-xs"
                >
                  {item.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
            <CardDescription className="text-muted-foreground">
              Common tasks to get you started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start h-auto p-4">
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-full bg-primary/10">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Upload Video</div>
                  <div className="text-sm text-muted-foreground">Add a new sermon or teaching</div>
                </div>
              </div>
            </Button>

            <Button variant="outline" className="w-full justify-start h-auto p-4">
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-full bg-green-500/10">
                  <ImageIcon className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Upload Images</div>
                  <div className="text-sm text-muted-foreground">Add thumbnails, banners, or photos</div>
                </div>
              </div>
            </Button>

            <Button variant="outline" className="w-full justify-start h-auto p-4">
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-full bg-purple-500/10">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Manage Preachers</div>
                  <div className="text-sm text-muted-foreground">Update speaker profiles and info</div>
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
