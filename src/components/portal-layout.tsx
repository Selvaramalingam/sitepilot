'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { 
  Compass, 
  Menu, 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  Briefcase, 
  FileSpreadsheet, 
  Receipt, 
  Truck, 
  DollarSign, 
  FileBarChart,
  LogOut,
  User,
  Plus
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser, UserProfile } from '@/lib/auth-helpers'

export interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<any>
}

interface PortalLayoutProps {
  title: string
  role: 'SUPER_ADMIN' | 'CONTRACTOR_OWNER' | 'SITE_ENGINEER'
  navigation: NavigationItem[]
  children: React.ReactNode
}

export function PortalLayout({ title, role, navigation, children }: PortalLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const profile = await getCurrentUser()
    if (profile) {
      if (profile.role !== role) {
        console.warn(`Role mismatch: expected ${role}, user has ${profile.role}. Redirecting...`)
        if (profile.role === 'SUPER_ADMIN') {
          router.push('/super-admin/dashboard')
        } else if (profile.role === 'CONTRACTOR_OWNER') {
          router.push('/contractor/dashboard')
        } else if (profile.role === 'SITE_ENGINEER') {
          router.push('/site-engineer/dashboard')
        } else {
          router.push('/login')
        }
      } else {
        setUserProfile(profile)
      }
    } else {
      router.push('/login')
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const roleNameMap = {
    SUPER_ADMIN: 'Super Admin',
    CONTRACTOR_OWNER: 'Contractor Owner',
    SITE_ENGINEER: 'Site Engineer'
  }

  const roleBadgeColor = {
    SUPER_ADMIN: 'bg-pink-500/10 text-pink-500 border-pink-500/20 dark:bg-pink-500/5',
    CONTRACTOR_OWNER: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 dark:bg-indigo-500/5',
    SITE_ENGINEER: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/5'
  }

  const profileHref = `/${role.toLowerCase().replace('_', '-')}/profile`

  const sidebarContent = (
    <div className="flex flex-col h-full bg-card border-r border-border/40">
      {/* Branding Logo */}
      <div className="flex h-16 items-center px-6 border-b border-border/40 gap-2">
        <Compass className="h-6 w-6 text-indigo-500" />
        <span className="font-bold text-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          SitePilot
        </span>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.name}</span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Profile & Logout */}
      <div className="p-4 border-t border-border/40 space-y-4">
        <Link href={profileHref} className="block">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/80 transition-all cursor-pointer border border-transparent hover:border-border/30">
            <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="overflow-hidden flex-1">
              <h4 className="text-sm font-semibold truncate leading-tight text-foreground">
                {userProfile?.full_name || 'Loading profile...'}
              </h4>
              <span className={`inline-block text-[10px] font-bold border px-2 py-0.5 rounded-full mt-1 ${roleBadgeColor[role]}`}>
                {roleNameMap[role]}
              </span>
            </div>
          </div>
        </Link>
        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 py-5 rounded-xl transition-all"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-40">
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* Sticky Top Navigation Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/40 bg-background/80 backdrop-blur-md px-6 md:px-8">
          <div className="flex items-center gap-4">
            {/* Mobile Sidebar Trigger */}
            <Sheet>
              <SheetTrigger render={
                <Button variant="ghost" size="icon" className="md:hidden w-9 h-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              } />
              <SheetContent side="left" className="w-[260px] p-0 border-r-0">
                <SheetTitle className="sr-only">Menu Sidebar</SheetTitle>
                {sidebarContent}
              </SheetContent>
            </Sheet>

            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="w-px h-6 bg-border/40 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-mono">Supabase Sandbox</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
