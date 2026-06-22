'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth-helpers'

export interface ProjectMin {
  id: string
  name: string
}

interface AdminProjectContextType {
  selectedProjectId: string
  setSelectedProjectId: (id: string) => void
  projects: ProjectMin[]
  loading: boolean
}

const AdminProjectContext = createContext<AdminProjectContextType | undefined>(undefined)

export function AdminProjectProvider({ children }: { children: React.ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [projects, setProjects] = useState<ProjectMin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProjects() {
      try {
        const user = await getCurrentUser()
        if (!user || !user.company_id) {
          setLoading(false)
          return
        }

        const supabase = createClient()
        const { data } = await supabase
          .from('projects')
          .select('id, name')
          .eq('company_id', user.company_id)
          .order('name', { ascending: true })

        if (data) {
          setProjects(data)
        }
      } catch (error) {
        console.error('Failed to load projects for filter', error)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [])

  return (
    <AdminProjectContext.Provider value={{ selectedProjectId, setSelectedProjectId, projects, loading }}>
      {children}
    </AdminProjectContext.Provider>
  )
}

export function useAdminProject() {
  const context = useContext(AdminProjectContext)
  if (context === undefined) {
    throw new Error('useAdminProject must be used within an AdminProjectProvider')
  }
  return context
}
