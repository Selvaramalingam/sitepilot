'use client'

import React from 'react'
import { PortalLayout, type NavigationItem } from '@/components/portal-layout'
import { LayoutDashboard, FileSpreadsheet, CheckSquare } from 'lucide-react'

const navigation: NavigationItem[] = [
  { name: 'Assigned Projects', href: '/site-engineer/dashboard', icon: LayoutDashboard },
  { name: 'Field Entries log', href: '/site-engineer/entries', icon: FileSpreadsheet },
  { name: 'My Tasks', href: '/site-engineer/tasks', icon: CheckSquare }
]

export default function SiteEngineerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PortalLayout 
      title="Site Engineer Workspace" 
      role="SITE_ENGINEER" 
      navigation={navigation}
    >
      {children}
    </PortalLayout>
  )
}
