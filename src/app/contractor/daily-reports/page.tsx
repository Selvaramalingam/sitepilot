'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ClipboardList, 
  Search, 
  Calendar, 
  MapPin, 
  AlertTriangle,
  User,
  CheckCircle2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser, UserProfile } from '@/lib/auth-helpers'

interface DailyReport {
  id: string
  projectId: string
  projectName: string
  reporterName: string
  date: string
  workCompleted: string
  issues: string
  notes: string
}

export default function ContractorDailyReports() {
  const router = useRouter()
  const [contractor, setContractor] = useState<UserProfile | null>(null)
  const [reports, setReports] = useState<DailyReport[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSession()
  }, [])

  const fetchSession = async () => {
    const profile = await getCurrentUser()
    if (profile && profile.role === 'CONTRACTOR_OWNER') {
      setContractor(profile)
      loadData(profile.company_id!)
    } else {
      router.push('/login')
    }
  }

  const loadData = async (companyId: string) => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      const { data: reportsData, error } = await supabase
        .from('daily_reports')
        .select('*, project:projects!inner(*), reporter:users(*)')
        .eq('projects.company_id', companyId)
        .order('report_date', { ascending: false })

      if (error) throw error

      if (reportsData) {
        const mapped = reportsData.map((r: any) => ({
          id: r.id,
          projectId: r.project_id,
          projectName: r.project?.name || 'Unknown Project',
          reporterName: r.reporter?.full_name || 'Unknown Engineer',
          date: r.report_date,
          workCompleted: r.work_completed || '',
          issues: r.issues || '',
          notes: r.notes || ''
        }))
        setReports(mapped)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filteredReports = reports.filter(r => 
    r.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.workCompleted.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
          <Input 
            placeholder="Search reports, projects, engineers..." 
            className="pl-10 rounded-xl border-border/40 bg-card/50"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading site reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No daily reports found. Ensure your site engineers are filing logs.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredReports.map(report => (
            <Card key={report.id} className="border border-border/40 bg-card/40 backdrop-blur-sm flex flex-col hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex justify-between items-start gap-4">
                  <div className="overflow-hidden">
                    <CardTitle className="text-lg font-bold font-heading truncate flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-indigo-500" />
                      {report.projectName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4" /> {report.date}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="inline-block bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      Report Filed
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <User className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span>Reporter: {report.reporterName}</span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/20 space-y-2">
                    <h4 className="text-xs uppercase font-bold text-emerald-500 flex items-center gap-1.5 tracking-wider">
                      <CheckCircle2 className="w-4 h-4" /> Work Completed
                    </h4>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{report.workCompleted}</p>
                  </div>

                  {report.issues && (
                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-2">
                      <h4 className="text-xs uppercase font-bold text-destructive flex items-center gap-1.5 tracking-wider">
                        <AlertTriangle className="w-4 h-4" /> Issues & Delays
                      </h4>
                      <p className="text-sm text-destructive leading-relaxed whitespace-pre-wrap">{report.issues}</p>
                    </div>
                  )}

                  {report.notes && (
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/20 space-y-2">
                      <h4 className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                        Additional Notes
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{report.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
