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
  ClipboardList
} from 'lucide-react'

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/contractor/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/contractor/projects', icon: Briefcase },
  { name: 'Materials', href: '/contractor/materials', icon: FileSpreadsheet },
  { name: 'Expenses', href: '/contractor/expenses', icon: Receipt },
  { name: 'Accounting', href: '/contractor/accounting', icon: DollarSign },
  { name: 'Engineers', href: '/contractor/engineers', icon: Users },
  { name: 'Reports', href: '/contractor/reports', icon: FileBarChart },
  { name: 'Daily Reports', href: '/contractor/daily-reports', icon: ClipboardList }
]

export default function ContractorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PortalLayout 
      title="Contractor Portal" 
      role="CONTRACTOR_OWNER" 
      navigation={navigation}
    >
      {children}
    </PortalLayout>
  )
}
