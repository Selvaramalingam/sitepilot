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
import { 
  ArrowLeft, 
  Calendar,
  Clock,
  User,
  CheckCircle2,
  FileText,
  MessageSquare,
  History,
  Paperclip,
  Download
} from 'lucide-react'

export default function EngineerTaskDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const router = useRouter()
  const { taskId } = use(params)
  
  const [task, setTask] = useState<any>(null)
  const [checklists, setChecklists] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [newComment, setNewComment] = useState('')

  useEffect(() => {
    loadData()
  }, [taskId])

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
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

      if (!tData || tData.assigned_to !== user?.id) {
        router.push('/site-engineer/tasks')
        return
      }
      setTask(tData)

      // Fetch related data
      await fetchRelatedData(supabase)
      
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
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

  const handleUpdateProgress = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value) || 0
    if (val < 0) val = 0
    if (val > 100) val = 100
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      await supabase.from('tasks').update({ progress: val }).eq('id', taskId)
      
      await supabase.from('task_history').insert({
        task_id: taskId,
        action: 'UPDATED_PROGRESS',
        user_id: user?.id,
        metadata: { new_value: val }
      })

      setTask({ ...task, progress: val })
      fetchRelatedData(supabase)
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateStatus = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
      
      await supabase.from('task_history').insert({
        task_id: taskId,
        action: 'UPDATED_STATUS',
        user_id: user?.id,
        metadata: { new_value: newStatus }
      })

      setTask({ ...task, status: newStatus })
      fetchRelatedData(supabase)
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggleChecklist = async (id: string, isCompleted: boolean) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      await supabase.from('task_checklists').update({ is_completed: isCompleted }).eq('id', id)
      
      // Optionally log checklist toggle
      await supabase.from('task_history').insert({
        task_id: taskId,
        action: 'CHECKLIST_TOGGLED',
        user_id: user?.id,
        metadata: { item_id: id, is_completed: isCompleted }
      })

      fetchRelatedData(supabase)
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

  if (loading || !task) return <div className="py-12 text-center">Loading task details...</div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="gap-2 -ml-4 hover:bg-transparent" onClick={() => router.push('/site-engineer/tasks')}>
          <ArrowLeft className="w-4 h-4" /> Back to My Tasks
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold font-heading mb-1">{task.title}</h1>
                  <p className="text-sm font-semibold text-indigo-500">{task.project?.name}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <TaskStatusBadge status={task.status} />
                <TaskPriorityBadge priority={task.priority} />
              </div>

              <div className="prose prose-sm dark:prose-invert max-w-none mb-6 p-4 rounded-xl bg-background/50 border border-border/40">
                <p className="whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border/40">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Due Date</Label>
                  <div className="text-sm font-medium flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-red-500" /> {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Est. Hours</Label>
                  <div className="text-sm font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500" /> {task.estimated_hours} hrs</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Assigned By</Label>
                  <div className="text-sm font-medium flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-indigo-500" /> {task.creator?.full_name || 'Admin'}</div>
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
                  <div className="space-y-3">
                    {checklists.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/40 hover:border-indigo-500/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={item.is_completed} onCheckedChange={(checked) => handleToggleChecklist(item.id, checked as boolean)} />
                          <span className={`text-sm ${item.is_completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>{item.title}</span>
                        </div>
                      </div>
                    ))}
                    {checklists.length === 0 && <p className="text-sm text-muted-foreground py-2">No checklist items to complete.</p>}
                  </div>
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
                    {comments.length === 0 && <div className="text-center py-10 text-muted-foreground text-sm">No comments yet.</div>}
                  </div>
                  <form onSubmit={handleAddComment} className="mt-auto">
                    <div className="relative">
                      <Textarea placeholder="Add a work note or comment..." value={newComment} onChange={e => setNewComment(e.target.value)} className="min-h-[80px] bg-background/50 rounded-xl pr-20 resize-none" />
                      <Button type="submit" disabled={!newComment.trim()} size="sm" className="absolute bottom-3 right-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg">Send</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attachments" className="mt-6 space-y-4">
              <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40 mb-4">
                  <div><CardTitle className="text-lg">Attached Proofs</CardTitle><CardDescription>Upload photos or documents.</CardDescription></div>
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
                        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-indigo-500" onClick={() => window.open(file.file_url, '_blank')}>
                          <Download className="w-4 h-4" />
                        </Button>
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
            <CardHeader className="pb-3 border-b border-border/40"><CardTitle className="text-base font-bold">Execution</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-6">
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-semibold text-foreground">Task Status</Label>
                  <TaskStatusBadge status={task.status} />
                </div>
                <select 
                  className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm font-medium focus:outline-none"
                  value={task.status}
                  onChange={handleUpdateStatus}
                >
                  <option value="Draft">Draft</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Review">Ready for Review</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-semibold text-foreground">Progress ({task.progress}%)</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Input 
                    type="range" 
                    min="0" max="100" 
                    value={task.progress}
                    onChange={(e) => setTask({...task, progress: parseInt(e.target.value) || 0})}
                    onBlur={(e) => handleUpdateProgress(e as any)}
                    className="flex-1 cursor-pointer"
                  />
                  <Input 
                    type="number" 
                    min="0" max="100" 
                    value={task.progress}
                    onChange={(e) => setTask({...task, progress: parseInt(e.target.value) || 0})}
                    onBlur={(e) => handleUpdateProgress(e as any)}
                    className="w-16 rounded-xl bg-background/50 text-center text-sm"
                  />
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${task.progress}%` }} />
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
