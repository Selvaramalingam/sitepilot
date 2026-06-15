'use client'

import React from 'react'
import { PortalLayout, type NavigationItem } from '@/components/portal-layout'
import { LayoutDashboard, Building2, CreditCard } from 'lucide-react'

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
  { name: 'Companies', href: '/super-admin/companies', icon: Building2 },
  { name: 'Subscriptions', href: '/super-admin/subscriptions', icon: CreditCard }
]

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PortalLayout 
      title="Super Admin Workspace" 
      role="SUPER_ADMIN" 
      navigation={navigation}
    >
      {children}
    </PortalLayout>
  )
}
