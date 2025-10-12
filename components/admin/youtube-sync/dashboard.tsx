'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SyncChannelsForm } from './sync-channels-form'
import { SyncStatus } from './sync-status'
import { VideoList } from './video-list'

export function YoutubeSyncDashboard() {
  const [activeTab, setActiveTab] = useState('sync')

  return (
    <Tabs defaultValue="sync" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="sync">Sync Channels</TabsTrigger>
        <TabsTrigger value="videos">Synced Videos</TabsTrigger>
        <TabsTrigger value="status">Sync Status</TabsTrigger>
      </TabsList>

      <TabsContent value="sync">
        <Card>
          <CardHeader>
            <CardTitle>Synchronize YouTube Channels</CardTitle>
            <CardDescription>
              Fetch videos from YouTube channels and sync them with Yomistream
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SyncChannelsForm />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="videos">
        <Card>
          <CardHeader>
            <CardTitle>Synced Videos</CardTitle>
            <CardDescription>
              View and manage videos synced from YouTube
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VideoList />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="status">
        <Card>
          <CardHeader>
            <CardTitle>Sync Status</CardTitle>
            <CardDescription>
              View current and historical sync operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SyncStatus />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
