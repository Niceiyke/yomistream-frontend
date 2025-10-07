import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Suspense } from "react"
import { ReactQueryProvider } from "@/lib/react-query-client"

export const metadata: Metadata = {
  title: "WordLyte - Faith-Based Streaming Platform",
  description: "Experience divine illumination through curated Christian content from trusted preachers and teachers",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense>
          <ReactQueryProvider>
            {children}
            <Analytics />
          </ReactQueryProvider>
        </Suspense>
      </body>
    </html>
  )
}
