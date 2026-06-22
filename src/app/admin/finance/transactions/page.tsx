'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useCurrency } from '@/hooks/useCurrency'
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowRightLeft, 
  Search,
  Trash2,
  ChevronDown,
  Plus,
  Check,
  X
} from 'lucide-react'

// ──────────────────────────────────────────────────────────────
// Inline-Create Combobox
// Allows selecting an existing option OR typing a new name to create
// ──────────────────────────────────────────────────────────────
interface ComboOption { id: string; name: string }

function CreatableCombobox({
  label,
  value,
  options,
  placeholder = 'Select or type to create...',
  noneLabel = 'None / N/A',
  allowNone = true,
  required = false,
  onCreate,
  onChange,
}: {
  label?: string
  value: string
  options: ComboOption[]
  placeholder?: string
  noneLabel?: string
  allowNone?: boolean
  required?: boolean
  onCreate: (name: string) => Promise<ComboOption | null>
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedLabel = value === '' 
    ? noneLabel 
    : options.find(o => o.id === value)?.name ?? ''

  const filtered = options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()))
  const showCreate = query.trim().length > 0 && !options.some(o => o.name.toLowerCase() === query.toLowerCase().trim())

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleSelect = (id: string) => {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  const handleCreate = async () => {
    const name = query.trim()
    if (!name) return
    setCreating(true)
    try {
      const created = await onCreate(name)
      if (created) {
        onChange(created.id)
        setOpen(false)
        setQuery('')
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div ref={containerRef} className="relative">
        {/* Trigger button */}
        <button
          type="button"
          onClick={open ? () => { setOpen(false); setQuery('') } : handleOpen}
          className={`flex w-full items-center justify-between rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 hover:border-border/70 transition-colors ${required && !value && 'border-red-500/50'}`}
        >
          <span className={value === '' ? 'text-muted-foreground' : 'text-foreground'}>
            {open ? (query || selectedLabel) : (selectedLabel || placeholder)}
          </span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-border/40 bg-popover shadow-xl overflow-hidden">
            {/* Search input */}
            <div className="p-2 border-b border-border/40">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); if (showCreate) handleCreate() }
                    if (e.key === 'Escape') { setOpen(false); setQuery('') }
                  }}
                  placeholder="Search or type new name..."
                  className="w-full pl-7 pr-3 py-1.5 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Options list */}
            <div className="max-h-48 overflow-y-auto py-1">
              {allowNone && (
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-muted-foreground ${value === '' ? 'bg-muted/30' : ''}`}
                >
                  <X className="w-3.5 h-3.5 opacity-50 shrink-0" />
                  {noneLabel}
                </button>
              )}

              {filtered.length === 0 && !showCreate && (
                <p className="px-3 py-3 text-xs text-muted-foreground text-center">No matches found</p>
              )}

              {filtered.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleSelect(o.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${value === o.id ? 'bg-muted/30 font-semibold' : ''}`}
                >
                  {value === o.id ? <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> : <span className="w-3.5 h-3.5 shrink-0" />}
                  {o.name}
                </button>
              ))}

              {/* Create new option */}
              {showCreate && (
                <button
                  type="button"
                  disabled={creating}
                  onClick={handleCreate}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-indigo-400 hover:bg-indigo-500/10 font-semibold transition-colors border-t border-border/40"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  {creating ? 'Creating...' : `Create "${query.trim()}"`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────
export default function FinanceTransactionsPage() {
  const { symbol, formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
  const [transactions, setTransactions] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  
  const [isOpen, setIsOpen] = useState(false)
  const [txType, setTxType] = useState('EXPENSE') // INCOME, EXPENSE, TRANSFER
  
  const [formData, setFormData] = useState({
    amount: '', date: '', accountId: '', toAccountId: '', categoryId: '', vendorId: '', method: 'Bank Transfer', reference: '', notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
      if (!profile || !profile.company_id) return
      setCompanyId(profile.company_id)
      
      const [acc, cat, ven, tx] = await Promise.all([
        supabase.from('finance_accounts').select('*').eq('company_id', profile.company_id).order('name'),
        supabase.from('finance_categories').select('*').eq('company_id', profile.company_id).eq('is_active', true).order('name'),
        supabase.from('finance_vendors').select('*').eq('company_id', profile.company_id).order('name'),
        supabase.from('finance_transactions').select('*, account:finance_accounts!finance_transactions_account_id_fkey(name), to_account:finance_accounts!finance_transactions_to_account_id_fkey(name), category:finance_categories(name), vendor:finance_vendors(name)').eq('company_id', profile.company_id).order('date', { ascending: false }).order('created_at', { ascending: false })
      ])
      
      setAccounts(acc.data || [])
      setCategories(cat.data || [])
      setVendors(ven.data || [])
      setTransactions(tx.data || [])
      
      if (acc.data && acc.data.length > 0) {
        setFormData(prev => ({ ...prev, accountId: acc.data[0].id }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // ── Inline create helpers ──

  const createVendor = async (name: string): Promise<{ id: string; name: string } | null> => {
    if (!companyId || !name.trim()) return null
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('finance_vendors')
        .insert({ company_id: companyId, name: name.trim() })
        .select('id, name')
        .single()
      if (error) throw error
      setVendors(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      return data
    } catch (e) {
      console.error(e)
      alert('Failed to create vendor')
      return null
    }
  }

  const createCategory = async (name: string): Promise<{ id: string; name: string } | null> => {
    if (!companyId || !name.trim()) return null
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('finance_categories')
        .insert({ company_id: companyId, name: name.trim(), type: txType, is_active: true })
        .select('id, name, type')
        .single()
      if (error) throw error
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      return data
    } catch (e) {
      console.error(e)
      alert('Failed to create category')
      return null
    }
  }

  // ── Dialog open ──

  const handleOpenDialog = (type: string) => {
    setTxType(type)
    setFormData({
      amount: '', date: new Date().toISOString().split('T')[0], 
      accountId: accounts[0]?.id || '', toAccountId: '', 
      categoryId: '', vendorId: '', method: 'Bank Transfer', reference: '', notes: ''
    })
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('users').select('company_id').eq('id', user?.id).single()
      
      await supabase.from('finance_transactions').insert({
        company_id: profile?.company_id,
        type: txType,
        amount: parseFloat(formData.amount) || 0,
        date: formData.date,
        account_id: formData.accountId,
        to_account_id: txType === 'TRANSFER' ? formData.toAccountId : null,
        category_id: txType !== 'TRANSFER' ? (formData.categoryId || null) : null,
        vendor_id: txType !== 'TRANSFER' ? (formData.vendorId || null) : null,
        payment_method: formData.method,
        reference_number: formData.reference,
        notes: formData.notes,
        created_by: user?.id
      })
      
      setIsOpen(false)
      loadData()
    } catch (e) {
      console.error(e)
      alert('Failed to save transaction')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction? Account balances will be reverted.')) return
    try {
      const supabase = createClient()
      await supabase.from('finance_transactions').delete().eq('id', id)
      loadData()
    } catch (e) {
      console.error(e)
      alert('Failed to delete transaction')
    }
  }

  const filteredTxs = transactions.filter(t => {
    const searchMatch = (t.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (t.reference_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (t.vendor?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const typeMatch = typeFilter === 'All' || t.type === typeFilter
    return searchMatch && typeMatch
  })

  const filteredCategoriesForType = categories.filter(c => c.type === txType)

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold font-heading">Ledger &amp; Transactions</h3>
          <p className="text-sm text-muted-foreground">Log all income, expenses, and bank transfers.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleOpenDialog('INCOME')} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-2">
            <ArrowUpRight className="w-4 h-4" /> Add Income
          </Button>
          <Button onClick={() => handleOpenDialog('EXPENSE')} className="bg-pink-600 hover:bg-pink-500 text-white rounded-xl gap-2">
            <ArrowDownRight className="w-4 h-4" /> Add Expense
          </Button>
          <Button onClick={() => handleOpenDialog('TRANSFER')} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl gap-2">
            <ArrowRightLeft className="w-4 h-4" /> Transfer
          </Button>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-[600px] rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {txType === 'INCOME' && 'Log Income'}
                {txType === 'EXPENSE' && 'Log Expense'}
                {txType === 'TRANSFER' && 'Transfer Funds'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">

              {/* Account row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{txType === 'TRANSFER' ? 'From Account' : 'Account'}</Label>
                  <select
                    required
                    className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus:outline-none"
                    value={formData.accountId}
                    onChange={e => setFormData({...formData, accountId: e.target.value})}
                  >
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                  </select>
                </div>

                {txType === 'TRANSFER' && (
                  <div className="space-y-2">
                    <Label>To Account</Label>
                    <select
                      required
                      className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus:outline-none"
                      value={formData.toAccountId}
                      onChange={e => setFormData({...formData, toAccountId: e.target.value})}
                    >
                      <option value="">Select Destination</option>
                      {accounts.filter(a => a.id !== formData.accountId).map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                    </select>
                  </div>
                )}

                {txType !== 'TRANSFER' && (
                  <CreatableCombobox
                    label="Category"
                    value={formData.categoryId}
                    options={filteredCategoriesForType}
                    placeholder="Select or create category..."
                    noneLabel="No Category"
                    allowNone={false}
                    required
                    onCreate={createCategory}
                    onChange={id => setFormData({...formData, categoryId: id})}
                  />
                )}
              </div>

              {/* Amount + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount ({symbol})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    className="rounded-xl bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="rounded-xl bg-background/50"
                  />
                </div>
              </div>

              {/* Vendor — creatable combobox */}
              {txType !== 'TRANSFER' && (
                <CreatableCombobox
                  label="Vendor / Payee"
                  value={formData.vendorId}
                  options={vendors}
                  placeholder="Select vendor or type to create new..."
                  noneLabel="None / N/A"
                  allowNone={true}
                  onCreate={createVendor}
                  onChange={id => setFormData({...formData, vendorId: id})}
                />
              )}

              {/* Payment method + Reference */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <select
                    className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus:outline-none"
                    value={formData.method}
                    onChange={e => setFormData({...formData, method: e.target.value})}
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Reference Number</Label>
                  <Input
                    value={formData.reference}
                    onChange={e => setFormData({...formData, reference: e.target.value})}
                    className="rounded-xl bg-background/50"
                    placeholder="Txn ID, Cheque No."
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="rounded-xl bg-background/50"
                  placeholder="Additional details..."
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className={`w-full text-white rounded-xl py-6 mt-4 ${
                  txType === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-500' : 
                  txType === 'EXPENSE' ? 'bg-pink-600 hover:bg-pink-500' : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                {isSubmitting ? 'Saving...' : 'Save Transaction'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search notes, reference, or vendor..." 
            className="pl-9 rounded-xl border-border/40 bg-card/50"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="flex w-full sm:w-40 rounded-xl border border-border/40 bg-card/50 px-3 h-10 text-sm focus:outline-none"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="All">All Types</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
          <option value="TRANSFER">Transfer</option>
        </select>
      </div>

      {/* Transactions table */}
      <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-border/40 text-xs font-semibold text-muted-foreground bg-muted/20">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-sm">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Loading...</td></tr>
              ) : filteredTxs.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No transactions found.</td></tr>
              ) : (
                filteredTxs.map(t => (
                  <tr key={t.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                        t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' :
                        t.type === 'EXPENSE' ? 'bg-pink-500/10 text-pink-500' : 'bg-indigo-500/10 text-indigo-500'
                      }`}>{t.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{t.notes || (t.type === 'TRANSFER' ? 'Internal Transfer' : 'Transaction')}</p>
                      {t.vendor && <p className="text-[10px] text-muted-foreground">Vendor: {t.vendor.name}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.type === 'TRANSFER' ? '-' : t.category?.name}</td>
                    <td className="px-4 py-3">
                      <p>{t.account?.name}</p>
                      {t.type === 'TRANSFER' && <p className="text-[10px] text-indigo-500">To: {t.to_account?.name}</p>}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${
                      t.type === 'INCOME' ? 'text-emerald-500' :
                      t.type === 'EXPENSE' ? 'text-pink-500' : 'text-indigo-500'
                    }`}>
                      {t.type === 'EXPENSE' ? '-' : t.type === 'INCOME' ? '+' : ''}{formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
