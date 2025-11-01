import { Metadata } from "next"
import { notFound } from "next/navigation"
import ChannelDetailClient from "./channel-detail-client"

interface ChannelPageProps {
  params: {
    id: string
  }
}

// Fetch channel data server-side
async function getChannel(channelId: string) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8002"
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/channels/${channelId}`, {
      next: { revalidate: 300 }, // Revalidate every 5 minutes
    })

    if (!res.ok) {
      return null
    }

    return res.json()
  } catch (error) {
    console.error("Error fetching channel:", error)
    return null
  }
}

// Fetch channel videos
async function getChannelVideos(channelId: string) {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8002"
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/videos?channel_id=${channelId}&limit=50`, {
      next: { revalidate: 120 }, // Revalidate every 2 minutes
    })

    if (!res.ok) {
      return { items: [], total: 0 }
    }

    return res.json()
  } catch (error) {
    console.error("Error fetching channel videos:", error)
    return { items: [], total: 0 }
  }
}

export async function generateMetadata({ params }: ChannelPageProps): Promise<Metadata> {
  const channel = await getChannel(params.id)

  if (!channel) {
    return {
      title: "Channel Not Found",
    }
  }

  return {
    title: `${channel.name} - Wordlyte`,
    description: channel.description || `Watch videos from ${channel.name}`,
  }
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const [channel, videosData] = await Promise.all([
    getChannel(params.id),
    getChannelVideos(params.id),
  ])

  if (!channel) {
    notFound()
  }

  return <ChannelDetailClient channel={channel} initialVideos={videosData.items} totalVideos={videosData.total} />
}
