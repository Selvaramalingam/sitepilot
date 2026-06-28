'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { TaskPriorityBadge, TaskStatusBadge } from '@/components/ui/task-badge'
import { FileUploader } from '@/components/ui/file-uploader'
import { recalculateTaskProgress } from '@/lib/task-utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { 
  ArrowLeft, 
  Calendar,
  Clock,
  User,
  CheckCircle2,
  FileText,
  MessageSquare,
  History,
  Trash2,
  Paperclip,
  Download,
  AlertCircle,
  Pencil
} from 'lucide-react'

export default function AdminTaskDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const router = useRouter()
  const { taskId } = use(params)
  
  const [task, setTask] = useState<any>(null)
  const [checklists, setChecklists] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [engineers, setEngineers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // New states
  const [newChecklist, setNewChecklist] = useState('')
  const [newComment, setNewComment] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [editFormData, setEditFormData] = useState({
    id: '',
    projectId: '',
    title: '',
    description: '',
    assignedTo: '',
    priority: 'Medium',
    startDate: '',
    dueDate: '',
    estimatedHours: '',
    status: 'Draft',
    progress: '0',
    category: ''
  })

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    loadData()
  }, [taskId])

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: tData } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(id, name, company_id),
          assignee:users!tasks_assigned_to_fkey(full_name),
          creator:users!tasks_created_by_fkey(full_name)
        `)
        .eq('id', taskId)
        .single()

      if (!tData) {
        router.push('/admin/tasks')
        return
      }
      setTask(tData)

      const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
      const companyId = profile?.company_id || tData.project?.company_id

      // Get engineers for reassignment
      const { data: eData } = await supabase.from('users').select('id, full_name').eq('company_id', companyId).eq('role', 'SITE_ENGINEER')
      setEngineers(eData || [])

      // Get projects for reassignment
      const { data: pData } = await supabase.from('projects').select('id, name').eq('company_id', companyId)
      setProjects(pData || [])

      // Fetch related data
      await fetchRelatedData(supabase)
      
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenEdit = () => {
    setEditFormData({
      id: task.id,
      projectId: task.project_id || '',
      title: task.title || '',
      description: task.description || '',
      assignedTo: task.assigned_to || '',
      priority: task.priority || 'Medium',
      startDate: task.start_date || '',
      dueDate: task.due_date || '',
      estimatedHours: task.estimated_hours?.toString() || '0',
      status: task.status || 'Draft',
      progress: task.progress?.toString() || '0',
      category: task.category || ''
    })
    setIsEditOpen(true)
  }

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase.from('tasks').update({
        project_id: editFormData.projectId,
        title: editFormData.title,
        description: editFormData.description,
        assigned_to: editFormData.assignedTo || null,
        priority: editFormData.priority,
        start_date: editFormData.startDate || null,
        due_date: editFormData.dueDate || null,
        estimated_hours: parseFloat(editFormData.estimatedHours) || 0,
        status: editFormData.status,
        progress: parseInt(editFormData.progress) || 0,
        category: editFormData.category || null
      }).eq('id', editFormData.id)

      if (error) throw error

      await supabase.from('task_history').insert({
        task_id: editFormData.id,
        action: 'UPDATED',
        user_id: user?.id,
        metadata: { title: editFormData.title }
      })

      // Recalculate progress to ensure consistency
      await recalculateTaskProgress(supabase, editFormData.id)

      setIsEditOpen(false)
      loadData()
    } catch (e: any) {
      alert('Failed to update task: ' + e.message)
    } finally {
      setFormLoading(false)
    }
  }

  const fetchRelatedData = async (supabase: any) => {
    const [cData, aData, commData, hData] = await Promise.all([
      supabase.from('task_checklists').select('*').eq('task_id', taskId).order('created_at', { ascending: true }),
      supabase.from('task_attachments').select('*, uploader:users(full_name)').eq('task_id', taskId).order('created_at', { ascending: false }),
      supabase.from('task_comments').select('*, commenter:users(full_name)').eq('task_id', taskId).order('created_at', { ascending: true }),
      supabase.from('task_history').select('*, actor:users(full_name)').eq('task_id', taskId).order('created_at', { ascending: false })
    ])
    
    setChecklists(cData.data || [])
    setAttachments(aData.data || [])
    setComments(commData.data || [])
    setHistory(hData.data || [])
  }

  const handleUpdateTask = async (field: string, value: any) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      await supabase.from('tasks').update({ [field]: value }).eq('id', taskId)
      
      await supabase.from('task_history').insert({
        task_id: taskId,
        action: `UPDATED_${field.toUpperCase()}`,
        user_id: user?.id,
        metadata: { new_value: value }
      })

      if (field === 'status') {
        await recalculateTaskProgress(supabase, taskId)
      }

      loadData()
    } catch (e) {
      console.error(e)
      alert('Failed to update task')
    }
  }

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChecklist.trim()) return
    try {
      const supabase = createClient()
      await supabase.from('task_checklists').insert({
        task_id: taskId,
        title: newChecklist
      })
      setNewChecklist('')
      await recalculateTaskProgress(supabase, taskId)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggleChecklist = async (id: string, isCompleted: boolean) => {
    try {
      const supabase = createClient()
      await supabase.from('task_checklists').update({ is_completed: isCompleted }).eq('id', id)
      await recalculateTaskProgress(supabase, taskId)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteChecklist = async (id: string) => {
    try {
      const supabase = createClient()
      await supabase.from('task_checklists').delete().eq('id', id)
      await recalculateTaskProgress(supabase, taskId)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      await supabase.from('task_comments').insert({
        task_id: taskId,
        user_id: user?.id,
        content: newComment
      })
      
      await supabase.from('task_history').insert({
        task_id: taskId,
        action: 'COMMENT_ADDED',
        user_id: user?.id
      })

      setNewComment('')
      fetchRelatedData(supabase)
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteAttachment = async (file: any) => {
    if (!confirm(`Are you sure you want to delete the file "${file.file_name}"?`)) return
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const urlParts = file.file_url.split('/task-attachments/')
      if (urlParts.length < 2) {
        throw new Error('Invalid file URL format')
      }
      const storagePath = urlParts[1]

      const { error: storageError } = await supabase.storage
        .from('task-attachments')
        .remove([storagePath])

      if (storageError) throw storageError

      const { error: dbError } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', file.id)

      if (dbError) throw dbError

      await supabase.from('task_history').insert({
        task_id: taskId,
        action: 'FILE_DELETED',
        user_id: user?.id,
        metadata: { file_name: file.file_name }
      })

      showToast('File deleted successfully', 'success')
      loadData()
    } catch (error: any) {
      console.error('Error deleting file:', error)
      showToast(error.message || 'Failed to delete file', 'error')
    }
  }

  const handleDeleteTask = async () => {
    if (!confirm('Are you sure you want to delete this task completely?')) return
    try {
      const supabase = createClient()
      await supabase.from('tasks').delete().eq('id', taskId)
      router.push('/admin/tasks')
    } catch (e) {
      console.error(e)
      alert('Delete failed')
    }
  }

  if (loading || !task) return <div className="py-12 text-center">Loading task details...</div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="gap-2 -ml-4 hover:bg-transparent" onClick={() => router.push('/admin/tasks')}>
          <ArrowLeft className="w-4 h-4" /> Back to Tasks
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 rounded-xl" onClick={handleOpenEdit}>
            <Pencil className="w-4 h-4" /> Edit Task
          </Button>
          <Button variant="ghost" className="text-red-500 hover:bg-red-500/10 hover:text-red-600 gap-2" onClick={handleDeleteTask}>
            <Trash2 className="w-4 h-4" /> Delete Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold font-heading mb-1">{task.title}</h1>
                  <p className="text-sm font-semibold text-indigo-500">{task.project?.name || 'No Project'}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <TaskStatusBadge status={task.status} />
                <TaskPriorityBadge priority={task.priority} />
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Created by {task.creator?.full_name || 'Admin'}
                </span>
              </div>

              <div className="prose prose-sm dark:prose-invert max-w-none mb-6 p-4 rounded-xl bg-background/50 border border-border/40">
                <p className="whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/40">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Start Date</Label>
                  <div className="text-sm font-medium flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-indigo-500" /> {task.start_date ? new Date(task.start_date).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Due Date</Label>
                  <div className="text-sm font-medium flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-red-500" /> {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Est. Hours</Label>
                  <div className="text-sm font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500" /> {task.estimated_hours} hrs</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Progress</Label>
                  <div className="text-sm font-bold text-emerald-500">{task.progress}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="checklists" className="w-full">
            <TabsList className="w-full justify-start border-b border-border/40 rounded-none bg-transparent p-0 h-auto">
              <TabsTrigger value="checklists" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent py-3 px-4 font-semibold"><CheckCircle2 className="w-4 h-4 mr-2" /> Checklists</TabsTrigger>
              <TabsTrigger value="comments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent py-3 px-4 font-semibold"><MessageSquare className="w-4 h-4 mr-2" /> Comments ({comments.length})</TabsTrigger>
              <TabsTrigger value="attachments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent py-3 px-4 font-semibold"><Paperclip className="w-4 h-4 mr-2" /> Files ({attachments.length})</TabsTrigger>
              <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent py-3 px-4 font-semibold"><History className="w-4 h-4 mr-2" /> History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="checklists" className="mt-6 space-y-4">
              <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="space-y-3 mb-6">
                    {checklists.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/40 hover:border-indigo-500/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={item.is_completed} onCheckedChange={(checked) => handleToggleChecklist(item.id, checked as boolean)} />
                          <span className={`text-sm ${item.is_completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>{item.title}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteChecklist(item.id)} className="h-6 w-6 text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    ))}
                    {checklists.length === 0 && <p className="text-sm text-muted-foreground py-2">No checklist items added yet.</p>}
                  </div>
                  <form onSubmit={handleAddChecklist} className="flex gap-2">
                    <Input placeholder="Add new checklist item..." value={newChecklist} onChange={e => setNewChecklist(e.target.value)} className="bg-background/50 rounded-xl" />
                    <Button type="submit" disabled={!newChecklist.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">Add</Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comments" className="mt-6 space-y-4">
              <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
                <CardContent className="p-6 flex flex-col h-[400px]">
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                    {comments.map(c => (
                      <div key={c.id} className="p-4 rounded-2xl bg-background/50 border border-border/40 rounded-tl-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-indigo-500">{c.commenter?.full_name || 'User'}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{c.content}</p>
                      </div>
                    ))}
                    {comments.length === 0 && <div className="text-center py-10 text-muted-foreground text-sm">No comments yet. Start the conversation.</div>}
                  </div>
                  <form onSubmit={handleAddComment} className="mt-auto">
                    <div className="relative">
                      <Textarea placeholder="Type your comment..." value={newComment} onChange={e => setNewComment(e.target.value)} className="min-h-[80px] bg-background/50 rounded-xl pr-20 resize-none" />
                      <Button type="submit" disabled={!newComment.trim()} size="sm" className="absolute bottom-3 right-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg">Send</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attachments" className="mt-6 space-y-4">
              <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40 mb-4">
                  <div><CardTitle className="text-lg">Attached Files</CardTitle><CardDescription>Images, documents, and proofs.</CardDescription></div>
                  <FileUploader taskId={taskId} onUploadSuccess={() => loadData()} />
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {attachments.map(file => (
                      <div key={file.id} className="p-3 rounded-xl bg-background/50 border border-border/40 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-foreground">{file.file_name}</p>
                          <p className="text-[10px] text-muted-foreground">By {file.uploader?.full_name} • {(file.file_size / 1024).toFixed(1)} KB</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-indigo-500" onClick={() => window.open(file.file_url, '_blank')}>
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteAttachment(file)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {attachments.length === 0 && <p className="col-span-full py-4 text-center text-sm text-muted-foreground">No files attached.</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-6 space-y-4">
              <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="space-y-6 border-l-2 border-border/60 ml-3 pl-6 py-2">
                    {history.map(log => (
                      <div key={log.id} className="relative">
                        <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-card" />
                        <p className="text-sm font-medium text-foreground">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">By {log.actor?.full_name || 'System'} on {new Date(log.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar / Quick Actions */}
        <div className="space-y-6">
          <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
            <CardHeader className="pb-3 border-b border-border/40"><CardTitle className="text-base font-bold">Administration</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Task Status</Label>
                <select 
                  className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm font-medium focus:outline-none"
                  value={task.status}
                  onChange={(e) => handleUpdateTask('status', e.target.value)}
                >
                  <option value="Draft">Draft</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Review">Review</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Priority</Label>
                <select 
                  className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm font-medium focus:outline-none"
                  value={task.priority}
                  onChange={(e) => handleUpdateTask('priority', e.target.value)}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Assigned Engineer</Label>
                <select 
                  className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm font-medium focus:outline-none"
                  value={task.assigned_to || ''}
                  onChange={(e) => handleUpdateTask('assigned_to', e.target.value || null)}
                >
                  <option value="">Unassigned</option>
                  {engineers.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>

            </CardContent>
          </Card>
        </div>

      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
          toast.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
            : 'bg-red-500/10 border-red-500/30 text-red-500'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Modify the task details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditTask} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Task Title</Label>
              <Input required placeholder="e.g. Inspect foundation wiring" value={editFormData.title} onChange={e => setEditFormData({...editFormData, title: e.target.value})} className="rounded-xl bg-background/50" />
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <select required className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus-visible:outline-none" value={editFormData.projectId} onChange={e => setEditFormData({...editFormData, projectId: e.target.value})}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea rows={3} className="flex w-full rounded-xl border border-border/40 bg-background/50 p-3 text-sm focus-visible:outline-none" placeholder="Task details..." value={editFormData.description} onChange={e => setEditFormData({...editFormData, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assign To</Label>
                <select className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus-visible:outline-none" value={editFormData.assignedTo} onChange={e => setEditFormData({...editFormData, assignedTo: e.target.value})}>
                  <option value="">Unassigned</option>
                  {engineers.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <select className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus-visible:outline-none" value={editFormData.priority} onChange={e => setEditFormData({...editFormData, priority: e.target.value})}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <select className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus-visible:outline-none" value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value})}>
                  <option value="Draft">Draft</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Review">Review</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Progress (%)</Label>
                <Input type="number" min="0" max="100" value={editFormData.progress} onChange={e => setEditFormData({...editFormData, progress: e.target.value})} className="rounded-xl bg-background/50" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Est. Hours</Label>
                <Input type="number" min="0" step="0.5" placeholder="e.g. 4.5" value={editFormData.estimatedHours} onChange={e => setEditFormData({...editFormData, estimatedHours: e.target.value})} className="rounded-xl bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input placeholder="e.g. Electrical" value={editFormData.category} onChange={e => setEditFormData({...editFormData, category: e.target.value})} className="rounded-xl bg-background/50" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={editFormData.startDate} onChange={e => setEditFormData({...editFormData, startDate: e.target.value})} className="rounded-xl bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={editFormData.dueDate} onChange={e => setEditFormData({...editFormData, dueDate: e.target.value})} className="rounded-xl bg-background/50" />
              </div>
            </div>
            <Button type="submit" disabled={formLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 mt-4">
              {formLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
