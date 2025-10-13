"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function AdminImageGallery() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Image Library</h1>
        <p className="text-muted-foreground">
          Manage uploaded images, thumbnails, and media assets.
        </p>
      </div>

      {/* Coming Soon */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle>Image Gallery</CardTitle>
          <CardDescription>
            This feature is coming soon. You'll be able to view, upload, and manage all platform images from this interface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Image Management System</h3>
              <p>Full image gallery and management capabilities will be available here.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
