"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Home,
  Video,
  Image as ImageIcon,
  Upload,
  BarChart3,
  Users,
  ChevronRight
} from "lucide-react"

interface AdminSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

const sidebarItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Home,
    description: "Platform overview and statistics"
  },
  {
    id: "content",
    label: "Content Management",
    icon: Video,
    description: "Manage videos and preachers"
  },
  {
    id: "users",
    label: "User Management",
    icon: Users,
    description: "Manage user accounts"
  },
  {
    id: "images",
    label: "Image Library",
    icon: ImageIcon,
    description: "Manage uploaded images"
  },
  {
    id: "upload",
    label: "Upload Content",
    icon: Upload,
    description: "Upload videos and images"
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    description: "Platform analytics and insights"
  },
]

export function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  return (
    <aside className="w-64 border-r border-border bg-card/30 backdrop-blur-sm min-h-[calc(100vh-73px)]">
      <nav className="p-4 space-y-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id

          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "w-full justify-start h-auto p-3 text-left",
                "hover:bg-accent/50 transition-colors",
                isActive && "bg-primary/10 text-primary border-l-2 border-primary"
              )}
              onClick={() => onSectionChange(item.id)}
            >
              <div className="flex items-center gap-3 w-full">
                <Icon className={cn(
                  "h-5 w-5 flex-shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground"
                )} />
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "font-medium text-sm",
                    isActive ? "text-primary" : "text-foreground"
                  )}>
                    {item.label}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </div>
                </div>
                {isActive && (
                  <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </div>
            </Button>
          )
        })}
      </nav>

      {/* Quick Stats */}
      <div className="p-4 border-t border-border mt-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => onSectionChange("upload")}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Video
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => onSectionChange("images")}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Add Image
          </Button>
        </div>
      </div>
    </aside>
  )
}
