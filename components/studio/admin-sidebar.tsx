"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  Users,
  BarChart3,
  Video,
} from "lucide-react"

interface AdminSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

const sidebarItems = [
  {
    id: "videos",
    label: "Videos",
    icon: BookOpen,
    description: "Manage videos"
  },
  {
    id: "preachers",
    label: "Preachers",
    icon: Users,
    description: "Manage preachers"
  },
  {
    id: "users",
    label: "Users",
    icon: Users,
    description: "View users"
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    description: "View analytics"
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
                    "font-medium text-sm truncate",
                    isActive ? "text-primary" : "text-foreground"
                  )}>
                    {item.label}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </div>
                </div>
              </div>
            </Button>
          )
        })}
      </nav>
    </aside>
  )
}
