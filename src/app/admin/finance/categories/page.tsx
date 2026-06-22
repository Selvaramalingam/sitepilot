'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit3, Tag, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function FinanceCategoriesPage() {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<any[]>([])
  
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({ id: '', name: '', type: 'EXPENSE', isActive: true })
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
      if (!profile || !profile.company_id) return
      
      const { data: cats } = await supabase.from('finance_categories').select('*').eq('company_id', profile.company_id).order('type').order('name')
      setCategories(cats || [])
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
        await supabase.from('finance_categories').update({
          name: formData.name,
          type: formData.type,
          is_active: formData.isActive
        }).eq('id', formData.id)
      } else {
        await supabase.from('finance_categories').insert({
          company_id: profile?.company_id,
          name: formData.name,
          type: formData.type,
          is_active: formData.isActive
        })
      }
      
      setIsOpen(false)
      loadCategories()
    } catch (e) {
      console.error(e)
      alert('Failed to save category')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? (It is better to disable it if it has transactions)')) return
    try {
      const supabase = createClient()
      await supabase.from('finance_categories').delete().eq('id', id)
      loadCategories()
    } catch (e) {
      console.error(e)
      alert('Failed to delete category. It might be linked to transactions.')
    }
  }

  const incomeCategories = categories.filter(c => c.type === 'INCOME')
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold font-heading">Categories Settings</h3>
          <p className="text-sm text-muted-foreground">Manage classifications for your income and expenses.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) { setFormData({ id: '', name: '', type: 'EXPENSE', isActive: true }); setIsEditing(false) }
        }}>
          <DialogTrigger render={
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg gap-2">
              <Plus className="w-4 h-4" /> Add Category
            </Button>
          } />
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Category Name</Label>
                <Input required placeholder="e.g. Office Rent" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="rounded-xl bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <select className="flex w-full rounded-xl border border-border/40 bg-background/50 px-3 h-10 text-sm focus:outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="active" checked={formData.isActive} onCheckedChange={(checked) => setFormData({...formData, isActive: checked as boolean})} />
                <Label htmlFor="active" className="text-sm font-medium leading-none cursor-pointer">Active (Available for new transactions)</Label>
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 mt-4">
                {isEditing ? 'Update Category' : 'Create Category'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Income Categories */}
        <div className="space-y-4">
          <h4 className="font-bold flex items-center gap-2 text-emerald-500"><ArrowUpRight className="w-5 h-5" /> Income Categories</h4>
          <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-border/40">
                {incomeCategories.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No income categories found.</div>
                ) : (
                  incomeCategories.map(c => (
                    <div key={c.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <Tag className="w-4 h-4 text-emerald-500" />
                        <span className={`font-semibold ${!c.is_active ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{c.name}</span>
                        {!c.is_active && <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground border border-border/40">Inactive</span>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-indigo-500" onClick={() => {
                          setFormData({ id: c.id, name: c.name, type: c.type, isActive: c.is_active })
                          setIsEditing(true)
                          setIsOpen(true)
                        }}><Edit3 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expense Categories */}
        <div className="space-y-4">
          <h4 className="font-bold flex items-center gap-2 text-pink-500"><ArrowDownRight className="w-5 h-5" /> Expense Categories</h4>
          <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-border/40">
                {expenseCategories.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No expense categories found.</div>
                ) : (
                  expenseCategories.map(c => (
                    <div key={c.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <Tag className="w-4 h-4 text-pink-500" />
                        <span className={`font-semibold ${!c.is_active ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{c.name}</span>
                        {!c.is_active && <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground border border-border/40">Inactive</span>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-indigo-500" onClick={() => {
                          setFormData({ id: c.id, name: c.name, type: c.type, isActive: c.is_active })
                          setIsEditing(true)
                          setIsOpen(true)
                        }}><Edit3 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
