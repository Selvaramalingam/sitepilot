import * as React from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Compass, Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent hover:opacity-90 transition-opacity">
              <Compass className="h-6 w-6 text-indigo-500" />
              <span>SitePilot</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <Link href="/features" className="transition-colors hover:text-foreground">Features</Link>
              <Link href="/pricing" className="transition-colors hover:text-foreground">Pricing</Link>
              <Link href="/contact" className="transition-colors hover:text-foreground">Contact</Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            
            <div className="hidden sm:flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="text-sm font-medium hover:bg-muted/80">
                  Log in
                </Button>
              </Link>
              <Link href="/book-demo">
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 text-sm font-medium rounded-xl transition-all duration-200">
                  Book Demo
                </Button>
              </Link>
            </div>

            {/* Mobile Navigation */}
            <Sheet>
              <SheetTrigger render={
                <button type="button" className="inline-flex items-center justify-center rounded-lg hover:bg-muted/80 text-foreground md:hidden w-9 h-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </button>
              } />
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetTitle className="text-left font-bold text-lg text-indigo-500 mb-6 flex items-center gap-2">
                  <Compass className="h-5 w-5" />
                  SitePilot
                </SheetTitle>
                <nav className="flex flex-col gap-4 text-lg font-medium mt-4">
                  <Link href="/features" className="transition-colors hover:text-indigo-500 py-2 border-b border-border/40">Features</Link>
                  <Link href="/pricing" className="transition-colors hover:text-indigo-500 py-2 border-b border-border/40">Pricing</Link>
                  <Link href="/contact" className="transition-colors hover:text-indigo-500 py-2 border-b border-border/40">Contact</Link>
                  <Link href="/login" className="transition-colors hover:text-indigo-500 py-2 border-b border-border/40">Log in</Link>
                  <Link href="/book-demo" className="mt-4">
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6">
                      Book Demo
                    </Button>
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/30 py-12 md:py-16">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2 space-y-4">
              <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                <Compass className="h-6 w-6 text-indigo-500" />
                <span>SitePilot</span>
              </Link>
              <p className="text-sm text-muted-foreground max-w-sm">
                The all-in-one SaaS platform for construction contractors and builders to manage projects, materials, expenses, and profitability.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-sm tracking-wider uppercase mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm tracking-wider uppercase mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                <li><Link href="/book-demo" className="hover:text-foreground transition-colors">Book Demo</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} SitePilot. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-foreground">Privacy Policy</Link>
              <Link href="#" className="hover:text-foreground">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
