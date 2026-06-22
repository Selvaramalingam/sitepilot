'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { TaskPriorityBadge, TaskStatusBadge } from '@/components/ui/task-badge'
import { 
  CheckSquare, 
  Search, 
  Calendar
} from 'lucide-react'

export default function EngineerTasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  useEffect(() => {
    loadData()
  }, [])

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
          project:projects(name)
        `)
        .eq('assigned_to', user.id)
        .order('due_date', { ascending: true })

      setTasks(tData || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.project?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-heading">My Assigned Tasks</h2>
        <p className="text-muted-foreground">Manage and report progress on your assigned work.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search tasks or projects..." 
            className="pl-9 rounded-xl border-border/40 bg-card/50"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="flex rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus:outline-none w-full sm:w-40"
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
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">Loading your tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">No assigned tasks found.</div>
        ) : (
          filteredTasks.map(task => {
            const isOverdue = task.status !== 'Completed' && task.due_date && new Date(task.due_date) < new Date()
            return (
              <Card 
                key={task.id} 
                className={`border-border/40 bg-card/40 backdrop-blur-sm hover:shadow-lg transition-all cursor-pointer ${isOverdue ? 'border-red-500/30' : ''}`}
                onClick={() => router.push(`/site-engineer/tasks/${task.id}`)}
              >
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-3">
                    <TaskStatusBadge status={task.status} />
                    <TaskPriorityBadge priority={task.priority} />
                  </div>
                  
                  <h3 className="font-bold text-lg mb-1 leading-tight line-clamp-2">{task.title}</h3>
                  <p className="text-xs font-semibold text-indigo-500 mb-4 truncate">{task.project?.name}</p>
                  
                  <div className="mt-auto space-y-3">
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
