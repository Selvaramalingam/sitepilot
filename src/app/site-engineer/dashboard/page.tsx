'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Briefcase, Calendar, MapPin, Plus, FileText, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser, UserProfile } from '@/lib/auth-helpers'

export default function SiteEngineerDashboard() {
  const router = useRouter()
  const [engineer, setEngineer] = useState<UserProfile | null>(null)
  const [assignedProjects, setAssignedProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSession()
  }, [])

  const fetchSession = async () => {
    const profile = await getCurrentUser()
    if (profile && profile.role === 'SITE_ENGINEER') {
      setEngineer(profile)
      loadDashboardData(profile.id)
    } else {
      router.push('/login')
    }
  }

  const loadDashboardData = async (engineerId: string) => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Fetch projects assigned to this site engineer
      const { data: assignments } = await supabase
        .from('project_assignments')
        .select('project_id, project:projects(*)')
        .eq('user_id', engineerId)

      // Fetch log counts (daily reports) filed by this engineer
      const { data: reports } = await supabase
        .from('daily_reports')
        .select('project_id')
        .eq('reporter_id', engineerId)

      const dbAssignments = assignments || []
      const dbReports = reports || []

      const mapped = dbAssignments
        .filter(a => a.project !== null)
        .map(a => {
          const p = a.project as any
          const logCount = dbReports.filter(r => r.project_id === p.id).length
          return {
            id: p.id,
            name: p.name,
            client: p.client_name || 'Unknown Client',
            address: p.address || 'No Address Listed',
            startDate: p.start_date || '',
            endDate: p.end_date || '',
            status: p.status || 'Active',
            logs: logCount
          }
        })

      setAssignedProjects(mapped)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview stats info */}
      <div className="rounded-2xl p-6 md:p-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white relative overflow-hidden shadow-xl shadow-indigo-500/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -z-10" />
        <div className="space-y-2 relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold font-heading">Field Engineer Hub</h2>
          <p className="text-white/80 max-w-xl text-sm leading-relaxed">
            Record raw material deliveries, file daily progress logs, and log labor expenses on site. You can only view projects assigned to you.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold tracking-tight font-heading mt-6">
        Your Assigned Projects ({assignedProjects.length})
      </h2>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading assigned projects...</p>
        </div>
      ) : assignedProjects.length === 0 ? (
        <Card className="p-8 text-center border border-border/40 bg-card/40 text-muted-foreground">
          You are currently not assigned to any projects. Contact your Contractor Owner to receive project assignments.
        </Card>
      ) : (
        /* Projects list */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignedProjects.map(p => (
            <Card key={p.id} className="border border-border/40 bg-card/40 backdrop-blur-sm flex flex-col justify-between hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold font-heading">{p.name}</CardTitle>
                    <CardDescription>Client: {p.client}</CardDescription>
                  </div>
                  <span className="inline-block border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {p.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="py-5 space-y-4">
                <div className="space-y-2 text-xs font-semibold text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span>{p.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span>Timeline: {p.startDate} to {p.endDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span>Logs filed: {p.logs} logs logged</span>
                  </div>
                </div>
              </CardContent>

              <div className="border-t border-border/40 bg-muted/10 px-6 py-4 flex justify-end items-center rounded-b-2xl">
                <Link href="/site-engineer/entries">
                  <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl gap-1 px-5 shadow shadow-indigo-500/10 text-xs font-semibold">
                    File Entry <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
