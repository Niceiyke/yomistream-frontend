"use client"

import React, { useState } from 'react'
import { Play, Edit, Trash2, MessageSquare, MoreVertical, Copy, Share2, Pin, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatDuration } from '@/lib/utils/video-helpers'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface NoteCardProps {
  note: {
    id: number
    video_time: number
    start_time: number
    end_time: number
    transcript_text: string
    user_note?: string
    note_category?: string
    template_type?: string
    created_at: string
    updated_at: string
    comments?: Array<{
      id: string
      text: string
      content: string
      created_at: string
    }>
  }
  onJumpToTime?: (time: number) => void
  onEdit?: (note: any) => void
  onDelete?: (noteId: number) => void
  onAddComment?: (noteId: number) => void
  onShare?: (noteId: number) => void
  onPin?: (noteId: number) => void
  className?: string
  showActions?: boolean
  compact?: boolean
}

export function NoteCard({
  note,
  onJumpToTime,
  onEdit,
  onDelete,
  onAddComment,
  onShare,
  onPin,
  className,
  showActions = true,
  compact = false
}: NoteCardProps) {
  const [isExpanded, setIsExpanded] = useState(!compact)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const text = `${note.transcript_text}\n\n${note.user_note || ''}\n\nFrom: ${formatDuration(note.video_time)}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const templateColors: Record<string, string> = {
    'scripture-study': 'bg-blue-100 text-blue-700 border-blue-200',
    'key-insight': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'question': 'bg-purple-100 text-purple-700 border-purple-200',
    'action-item': 'bg-green-100 text-green-700 border-green-200',
    'sermon-outline': 'bg-orange-100 text-orange-700 border-orange-200',
    'general': 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const templateColor = note.template_type 
    ? templateColors[note.template_type] || templateColors.general
    : templateColors.general

  return (
    <Card className={cn(
      "border border-blue-200/30 shadow-sm hover:shadow-md transition-all duration-200",
      "bg-card/80",
      className
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-xs", templateColor)}>
              {formatDuration(note.video_time)}
            </Badge>
            {note.template_type && note.template_type !== 'general' && (
              <Badge variant="secondary" className="text-xs">
                {note.template_type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Badge>
            )}
            {note.note_category && (
              <Badge variant="outline" className="text-xs">
                <Tag className="w-3 h-3 mr-1" />
                {note.note_category}
              </Badge>
            )}
            {note.comments && note.comments.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                <MessageSquare className="w-3 h-3 mr-1" />
                {note.comments.length}
              </Badge>
            )}
          </div>
          
          {showActions && (
            <div className="flex items-center gap-1">
              {onJumpToTime && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onJumpToTime(note.video_time)}
                  className="h-7 w-7 p-0"
                  title="Jump to this time in video"
                >
                  <Play className="w-3.5 h-3.5" />
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(note)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Note
                    </DropdownMenuItem>
                  )}
                  {onAddComment && (
                    <DropdownMenuItem onClick={() => onAddComment(note.id)}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Add Comment
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleCopy}>
                    <Copy className="w-4 h-4 mr-2" />
                    {copied ? 'Copied!' : 'Copy Note'}
                  </DropdownMenuItem>
                  {onShare && (
                    <DropdownMenuItem onClick={() => onShare(note.id)}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Note
                    </DropdownMenuItem>
                  )}
                  {onPin && (
                    <DropdownMenuItem onClick={() => onPin(note.id)}>
                      <Pin className="w-4 h-4 mr-2" />
                      Pin Note
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(note.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Note
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Transcript */}
        <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3 border-l-4 border-blue-400 mb-3">
          <p className={cn(
            "text-xs text-blue-800 dark:text-blue-200 italic leading-relaxed",
            compact && !isExpanded && "line-clamp-2"
          )}>
            "{note.transcript_text}"
          </p>
        </div>

        {/* User Note */}
        {note.user_note && (
          <div className={cn(
            "bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200/30 dark:border-amber-800/30",
            compact && !isExpanded && "line-clamp-3"
          )}>
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
              <ReactMarkdown
                components={{
                  p: ({ children, ...props }: any) => (
                    <p className="mb-2 last:mb-0" {...props}>{children}</p>
                  ),
                  strong: ({ children, ...props }: any) => (
                    <strong className="font-bold text-amber-900 dark:text-amber-100" {...props}>{children}</strong>
                  ),
                  em: ({ children, ...props }: any) => (
                    <em className="italic text-amber-800 dark:text-amber-200" {...props}>{children}</em>
                  ),
                  code: ({ children, ...props }: any) => (
                    <code className="bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                      {children}
                    </code>
                  ),
                  ul: ({ children, ...props }: any) => (
                    <ul className="list-disc list-inside mb-2 space-y-1" {...props}>{children}</ul>
                  ),
                  ol: ({ children, ...props }: any) => (
                    <ol className="list-decimal list-inside mb-2 space-y-1" {...props}>{children}</ol>
                  ),
                  li: ({ children, ...props }: any) => (
                    <li className="text-sm" {...props}>{children}</li>
                  ),
                  blockquote: ({ children, ...props }: any) => (
                    <blockquote className="border-l-4 border-amber-400 pl-3 italic my-2 text-amber-700 dark:text-amber-300" {...props}>
                      {children}
                    </blockquote>
                  ),
                  a: ({ children, ...props }: any) => (
                    <a 
                      {...props}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {note.user_note}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Expand/Collapse for compact mode */}
        {compact && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-xs"
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </Button>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {new Date(note.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          {note.updated_at !== note.created_at && (
            <span className="text-xs text-muted-foreground italic">
              Edited
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
