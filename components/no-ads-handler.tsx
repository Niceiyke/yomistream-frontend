// No Ads Handler Component
// Handles the user experience when no ads are available

"use client"

import React, { useState, useEffect } from 'react'
import { Heart, Gift, Users, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NO_ADS_CONFIG } from '@/lib/config/ad-config'

interface NoAdsHandlerProps {
  videoId: string
  onComplete?: () => void
  showAlternatives?: boolean
}

export const NoAdsHandler: React.FC<NoAdsHandlerProps> = ({
  videoId,
  onComplete,
  showAlternatives = false
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState(NO_ADS_CONFIG.message_duration / 1000)

  useEffect(() => {
    if (!NO_ADS_CONFIG.show_no_ads_message) {
      onComplete?.()
      return
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsVisible(false)
          onComplete?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [onComplete])

  if (!isVisible || !NO_ADS_CONFIG.show_no_ads_message) {
    return null
  }

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-secondary/90 flex items-center justify-center z-50">
      <div className="text-center text-white p-8 max-w-md">
        {/* Main Message */}
        <div className="mb-6">
          <Heart className="w-16 h-16 mx-auto mb-4 text-white/90" />
          <h2 className="text-2xl font-bold mb-2">
            {NO_ADS_CONFIG.no_ads_message}
          </h2>
          <p className="text-white/80 text-sm">
            Your content will begin in {timeRemaining} seconds
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/20 rounded-full h-1 mb-6">
          <div 
            className="bg-white h-1 rounded-full transition-all duration-1000"
            style={{ 
              width: `${((NO_ADS_CONFIG.message_duration / 1000 - timeRemaining) / (NO_ADS_CONFIG.message_duration / 1000)) * 100}%` 
            }}
          />
        </div>

        {/* Alternative Monetization Options */}
        {showAlternatives && (
          <div className="space-y-3">
            {NO_ADS_CONFIG.alternative_monetization.show_donation_prompt && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => window.open(`https://yomistream.com/donate?video=${videoId}`, '_blank')}
              >
                <Heart className="w-4 h-4 mr-2" />
                Support This Ministry
              </Button>
            )}
            
            {NO_ADS_CONFIG.alternative_monetization.show_subscription_prompt && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => window.open('https://yomistream.com/subscribe', '_blank')}
              >
                <Users className="w-4 h-4 mr-2" />
                Join Yomistream Plus
              </Button>
            )}
            
            {NO_ADS_CONFIG.alternative_monetization.show_merchandise_prompt && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => window.open('https://yomistream.com/store', '_blank')}
              >
                <Gift className="w-4 h-4 mr-2" />
                Christian Merchandise
              </Button>
            )}
          </div>
        )}

        {/* Skip Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="mt-4 text-white/60 hover:text-white hover:bg-white/10"
          onClick={() => {
            setIsVisible(false)
            onComplete?.()
          }}
        >
          Skip Message
        </Button>
      </div>
    </div>
  )
}

// Fallback Content Component
export const FallbackContent: React.FC<{
  content: typeof NO_ADS_CONFIG.fallback_content
  onComplete?: () => void
}> = ({ content, onComplete }) => {
  const [timeRemaining, setTimeRemaining] = useState(content.duration)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          onComplete?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [onComplete])

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center z-50">
      <div className="text-center text-white p-8 max-w-lg">
        {/* Content Image */}
        {content.image_url && (
          <img 
            src={content.image_url} 
            alt={content.title}
            className="w-32 h-32 mx-auto mb-6 rounded-lg object-cover"
          />
        )}
        
        {/* Content Info */}
        <h2 className="text-3xl font-bold mb-4">{content.title}</h2>
        <p className="text-white/80 mb-6">{content.description}</p>
        
        {/* Progress Bar */}
        <div className="w-full bg-white/20 rounded-full h-2 mb-6">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-1000"
            style={{ 
              width: `${((content.duration - timeRemaining) / content.duration) * 100}%` 
            }}
          />
        </div>
        
        {/* Action Button */}
        <Button 
          className="mb-4"
          onClick={() => window.open(content.click_url, '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Learn More
        </Button>
        
        <p className="text-white/60 text-sm">
          Your video continues in {timeRemaining} seconds
        </p>
      </div>
    </div>
  )
}

export default NoAdsHandler
