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
  Plus,
  Lock
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
  sidebarTopElement?: React.ReactNode
}

export function PortalLayout({ title, role, navigation, children, sidebarTopElement }: PortalLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [features, setFeatures] = useState<Record<string, boolean> | null>(null)
  const [loadingFeatures, setLoadingFeatures] = useState(role !== 'SUPER_ADMIN')

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
          router.push('/admin/dashboard')
        } else if (profile.role === 'SITE_ENGINEER') {
          router.push('/site-engineer/dashboard')
        } else {
          router.push('/login')
        }
      } else {
        setUserProfile(profile)
        // Fetch subscription plan features
        if (profile.role !== 'SUPER_ADMIN' && profile.company_id) {
          try {
            const supabase = createClient()
            const { data: companyData } = await supabase
              .from('companies')
              .select(`
                subscription_plan_id,
                subscription_plans (
                  features
                )
              `)
              .eq('id', profile.company_id)
              .single()

            if (companyData?.subscription_plans) {
              const planFeatures = (companyData.subscription_plans as any).features || {}
              setFeatures(planFeatures)
            } else {
              setFeatures({
                Materials: true,
                Expenses: true,
                Accounting: false,
                Reports: false,
                Documents: true,
                AI: false,
                Tasks: true,
                Finance: false
              })
            }
          } catch (err) {
            console.error('Failed to load active plan features:', err)
          } finally {
            setLoadingFeatures(false)
          }
        } else {
          setLoadingFeatures(false)
        }
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

  const profileHref = role === 'CONTRACTOR_OWNER' ? '/admin/profile' : `/${role.toLowerCase().replace('_', '-')}/profile`

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
        {sidebarTopElement && (
          <div className="mb-4">
            {sidebarTopElement}
          </div>
        )}
        {navigation
          .filter((item) => {
            if (role === 'SUPER_ADMIN') return true
            if (!features) return true
            if (item.name === 'Materials') return features.Materials !== false
            if (item.name === 'Expenses') return features.Expenses !== false
            if (item.name === 'Accounting') return features.Accounting !== false
            if (item.name === 'Reports') return features.Reports !== false
            if (item.name === 'Tasks') return features.Tasks !== false
            if (item.name === 'My Tasks') return features.Tasks !== false
            if (item.name === 'Finance') return features.Finance !== false
            return true
          })
          .map((item) => {
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

  // Check if current route is disabled
  let isRouteDisabled = false
  let disabledFeatureName = ''

  if (!loadingFeatures && features && role !== 'SUPER_ADMIN') {
    if (pathname.startsWith('/admin/materials') && features.Materials === false) {
      isRouteDisabled = true
      disabledFeatureName = 'Materials Management'
    } else if (pathname.startsWith('/admin/expenses') && features.Expenses === false) {
      isRouteDisabled = true
      disabledFeatureName = 'Project Expense Tracking'
    } else if (pathname.startsWith('/admin/accounting') && features.Accounting === false) {
      isRouteDisabled = true
      disabledFeatureName = 'Project Accounting'
    } else if (pathname.startsWith('/admin/reports') && features.Reports === false) {
      isRouteDisabled = true
      disabledFeatureName = 'Advanced Reports'
    } else if (pathname.startsWith('/admin/tasks') && features.Tasks === false) {
      isRouteDisabled = true
      disabledFeatureName = 'Task Management'
    } else if (pathname.startsWith('/site-engineer/tasks') && features.Tasks === false) {
      isRouteDisabled = true
      disabledFeatureName = 'Task Management'
    } else if (pathname.startsWith('/admin/finance') && features.Finance === false) {
      isRouteDisabled = true
      disabledFeatureName = 'Personal Finance & Company Ledger'
    }
  }

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
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {isRouteDisabled ? (
            <div className="flex items-center justify-center min-h-[60vh] w-full">
              <div className="max-w-md w-full bg-card/60 backdrop-blur-xl border border-border/40 p-8 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-inner animate-pulse">
                  <Lock className="w-8 h-8" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {disabledFeatureName} Locked
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Your company's active subscription tier does not include the <span className="font-semibold text-foreground">{disabledFeatureName}</span> module.
                  </p>
                </div>
                
                <div className="bg-muted/40 rounded-2xl p-4 border border-border/30 text-xs text-muted-foreground text-left leading-normal space-y-1.5">
                  <p className="font-semibold text-foreground">What you're missing:</p>
                  {disabledFeatureName === 'Task Management' ? (
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Assign tasks to Site Engineers and track completion</li>
                      <li>Monitor task priorities (Low to Critical) and start/due dates</li>
                      <li>Upload and verify proof of work (photos, notes, documents)</li>
                    </ul>
                  ) : disabledFeatureName === 'Personal Finance & Company Ledger' ? (
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Record daily company income, expenses, and account transfers</li>
                      <li>Manage independent cash, bank, card, and UPI accounts</li>
                      <li>Track recurring payments (Rent, EMI, Salaries) and run reports</li>
                    </ul>
                  ) : (
                    <p>Upgrade your plan to unlock full access to this feature module and enhance your team workflow.</p>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button 
                    variant="outline"
                    onClick={() => router.push(role === 'CONTRACTOR_OWNER' ? '/admin/dashboard' : '/site-engineer/dashboard')}
                    className="flex-1 rounded-xl h-11 border-border/40"
                  >
                    Back to Dashboard
                  </Button>
                  {role === 'CONTRACTOR_OWNER' && (
                    <Button
                      onClick={() => router.push('/admin/profile')}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl h-11 font-medium shadow-lg shadow-indigo-500/20"
                    >
                      Upgrade Plan
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}
