'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Search, 
  DollarSign, 
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  FileCheck,
  Edit3
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser, UserProfile } from '@/lib/auth-helpers'
import { useCurrency } from '@/hooks/useCurrency'
import { useAdminProject } from '@/components/admin-project-context'

interface Expense {
  id: string
  projectId: string
  projectName: string
  category: 'Labour' | 'Transport' | 'Machinery' | 'Food' | 'Fuel' | 'Miscellaneous'
  amount: number
  date: string
  notes: string
}

export default function ContractorExpenses() {
  const router = useRouter()
  const { symbol, formatCurrency } = useCurrency()
  const [contractor, setContractor] = useState<UserProfile | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const { selectedProjectId, setSelectedProjectId } = useAdminProject()
  const [loading, setLoading] = useState(true)

  // New Expense form state
  const [newExpense, setNewExpense] = useState({
    projectId: '', category: 'Labour' as Expense['category'], amount: '', date: '', notes: ''
  })
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Edit Expense form states
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editExpenseForm, setEditExpenseForm] = useState({
    projectId: '', category: 'Labour' as Expense['category'], amount: '', date: '', notes: ''
  })

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

      const activeProjects = projectsData || []
      setProjects(activeProjects)

      if (activeProjects.length > 0 && !newExpense.projectId) {
        setNewExpense(prev => ({ ...prev, projectId: activeProjects[0].id }))
      }

      // Fetch expenses joined with projects
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*, project:projects!inner(*)')
        .eq('projects.company_id', companyId)
        .order('expense_date', { ascending: false })

      if (expensesData) {
        setExpenses(expensesData.map((e: any) => ({
          id: e.id,
          projectId: e.project_id,
          projectName: e.project?.name || 'Unknown',
          category: e.category,
          amount: parseFloat(e.amount) || 0,
          date: e.expense_date,
          notes: e.notes || ''
        })))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contractor?.company_id) return
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('expenses')
        .insert({
          project_id: newExpense.projectId,
          category: newExpense.category,
          amount: parseFloat(newExpense.amount) || 0,
          expense_date: newExpense.date || new Date().toISOString().split('T')[0],
          notes: newExpense.notes
        })

      if (error) {
        alert('Failed: ' + error.message)
        return
      }

      setNewExpense({
        projectId: projects[0]?.id || '',
        category: 'Labour',
        amount: '',
        date: '',
        notes: ''
      })
      setIsCreateOpen(false)
      loadData(contractor.company_id)
    } catch (err) {
      console.error(err)
    }
  }

  const handleEditExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense || !contractor?.company_id) return
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('expenses')
        .update({
          project_id: editExpenseForm.projectId,
          category: editExpenseForm.category,
          amount: parseFloat(editExpenseForm.amount) || 0,
          expense_date: editExpenseForm.date,
          notes: editExpenseForm.notes
        })
        .eq('id', editingExpense.id)

      if (error) {
        alert('Update failed: ' + error.message)
        return
      }

      setEditingExpense(null)
      loadData(contractor.company_id)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)

      if (error) {
        alert('Delete failed: ' + error.message)
        return
      }

      loadData(contractor!.company_id!)
    } catch (e) {
      console.error(e)
    }
  }

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.notes.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.projectName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory
    const matchesProject = selectedProjectId === 'all' || e.projectId === selectedProjectId
    return matchesSearch && matchesCategory && matchesProject
  })

  const totalExpense = filteredExpenses.reduce((acc, e) => acc + e.amount, 0)

  const categoryBadgeColor = {
    Labour: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    Transport: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    Machinery: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    Fuel: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    Food: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    Miscellaneous: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border border-border/40 bg-card/40 backdrop-blur-sm p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Total Expenses logged</span>
            <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-indigo-500">{formatCurrency(totalExpense)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>
        <Card className="border border-border/40 bg-card/40 backdrop-blur-sm p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Active Categories</span>
            <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-pink-500">
              {new Set(filteredExpenses.map(e => e.category)).size} categories
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500">
            <Layers className="w-5 h-5" />
          </div>
        </Card>
        <Card className="border border-border/40 bg-card/40 backdrop-blur-sm p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Wages & Labour Ratio</span>
            <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-cyan-500">
              {totalExpense > 0 ? ((filteredExpenses.filter(e => e.category === 'Labour').reduce((acc, e) => acc + e.amount, 0) / totalExpense) * 100).toFixed(1) : 0}%
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
            <Sparkles className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Filter and Add */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
            <Input 
              placeholder="Search expenses..." 
              className="pl-10 rounded-xl border-border/40 bg-card/50"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="flex rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none w-full sm:w-48 font-medium"
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            className="flex rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none w-full sm:w-48"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Labour">Labour</option>
            <option value="Transport">Transport</option>
            <option value="Machinery">Machinery</option>
            <option value="Food">Food</option>
            <option value="Fuel">Fuel</option>
            <option value="Miscellaneous">Miscellaneous</option>
          </select>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 gap-2 w-full md:w-auto py-5">
              <Plus className="h-4.5 w-4.5" /> Log Project Expense
            </Button>
          } />
          <DialogContent className="sm:max-w-[450px] rounded-2xl bg-card border-border/40">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-heading">Register Accrued Expense</DialogTitle>
              <CardDescription>Log field expenses for contractor team auditing.</CardDescription>
            </DialogHeader>
            <form onSubmit={handleCreateExpense} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="e-project">Associate with Project</Label>
                <select
                  id="e-project"
                  className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none"
                  value={newExpense.projectId}
                  onChange={e => setNewExpense({...newExpense, projectId: e.target.value})}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="e-category">Expense Category</Label>
                  <select
                    id="e-category"
                    className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none"
                    value={newExpense.category}
                    onChange={e => setNewExpense({...newExpense, category: e.target.value as any})}
                  >
                    <option value="Labour">Labour</option>
                    <option value="Transport">Transport</option>
                    <option value="Machinery">Machinery</option>
                    <option value="Food">Food</option>
                    <option value="Fuel">Fuel</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-amount">Amount ({symbol})</Label>
                  <Input 
                    id="e-amount" required type="number" placeholder="150"
                    className="rounded-xl border-border/40 bg-background/30 h-11"
                    value={newExpense.amount}
                    onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="e-date">Accrued Date</Label>
                  <Input 
                    id="e-date" type="date" required
                    className="rounded-xl border-border/40 bg-background/30 h-11"
                    value={newExpense.date}
                    onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-notes">Audit Notes / Explanations</Label>
                <textarea 
                  id="e-notes" placeholder="scaffolding crew weekend wages..."
                  className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={newExpense.notes}
                  onChange={e => setNewExpense({...newExpense, notes: e.target.value})}
                />
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 font-semibold shadow-lg shadow-indigo-500/20 mt-4">
                Register Expense Transaction
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Expense ledger Table */}
      <Card className="border border-border/40 bg-card/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Project Audited Expense logs</CardTitle>
          <CardDescription>Consolidated statements of miscellaneous expenditures and labor payouts</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading expenses...</div>
            ) : filteredExpenses.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No expense logs found.</div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/40 text-xs font-semibold text-muted-foreground bg-muted/20">
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Project</th>
                    <th className="px-6 py-3.5">Notes</th>
                    <th className="px-6 py-3.5">Amount</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                  {filteredExpenses.map(e => (
                    <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-indigo-500" />
                        <span className={`inline-block border px-2 py-0.5 rounded-full text-[10px] font-bold ${categoryBadgeColor[e.category]}`}>
                          {e.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{e.projectName}</td>
                      <td className="px-6 py-4 text-xs max-w-xs truncate">{e.notes}</td>
                      <td className="px-6 py-4 font-bold text-indigo-500">{formatCurrency(e.amount)}</td>
                      <td className="px-6 py-4 text-muted-foreground">{e.date}</td>
                      <td className="px-6 py-4 text-right flex justify-end gap-1">
                        <Dialog open={editingExpense?.id === e.id} onOpenChange={(open) => !open && setEditingExpense(null)}>
                          <DialogTrigger render={
                            <Button variant="ghost" size="icon" onClick={() => {
                              setEditingExpense(e)
                              setEditExpenseForm({
                                projectId: e.projectId, category: e.category, amount: e.amount.toString(), date: e.date, notes: e.notes
                              })
                            }} className="rounded-lg text-muted-foreground hover:text-indigo-500">
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          } />
                          <DialogContent className="sm:max-w-[450px] rounded-2xl bg-card border-border/40">
                            <DialogHeader><DialogTitle className="text-xl font-bold font-heading">Edit Expense</DialogTitle></DialogHeader>
                            <form onSubmit={handleEditExpenseSubmit} className="space-y-4 mt-2">
                              <div className="space-y-2">
                                <Label>Project</Label>
                                <select className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none" value={editExpenseForm.projectId} onChange={ev => setEditExpenseForm({...editExpenseForm, projectId: ev.target.value})}>
                                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Category</Label>
                                  <select className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none" value={editExpenseForm.category} onChange={ev => setEditExpenseForm({...editExpenseForm, category: ev.target.value as any})}>
                                    <option value="Labour">Labour</option>
                                    <option value="Transport">Transport</option>
                                    <option value="Machinery">Machinery</option>
                                    <option value="Food">Food</option>
                                    <option value="Fuel">Fuel</option>
                                    <option value="Miscellaneous">Miscellaneous</option>
                                  </select>
                                </div>
                                 <div className="space-y-2"><Label>Amount ({symbol})</Label><Input required type="number" className="rounded-xl border-border/40 bg-background/30 h-11" value={editExpenseForm.amount} onChange={ev => setEditExpenseForm({...editExpenseForm, amount: ev.target.value})} /></div>
                              </div>
                              <div className="space-y-2"><Label>Date</Label><Input type="date" required className="rounded-xl border-border/40 bg-background/30 h-11" value={editExpenseForm.date} onChange={ev => setEditExpenseForm({...editExpenseForm, date: ev.target.value})} /></div>
                              <div className="space-y-2">
                                <Label>Notes</Label>
                                <textarea className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 py-2 text-sm focus-visible:outline-none" value={editExpenseForm.notes} onChange={ev => setEditExpenseForm({...editExpenseForm, notes: ev.target.value})} />
                              </div>
                              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 font-semibold mt-4">Save Changes</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(e.id)}
                          className="rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
