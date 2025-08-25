import type React from "react"
import { Urbanist } from 'next/font/google';
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const urbanist = Urbanist({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
  adjustFontFallback: true
});


export const metadata: Metadata = {
  title: "azmth studio",
  description: "Audio Waveform Annotator",
  
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    
    <html lang="en" suppressHydrationWarning>
       <body className={urbanist.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <div className="flex h-screen overflow-hidden">
         
            <div className="flex-1 overflow-auto">{children}</div>
          </div>
        </ThemeProvider>
      </body>
    </html>
   
  )
}

