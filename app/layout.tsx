import { Suspense } from "react"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { ReactQueryProvider } from "@/lib/react-query-provider"
import '@/lib/init-ad-system' // Initialize ad system
import { ToastProvider } from '@/components/ui/use-toast'
export const metadata: Metadata = {
  title: "WordLyte - Faith-Based Streaming Platform",
  description: "Experience divine illumination through curated Christian content from trusted preachers and teachers",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <AuthProvider>
          <ReactQueryProvider>
            <ToastProvider>
            {children}
            </ToastProvider>
            <Analytics />
          </ReactQueryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
