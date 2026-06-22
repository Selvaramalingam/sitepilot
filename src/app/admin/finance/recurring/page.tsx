'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useCurrency } from '@/hooks/useCurrency'
import { Plus, Trash2, Edit3, CalendarClock, Clock, CheckCircle2 } from 'lucide-react'

export default function FinanceRecurringPage() {
  const { symbol, formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(true)
  
  const [bills, setBills] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  const [formData, setFormData] = useState({
    id: '', title: '', amount: '', categoryId: '', vendorId: '', accountId: '', frequency: 'Monthly', nextDueDate: '', notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
      if (!profile || !profile.company_id) return
      
      const [acc, cat, ven, bData] = await Promise.all([
        supabase.from('finance_accounts').select('*').eq('company_id', profile.company_id).order('name'),
        supabase.from('finance_categories').select('*').eq('company_id', profile.company_id).eq('type', 'EXPENSE').order('name'),
        supabase.from('finance_vendors').select('*').eq('company_id', profile.company_id).order('name'),
        supabase.from('finance_recurring_bills').select('*, account:finance_accounts(name), category:finance_categories(name), vendor:finance_vendors(name)').eq('company_id', profile.company_id).order('next_due_date', { ascending: true })
      ])
      
      setAccounts(acc.data || [])
      setCategories(cat.data || [])
      setVendors(ven.data || [])
      setBills(bData.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('users').select('company_id').eq('id', user?.id).single()
      
      const payload = {
        title: formData.title,
        amount: parseFloat(formData.amount) || 0,
        category_id: formData.categoryId || null,
        vendor_id: formData.vendorId || null,
        account_id: formData.accountId || null,
        frequency: formData.frequency,
        next_due_date: formData.nextDueDate,
        notes: formData.notes
      }

      if (isEditing) {
        await supabase.from('finance_recurring_bills').update(payload).eq('id', formData.id)
      } else {
        await supabase.from('finance_recurring_bills').insert({ ...payload, company_id: profile?.company_id })
      }
      
      setIsOpen(false)
      loadData()
    } catch (e) {
      console.error(e)
      alert('Failed to save recurring bill')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring bill?')) return
    try {
      const supabase = createClient()
      await supabase.from('finance_recurring_bills').delete().eq('id', id)
      loadData()
    } catch (e) {
      console.error(e)
      alert('Failed to delete')
    }
  }

  const handleMarkPaid = async (bill: any) => {
    if (!confirm(`Log payment of ${formatCurrency(bill.amount)} for ${bill.title}?`)) return
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      // 1. Log transaction
      await supabase.from('finance_transactions').insert({
        company_id: bill.company_id,
        type: 'EXPENSE',
        amount: bill.amount,
        date: new Date().toISOString().split('T')[0],
        account_id: bill.account_id,
        category_id: bill.category_id,
        vendor_id: bill.vendor_id,
        notes: `Paid recurring bill: ${bill.title}`,
        payment_method: 'Bank Transfer',
        created_by: user?.id
      })

      // 2. Calculate next due date
      const currentDate = new Date(bill.next_due_date)
      if (bill.frequency === 'Monthly') currentDate.setMonth(currentDate.getMonth() + 1)
      else if (bill.frequency === 'Weekly') currentDate.setDate(currentDate.getDate() + 7)
      else if (bill.frequency === 'Yearly') currentDate.setFullYear(currentDate.getFullYear() + 1)
      else if (bill.frequency === 'Quarterly') currentDate.setMonth(currentDate.getMonth() + 3)
      else if (bill.frequency === 'Daily') currentDate.setDate(currentDate.getDate() + 1)

      // 3. Update bill next due date
      await supabase.from('finance_recurring_bills').update({
        next_due_date: currentDate.toISOString().split('T')[0]
      }).eq('id', bill.id)

      loadData()
    } catch (e) {
      console.error(e)
      alert('Failed to process payment')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold font-heading">Recurring Bills</h3>
          <p className="text-sm text-muted-foreground">Manage subscriptions, rent, salaries, and EMIs.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) { 
            setFormData({ id: '', title: '', amount: '', categoryId: '', vendorId: '', accountId: '', frequency: 'Monthly', nextDueDate: '', notes: '' })
            setIsEditing(false) 
          }
        }}>
          <DialogTrigger render={
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg gap-2">
              <Plus className="w-4 h-4" /> Add Bill
            </Button>
          } />
          <DialogContent className="sm:max-w-[500px] rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Recurring Bill' : 'Add Recurring Bill'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Bill Title</Label>
                <Input required placeholder="e.g. Office Rent, AWS Hosting" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="rounded-xl bg-background/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount ({symbol})</Label>
                  <Input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="rounded-xl bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <select required className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus:outline-none" value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})}>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Next Due Date</Label>
                <Input type="date" required value={formData.nextDueDate} onChange={e => setFormData({...formData, nextDueDate: e.target.value})} className="rounded-xl bg-background/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select required className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus:outline-none" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Account</Label>
                  <select className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus:outline-none" value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})}>
                    <option value="">Select Account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Vendor</Label>
                <select className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus:outline-none" value={formData.vendorId} onChange={e => setFormData({...formData, vendorId: e.target.value})}>
                  <option value="">None</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 mt-4">
                {isEditing ? 'Update Bill' : 'Create Bill'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">Loading recurring bills...</div>
        ) : bills.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">No recurring bills found.</div>
        ) : (
          bills.map(b => {
            const isOverdue = new Date(b.next_due_date) < new Date(new Date().setHours(0,0,0,0))
            const isDueSoon = !isOverdue && (new Date(b.next_due_date).getTime() - new Date().getTime()) < 7 * 24 * 60 * 60 * 1000
            
            return (
              <Card key={b.id} className={`border-border/40 bg-card/40 backdrop-blur-sm transition-all ${isOverdue ? 'border-red-500/50 shadow-sm shadow-red-500/10' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isOverdue ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-500'
                    }`}>
                      <CalendarClock className="w-6 h-6" />
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-indigo-500" onClick={() => {
                        setFormData({ id: b.id, title: b.title, amount: b.amount.toString(), categoryId: b.category_id || '', vendorId: b.vendor_id || '', accountId: b.account_id || '', frequency: b.frequency, nextDueDate: b.next_due_date, notes: b.notes || '' })
                        setIsEditing(true)
                        setIsOpen(true)
                      }}><Edit3 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(b.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-lg leading-tight mb-1">{b.title}</h3>
                  <p className="text-2xl font-extrabold text-pink-500 mb-4">{formatCurrency(b.amount)}</p>
                  
                  <div className="space-y-2 text-sm text-muted-foreground mb-6">
                    <p className="flex justify-between"><span>Frequency:</span> <span className="font-semibold text-foreground">{b.frequency}</span></p>
                    <p className="flex justify-between"><span>Category:</span> <span className="text-foreground">{b.category?.name || 'Uncategorized'}</span></p>
                    <p className="flex justify-between items-center">
                      <span>Due Date:</span> 
                      <span className={`font-semibold flex items-center gap-1 ${isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : 'text-foreground'}`}>
                        {isOverdue && <Clock className="w-3 h-3" />}
                        {new Date(b.next_due_date).toLocaleDateString()}
                      </span>
                    </p>
                  </div>

                  <Button 
                    onClick={() => handleMarkPaid(b)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Log Payment
                  </Button>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
