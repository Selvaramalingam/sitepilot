'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  ClipboardList, 
  Search, 
  Calendar, 
  AlertTriangle,
  User,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3
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
  const [projects, setProjects] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // Form states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null)
  
  const [formData, setFormData] = useState({
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    workCompleted: '',
    issues: '',
    notes: ''
  })
  const [formLoading, setFormLoading] = useState(false)

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
      
      // Fetch projects for dropdown
      const { data: projData } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', companyId)
      
      if (projData) {
        setProjects(projData)
        if (projData.length > 0) {
          setFormData(prev => ({ ...prev, projectId: projData[0].id }))
        }
      }

      // Fetch reports
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contractor) return
    setFormLoading(true)

    try {
      const supabase = createClient()
      const payload = {
        project_id: formData.projectId,
        reporter_id: contractor.id,
        report_date: formData.date,
        work_completed: formData.workCompleted,
        issues: formData.issues,
        notes: formData.notes
      }

      if (editingReport) {
        await supabase.from('daily_reports').update(payload).eq('id', editingReport.id)
      } else {
        await supabase.from('daily_reports').insert([payload])
      }
      
      setIsCreateOpen(false)
      setEditingReport(null)
      setFormData({
        projectId: projects[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        workCompleted: '',
        issues: '',
        notes: ''
      })
      loadData(contractor.company_id!)
    } catch (err) {
      console.error(err)
      alert('Failed to save report')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return
    try {
      const supabase = createClient()
      await supabase.from('daily_reports').delete().eq('id', id)
      loadData(contractor!.company_id!)
    } catch (e) {
      console.error(e)
    }
  }

  const startEdit = (report: DailyReport) => {
    setEditingReport(report)
    setFormData({
      projectId: report.projectId,
      date: report.date,
      workCompleted: report.workCompleted,
      issues: report.issues,
      notes: report.notes
    })
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

        {/* Add Report Modal */}
        <Dialog open={isCreateOpen || !!editingReport} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false)
            setEditingReport(null)
            setFormData({
              projectId: projects[0]?.id || '',
              date: new Date().toISOString().split('T')[0],
              workCompleted: '',
              issues: '',
              notes: ''
            })
          } else {
            setIsCreateOpen(true)
          }
        }}>
          <DialogTrigger render={
            <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 gap-2 w-full sm:w-auto py-5 transition-all duration-300">
              <Plus className="h-4.5 w-4.5" /> File New Report
            </Button>
          } />
          <DialogContent className="sm:max-w-[500px] rounded-2xl bg-card border-border/40 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-heading bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                {editingReport ? 'Edit Daily Report' : 'File Daily Report'}
              </DialogTitle>
              <CardDescription>Log daily site progress, issues, and activities.</CardDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Select Project</Label>
                <select
                  required
                  className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none"
                  value={formData.projectId}
                  onChange={e => setFormData({...formData, projectId: e.target.value})}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id} className="bg-card">{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  type="date" required
                  className="rounded-xl border-border/40 bg-background/30 h-11"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Work Completed</Label>
                <textarea 
                  required placeholder="Describe the work done today..."
                  className="flex w-full rounded-xl border border-border/40 bg-background/30 p-3 min-h-[100px] text-sm focus-visible:outline-none focus:border-indigo-500/50"
                  value={formData.workCompleted}
                  onChange={e => setFormData({...formData, workCompleted: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Issues & Delays</Label>
                <textarea 
                  placeholder="Any roadblocks, weather delays, etc..."
                  className="flex w-full rounded-xl border border-border/40 bg-background/30 p-3 min-h-[80px] text-sm focus-visible:outline-none focus:border-indigo-500/50"
                  value={formData.issues}
                  onChange={e => setFormData({...formData, issues: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <textarea 
                  placeholder="Any other observations..."
                  className="flex w-full rounded-xl border border-border/40 bg-background/30 p-3 min-h-[80px] text-sm focus-visible:outline-none focus:border-indigo-500/50"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>
              <Button type="submit" disabled={formLoading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-6 font-semibold shadow-lg shadow-indigo-500/20 mt-4">
                {formLoading ? 'Saving...' : 'Save Report'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(report)} className="h-8 w-8 text-muted-foreground hover:text-indigo-400">
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(report.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
