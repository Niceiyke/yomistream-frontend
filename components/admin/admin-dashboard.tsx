"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  Video,
  Image as ImageIcon,
  BarChart3,
  TrendingUp,
  Activity,
  RefreshCw
} from "lucide-react"

interface AdminDashboardProps {
  stats?: {
    totalVideos?: number
    totalPreachers?: number
    totalUsers?: number
    totalCollections?: number
  }
}

export function AdminDashboard({ stats }: AdminDashboardProps) {
  const dashboardStats = [
    {
      title: "Total Videos",
      value: stats?.totalVideos ?? 0,
      icon: Video,
      description: "Videos in platform",
      trend: "+12% from last month",
      color: "text-blue-600"
    },
    {
      title: "Total Preachers",
      value: stats?.totalPreachers ?? 0,
      icon: Users,
      description: "Preachers registered",
      trend: "+3 new this week",
      color: "text-green-600"
    },
    {
      title: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      description: "Registered users",
      trend: "+8% from last month",
      color: "text-purple-600"
    },
    {
      title: "Collections",
      value: stats?.totalCollections ?? 0,
      icon: Video,
      description: "Video collections",
      trend: "+2 new collections",
      color: "text-orange-600"
    }
  ]

  const recentActivity = [
    {
      action: "New video uploaded",
      details: "Sunday Sermon - Faith in Action",
      time: "2 hours ago",
      type: "video"
    },
    {
      action: "User registered",
      details: "john.doe@example.com",
      time: "4 hours ago",
      type: "user"
    },
    {
      action: "Image uploaded",
      details: "Church banner for Easter",
      time: "6 hours ago",
      type: "image"
    },
    {
      action: "Preacher profile updated",
      details: "Pastor Michael Johnson",
      time: "1 day ago",
      type: "preacher"
    }
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Yomistream admin portal. Monitor platform performance and manage content.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">{stat.trend}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 bg-card border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest platform activities and updates
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className={`p-2 rounded-full ${
                    activity.type === 'video' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'user' ? 'bg-green-100 text-green-600' :
                    activity.type === 'image' ? 'bg-purple-100 text-purple-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    {activity.type === 'video' && <Video className="h-4 w-4" />}
                    {activity.type === 'user' && <Users className="h-4 w-4" />}
                    {activity.type === 'image' && <ImageIcon className="h-4 w-4" />}
                    {activity.type === 'preacher' && <Users className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {activity.action}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.details}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & System Status */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Video className="h-4 w-4 mr-2" />
                Upload New Video
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Add New Preacher
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <ImageIcon className="h-4 w-4 mr-2" />
                Upload Images
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Platform health indicators
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">API Status</span>
                <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <Badge className="bg-green-100 text-green-800">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Storage</span>
                <Badge className="bg-green-100 text-green-800">Available</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Transcoding</span>
                <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
