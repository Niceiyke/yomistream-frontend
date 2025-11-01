"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tv, Video as VideoIcon, Eye, Calendar, Heart, DollarSign, Bell, Share2, ExternalLink, Settings } from "lucide-react"
import { Channel, Video } from "@/lib/types/content"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/lib/auth-context"
import { apiPost, apiDelete } from "@/lib/api"
import { toast } from "sonner"
import { ShareDialog } from "@/components/share-dialog"
import { AppHeader } from "@/components/app-header"

interface ChannelDetailClientProps {
  channel: Channel
  initialVideos: Video[]
  totalVideos: number
}

export default function ChannelDetailClient({
  channel,
  initialVideos,
  totalVideos,
}: ChannelDetailClientProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [videos] = useState<Video[]>(initialVideos)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({})

  // Check if current user is the channel owner
  const isOwner = user?.id === channel.owner_id

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A"
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  const handleFollow = async () => {
    if (!user) {
      toast.error("Please sign in to follow this channel")
      router.push("/auth/signin")
      return
    }

    setActionLoading({ ...actionLoading, follow: true })
    try {
      if (isFollowing) {
        await apiDelete(`/api/v1/channels/${channel.id}/follow`)
        setIsFollowing(false)
        toast.success("Unfollowed channel")
      } else {
        await apiPost(`/api/v1/channels/${channel.id}/follow`, {})
        setIsFollowing(true)
        toast.success("Following channel")
      }
    } catch (error) {
      toast.error("Failed to update follow status")
    } finally {
      setActionLoading({ ...actionLoading, follow: false })
    }
  }

  const handleSubscribe = async () => {
    if (!user) {
      toast.error("Please sign in to subscribe")
      router.push("/auth/signin")
      return
    }

    setActionLoading({ ...actionLoading, subscribe: true })
    try {
      if (isSubscribed) {
        await apiDelete(`/api/v1/channels/${channel.id}/subscribe`)
        setIsSubscribed(false)
        toast.success("Unsubscribed from notifications")
      } else {
        await apiPost(`/api/v1/channels/${channel.id}/subscribe`, {})
        setIsSubscribed(true)
        toast.success("Subscribed to notifications")
      }
    } catch (error) {
      toast.error("Failed to update subscription")
    } finally {
      setActionLoading({ ...actionLoading, subscribe: false })
    }
  }

  const handleTip = () => {
    if (!user) {
      toast.error("Please sign in to tip the creator")
      router.push("/auth/signin")
      return
    }
    // TODO: Implement tip/donation modal
    toast.info("Tipping feature coming soon!")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-blue-950 dark:to-purple-950">
      {/* App Header */}
      <AppHeader
        showActions={true}
        backButton={{
          label: "← Back",
          onClick: () => router.back(),
          scroll: false
        }}
      />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Channel Header */}
        <Card className="mb-8 border-slate-200 dark:border-slate-800 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-6 flex-col lg:flex-row">
              <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex-shrink-0">
                <Tv className="w-12 h-12 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 w-full">
                <CardTitle className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">
                  {channel.name}
                </CardTitle>
                {channel.description && (
                  <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-4">
                    {channel.description}
                  </p>
                )}
                
                {/* Statistics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-t border-slate-200 dark:border-slate-700 mb-6">
                  <div className="text-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{(channel.subscriber_count ?? 0).toLocaleString()}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">Subscribers</div>
                  </div>
                  <div className="text-center bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{(channel.video_count ?? 0).toLocaleString()}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">Videos</div>
                  </div>
                  <div className="text-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 p-4 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">{(channel.total_views ?? 0).toLocaleString()}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">Total Views</div>
                  </div>
                  <div className="text-center bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/50 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                      {Math.round((channel.total_watch_time ?? 0) / 3600)}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">Hours Watched</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm mb-6">
                  <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">
                    Created {formatDistanceToNow(new Date(channel.created_at), { addSuffix: true })}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Studio Button - Only for channel owner */}
                  {isOwner && (
                    <Button
                      onClick={() => router.push(`/studio/channel/${channel.id}`)}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Go to Studio
                    </Button>
                  )}

                  {/* Follow Button - Hidden for channel owner */}
                  {!isOwner && (
                    <Button
                      onClick={handleFollow}
                      disabled={actionLoading.follow}
                      className={`${
                        isFollowing
                          ? "bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      } transition-all duration-200 shadow-lg hover:shadow-xl`}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${isFollowing ? "fill-current" : ""}`} />
                      {isFollowing ? "Following" : "Follow"}
                    </Button>
                  )}

                  {!isOwner && (
                    <Button
                      onClick={handleSubscribe}
                      disabled={actionLoading.subscribe}
                      variant="outline"
                      className="border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-600 dark:hover:text-white transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <Bell className={`w-4 h-4 mr-2 ${isSubscribed ? "fill-current" : ""}`} />
                      {isSubscribed ? "Subscribed" : "Subscribe"}
                    </Button>
                  )}

                  <Button
                    onClick={handleTip}
                    variant="outline"
                    className="border-2 border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-600 dark:hover:text-white transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Tip Creator
                  </Button>

                  <ShareDialog
                    content={{
                      title: channel.name,
                      text: `Check out ${channel.name} on Wordlyte`,
                      url: typeof window !== "undefined" ? window.location.href : "",
                      type: "video"
                    }}
                  >
                    <Button
                      variant="outline"
                      className="border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white dark:border-green-400 dark:text-green-400 dark:hover:bg-green-600 dark:hover:text-white transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </ShareDialog>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Videos Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Videos ({totalVideos})
          </h2>
        </div>

        {videos.length === 0 ? (
          <Card className="border-slate-200 dark:border-slate-800 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <VideoIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                No videos available in this channel yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Card
                key={video.id}
                className="group cursor-pointer border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-300 hover:shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden"
                onClick={() => router.push(`/video/${video.id}`)}
              >
                <div className="relative aspect-video bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoIcon className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                  {video.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                      {formatDuration(video.duration)}
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                      {video.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{video.view_count?.toLocaleString() || 0}</span>
                    </div>
                    {video.created_at && (
                      <span>
                        {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
