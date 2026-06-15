import * as React from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { Compass } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-[100px] -z-10 dark:bg-indigo-500/5" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-[100px] -z-10 dark:bg-purple-500/5" />

      {/* Header */}
      <header className="w-full flex h-16 items-center justify-between px-6 sm:px-12 relative z-10 border-b border-border/40 bg-background/50 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent hover:opacity-90 transition-opacity">
          <Compass className="h-6 w-6 text-indigo-500" />
          <span>SitePilot</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main viewport */}
      <main className="flex-grow flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
    </div>
  )
}
