"use client"

import { useState } from "react"
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  Share2,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ShareDialog } from "@/components/share-dialog"

interface ScriptureReference {
  book: string
  chapter: number
  verse: number
  text: string
}

interface SermonNotesProps {
  notes: string[]
  scriptureReferences: ScriptureReference[]
  className?: string
}

export function SermonNotes({ notes, scriptureReferences, className = "" }: SermonNotesProps) {
  const [isNotesOpen, setIsNotesOpen] = useState(true)
  const [isScripturesOpen, setIsScripturesOpen] = useState(true)
  const [copiedVerse, setCopiedVerse] = useState<string | null>(null)
  const [bookmarkedNotes, setBookmarkedNotes] = useState<Set<number>>(new Set())
  const [bookmarkedVerses, setBookmarkedVerses] = useState<Set<string>>(new Set())
  const [highlightedText, setHighlightedText] = useState<string>("")

  const copyToClipboard = async (text: string, reference: string) => {
    try {
      await navigator.clipboard.writeText(`${text} - ${reference}`)
      setCopiedVerse(reference)
      setTimeout(() => setCopiedVerse(null), 2000)
    } catch (error) {
      console.error("Failed to copy text:", error)
    }
  }

  const toggleNoteBookmark = (index: number) => {
    const newBookmarks = new Set(bookmarkedNotes)
    if (newBookmarks.has(index)) {
      newBookmarks.delete(index)
    } else {
      newBookmarks.add(index)
    }
    setBookmarkedNotes(newBookmarks)
  }

  const toggleVerseBookmark = (reference: string) => {
    const newBookmarks = new Set(bookmarkedVerses)
    if (newBookmarks.has(reference)) {
      newBookmarks.delete(reference)
    } else {
      newBookmarks.add(reference)
    }
    setBookmarkedVerses(newBookmarks)
  }

  const formatReference = (ref: ScriptureReference) => {
    return `${ref.book} ${ref.chapter}:${ref.verse}`
  }

  const openBibleGateway = (ref: ScriptureReference) => {
    const reference = formatReference(ref)
    const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference)}&version=NIV`
    window.open(url, "_blank")
  }

  return (
    <TooltipProvider>
      <div className={`space-y-4 ${className}`}>
        {/* Sermon Notes Section */}
        <Card className="bg-card border-border shadow-sm">
          <Collapsible open={isNotesOpen} onOpenChange={setIsNotesOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-secondary" />
                    <CardTitle className="text-foreground">Sermon Notes</CardTitle>
                    <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground border-secondary/50">
                      {notes.length} Key Points
                    </Badge>
                    {bookmarkedNotes.size > 0 && (
                      <Badge variant="secondary" className="bg-accent/40 text-accent-foreground border-accent/60">
                        {bookmarkedNotes.size} Bookmarked
                      </Badge>
                    )}
                  </div>
                  {isNotesOpen ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <CardDescription className="text-muted-foreground">Key insights and takeaways from this sermon</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {notes.map((note, index) => (
                      <div
                        key={index}
                        className={`flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                          bookmarkedNotes.has(index)
                            ? "bg-accent/30 border-accent"
                            : "bg-muted/50 border-border hover:bg-muted"
                        }`}
                      >
                        <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
                          {index + 1}
                        </div>
                        <p className="text-foreground leading-relaxed flex-1">{note}</p>
                        <div className="flex items-center space-x-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleNoteBookmark(index)}
                                className="text-muted-foreground hover:text-accent h-8 w-8 p-0"
                              >
                                {bookmarkedNotes.has(index) ? (
                                  <BookmarkCheck className="w-4 h-4 text-accent-foreground" />
                                ) : (
                                  <Bookmark className="w-4 h-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{bookmarkedNotes.has(index) ? "Remove bookmark" : "Bookmark note"}</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <ShareDialog
                                content={{
                                  title: `Sermon Note ${index + 1}`,
                                  text: note,
                                  url: window.location.href,
                                  type: 'sermon-note'
                                }}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-secondary h-8 w-8 p-0"
                                >
                                  <Share2 className="w-4 h-4" />
                                </Button>
                              </ShareDialog>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Share note</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Scripture References Section */}
        <Card className="bg-card border-border shadow-sm">
          <Collapsible open={isScripturesOpen} onOpenChange={setIsScripturesOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-accent-foreground" />
                    <CardTitle className="text-foreground">Scripture References</CardTitle>
                    <Badge variant="secondary" className="bg-accent/40 text-accent-foreground border-accent/60">
                      {scriptureReferences.length} Verses
                    </Badge>
                    {bookmarkedVerses.size > 0 && (
                      <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground border-secondary/50">
                        {bookmarkedVerses.size} Bookmarked
                      </Badge>
                    )}
                  </div>
                  {isScripturesOpen ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <CardDescription className="text-muted-foreground">Biblical passages referenced in this sermon</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {scriptureReferences.map((ref, index) => {
                      const reference = formatReference(ref)
                      const isBookmarked = bookmarkedVerses.has(reference)
                      return (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border transition-all duration-200 ${
                            isBookmarked
                              ? "bg-secondary/20 border-secondary/50"
                              : "bg-muted/50 border-border hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="outline" className="border-accent text-accent-foreground bg-accent/20">
                              {reference}
                            </Badge>
                            <div className="flex items-center space-x-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleVerseBookmark(reference)}
                                    className="text-muted-foreground hover:text-secondary h-8 w-8 p-0"
                                  >
                                    {isBookmarked ? (
                                      <BookmarkCheck className="w-4 h-4 text-secondary" />
                                    ) : (
                                      <Bookmark className="w-4 h-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{isBookmarked ? "Remove bookmark" : "Bookmark verse"}</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(ref.text, reference)}
                                    className="text-muted-foreground hover:text-primary h-8 w-8 p-0"
                                  >
                                    {copiedVerse === reference ? (
                                      <Check className="w-4 h-4 text-primary" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copy verse</p>
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openBibleGateway(ref)}
                                    className="text-muted-foreground hover:text-secondary h-8 w-8 p-0"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Open in Bible Gateway</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                          <blockquote className="text-foreground italic leading-relaxed border-l-2 border-accent pl-4">
                            "{ref.text}"
                          </blockquote>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </TooltipProvider>
  )
}
