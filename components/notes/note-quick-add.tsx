"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { StickyNote, Save, X, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NoteEditor } from './note-editor'
import { NoteTemplatesSelector, NOTE_TEMPLATES, type NoteTemplate } from './note-templates'
import { formatDuration } from '@/lib/utils/video-helpers'
import { cn } from '@/lib/utils'

interface NoteQuickAddProps {
  videoTime: number
  transcriptText: string
  startTime: number
  endTime: number
  onSave: (note: {
    startTime: number
    endTime: number
    transcriptText: string
    videoTime: number
    userNote: string
    templateType?: string
  }) => Promise<void>
  onCancel: () => void
  className?: string
  autoFocus?: boolean
}

export function NoteQuickAdd({
  videoTime,
  transcriptText,
  startTime,
  endTime,
  onSave,
  onCancel,
  className,
  autoFocus = true
}: NoteQuickAddProps) {
  const [userNote, setUserNote] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!userNote.trim()) return

    setIsSaving(true)
    try {
      await onSave({
        startTime,
        endTime,
        transcriptText,
        videoTime,
        userNote: userNote.trim(),
        templateType: selectedTemplate?.id
      })
    } catch (error) {
      console.error('Error saving note:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTemplateSelect = (template: NoteTemplate) => {
    setSelectedTemplate(template)
    if (template.template) {
      setUserNote(template.template)
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }, [userNote])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <Card className={cn(
      "border-2 border-primary/50 shadow-lg",
      "animate-in slide-in-from-bottom-4 duration-300",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-primary" />
              Quick Note
              {selectedTemplate && (
                <Badge variant="secondary" className="ml-2">
                  {selectedTemplate.name}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {formatDuration(videoTime)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Segment: {formatDuration(startTime)} - {formatDuration(endTime)}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Transcript Preview */}
        <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3 border-l-4 border-blue-400">
          <p className="text-xs text-blue-800 dark:text-blue-200 italic leading-relaxed line-clamp-3">
            "{transcriptText}"
          </p>
        </div>

        {/* Template Selector */}
        <div className="flex items-center gap-2">
          <NoteTemplatesSelector
            onSelectTemplate={handleTemplateSelect}
            trigger={
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                {selectedTemplate ? 'Change Template' : 'Use Template'}
              </Button>
            }
          />
          {selectedTemplate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTemplate(null)
                setUserNote('')
              }}
            >
              Clear Template
            </Button>
          )}
        </div>

        {/* Note Editor */}
        <NoteEditor
          value={userNote}
          onChange={setUserNote}
          placeholder="Add your thoughts, insights, or questions..."
          autoFocus={autoFocus}
          minHeight="120px"
          maxHeight="300px"
        />

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-foreground">
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </span>
            ) : (
              <span>
                Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+Enter</kbd> to save
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave()}
              disabled={!userNote.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Note
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
