'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, ShieldCheck, Plus, Camera, FileText, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser, UserProfile } from '@/lib/auth-helpers'

export default function SiteEngineerEntries() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'material' | 'expense' | 'report'>('material')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [engineer, setEngineer] = useState<UserProfile | null>(null)
  const [assignedProjects, setAssignedProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Form states
  const [materialForm, setMaterialForm] = useState({ projectId: '', name: '', quantity: '', unit: 'Tons', supplier: '', cost: '', date: '' })
  const [expenseForm, setExpenseForm] = useState({ projectId: '', category: 'Labour', amount: '', notes: '', date: '' })
  const [reportForm, setReportForm] = useState({ projectId: '', date: '', completed: '', issues: '', notes: '' })

  useEffect(() => {
    fetchSession()
  }, [])

  const fetchSession = async () => {
    const profile = await getCurrentUser()
    if (profile && profile.role === 'SITE_ENGINEER') {
      setEngineer(profile)
      loadProjects(profile.id)
    } else {
      router.push('/login')
    }
  }

  const loadProjects = async (engineerId: string) => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: assignments } = await supabase
        .from('project_assignments')
        .select('project_id, project:projects(*)')
        .eq('user_id', engineerId)

      const dbProjects = (assignments || [])
        .filter(a => a.project !== null)
        .map(a => a.project as any)

      setAssignedProjects(dbProjects)

      if (dbProjects.length > 0) {
        const defaultProjId = dbProjects[0].id
        setMaterialForm(prev => ({ ...prev, projectId: defaultProjId }))
        setExpenseForm(prev => ({ ...prev, projectId: defaultProjId }))
        setReportForm(prev => ({ ...prev, projectId: defaultProjId }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setErrorMsg('')
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  const handleMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!engineer || !engineer.company_id || !materialForm.projectId) return
    setErrorMsg('')

    try {
      const supabase = createClient()
      const trimmedSupplier = materialForm.supplier.trim()

      if (!trimmedSupplier) {
        setErrorMsg('Supplier name is required.')
        return
      }

      // 1. Resolve or Create Supplier
      let supplierId = ''
      const { data: existingSupplier } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', engineer.company_id)
        .ilike('name', trimmedSupplier)
        .maybeSingle()

      if (existingSupplier) {
        supplierId = existingSupplier.id
      } else {
        const { data: newSup, error: supErr } = await supabase
          .from('suppliers')
          .insert({
            company_id: engineer.company_id,
            name: trimmedSupplier
          })
          .select()
          .single()

        if (supErr) {
          setErrorMsg('Failed to resolve supplier: ' + supErr.message)
          return
        }
        supplierId = newSup.id
      }

      // 2. Insert material
      const { error: matErr } = await supabase
        .from('materials')
        .insert({
          project_id: materialForm.projectId,
          name: materialForm.name,
          quantity: parseFloat(materialForm.quantity) || 0,
          unit: materialForm.unit,
          supplier_id: supplierId,
          cost: parseFloat(materialForm.cost) || 0,
          purchase_date: materialForm.date || new Date().toISOString().split('T')[0]
        })

      if (matErr) {
        setErrorMsg('Failed to log material delivery: ' + matErr.message)
        return
      }

      triggerSuccess(`Material "${materialForm.name}" registered successfully!`)
      setMaterialForm({
        projectId: assignedProjects[0]?.id || '',
        name: '',
        quantity: '',
        unit: 'Tons',
        supplier: '',
        cost: '',
        date: ''
      })
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.')
    }
  }

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!engineer || !expenseForm.projectId) return
    setErrorMsg('')

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('expenses')
        .insert({
          project_id: expenseForm.projectId,
          category: expenseForm.category,
          amount: parseFloat(expenseForm.amount) || 0,
          expense_date: expenseForm.date || new Date().toISOString().split('T')[0],
          notes: expenseForm.notes
        })

      if (error) {
        setErrorMsg('Failed to log expense: ' + error.message)
        return
      }

      triggerSuccess(`Expense of $${expenseForm.amount} registered successfully!`)
      setExpenseForm({
        projectId: assignedProjects[0]?.id || '',
        category: 'Labour',
        amount: '',
        notes: '',
        date: ''
      })
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.')
    }
  }

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!engineer || !reportForm.projectId) return
    setErrorMsg('')

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('daily_reports')
        .insert({
          project_id: reportForm.projectId,
          reporter_id: engineer.id,
          report_date: reportForm.date || new Date().toISOString().split('T')[0],
          work_completed: reportForm.completed,
          issues: reportForm.issues || '',
          notes: reportForm.notes || ''
        })

      if (error) {
        setErrorMsg('Failed to file progress report: ' + error.message)
        return
      }

      triggerSuccess(`Daily Progress Report filed successfully for ${reportForm.date || 'today'}!`)
      setReportForm({
        projectId: assignedProjects[0]?.id || '',
        date: '',
        completed: '',
        issues: '',
        notes: ''
      })
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.')
    }
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading field workspaces...</p>
      </div>
    )
  }

  if (assignedProjects.length === 0) {
    return (
      <Card className="p-8 text-center max-w-2xl mx-auto border border-border/40 bg-card/40 text-muted-foreground">
        You are not assigned to any projects. You must be assigned to at least one project by your Contractor Owner before logging site entries.
      </Card>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Ledger lock reminder */}
      <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-xs font-semibold rounded-2xl p-4 flex gap-2.5 items-center">
        <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
        <span>Ledger Protection Enabled: Entries logged here are immediately locked for accounting audits and cannot be modified or deleted.</span>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold rounded-2xl p-4 flex gap-2.5 items-center animate-in fade-in zoom-in-95">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold rounded-2xl p-4 flex gap-2.5 items-center animate-in fade-in zoom-in-95">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex gap-2 p-1.5 bg-muted/30 border border-border/40 rounded-2xl">
        <button
          onClick={() => { setActiveTab('material'); setErrorMsg(''); }}
          className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'material' 
              ? 'bg-indigo-600 text-white shadow shadow-indigo-500/20' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Material Entry
        </button>
        <button
          onClick={() => { setActiveTab('expense'); setErrorMsg(''); }}
          className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'expense' 
              ? 'bg-indigo-600 text-white shadow shadow-indigo-500/20' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Expense Entry
        </button>
        <button
          onClick={() => { setActiveTab('report'); setErrorMsg(''); }}
          className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'report' 
              ? 'bg-indigo-600 text-white shadow shadow-indigo-500/20' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Daily Report
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'material' && (
        <Card className="border border-border/40 bg-card/40 backdrop-blur-sm p-2 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold font-heading">Register Material Delivery</CardTitle>
            <CardDescription>Log bulk materials arriving on site.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMaterialSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="m-proj">Select Project Site</Label>
                <select
                  id="m-proj"
                  className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none"
                  value={materialForm.projectId}
                  onChange={e => setMaterialForm({...materialForm, projectId: e.target.value})}
                >
                  {assignedProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-name">Material Item</Label>
                <Input 
                  id="m-name" required placeholder="e.g. Portland Cement Grade 53"
                  className="rounded-xl border-border/40 bg-background/30 h-11"
                  value={materialForm.name}
                  onChange={e => setMaterialForm({...materialForm, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="m-qty">Quantity</Label>
                  <Input 
                    id="m-qty" required type="number" step="0.01" placeholder="50"
                    className="rounded-xl border-border/40 bg-background/30 h-11"
                    value={materialForm.quantity}
                    onChange={e => setMaterialForm({...materialForm, quantity: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-unit">Unit Metric</Label>
                  <select
                    id="m-unit"
                    className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none"
                    value={materialForm.unit}
                    onChange={e => setMaterialForm({...materialForm, unit: e.target.value})}
                  >
                    <option value="Tons">Tons</option>
                    <option value="Bags">Bags</option>
                    <option value="Cum">Cum</option>
                    <option value="Pcs">Pieces</option>
                    <option value="Litres">Litres</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-supplier">Supplier Name</Label>
                <Input 
                  id="m-supplier" required placeholder="Apex Concrete Co."
                  className="rounded-xl border-border/40 bg-background/30 h-11"
                  value={materialForm.supplier}
                  onChange={e => setMaterialForm({...materialForm, supplier: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="m-cost">Total Invoice Cost ($)</Label>
                  <Input 
                    id="m-cost" required type="number" placeholder="2400"
                    className="rounded-xl border-border/40 bg-background/30 h-11"
                    value={materialForm.cost}
                    onChange={e => setMaterialForm({...materialForm, cost: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-date">Delivery Date</Label>
                  <Input 
                    id="m-date" type="date" required
                    className="rounded-xl border-border/40 bg-background/30 h-11"
                    value={materialForm.date}
                    onChange={e => setMaterialForm({...materialForm, date: e.target.value})}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 font-semibold shadow-lg shadow-indigo-500/20">
                Log Material Receipt
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'expense' && (
        <Card className="border border-border/40 bg-card/40 backdrop-blur-sm p-2 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold font-heading">Register Field Expense</CardTitle>
            <CardDescription>Log local expenses and upload receipts.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="e-proj">Project Site</Label>
                <select
                  id="e-proj"
                  className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none"
                  value={expenseForm.projectId}
                  onChange={e => setExpenseForm({...expenseForm, projectId: e.target.value})}
                >
                  {assignedProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="e-cat">Category</Label>
                  <select
                    id="e-cat"
                    className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none"
                    value={expenseForm.category}
                    onChange={e => setExpenseForm({...expenseForm, category: e.target.value as any})}
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
                  <Label htmlFor="e-amt">Amount ($)</Label>
                  <Input 
                    id="e-amt" required type="number" placeholder="250"
                    className="rounded-xl border-border/40 bg-background/30 h-11"
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="e-date">Accrued Date</Label>
                  <Input 
                    id="e-date" type="date" required
                    className="rounded-xl border-border/40 bg-background/30 h-11"
                    value={expenseForm.date}
                    onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-notes">Audit Notes</Label>
                <textarea 
                  id="e-notes" required placeholder="Description of the expense..."
                  className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={expenseForm.notes}
                  onChange={e => setExpenseForm({...expenseForm, notes: e.target.value})}
                />
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 font-semibold shadow-lg shadow-indigo-500/20">
                Log Expense Payout
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'report' && (
        <Card className="border border-border/40 bg-card/40 backdrop-blur-sm p-2 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold font-heading">Submit Daily Progress Report</CardTitle>
            <CardDescription>File daily logs of progress, milestones, and site issues.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="r-proj">Project Site</Label>
                  <select
                    id="r-proj"
                    className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none"
                    value={reportForm.projectId}
                    onChange={e => setReportForm({...reportForm, projectId: e.target.value})}
                  >
                    {assignedProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-date">Log Date</Label>
                  <Input 
                    id="r-date" type="date" required
                    className="rounded-xl border-border/40 bg-background/30 h-11"
                    value={reportForm.date}
                    onChange={e => setReportForm({...reportForm, date: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-completed">Work Completed Today</Label>
                <textarea 
                  id="r-completed" required placeholder="e.g. Concrete slab cast completed for Block B first floor..."
                  className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 py-2 text-sm focus-visible:outline-none"
                  value={reportForm.completed}
                  onChange={e => setReportForm({...reportForm, completed: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-issues">Issues / Delays (If Any)</Label>
                <textarea 
                  id="r-issues" placeholder="e.g. Heavy rainfall delayed masonry work by 2 hours..."
                  className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 py-2 text-sm focus-visible:outline-none"
                  value={reportForm.issues}
                  onChange={e => setReportForm({...reportForm, issues: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-notes">Audit Notes</Label>
                <textarea 
                  id="r-notes" placeholder="Additional details..."
                  className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 py-2 text-sm focus-visible:outline-none"
                  value={reportForm.notes}
                  onChange={e => setReportForm({...reportForm, notes: e.target.value})}
                />
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 font-semibold shadow-lg shadow-indigo-500/20">
                Submit Progress Report
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
