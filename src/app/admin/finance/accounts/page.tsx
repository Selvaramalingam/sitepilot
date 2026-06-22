'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useCurrency } from '@/hooks/useCurrency'
import { Plus, Wallet, Trash2, Edit3, Landmark, CreditCard, Smartphone } from 'lucide-react'

export default function FinanceAccountsPage() {
  const { symbol, formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<any[]>([])
  
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({ id: '', name: '', type: 'Bank', currency: 'USD', balance: '0' })
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
      if (!profile || !profile.company_id) return
      
      const { data: accountsData } = await supabase.from('finance_accounts').select('*').eq('company_id', profile.company_id).order('name')
      setAccounts(accountsData || [])
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
      
      if (isEditing) {
        await supabase.from('finance_accounts').update({
          name: formData.name,
          type: formData.type,
          currency: formData.currency,
          balance: parseFloat(formData.balance) || 0
        }).eq('id', formData.id)
      } else {
        await supabase.from('finance_accounts').insert({
          company_id: profile?.company_id,
          name: formData.name,
          type: formData.type,
          currency: formData.currency,
          balance: parseFloat(formData.balance) || 0
        })
      }
      
      setIsOpen(false)
      loadAccounts()
    } catch (e) {
      console.error(e)
      alert('Failed to save account')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account? Transactions tied to it will fail.')) return
    try {
      const supabase = createClient()
      await supabase.from('finance_accounts').delete().eq('id', id)
      loadAccounts()
    } catch (e) {
      console.error(e)
      alert('Failed to delete account')
    }
  }

  const getAccountIcon = (type: string) => {
    switch(type) {
      case 'Bank': return <Landmark className="w-6 h-6 text-indigo-500" />
      case 'Cash': return <Wallet className="w-6 h-6 text-emerald-500" />
      case 'Credit Card': return <CreditCard className="w-6 h-6 text-pink-500" />
      case 'UPI': case 'Digital Wallet': return <Smartphone className="w-6 h-6 text-cyan-500" />
      default: return <Wallet className="w-6 h-6 text-indigo-500" />
    }
  }

  const totalBalance = accounts.reduce((acc, a) => acc + parseFloat(a.balance), 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold font-heading">Chart of Accounts</h3>
          <p className="text-sm text-muted-foreground">Total Balance: <span className="font-bold text-foreground">{formatCurrency(totalBalance)}</span></p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) { setFormData({ id: '', name: '', type: 'Bank', currency: 'USD', balance: '0' }); setIsEditing(false) }
        }}>
          <DialogTrigger render={
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg gap-2">
              <Plus className="w-4 h-4" /> Add Account
            </Button>
          } />
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Account' : 'Add New Account'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input required placeholder="e.g. Chase Business Checking" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="rounded-xl bg-background/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <select className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus:outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="Bank">Bank Account</option>
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Digital Wallet">Digital Wallet</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Initial Balance</Label>
                  <Input type="number" step="0.01" required value={formData.balance} onChange={e => setFormData({...formData, balance: e.target.value})} className="rounded-xl bg-background/50" />
                </div>
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 mt-4">
                {isEditing ? 'Update Account' : 'Create Account'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">No accounts configured.</div>
        ) : (
          accounts.map(acc => (
            <Card key={acc.id} className="border-border/40 bg-card/40 backdrop-blur-sm hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    acc.type === 'Bank' ? 'bg-indigo-500/10' :
                    acc.type === 'Cash' ? 'bg-emerald-500/10' :
                    acc.type === 'Credit Card' ? 'bg-pink-500/10' : 'bg-cyan-500/10'
                  }`}>
                    {getAccountIcon(acc.type)}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-indigo-500" onClick={() => {
                      setFormData({ id: acc.id, name: acc.name, type: acc.type, currency: acc.currency, balance: acc.balance })
                      setIsEditing(true)
                      setIsOpen(true)
                    }}><Edit3 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(acc.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                <h3 className="font-bold text-lg leading-tight mb-1">{acc.name}</h3>
                <p className="text-xs text-muted-foreground font-semibold mb-4">{acc.type}</p>
                <div className="pt-4 border-t border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
                  <p className="text-2xl font-extrabold">{formatCurrency(parseFloat(acc.balance))}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
