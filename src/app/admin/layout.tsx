'use client'

import React from 'react'
import { PortalLayout, type NavigationItem } from '@/components/portal-layout'
import { 
  LayoutDashboard, 
  Briefcase, 
  FileSpreadsheet, 
  Receipt, 
  DollarSign, 
  FileBarChart,
  Users,
  ClipboardList,
  Building2,
  CheckSquare,
  Landmark
} from 'lucide-react'
import { AdminProjectProvider, useAdminProject } from '@/components/admin-project-context'

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/admin/projects', icon: Briefcase },
  { name: 'Materials', href: '/admin/materials', icon: FileSpreadsheet },
  { name: 'Expenses', href: '/admin/expenses', icon: Receipt },
  { name: 'Accounting', href: '/admin/accounting', icon: DollarSign },
  { name: 'Engineers', href: '/admin/engineers', icon: Users },
  { name: 'Reports', href: '/admin/reports', icon: FileBarChart },
  { name: 'Daily Reports', href: '/admin/daily-reports', icon: ClipboardList },
  { name: 'Tasks', href: '/admin/tasks', icon: CheckSquare },
  { name: 'Finance', href: '/admin/finance', icon: Landmark }
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminProjectProvider>
      <PortalLayout 
        title="Admin Portal" 
        role="CONTRACTOR_OWNER" 
        navigation={navigation}
      >
        {children}
      </PortalLayout>
    </AdminProjectProvider>
  )
}
