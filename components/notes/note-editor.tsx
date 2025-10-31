"use client"

import React, { useState, useCallback } from 'react'
import { Bold, Italic, List, ListOrdered, Code, Link as LinkIcon, Highlighter, Quote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface NoteEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  minHeight?: string
  maxHeight?: string
  showFormatting?: boolean
}

export function NoteEditor({
  value,
  onChange,
  placeholder = "Write your note...",
  className,
  autoFocus = false,
  minHeight = "100px",
  maxHeight = "400px",
  showFormatting = true
}: NoteEditorProps) {
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const insertFormatting = useCallback((before: string, after: string = '') => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    
    // If no text selected, insert placeholder
    const textToWrap = selectedText || 'text'
    
    const newText = 
      value.substring(0, start) + 
      before + 
      textToWrap + 
      after + 
      value.substring(end)
    
    onChange(newText)

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus()
      if (selectedText) {
        // If text was selected, place cursor after the formatted text
        const newCursorPos = start + before.length + textToWrap.length + after.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      } else {
        // If no text selected, select the placeholder
        const selectStart = start + before.length
        const selectEnd = selectStart + textToWrap.length
        textarea.setSelectionRange(selectStart, selectEnd)
      }
    }, 0)
  }, [value, onChange])

  const handleSelectionChange = useCallback(() => {
    if (textareaRef.current) {
      setSelection({
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd
      })
    }
  }, [])

  // Keyboard shortcuts for formatting
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault()
          insertFormatting('**', '**')
          break
        case 'i':
          e.preventDefault()
          insertFormatting('*', '*')
          break
        case 'k':
          e.preventDefault()
          const url = prompt('Enter URL:')
          if (url) insertFormatting('[', `](${url})`)
          break
      }
    }
  }, [insertFormatting])

  const formatBold = () => insertFormatting('**', '**')
  const formatItalic = () => insertFormatting('*', '*')
  const formatCode = () => insertFormatting('`', '`')
  const formatHighlight = () => insertFormatting('==', '==')
  const formatQuote = () => insertFormatting('\n> ', '')
  const formatBulletList = () => insertFormatting('\n- ', '')
  const formatNumberedList = () => insertFormatting('\n1. ', '')

  const formatLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      insertFormatting('[', `](${url})`)
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showFormatting && (
        <div className="flex items-center gap-1 p-2 bg-muted/50 rounded-lg border border-border/50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={formatBold}
            className="h-8 w-8 p-0"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={formatItalic}
            className="h-8 w-8 p-0"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={formatHighlight}
            className="h-8 w-8 p-0"
            title="Highlight"
          >
            <Highlighter className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={formatBulletList}
            className="h-8 w-8 p-0"
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={formatNumberedList}
            className="h-8 w-8 p-0"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={formatQuote}
            className="h-8 w-8 p-0"
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={formatCode}
            className="h-8 w-8 p-0"
            title="Code"
          >
            <Code className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={formatLink}
            className="h-8 w-8 p-0"
            title="Link"
          >
            <LinkIcon className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={handleSelectionChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          "resize-none font-sans",
          "focus-visible:ring-2 focus-visible:ring-primary"
        )}
        style={{
          minHeight,
          maxHeight
        }}
      />
      
      <div className="text-xs text-muted-foreground">
        Supports Markdown formatting
      </div>
    </div>
  )
}
