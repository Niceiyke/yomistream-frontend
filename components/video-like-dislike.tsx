"use client"

import { useState, useEffect } from "react"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { getUserLikeStatus, likeVideo, dislikeVideo, removeLike } from "@/lib/api/videos"
import { cn } from "@/lib/utils"

interface VideoLikeDislikeProps {
  videoId: string
  likeCount: number
  dislikeCount: number
  onCountsUpdate?: (likeCount: number, dislikeCount: number) => void
  variant?: "default" | "compact"
  className?: string
}

export function VideoLikeDislike({
  videoId,
  likeCount: initialLikeCount,
  dislikeCount: initialDislikeCount,
  onCountsUpdate,
  variant = "default",
  className
}: VideoLikeDislikeProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [userStatus, setUserStatus] = useState<'like' | 'dislike' | null>(null)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount)
  const [loading, setLoading] = useState(false)

  // Fetch user's current like status
  useEffect(() => {
    if (user) {
      getUserLikeStatus(videoId)
        .then(response => {
          setUserStatus(response.user_like_status)
        })
        .catch(error => {
          console.error('Failed to fetch like status:', error)
        })
    }
  }, [videoId, user])

  // Update counts when props change
  useEffect(() => {
    setLikeCount(initialLikeCount)
    setDislikeCount(initialDislikeCount)
  }, [initialLikeCount, initialDislikeCount])

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to like videos"
      })
      return
    }

    setLoading(true)
    try {
      let newLikeCount = likeCount
      let newDislikeCount = dislikeCount
      let newStatus: 'like' | 'dislike' | null = null

      if (userStatus === 'like') {
        // Remove like
        await removeLike(videoId)
        newLikeCount = Math.max(0, likeCount - 1)
        newStatus = null
      } else if (userStatus === 'dislike') {
        // Change from dislike to like
        await likeVideo(videoId)
        newLikeCount = likeCount + 1
        newDislikeCount = Math.max(0, dislikeCount - 1)
        newStatus = 'like'
      } else {
        // Add like
        await likeVideo(videoId)
        newLikeCount = likeCount + 1
        newStatus = 'like'
      }

      setUserStatus(newStatus)
      setLikeCount(newLikeCount)
      setDislikeCount(newDislikeCount)
      
      if (onCountsUpdate) {
        onCountsUpdate(newLikeCount, newDislikeCount)
      }
    } catch (error) {
      console.error('Failed to like video:', error)
      toast({
        title: "Error",
        description: "Failed to like video. Please try again."
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDislike = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to dislike videos"
      })
      return
    }

    setLoading(true)
    try {
      let newLikeCount = likeCount
      let newDislikeCount = dislikeCount
      let newStatus: 'like' | 'dislike' | null = null

      if (userStatus === 'dislike') {
        // Remove dislike
        await removeLike(videoId)
        newDislikeCount = Math.max(0, dislikeCount - 1)
        newStatus = null
      } else if (userStatus === 'like') {
        // Change from like to dislike
        await dislikeVideo(videoId)
        newDislikeCount = dislikeCount + 1
        newLikeCount = Math.max(0, likeCount - 1)
        newStatus = 'dislike'
      } else {
        // Add dislike
        await dislikeVideo(videoId)
        newDislikeCount = dislikeCount + 1
        newStatus = 'dislike'
      }

      setUserStatus(newStatus)
      setLikeCount(newLikeCount)
      setDislikeCount(newDislikeCount)
      
      if (onCountsUpdate) {
        onCountsUpdate(newLikeCount, newDislikeCount)
      }
    } catch (error) {
      console.error('Failed to dislike video:', error)
      toast({
        title: "Error",
        description: "Failed to dislike video. Please try again."
      })
    } finally {
      setLoading(false)
    }
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          onClick={handleLike}
          variant="ghost"
          size="sm"
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 h-auto py-1.5 px-2.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200 rounded-lg group",
            userStatus === 'like' && "bg-blue-100 dark:bg-blue-900/30"
          )}
          title="Like"
        >
          <ThumbsUp 
            className={cn(
              "w-4 h-4 transition-all duration-200",
              userStatus === 'like' 
                ? "text-blue-600 dark:text-blue-400 fill-current scale-110" 
                : "text-blue-600 dark:text-blue-400 group-hover:scale-110"
            )} 
          />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {likeCount.toLocaleString()}
          </span>
        </Button>

        <Button
          onClick={handleDislike}
          variant="ghost"
          size="sm"
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 h-auto py-1.5 px-2.5 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 rounded-lg group",
            userStatus === 'dislike' && "bg-red-100 dark:bg-red-900/30"
          )}
          title="Dislike"
        >
          <ThumbsDown 
            className={cn(
              "w-4 h-4 transition-all duration-200",
              userStatus === 'dislike' 
                ? "text-red-600 dark:text-red-400 fill-current scale-110" 
                : "text-red-600 dark:text-red-400 group-hover:scale-110"
            )} 
          />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {dislikeCount.toLocaleString()}
          </span>
        </Button>
      </div>
    )
  }

  // Default variant - vertical layout
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        onClick={handleLike}
        variant="ghost"
        size="sm"
        disabled={loading}
        className={cn(
          "flex flex-col items-center gap-0.5 h-auto py-2 px-3 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200 rounded-lg group",
          userStatus === 'like' && "bg-blue-100 dark:bg-blue-900/30"
        )}
        title="Like"
      >
        <ThumbsUp 
          className={cn(
            "w-5 h-5 transition-all duration-200",
            userStatus === 'like' 
              ? "text-blue-600 dark:text-blue-400 fill-current scale-110" 
              : "text-blue-600 dark:text-blue-400 group-hover:scale-110"
          )} 
        />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {likeCount.toLocaleString()}
        </span>
      </Button>

      <Button
        onClick={handleDislike}
        variant="ghost"
        size="sm"
        disabled={loading}
        className={cn(
          "flex flex-col items-center gap-0.5 h-auto py-2 px-3 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 rounded-lg group",
          userStatus === 'dislike' && "bg-red-100 dark:bg-red-900/30"
        )}
        title="Dislike"
      >
        <ThumbsDown 
          className={cn(
            "w-5 h-5 transition-all duration-200",
            userStatus === 'dislike' 
              ? "text-red-600 dark:text-red-400 fill-current scale-110" 
              : "text-red-600 dark:text-red-400 group-hover:scale-110"
          )} 
        />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {dislikeCount.toLocaleString()}
        </span>
      </Button>
    </div>
  )
}
