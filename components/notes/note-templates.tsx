"use client"

import React from 'react'
import { BookOpen, Lightbulb, HelpCircle, Target, FileText, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface NoteTemplate {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  template: string
  color: string
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'scripture-study',
    name: 'Scripture Study',
    description: 'Structured format for studying Bible passages',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'bg-blue-500',
    template: `**Verse/Passage:** 

**Context:** 

**Key Insights:**
- 

**Personal Application:**

**Questions:**
- `
  },
  {
    id: 'key-insight',
    name: 'Key Insight',
    description: 'Capture main points and supporting evidence',
    icon: <Lightbulb className="w-5 h-5" />,
    color: 'bg-yellow-500',
    template: `**Main Point:** 

**Supporting Evidence:**
- 

**Personal Reflection:**

**Related Scriptures:**
- `
  },
  {
    id: 'question',
    name: 'Question',
    description: 'Document questions for further study',
    icon: <HelpCircle className="w-5 h-5" />,
    color: 'bg-purple-500',
    template: `**Question:** 

**Initial Thoughts:**

**Scripture References:**
- 

**Follow-up Actions:**
- `
  },
  {
    id: 'action-item',
    name: 'Action Item',
    description: 'Track practical applications',
    icon: <Target className="w-5 h-5" />,
    color: 'bg-green-500',
    template: `**Action:** 

**Why:** 

**When:** 

**How to Measure:**

**Accountability:**`
  },
  {
    id: 'sermon-outline',
    name: 'Sermon Outline',
    description: 'Follow along with sermon structure',
    icon: <FileText className="w-5 h-5" />,
    color: 'bg-orange-500',
    template: `**Main Theme:** 

**Key Points:**
1. 
2. 
3. 

**Supporting Scriptures:**
- 

**Personal Takeaways:**
- `
  },
  {
    id: 'general',
    name: 'General Note',
    description: 'Free-form note taking',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'bg-gray-500',
    template: ''
  }
]

interface NoteTemplatesSelectorProps {
  onSelectTemplate: (template: NoteTemplate) => void
  trigger?: React.ReactNode
  className?: string
}

export function NoteTemplatesSelector({
  onSelectTemplate,
  trigger,
  className
}: NoteTemplatesSelectorProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (template: NoteTemplate) => {
    onSelectTemplate(template)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Use Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a Note Template</DialogTitle>
          <DialogDescription>
            Select a template to structure your note, or start with a blank note
          </DialogDescription>
        </DialogHeader>
        
        <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 mt-4", className)}>
          {NOTE_TEMPLATES.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary"
              onClick={() => handleSelect(template)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg text-white",
                    template.color
                  )}>
                    {template.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {template.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {template.template && (
                <CardContent className="pt-0">
                  <div className="bg-muted/50 rounded p-2 text-xs font-mono text-muted-foreground line-clamp-4">
                    {template.template}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Quick template buttons for mobile
export function QuickTemplateButtons({
  onSelectTemplate,
  className
}: {
  onSelectTemplate: (template: NoteTemplate) => void
  className?: string
}) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-2", className)}>
      {NOTE_TEMPLATES.slice(0, 4).map((template) => (
        <Button
          key={template.id}
          variant="outline"
          size="sm"
          onClick={() => onSelectTemplate(template)}
          className="flex-shrink-0"
        >
          <span className="mr-2">{template.icon}</span>
          {template.name}
        </Button>
      ))}
    </div>
  )
}
