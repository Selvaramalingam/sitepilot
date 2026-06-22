'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  TrendingUp, 
  Edit3,
  Trash2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser, UserProfile } from '@/lib/auth-helpers'
import { useAdminProject } from '@/components/admin-project-context'
import { useCurrency } from '@/hooks/useCurrency'

interface MoneyInRecord {
  id: string
  projectId: string
  projectName: string
  sourceName: string
  amount: number
  date: string
  method: string
}

interface MoneyOutRecord {
  id: string
  supplier: string
  supplierId: string
  projectId: string
  projectName: string
  amount: number
  date: string
  notes: string
}

export default function Cashbook() {
  const router = useRouter()
  const { symbol, formatCurrency } = useCurrency()
  const [contractor, setContractor] = useState<UserProfile | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  
  const [moneyInLogs, setMoneyInLogs] = useState<MoneyInRecord[]>([])
  const [moneyOutLogs, setMoneyOutLogs] = useState<MoneyOutRecord[]>([])
  const [loading, setLoading] = useState(true)
  const { selectedProjectId, setSelectedProjectId } = useAdminProject()

  // Cost summaries
  const [rawMaterials, setRawMaterials] = useState<any[]>([])
  const [rawExpenses, setRawExpenses] = useState<any[]>([])

  // Create States
  const [newMoneyIn, setNewMoneyIn] = useState({ projectId: '', sourceName: '', amount: '', date: '', method: 'Bank Transfer' })
  const [isMoneyInOpen, setIsMoneyInOpen] = useState(false)

  const [newMoneyOut, setNewMoneyOut] = useState({ supplierId: '', projectId: '', amount: '', date: '', notes: '' })
  const [isMoneyOutOpen, setIsMoneyOutOpen] = useState(false)

  // Edit States
  const [editingMoneyIn, setEditingMoneyIn] = useState<MoneyInRecord | null>(null)
  const [editMoneyInForm, setEditMoneyInForm] = useState({ sourceName: '', amount: '', date: '', method: '' })
  
  const [editingMoneyOut, setEditingMoneyOut] = useState<MoneyOutRecord | null>(null)
  const [editMoneyOutForm, setEditMoneyOutForm] = useState({ amount: '', date: '', notes: '' })

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
      const { data: projectsData } = await supabase.from('projects').select('*').eq('company_id', companyId).order('name', { ascending: true })
      const activeProjects = projectsData || []
      setProjects(activeProjects)

      if (activeProjects.length > 0) {
        if (!newMoneyIn.projectId) setNewMoneyIn(prev => ({ ...prev, projectId: activeProjects[0].id }))
        if (!newMoneyOut.projectId) setNewMoneyOut(prev => ({ ...prev, projectId: activeProjects[0].id }))
      }

      // Fetch suppliers
      const { data: suppliersData } = await supabase.from('suppliers').select('*').eq('company_id', companyId).order('name', { ascending: true })
      const activeSuppliers = suppliersData || []
      setSuppliers(activeSuppliers)
      if (activeSuppliers.length > 0 && !newMoneyOut.supplierId) {
        setNewMoneyOut(prev => ({ ...prev, supplierId: activeSuppliers[0].id }))
      }

      // Fetch money in (client payments)
      const { data: clientPayData } = await supabase.from('client_payments').select('*, project:projects!inner(*)').eq('projects.company_id', companyId).order('payment_date', { ascending: false })
      if (clientPayData) {
        setMoneyInLogs(clientPayData.map((p: any) => ({
          id: p.id, projectId: p.project_id, projectName: p.project?.name || 'Unknown', sourceName: p.client_name, amount: parseFloat(p.amount) || 0, date: p.payment_date, method: p.payment_method || 'Bank Transfer'
        })))
      }

      // Fetch money out (supplier payments)
      const { data: supplierPayData } = await supabase.from('supplier_payments').select('*, project:projects!inner(*), supplier:suppliers(*)').eq('projects.company_id', companyId).order('payment_date', { ascending: false })
      if (supplierPayData) {
        setMoneyOutLogs(supplierPayData.map((p: any) => ({
          id: p.id, supplier: p.supplier?.name || 'Unknown', supplierId: p.supplier_id, projectId: p.project_id, projectName: p.project?.name || 'Unknown', amount: parseFloat(p.amount) || 0, date: p.payment_date, notes: p.notes || ''
        })))
      }

      // Fetch material costs
      const { data: materialsData } = await supabase.from('materials').select('cost, project_id, project:projects!inner(*)').eq('projects.company_id', companyId)
      if (materialsData) setRawMaterials(materialsData)

      // Fetch expenses
      const { data: expensesData } = await supabase.from('expenses').select('amount, project_id, project:projects!inner(*)').eq('projects.company_id', companyId)
      if (expensesData) setRawExpenses(expensesData)

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // --- Money In Actions ---
  const handleLogMoneyIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contractor?.company_id) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('client_payments').insert({
        project_id: newMoneyIn.projectId, client_name: newMoneyIn.sourceName, amount: parseFloat(newMoneyIn.amount) || 0, payment_date: newMoneyIn.date || new Date().toISOString().split('T')[0], payment_method: newMoneyIn.method
      })
      if (error) { alert('Failed: ' + error.message); return }
      setNewMoneyIn({ projectId: projects[0]?.id || '', sourceName: '', amount: '', date: '', method: 'Bank Transfer' })
      setIsMoneyInOpen(false)
      loadData(contractor.company_id)
    } catch (err) { console.error(err) }
  }

  const handleEditMoneyInSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMoneyIn || !contractor?.company_id) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('client_payments').update({
        client_name: editMoneyInForm.sourceName, amount: parseFloat(editMoneyInForm.amount) || 0, payment_date: editMoneyInForm.date, payment_method: editMoneyInForm.method
      }).eq('id', editingMoneyIn.id)
      if (error) { alert('Failed: ' + error.message); return }
      setEditingMoneyIn(null)
      loadData(contractor.company_id)
    } catch (err) { console.error(err) }
  }

  const handleDeleteMoneyIn = async (id: string) => {
    if (!confirm('Delete this record?')) return
    const supabase = createClient()
    await supabase.from('client_payments').delete().eq('id', id)
    loadData(contractor!.company_id!)
  }

  // --- Money Out Actions ---
  const handleLogMoneyOut = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contractor?.company_id) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('supplier_payments').insert({
        supplier_id: newMoneyOut.supplierId, project_id: newMoneyOut.projectId, amount: parseFloat(newMoneyOut.amount) || 0, payment_date: newMoneyOut.date || new Date().toISOString().split('T')[0], notes: newMoneyOut.notes
      })
      if (error) { alert('Failed: ' + error.message); return }
      setNewMoneyOut({ supplierId: suppliers[0]?.id || '', projectId: projects[0]?.id || '', amount: '', date: '', notes: '' })
      setIsMoneyOutOpen(false)
      loadData(contractor.company_id)
    } catch (err) { console.error(err) }
  }

  const handleEditMoneyOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMoneyOut || !contractor?.company_id) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('supplier_payments').update({
        amount: parseFloat(editMoneyOutForm.amount) || 0, payment_date: editMoneyOutForm.date, notes: editMoneyOutForm.notes
      }).eq('id', editingMoneyOut.id)
      if (error) { alert('Failed: ' + error.message); return }
      setEditingMoneyOut(null)
      loadData(contractor.company_id)
    } catch (err) { console.error(err) }
  }

  const handleDeleteMoneyOut = async (id: string) => {
    if (!confirm('Delete this record?')) return
    const supabase = createClient()
    await supabase.from('supplier_payments').delete().eq('id', id)
    loadData(contractor!.company_id!)
  }

  // Calculations
  const filteredMoneyInLogs = moneyInLogs.filter(log => selectedProjectId === 'all' || log.projectId === selectedProjectId)
  const filteredMoneyOutLogs = moneyOutLogs.filter(log => selectedProjectId === 'all' || log.projectId === selectedProjectId)
  
  const filteredMaterialsCost = rawMaterials
    .filter(m => selectedProjectId === 'all' || m.project_id === selectedProjectId)
    .reduce((acc, m) => acc + (parseFloat(m.cost) || 0), 0)
    
  const filteredExpensesCost = rawExpenses
    .filter(e => selectedProjectId === 'all' || e.project_id === selectedProjectId)
    .reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0)

  const totalMoneyIn = filteredMoneyInLogs.reduce((acc, p) => acc + p.amount, 0)
  const totalMoneyOut = filteredMoneyOutLogs.reduce((acc, p) => acc + p.amount, 0)
  const totalProjectCost = filteredMaterialsCost + filteredExpensesCost
  const netBalance = totalMoneyIn - totalProjectCost
  const profitMargin = totalMoneyIn > 0 ? (netBalance / totalMoneyIn) * 100 : 0

  return (
    <div className="space-y-8">
      {/* Project Filter Selector inside the page */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/40 backdrop-blur-sm border border-border/40 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold font-heading">Project Cashbook Ledger</h2>
          <p className="text-muted-foreground text-xs">Track client payments received, supplier payout costs, and profitability margins.</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/40 border border-border/40 px-3 py-1.5 rounded-xl shrink-0 w-full sm:w-auto">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Filter:</span>
          <select
            className="bg-transparent text-sm font-semibold focus:outline-none cursor-pointer text-foreground w-full sm:w-48"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="all" className="bg-card">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-card">
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Cashflow Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-border/40 bg-card/40 backdrop-blur-sm p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Total Money Received</span>
            <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-emerald-500">{formatCurrency(totalMoneyIn)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><ArrowUpRight className="w-5 h-5" /></div>
        </Card>
        <Card className="border border-border/40 bg-card/40 backdrop-blur-sm p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Total Accrued Cost</span>
            <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-pink-500">{formatCurrency(totalProjectCost)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500"><ArrowDownRight className="w-5 h-5" /></div>
        </Card>
        <Card className="border border-border/40 bg-card/40 backdrop-blur-sm p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Net Balance (Profit)</span>
            <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-indigo-500">{formatCurrency(netBalance)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><DollarSign className="w-5 h-5" /></div>
        </Card>
        <Card className="border border-border/40 bg-card/40 backdrop-blur-sm p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Margin (%)</span>
            <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-cyan-500">{profitMargin.toFixed(1)}%</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500"><TrendingUp className="w-5 h-5" /></div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Money In */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold tracking-tight font-heading">Money Received (In)</h2>
            <Dialog open={isMoneyInOpen} onOpenChange={setIsMoneyInOpen}>
              <DialogTrigger render={
                <Button variant="outline" size="sm" className="rounded-xl border-border/40 hover:bg-muted/80 gap-1"><Plus className="w-4 h-4 text-emerald-500" /> Log Money Received</Button>
              } />
              <DialogContent className="sm:max-w-[425px] rounded-2xl bg-card border-border/40">
                <DialogHeader><DialogTitle className="text-xl font-bold font-heading">Log Money Received</DialogTitle></DialogHeader>
                <form onSubmit={handleLogMoneyIn} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="in-project">Project</Label>
                    <select id="in-project" className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none" value={newMoneyIn.projectId} onChange={e => setNewMoneyIn({...newMoneyIn, projectId: e.target.value})}>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="in-source">From (Client/Source)</Label>
                    <Input id="in-source" required className="rounded-xl border-border/40 bg-background/30 h-11" value={newMoneyIn.sourceName} onChange={e => setNewMoneyIn({...newMoneyIn, sourceName: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="in-amount">Amount ({symbol})</Label><Input id="in-amount" required type="number" className="rounded-xl border-border/40 bg-background/30 h-11" value={newMoneyIn.amount} onChange={e => setNewMoneyIn({...newMoneyIn, amount: e.target.value})} /></div>
                    <div className="space-y-2"><Label htmlFor="in-date">Date</Label><Input id="in-date" type="date" required className="rounded-xl border-border/40 bg-background/30 h-11" value={newMoneyIn.date} onChange={e => setNewMoneyIn({...newMoneyIn, date: e.target.value})} /></div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="in-method">Payment Method</Label>
                    <select id="in-method" className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none" value={newMoneyIn.method} onChange={e => setNewMoneyIn({...newMoneyIn, method: e.target.value})}>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-6 font-semibold">Save</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="border border-border/40 bg-card/40 backdrop-blur-sm">
            <CardContent className="px-0 py-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-xs font-semibold text-muted-foreground bg-muted/20">
                    <th className="px-4 py-3">Source</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                  {filteredMoneyInLogs.map(p => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3.5"><div className="font-semibold">{p.sourceName}</div><span className="text-xs text-muted-foreground">{p.projectName}</span></td>
                      <td className="px-4 py-3.5 font-bold text-emerald-500">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3.5 text-right flex justify-end gap-1">
                        <Dialog open={editingMoneyIn?.id === p.id} onOpenChange={(open) => !open && setEditingMoneyIn(null)}>
                          <DialogTrigger render={<Button variant="ghost" size="icon" onClick={() => { setEditingMoneyIn(p); setEditMoneyInForm({ sourceName: p.sourceName, amount: p.amount.toString(), date: p.date, method: p.method }) }} className="h-8 w-8 text-muted-foreground hover:text-indigo-400"><Edit3 className="w-4 h-4" /></Button>} />
                          <DialogContent className="sm:max-w-[425px] rounded-2xl bg-card border-border/40">
                            <DialogHeader><DialogTitle className="text-xl font-bold font-heading">Edit Record</DialogTitle></DialogHeader>
                            <form onSubmit={handleEditMoneyInSubmit} className="space-y-4">
                              <div className="space-y-2"><Label>From</Label><Input required value={editMoneyInForm.sourceName} onChange={e => setEditMoneyInForm({...editMoneyInForm, sourceName: e.target.value})} className="rounded-xl border-border/40 bg-background/30 h-11" /></div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Amount ({symbol})</Label><Input required type="number" value={editMoneyInForm.amount} onChange={e => setEditMoneyInForm({...editMoneyInForm, amount: e.target.value})} className="rounded-xl border-border/40 bg-background/30 h-11" /></div>
                                <div className="space-y-2"><Label>Date</Label><Input type="date" required value={editMoneyInForm.date} onChange={e => setEditMoneyInForm({...editMoneyInForm, date: e.target.value})} className="rounded-xl border-border/40 bg-background/30 h-11" /></div>
                              </div>
                              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 font-semibold">Update</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteMoneyIn(p.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Money Out */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold tracking-tight font-heading">Money Paid (Out)</h2>
            <Dialog open={isMoneyOutOpen} onOpenChange={setIsMoneyOutOpen}>
              <DialogTrigger render={
                <Button variant="outline" size="sm" className="rounded-xl border-border/40 hover:bg-muted/80 gap-1"><Plus className="w-4 h-4 text-pink-500" /> Log Money Paid</Button>
              } />
              <DialogContent className="sm:max-w-[425px] rounded-2xl bg-card border-border/40">
                <DialogHeader><DialogTitle className="text-xl font-bold font-heading">Log Money Paid</DialogTitle></DialogHeader>
                <form onSubmit={handleLogMoneyOut} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="out-supplier">To (Supplier)</Label>
                    <select id="out-supplier" className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none" value={newMoneyOut.supplierId} onChange={e => setNewMoneyOut({...newMoneyOut, supplierId: e.target.value})}>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="out-project">Project</Label>
                    <select id="out-project" className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none" value={newMoneyOut.projectId} onChange={e => setNewMoneyOut({...newMoneyOut, projectId: e.target.value})}>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="out-amount">Amount ({symbol})</Label><Input id="out-amount" required type="number" className="rounded-xl border-border/40 bg-background/30 h-11" value={newMoneyOut.amount} onChange={e => setNewMoneyOut({...newMoneyOut, amount: e.target.value})} /></div>
                    <div className="space-y-2"><Label htmlFor="out-date">Date</Label><Input id="out-date" type="date" required className="rounded-xl border-border/40 bg-background/30 h-11" value={newMoneyOut.date} onChange={e => setNewMoneyOut({...newMoneyOut, date: e.target.value})} /></div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="out-notes">Details / Notes</Label><Input id="out-notes" className="rounded-xl border-border/40 bg-background/30 h-11" value={newMoneyOut.notes} onChange={e => setNewMoneyOut({...newMoneyOut, notes: e.target.value})} /></div>
                  <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-500 text-white rounded-xl py-6 font-semibold">Save</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="border border-border/40 bg-card/40 backdrop-blur-sm">
            <CardContent className="px-0 py-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-xs font-semibold text-muted-foreground bg-muted/20">
                    <th className="px-4 py-3">To</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                  {filteredMoneyOutLogs.map(p => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3.5"><div className="font-semibold">{p.supplier}</div><span className="text-xs text-muted-foreground">{p.projectName}</span></td>
                      <td className="px-4 py-3.5 font-bold text-pink-500">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3.5 text-right flex justify-end gap-1">
                        <Dialog open={editingMoneyOut?.id === p.id} onOpenChange={(open) => !open && setEditingMoneyOut(null)}>
                          <DialogTrigger render={<Button variant="ghost" size="icon" onClick={() => { setEditingMoneyOut(p); setEditMoneyOutForm({ amount: p.amount.toString(), date: p.date, notes: p.notes }) }} className="h-8 w-8 text-muted-foreground hover:text-indigo-400"><Edit3 className="w-4 h-4" /></Button>} />
                          <DialogContent className="sm:max-w-[425px] rounded-2xl bg-card border-border/40">
                            <DialogHeader><DialogTitle className="text-xl font-bold font-heading">Edit Record</DialogTitle></DialogHeader>
                            <form onSubmit={handleEditMoneyOutSubmit} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Amount ({symbol})</Label><Input required type="number" value={editMoneyOutForm.amount} onChange={e => setEditMoneyOutForm({...editMoneyOutForm, amount: e.target.value})} className="rounded-xl border-border/40 bg-background/30 h-11" /></div>
                                <div className="space-y-2"><Label>Date</Label><Input type="date" required value={editMoneyOutForm.date} onChange={e => setEditMoneyOutForm({...editMoneyOutForm, date: e.target.value})} className="rounded-xl border-border/40 bg-background/30 h-11" /></div>
                              </div>
                              <div className="space-y-2"><Label>Details / Notes</Label><Input value={editMoneyOutForm.notes} onChange={e => setEditMoneyOutForm({...editMoneyOutForm, notes: e.target.value})} className="rounded-xl border-border/40 bg-background/30 h-11" /></div>
                              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 font-semibold">Update</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteMoneyOut(p.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
