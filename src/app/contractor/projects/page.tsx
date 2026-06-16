'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Briefcase, 
  Plus, 
  UserPlus, 
  Calendar, 
  MapPin, 
  FolderArchive,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit3
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser, UserProfile } from '@/lib/auth-helpers'
import { useCurrency } from '@/hooks/useCurrency'

interface Project {
  id: string
  name: string
  client: string
  address: string
  startDate: string
  endDate: string
  status: 'Planning' | 'Active' | 'Archived' | 'Delayed'
  engineer: string
  engineerId: string
  budget: number
}

export default function ContractorProjects() {
  const router = useRouter()
  const { symbol } = useCurrency()
  const [contractor, setContractor] = useState<UserProfile | null>(null)
  const [engineers, setEngineers] = useState<UserProfile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // New Project form states
  const [newProject, setNewProject] = useState({
    name: '', client: '', address: '', startDate: '', endDate: '', status: 'Planning' as Project['status'], budget: ''
  })
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Edit Project form states
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editProjectForm, setEditProjectForm] = useState({
    name: '', client: '', address: '', startDate: '', endDate: '', status: 'Planning' as Project['status'], budget: ''
  })

  // Assignment states
  const [assigningProject, setAssigningProject] = useState<Project | null>(null)
  const [selectedEngineer, setSelectedEngineer] = useState('')

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
      
      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true })

      // Fetch project assignments with user profile details
      const { data: assignmentsData } = await supabase
        .from('project_assignments')
        .select('project_id, user_id, users:users!project_assignments_user_id_fkey(id, full_name, email)')

      // Fetch company site engineers
      const { data: engineersData } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', companyId)
        .eq('role', 'SITE_ENGINEER')
        .order('full_name', { ascending: true })

      if (engineersData) {
        setEngineers(engineersData as UserProfile[])
      }

      if (projectsData) {
        const mapped = projectsData.map((p: any) => {
          const assignment = assignmentsData?.find((a: any) => a.project_id === p.id)
          const assignedUser: any = assignment?.users
          return {
            id: p.id,
            name: p.name,
            client: p.client_name || '',
            address: p.address || '',
            startDate: p.start_date || '',
            endDate: p.end_date || '',
            status: p.status || 'Planning',
            engineer: assignedUser ? `${assignedUser.full_name} (${assignedUser.email})` : 'Unassigned',
            engineerId: assignedUser?.id || '',
            budget: p.budget || 0
          }
        })
        setProjects(mapped)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contractor || !contractor.company_id) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('projects')
        .insert({
          company_id: contractor.company_id,
          name: newProject.name,
          client_name: newProject.client,
          address: newProject.address,
          start_date: newProject.startDate,
          end_date: newProject.endDate,
          status: newProject.status,
          budget: parseFloat(newProject.budget) || 0
        })

      if (error) {
        alert('Failed to create project: ' + error.message)
        return
      }

      setNewProject({ name: '', client: '', address: '', startDate: '', endDate: '', status: 'Planning', budget: '' })
      setIsCreateOpen(false)
      loadData(contractor.company_id)
    } catch (err) {
      console.error(err)
    }
  }

  const handleEditProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject || !contractor?.company_id) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('projects')
        .update({
          name: editProjectForm.name,
          client_name: editProjectForm.client,
          address: editProjectForm.address,
          start_date: editProjectForm.startDate,
          end_date: editProjectForm.endDate,
          status: editProjectForm.status,
          budget: parseFloat(editProjectForm.budget) || 0
        })
        .eq('id', editingProject.id)

      if (error) {
        alert('Failed to update project: ' + error.message)
        return
      }

      setEditingProject(null)
      loadData(contractor.company_id)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAssignEngineer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assigningProject || !contractor?.company_id) return

    try {
      const supabase = createClient()
      
      // Delete existing assignment first
      await supabase
        .from('project_assignments')
        .delete()
        .eq('project_id', assigningProject.id)

      if (selectedEngineer !== 'Unassigned' && selectedEngineer !== '') {
        const { error } = await supabase
          .from('project_assignments')
          .insert({
            project_id: assigningProject.id,
            user_id: selectedEngineer
          })

        if (error) {
          alert('Failed to assign engineer: ' + error.message)
          return
        }
      }

      setAssigningProject(null)
      loadData(contractor.company_id)
    } catch (err) {
      console.error(err)
    }
  }

  const toggleArchive = async (id: string, currentStatus: string) => {
    if (!contractor?.company_id) return
    const newStatus = currentStatus === 'Archived' ? 'Active' : 'Archived'
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) {
        alert('Failed to update status: ' + error.message)
        return
      }

      loadData(contractor.company_id)
    } catch (err) {
      console.error(err)
    }
  }

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const statusBadgeColor = {
    Planning: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    Active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    Delayed: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    Archived: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }

  return (
    <div className="space-y-6">
      {/* Header filter & add project modal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
          <Input 
            placeholder="Search projects by name, client..." 
            className="pl-10 rounded-xl border-border/40 bg-card/50"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 gap-2 w-full sm:w-auto py-5">
              <Plus className="h-4.5 w-4.5" /> Create New Project
            </Button>
          } />
          <DialogContent className="sm:max-w-[450px] rounded-2xl bg-card border-border/40">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-heading">Register New Project</DialogTitle>
              <CardDescription>Setup details for contract parameters, client and target deadlines.</CardDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="p-name">Project Name</Label>
                <Input 
                  id="p-name" required placeholder="e.g. Greenwood Heights Phase II"
                  className="rounded-xl border-border/40 bg-background/30 h-11"
                  value={newProject.name}
                  onChange={e => setNewProject({...newProject, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-client">Client / Authority Name</Label>
                <Input 
                  id="p-client" required placeholder="e.g. Greenwood Developers"
                  className="rounded-xl border-border/40 bg-background/30 h-11"
                  value={newProject.client}
                  onChange={e => setNewProject({...newProject, client: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-address">Site Location Address</Label>
                <Input 
                  id="p-address" required placeholder="12 Greenwood Enclave"
                  className="rounded-xl border-border/40 bg-background/30 h-11"
                  value={newProject.address}
                  onChange={e => setNewProject({...newProject, address: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="p-start">Start Date</Label>
                  <Input 
                    id="p-start" type="date" required
                    className="rounded-xl border-border/40 bg-background/30 h-11"
                    value={newProject.startDate}
                    onChange={e => setNewProject({...newProject, startDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-end">Target End Date</Label>
                  <Input 
                    id="p-end" type="date" required
                    className="rounded-xl border-border/40 bg-background/30 h-11"
                    value={newProject.endDate}
                    onChange={e => setNewProject({...newProject, endDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-budget">Project Budget ({symbol})</Label>
                <Input 
                  id="p-budget" required type="number" placeholder="e.g. 250000"
                  className="rounded-xl border-border/40 bg-background/30 h-11"
                  value={newProject.budget}
                  onChange={e => setNewProject({...newProject, budget: e.target.value})}
                />
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 font-semibold shadow-lg shadow-indigo-500/20 mt-4">
                Create Project Workspace
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No projects found. Register one to get started.
        </div>
      ) : (
        /* Projects Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(p => (
            <Card key={p.id} className="border border-border/40 bg-card/40 backdrop-blur-sm flex flex-col justify-between hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex justify-between items-start gap-4">
                  <div className="overflow-hidden">
                    <CardTitle className="text-lg font-bold font-heading truncate">{p.name}</CardTitle>
                    <CardDescription className="truncate">Client: {p.client}</CardDescription>
                  </div>
                  <span className={`inline-block border px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeColor[p.status]}`}>
                    {p.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="py-5 space-y-4">
                <div className="space-y-2 text-xs font-semibold text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span className="truncate">{p.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span>{p.startDate} to {p.endDate}</span>
                  </div>
                </div>

                {/* Assigned site engineer block */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border/20 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Assigned Engineer</span>
                  <p className="text-xs font-bold text-foreground truncate">{p.engineer}</p>
                </div>
              </CardContent>              <div className="border-t border-border/40 bg-muted/10 px-6 py-4 flex justify-between items-center rounded-b-2xl">
                {/* Edit Project Dialog Overlay */}
                <Dialog open={editingProject?.id === p.id} onOpenChange={(open) => !open && setEditingProject(null)}>
                  <DialogTrigger render={
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditingProject(p)
                        setEditProjectForm({
                          name: p.name, client: p.client, address: p.address, startDate: p.startDate, endDate: p.endDate, status: p.status, budget: p.budget.toString()
                        })
                      }}
                      className="rounded-lg border-border/40 hover:bg-muted/80 gap-1.5"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-indigo-500" /> Edit
                    </Button>
                  } />
                  <DialogContent className="sm:max-w-[450px] rounded-2xl bg-card border-border/40">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold font-heading">Edit Project</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditProjectSubmit} className="space-y-4 mt-2">
                      <div className="space-y-2">
                        <Label>Project Name</Label>
                        <Input required className="rounded-xl border-border/40 bg-background/30 h-11" value={editProjectForm.name} onChange={e => setEditProjectForm({...editProjectForm, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Client / Authority Name</Label>
                        <Input required className="rounded-xl border-border/40 bg-background/30 h-11" value={editProjectForm.client} onChange={e => setEditProjectForm({...editProjectForm, client: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Site Location Address</Label>
                        <Input required className="rounded-xl border-border/40 bg-background/30 h-11" value={editProjectForm.address} onChange={e => setEditProjectForm({...editProjectForm, address: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Start Date</Label><Input type="date" required className="rounded-xl border-border/40 bg-background/30 h-11" value={editProjectForm.startDate} onChange={e => setEditProjectForm({...editProjectForm, startDate: e.target.value})} /></div>
                        <div className="space-y-2"><Label>Target End Date</Label><Input type="date" required className="rounded-xl border-border/40 bg-background/30 h-11" value={editProjectForm.endDate} onChange={e => setEditProjectForm({...editProjectForm, endDate: e.target.value})} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Project Budget ({symbol})</Label><Input required type="number" className="rounded-xl border-border/40 bg-background/30 h-11" value={editProjectForm.budget} onChange={e => setEditProjectForm({...editProjectForm, budget: e.target.value})} /></div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <select className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none" value={editProjectForm.status} onChange={(e: any) => setEditProjectForm({...editProjectForm, status: e.target.value})}>
                            <option value="Planning">Planning</option>
                            <option value="Active">Active</option>
                            <option value="Delayed">Delayed</option>
                            <option value="Archived">Archived</option>
                          </select>
                        </div>
                      </div>
                      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 font-semibold shadow-lg shadow-indigo-500/20 mt-4">
                        Save Changes
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Assign Engineer Dialog Overlay */}
                <Dialog open={assigningProject?.id === p.id} onOpenChange={(open) => !open && setAssigningProject(null)}>
                  <DialogTrigger render={
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setAssigningProject(p)
                        setSelectedEngineer(p.engineerId || 'Unassigned')
                      }}
                      className="rounded-lg border-border/40 hover:bg-muted/80 gap-1.5"
                    >
                      <UserPlus className="h-3.5 w-3.5 text-indigo-500" /> Assign Engineer
                    </Button>
                  } />
                  <DialogContent className="sm:max-w-[400px] rounded-2xl bg-card border-border/40">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold font-heading">Assign Site Engineer</DialogTitle>
                      <CardDescription>Select an engineer from your registered company profiles.</CardDescription>
                    </DialogHeader>
                    <form onSubmit={handleAssignEngineer} className="space-y-4 mt-2">
                      <div className="space-y-2">
                        <Label htmlFor="eng-select">Registered Site Engineers</Label>
                        <select
                          id="eng-select"
                          className="flex w-full rounded-xl border border-border bg-background px-3 h-11 text-sm focus-visible:outline-none"
                          value={selectedEngineer}
                          onChange={e => setSelectedEngineer(e.target.value)}
                        >
                          <option value="Unassigned">Unassigned</option>
                          {engineers.map(eng => (
                            <option key={eng.id} value={eng.id}>
                              {eng.full_name} ({eng.email})
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 font-semibold mt-4">
                        Update Assignment
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => toggleArchive(p.id, p.status)}
                  className="rounded-lg text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 gap-1"
                >
                  <FolderArchive className="h-3.5 w-3.5" />
                  <span>{p.status === 'Archived' ? 'Activate' : 'Archive'}</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
