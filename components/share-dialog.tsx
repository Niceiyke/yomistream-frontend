"use client"

import { useState, useEffect } from "react"
import {
  Share2,
  Copy,
  Check,
  Twitter,
  Facebook,
  MessageCircle,
  Mail,
  QrCode,
  Link,
  X
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

  const shareToTwitter = () => {
    const text = encodeURIComponent(content.text || content.title)
    const url = encodeURIComponent(content.url)
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`
    window.open(twitterUrl, '_blank')
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share {getContentTypeLabel()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Content Preview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs", getContentTypeColor())}>
                {getContentTypeLabel()}
              </Badge>
            </div>
            <h3 className="font-medium text-sm line-clamp-2">{content.title}</h3>
            {content.text && (
              <p className="text-sm text-muted-foreground line-clamp-3">{content.text}</p>
            )}
          </div>

          <Separator />

          {/* Native Share (if available) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <div className="space-y-2">
              <Button
                onClick={shareViaWebShare}
                className="w-full justify-start"
                variant="default"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share via Device
              </Button>
            </div>
          )}

          {/* Social Media Sharing */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Share on Social Media</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={shareToTwitter}
                variant="outline"
                className="justify-start"
              >
                <Twitter className="w-4 h-4 mr-2" />
                Twitter
              </Button>
              <Button
                onClick={shareToFacebook}
                variant="outline"
                className="justify-start"
              >
                <Facebook className="w-4 h-4 mr-2" />
                Facebook
              </Button>
              <Button
                onClick={shareToWhatsApp}
                variant="outline"
                className="justify-start"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                onClick={shareViaEmail}
                variant="outline"
                className="justify-start"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
            </div>
          </div>

          <Separator />

          {/* Copy Link */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Copy Link</h4>
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="w-full justify-start"
              disabled={copied}
            >
              {copied ? (
                <Check className="w-4 h-4 mr-2 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>

          {/* QR Code */}
          {qrCodeUrl && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">QR Code</h4>
                <div className="flex justify-center">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-32 h-32 border rounded-lg"
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Scan to open on mobile device
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
