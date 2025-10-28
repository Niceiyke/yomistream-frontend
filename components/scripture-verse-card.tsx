"use client"

import { useState } from "react"
import { Copy, Check, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ScriptureReference {
  book: string
  chapter: number
  verse: number
  text: string
}

interface ScriptureVerseCardProps {
  reference: ScriptureReference
  className?: string
  compact?: boolean
}

export function ScriptureVerseCard({ reference, className = "", compact = false }: ScriptureVerseCardProps) {
  const [copied, setCopied] = useState(false)

  const formatReference = () => {
    return `${reference.book} ${reference.chapter}:${reference.verse}`
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`"${reference.text}" - ${formatReference()}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy text:", error)
    }
  }

  const openBibleGateway = () => {
    const ref = formatReference()
    const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=NIV`
    window.open(url, "_blank")
  }

  if (compact) {
    return (
      <div className={`p-3 rounded-lg bg-card border border-border overflow-hidden ${className}`}>
        <div className="flex items-start justify-between mb-2">
          <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-xs shrink-0">
            {formatReference()}
          </Badge>
          <div className="flex space-x-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="text-muted-foreground hover:text-foreground h-6 w-6 p-0"
            >
              {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={openBibleGateway}
              className="text-muted-foreground hover:text-foreground h-6 w-6 p-0"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="max-h-[120px] overflow-y-auto">
          <p className="text-foreground text-sm italic leading-relaxed break-words">"{reference.text}"</p>
        </div>
      </div>
    )
  }

  return (
    <Card className={`bg-card border-border hover:bg-accent/50 transition-colors overflow-hidden ${className}`}>
      <CardContent className="p-4 overflow-hidden">
        <div className="flex items-start justify-between mb-3">
          <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 shrink-0">
            {formatReference()}
          </Badge>
          <div className="flex space-x-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
              title="Copy verse"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={openBibleGateway}
              className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
              title="Open in Bible Gateway"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          <blockquote className="text-foreground italic leading-relaxed border-l-2 border-amber-500/30 pl-4 break-words">
            "{reference.text}"
          </blockquote>
        </div>
      </CardContent>
    </Card>
  )
}
