'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useAdminProject } from '@/components/admin-project-context'
import { TaskPriorityBadge, TaskStatusBadge } from '@/components/ui/task-badge'
import { 
  CheckSquare, 
  Search, 
  Plus, 
  Calendar,
  Clock,
  User,
  AlertCircle
} from 'lucide-react'

export default function AdminTasksPage() {
  const router = useRouter()
  const { selectedProjectId, setSelectedProjectId } = useAdminProject()
  
  const [tasks, setTasks] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [engineers, setEngineers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    description: '',
    assignedTo: '',
    priority: 'Medium',
    startDate: '',
    dueDate: '',
    estimatedHours: ''
  })
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's company
      const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single()
      if (!profile || !profile.company_id) return

      // Fetch projects
      const { data: pData } = await supabase.from('projects').select('id, name').eq('company_id', profile.company_id)
      setProjects(pData || [])
      if (pData && pData.length > 0) {
        setFormData(prev => ({ ...prev, projectId: pData[0].id }))
      }

      // Fetch engineers
      const { data: eData } = await supabase.from('users').select('id, full_name').eq('company_id', profile.company_id).eq('role', 'SITE_ENGINEER')
      setEngineers(eData || [])

      // Fetch tasks
      const { data: tData } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(name, company_id),
          assignee:users!tasks_assigned_to_fkey(full_name)
        `)
        .eq('projects.company_id', profile.company_id)
        .order('created_at', { ascending: false })

      setTasks((tData || []).filter(t => t.project !== null)) // Filter out tasks if project join failed
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: task, error } = await supabase.from('tasks').insert({
        project_id: formData.projectId,
        title: formData.title,
        description: formData.description,
        assigned_to: formData.assignedTo || null,
        priority: formData.priority,
        start_date: formData.startDate || null,
        due_date: formData.dueDate || null,
        estimated_hours: parseFloat(formData.estimatedHours) || 0,
        created_by: user?.id,
        status: 'Draft'
      }).select().single()

      if (error) throw error

      if (task) {
        await supabase.from('task_history').insert({
          task_id: task.id,
          action: 'CREATED',
          user_id: user?.id,
          metadata: { title: task.title }
        })
      }

      setIsCreateOpen(false)
      loadData()
    } catch (e: any) {
      alert('Failed to create task: ' + e.message)
    } finally {
      setFormLoading(false)
    }
  }

  // Filter logic
  const filteredTasks = tasks.filter(t => {
    const matchesProject = selectedProjectId === 'all' || t.project_id === selectedProjectId
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.assignee?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter
    const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter
    
    return matchesProject && matchesSearch && matchesStatus && matchesPriority
  })

  // KPI Calculations
  const totalTasks = filteredTasks.length
  const pendingTasks = filteredTasks.filter(t => ['Draft', 'Pending'].includes(t.status)).length
  const inProgressTasks = filteredTasks.filter(t => t.status === 'In Progress').length
  const completedTasks = filteredTasks.filter(t => t.status === 'Completed').length
  const overdueTasks = filteredTasks.filter(t => t.status !== 'Completed' && t.due_date && new Date(t.due_date) < new Date()).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading">Task Management</h2>
          <p className="text-muted-foreground">Assign and monitor project tasks</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg gap-2">
              <Plus className="w-4 h-4" /> Create Task
            </Button>
          } />
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>Fill out the task details below to assign work.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Task Title</Label>
                <Input required placeholder="e.g. Inspect foundation wiring" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="rounded-xl bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <select required className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus-visible:outline-none" value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})}>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <textarea rows={3} className="flex w-full rounded-xl border border-border/40 bg-background/50 p-3 text-sm focus-visible:outline-none" placeholder="Task details..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <select className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus-visible:outline-none" value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})}>
                    <option value="">Unassigned</option>
                    {engineers.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <select className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus-visible:outline-none" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Est. Hours</Label>
                  <Input type="number" min="0" step="0.5" placeholder="e.g. 4.5" value={formData.estimatedHours} onChange={e => setFormData({...formData, estimatedHours: e.target.value})} className="rounded-xl bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="rounded-xl bg-background/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="rounded-xl bg-background/50" />
                </div>
              </div>
              <Button type="submit" disabled={formLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 mt-4">
                {formLoading ? 'Creating...' : 'Create Task'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col justify-center">
            <span className="text-xs font-semibold text-muted-foreground">Total Tasks</span>
            <span className="text-2xl font-bold">{totalTasks}</span>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col justify-center">
            <span className="text-xs font-semibold text-amber-500">Pending</span>
            <span className="text-2xl font-bold text-amber-500">{pendingTasks}</span>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col justify-center">
            <span className="text-xs font-semibold text-indigo-500">In Progress</span>
            <span className="text-2xl font-bold text-indigo-500">{inProgressTasks}</span>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col justify-center">
            <span className="text-xs font-semibold text-emerald-500">Completed</span>
            <span className="text-2xl font-bold text-emerald-500">{completedTasks}</span>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col justify-center">
            <span className="text-xs font-semibold text-red-500">Overdue</span>
            <span className="text-2xl font-bold text-red-500">{overdueTasks}</span>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search tasks..." 
              className="pl-9 rounded-xl border-border/40 bg-card/50"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="flex rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus-visible:outline-none w-full sm:w-40 font-medium"
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            className="flex rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus-visible:outline-none w-full sm:w-40"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="On Hold">On Hold</option>
            <option value="Review">Review</option>
            <option value="Completed">Completed</option>
          </select>
          <select
            className="flex rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus:outline-none w-full sm:w-40"
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
          >
            <option value="All">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">No tasks found.</div>
        ) : (
          filteredTasks.map(task => {
            const isOverdue = task.status !== 'Completed' && task.due_date && new Date(task.due_date) < new Date()
            return (
              <Card 
                key={task.id} 
                className={`border-border/40 bg-card/40 backdrop-blur-sm hover:shadow-lg transition-all cursor-pointer ${isOverdue ? 'border-red-500/30' : ''}`}
                onClick={() => router.push(`/admin/tasks/${task.id}`)}
              >
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-3">
                    <TaskStatusBadge status={task.status} />
                    <TaskPriorityBadge priority={task.priority} />
                  </div>
                  
                  <h3 className="font-bold text-lg mb-1 leading-tight line-clamp-2">{task.title}</h3>
                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{task.description || 'No description provided.'}</p>
                  
                  <div className="mt-auto space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      {task.assignee?.full_name || 'Unassigned'}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {task.due_date && (
                        <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-500 font-bold' : ''}`}>
                          <Calendar className="w-3.5 h-3.5" /> {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-2">
                      <div className="flex justify-between text-[10px] mb-1 font-semibold">
                        <span>Progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
