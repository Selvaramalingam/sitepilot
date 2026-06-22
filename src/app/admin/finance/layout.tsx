'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Wallet, 
  Tags, 
  Users, 
  ListOrdered, 
  CalendarClock, 
  BarChart3
} from 'lucide-react'

const navItems = [
  { name: 'Dashboard', href: '/admin/finance', icon: LayoutDashboard },
  { name: 'Transactions', href: '/admin/finance/transactions', icon: ListOrdered },
  { name: 'Accounts', href: '/admin/finance/accounts', icon: Wallet },
  { name: 'Categories', href: '/admin/finance/categories', icon: Tags },
  { name: 'Vendors', href: '/admin/finance/vendors', icon: Users },
  { name: 'Recurring Bills', href: '/admin/finance/recurring', icon: CalendarClock },
  { name: 'Reports', href: '/admin/finance/reports', icon: BarChart3 }
]

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-heading">Company Finance</h2>
        <p className="text-muted-foreground">Manage your company's independent accounting, cash flow, and expenses.</p>
      </div>

      <div className="flex overflow-x-auto border-b border-border/40 pb-px hide-scrollbar">
        <div className="flex space-x-1 min-w-max">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-colors ${
                  isActive 
                    ? 'bg-indigo-500/10 text-indigo-500 border-b-2 border-indigo-500' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="pt-2">
        {children}
      </div>
    </div>
  )
}
