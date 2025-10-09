"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface PreviewState {
  activePreviewId: string | null
  previewCount: number
  maxConcurrentPreviews: number
}

interface PreviewContextValue {
  // State
  activePreviewId: string | null
  previewCount: number
  
  // Actions
  requestPreview: (videoId: string) => boolean
  releasePreview: (videoId: string) => void
  canShowPreview: (videoId: string) => boolean
  forceReleaseAll: () => void
  
  // Configuration
  maxConcurrentPreviews: number
  setMaxConcurrentPreviews: (count: number) => void
}

const PreviewContext = createContext<PreviewContextValue | null>(null)

interface PreviewProviderProps {
  children: ReactNode
  maxConcurrentPreviews?: number
}

export function PreviewProvider({ 
  children, 
  maxConcurrentPreviews = 1 
}: PreviewProviderProps) {
  const [state, setState] = useState<PreviewState>({
    activePreviewId: null,
    previewCount: 0,
    maxConcurrentPreviews
  })

  const requestPreview = useCallback((videoId: string): boolean => {
    let canShow = false
    
    setState(prevState => {
      // Check if this video already has the preview
      if (prevState.activePreviewId === videoId) {
        canShow = true
        return prevState
      }
      
      // Check if we can show a new preview
      if (prevState.previewCount < prevState.maxConcurrentPreviews) {
        canShow = true
        return {
          ...prevState,
          activePreviewId: videoId,
          previewCount: prevState.previewCount + 1
        }
      }
      
      // Cannot show preview - at capacity
      canShow = false
      return prevState
    })
    
    return canShow
  }, [])

  const releasePreview = useCallback((videoId: string) => {
    setState(prevState => {
      if (prevState.activePreviewId === videoId) {
        return {
          ...prevState,
          activePreviewId: null,
          previewCount: Math.max(0, prevState.previewCount - 1)
        }
      }
      return prevState
    })
  }, [])

  const canShowPreview = useCallback((videoId: string): boolean => {
    return state.activePreviewId === videoId || 
           state.previewCount < state.maxConcurrentPreviews
  }, [state.activePreviewId, state.previewCount, state.maxConcurrentPreviews])

  const forceReleaseAll = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      activePreviewId: null,
      previewCount: 0
    }))
  }, [])

  const setMaxConcurrentPreviews = useCallback((count: number) => {
    setState(prevState => ({
      ...prevState,
      maxConcurrentPreviews: Math.max(0, count)
    }))
  }, [])

  const contextValue: PreviewContextValue = {
    activePreviewId: state.activePreviewId,
    previewCount: state.previewCount,
    requestPreview,
    releasePreview,
    canShowPreview,
    forceReleaseAll,
    maxConcurrentPreviews: state.maxConcurrentPreviews,
    setMaxConcurrentPreviews
  }

  return (
    <PreviewContext.Provider value={contextValue}>
      {children}
    </PreviewContext.Provider>
  )
}

export function usePreviewManager(): PreviewContextValue {
  const context = useContext(PreviewContext)
  if (!context) {
    throw new Error('usePreviewManager must be used within a PreviewProvider')
  }
  return context
}

export default PreviewProvider
