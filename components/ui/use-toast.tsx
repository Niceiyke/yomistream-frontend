// components/ui/use-toast.tsx
'use client'

import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'

interface ToastProviderProps {
  children: React.ReactNode
}

export const ToastContext = React.createContext<{
  toast: (options: { title: string; description?: string }) => void
}>({
  toast: () => {}
})

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<Array<{
    id: string
    title: string
    description?: string
  }>>([])

  const toast = ({ title, description }: { title: string; description?: string }) => {
    const id = Math.random().toString(36)
    setToasts((prev) => [...prev, { id, title, description }])
    
    // Auto-remove toast after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter(t => t.id !== id))
    }, 3000)
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider>
        {children}
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            className="fixed bottom-4 right-4 z-50 w-full max-w-sm rounded-lg border bg-background p-4 shadow-lg"
          >
            <ToastPrimitive.Title className="text-sm font-medium">
              {toast.title}
            </ToastPrimitive.Title>
            {toast.description && (
              <ToastPrimitive.Description className="text-sm text-muted-foreground mt-1">
                {toast.description}
              </ToastPrimitive.Description>
            )}
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}

export const useToast = () => React.useContext(ToastContext)