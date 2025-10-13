"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, Star, BookOpen, Users, Crown, Cross } from "lucide-react"

export function ColorSystemDemo() {
  return (
    <div className="p-8 space-y-8 bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">Yomistream Color System</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          A spiritually-inspired color palette designed for Christian content,
          conveying themes of faith, hope, grace, and divine wisdom.
        </p>
      </div>

      {/* Primary Color Showcase */}
      <Card className="border-primary/20">
        <CardHeader className="bg-primary/5">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Crown className="w-5 h-5" />
            Sacred Blue - Divine Wisdom & Heavenly Peace
          </CardTitle>
          <CardDescription>
            Primary actions, links, and key interactive elements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button className="bg-primary hover:bg-primary/90">Primary Button</Button>
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
              Primary Outline
            </Button>
            <Badge className="bg-primary text-primary-foreground">Primary Badge</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Used for: Main CTAs, navigation highlights, primary links, featured content
          </p>
        </CardContent>
      </Card>

      {/* Secondary Color Showcase */}
      <Card className="border-secondary/20">
        <CardHeader className="bg-secondary/5">
          <CardTitle className="flex items-center gap-2 text-secondary-foreground">
            <Star className="w-5 h-5" />
            Covenant Gold - Divine Promise & Eternal Light
          </CardTitle>
          <CardDescription>
            Secondary actions and premium features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
              Premium Feature
            </Button>
            <Button variant="outline" className="border-secondary text-secondary hover:bg-secondary/10">
              Favorite <Heart className="w-4 h-4 ml-1" />
            </Button>
            <Badge variant="outline" className="border-secondary text-secondary">
              Premium
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Used for: Favorites, premium content, special highlights, success states
          </p>
        </CardContent>
      </Card>

      {/* Tertiary Color Showcase */}
      <Card className="border-tertiary/20">
        <CardHeader className="bg-tertiary/5">
          <CardTitle className="flex items-center gap-2 text-tertiary-foreground">
            <BookOpen className="w-5 h-5" />
            Grace Purple - Spiritual Depth & Redemption
          </CardTitle>
          <CardDescription>
            Study materials, scripture content, and spiritual features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button className="bg-tertiary hover:bg-tertiary/90 text-tertiary-foreground">
              Study Guide
            </Button>
            <Button variant="outline" className="border-tertiary text-tertiary hover:bg-tertiary/10">
              Bible Study
            </Button>
            <Badge className="bg-tertiary text-tertiary-foreground">Scripture</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Used for: Bible study tools, scripture references, spiritual content, meditation features
          </p>
        </CardContent>
      </Card>

      {/* Accent Color Showcase */}
      <Card className="border-accent/20">
        <CardHeader className="bg-accent/5">
          <CardTitle className="flex items-center gap-2 text-accent-foreground">
            <Users className="w-5 h-5" />
            Mercy Teal - Healing & Compassion
          </CardTitle>
          <CardDescription>
            Community features, support content, and compassionate actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Community
            </Button>
            <Button variant="outline" className="border-accent text-accent hover:bg-accent/10">
              Support Group
            </Button>
            <Badge variant="outline" className="border-accent text-accent">
              Community
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Used for: Community features, support content, compassionate actions, help resources
          </p>
        </CardContent>
      </Card>

      {/* Usage Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cross className="w-5 h-5" />
            Christian Design Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-primary mb-2">✅ Do Use</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Primary blue for main navigation and CTAs</li>
                <li>• Secondary gold for favorites and premium features</li>
                <li>• Tertiary purple for spiritual/Bible content</li>
                <li>• Accent teal for community and support features</li>
                <li>• Consistent color meanings across the platform</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-destructive mb-2">❌ Don't Use</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Red for anything except errors/destructive actions</li>
                <li>• Pure black text on white (use proper contrast)</li>
                <li>• Too many colors competing for attention</li>
                <li>• Colors without spiritual meaning/context</li>
                <li>• Low contrast combinations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
