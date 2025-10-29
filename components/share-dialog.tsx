"use client"

import { useState, useEffect } from "react"
import {
  Share2,
  Copy,
  Check,
  Facebook,
  MessageCircle,
  Mail,
  QrCode,
  Link,
  X,
  Linkedin,
  Send,
  Globe
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface ShareContent {
  title: string
  text?: string
  url: string
  type: 'video' | 'sermon-note' | 'key-point' | 'scripture' | 'custom'
}

interface ShareDialogProps {
  children: React.ReactNode
  content: ShareContent
  className?: string
}

export function ShareDialog({ children, content, className }: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const { toast } = useToast()

  // Generate QR code URL when dialog opens
  useEffect(() => {
    if (open && content.url) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(content.url)}`
      setQrCodeUrl(qrUrl)
    }
  }, [open, content.url])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content.url)
      setCopied(true)
      toast({
        title: "Link copied!",
        description: "The link has been copied to your clipboard.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Unable to copy link to clipboard.",
      })
    }
  }

  const shareViaWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: content.title,
          text: content.text || `Check this out: ${content.title}`,
          url: content.url,
        })
        setOpen(false)
      } catch (error) {
        // User cancelled share or error occurred
        console.log('Share cancelled or failed')
      }
    }
  }

  const shareToX = () => {
    const text = encodeURIComponent(content.text || content.title)
    const url = encodeURIComponent(content.url)
    const xUrl = `https://x.com/intent/tweet?text=${text}&url=${url}`
    window.open(xUrl, '_blank')
    setOpen(false)
  }

  const shareToFacebook = () => {
    const url = encodeURIComponent(content.url)
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`
    window.open(facebookUrl, '_blank')
    setOpen(false)
  }

    const shareToWhatsApp = () => {
    const text = encodeURIComponent(`${content.text || content.title} ${content.url}`)
    const whatsappUrl = `https://wa.me/?text=${text}`
    window.open(whatsappUrl, '_blank')
    setOpen(false)
  }

    const shareToTelegram = () => {
    const text = encodeURIComponent(`${content.text || content.title}\n\n${content.url}`)
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(content.url)}&text=${text}`
    window.open(telegramUrl, '_blank')
    setOpen(false)
  }

  const shareToLinkedIn = () => {
    const url = encodeURIComponent(content.url)
    const title = encodeURIComponent(content.title)
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}`
    window.open(linkedinUrl, '_blank')
    setOpen(false)
  }





  const shareViaEmail = () => {
    const subject = encodeURIComponent(content.title)
    const body = encodeURIComponent(`${content.text || `Check this out: ${content.title}`}\n\n${content.url}`)
    const emailUrl = `mailto:?subject=${subject}&body=${body}`
    window.location.href = emailUrl
    setOpen(false)
  }

  const getContentTypeLabel = () => {
    switch (content.type) {
      case 'video': return 'Video'
      case 'sermon-note': return 'Sermon Note'
      case 'key-point': return 'Key Point'
      case 'scripture': return 'Scripture'
      default: return 'Content'
    }
  }

  const getContentTypeColor = () => {
    switch (content.type) {
      case 'video': return 'bg-primary/20 text-primary border-primary/30'
      case 'sermon-note': return 'bg-secondary/20 text-secondary border-secondary/30'
      case 'key-point': return 'bg-accent/20 text-accent border-accent/30'
      case 'scripture': return 'bg-blue-500/20 text-blue-600 border-blue-500/30'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-gradient-to-br from-background via-background to-muted/20 backdrop-blur-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
              <Share2 className="w-4 h-4 text-primary" />
            </div>
            Share {getContentTypeLabel()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Content Preview Card */}
          <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={cn("text-xs font-medium px-2 py-0.5", getContentTypeColor())}>
                {getContentTypeLabel()}
              </Badge>
            </div>
            <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-2">{content.title}</h3>
            {content.text && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{content.text}</p>
            )}
          </div>

          {/* Native Share (if available) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              onClick={shareViaWebShare}
              className="w-full h-10 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium shadow-md hover:shadow-lg transition-all duration-200"
              size="sm"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share via Device
            </Button>
          )}

          {/* Social Media Sharing Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              Share on Social Media
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={shareToX}
                variant="outline"
                className="h-12 flex-col gap-1 bg-gradient-to-br from-gray-50 to-gray-100/50 hover:from-gray-100 hover:to-gray-200/50 border-gray-200/50 dark:from-gray-950/20 dark:to-gray-900/20 dark:hover:from-gray-900/30 dark:hover:to-gray-800/30 transition-all duration-200 p-2"
                size="sm"
              >
                <X className="w-4 h-4 text-gray-800 dark:text-gray-200" />
                <span className="text-[10px] font-medium leading-tight">X</span>
              </Button>
              <Button
                onClick={shareToFacebook}
                variant="outline"
                className="h-12 flex-col gap-1 bg-gradient-to-br from-blue-50 to-blue-100/50 hover:from-blue-100 hover:to-blue-200/50 border-blue-200/50 dark:from-blue-950/20 dark:to-blue-900/20 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 transition-all duration-200 p-2"
                size="sm"
              >
                <Facebook className="w-4 h-4 text-blue-700" />
                <span className="text-[10px] font-medium leading-tight">Facebook</span>
              </Button>
              <Button
                onClick={shareToLinkedIn}
                variant="outline"
                className="h-12 flex-col gap-1 bg-gradient-to-br from-blue-50 to-blue-100/50 hover:from-blue-100 hover:to-blue-200/50 border-blue-200/50 dark:from-blue-950/20 dark:to-blue-900/20 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 transition-all duration-200 p-2"
                size="sm"
              >
                <Linkedin className="w-4 h-4 text-blue-600" />
                <span className="text-[10px] font-medium leading-tight">LinkedIn</span>
              </Button>
              <Button
                onClick={shareToWhatsApp}
                variant="outline"
                className="h-12 flex-col gap-1 bg-gradient-to-br from-green-50 to-green-100/50 hover:from-green-100 hover:to-green-200/50 border-green-200/50 dark:from-green-950/20 dark:to-green-900/20 dark:hover:from-green-900/30 dark:hover:to-green-800/30 transition-all duration-200 p-2"
                size="sm"
              >
                <MessageCircle className="w-4 h-4 text-green-600" />
                <span className="text-[10px] font-medium leading-tight">WhatsApp</span>
              </Button>
              <Button
                onClick={shareToTelegram}
                variant="outline"
                className="h-12 flex-col gap-1 bg-gradient-to-br from-blue-50 to-blue-100/50 hover:from-blue-100 hover:to-blue-200/50 border-blue-200/50 dark:from-blue-950/20 dark:to-blue-900/20 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 transition-all duration-200 p-2"
                size="sm"
              >
                <Send className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] font-medium leading-tight">Telegram</span>
              </Button>
              <Button
                onClick={shareViaEmail}
                variant="outline"
                className="h-12 flex-col gap-1 bg-gradient-to-br from-gray-50 to-gray-100/50 hover:from-gray-100 hover:to-gray-200/50 border-gray-200/50 dark:from-gray-950/20 dark:to-gray-900/20 dark:hover:from-gray-900/30 dark:hover:to-gray-800/30 transition-all duration-200 p-2"
                size="sm"
              >
                <Mail className="w-4 h-4 text-gray-600" />
                <span className="text-[10px] font-medium leading-tight">Email</span>
              </Button>
            </div>
          </div>

          <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Copy Link Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5" />
              Copy Link
            </h4>
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className={cn(
                "w-full h-9 font-medium transition-all duration-200 text-sm",
                copied
                  ? "bg-gradient-to-r from-green-50 to-green-100 border-green-200 text-green-700 dark:from-green-950/20 dark:to-green-900/20 dark:border-green-800"
                  : "bg-gradient-to-br from-card/50 to-card/30 hover:from-card/70 hover:to-card/50 border-border/50 hover:border-border"
              )}
              disabled={copied}
              size="sm"
            >
              {copied ? (
                <Check className="w-4 h-4 mr-2 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>

          {/* QR Code Section - Collapsed by default */}
          {qrCodeUrl && (
            <>
              <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5" />
                  QR Code
                </h4>
                <div className="flex justify-center">
                  <div className="p-2 bg-gradient-to-br from-card to-card/80 rounded-lg border border-border/50 shadow-md">
                    <img
                      src={qrCodeUrl}
                      alt="QR Code"
                      className="w-20 h-20 rounded"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
