"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function AdminAnalytics() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          View detailed analytics and performance metrics for the platform.
        </p>
      </div>

      {/* Coming Soon */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle>Platform Analytics</CardTitle>
          <CardDescription>
            This feature is coming soon. You'll be able to view comprehensive analytics, user engagement metrics, and performance data from this interface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Analytics Dashboard</h3>
              <p>Full analytics and reporting capabilities will be available here.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
