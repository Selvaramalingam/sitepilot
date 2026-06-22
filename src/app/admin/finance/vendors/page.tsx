'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit3, Building2, Phone, Mail, MapPin } from 'lucide-react'

export default function FinanceVendorsPage() {
  const [loading, setLoading] = useState(true)
  const [vendors, setVendors] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({ id: '', name: '', contact_person: '', phone: '', email: '', address: '', notes: '' })
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    loadVendors()
  }, [])

  const loadVendors = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
      if (!profile || !profile.company_id) return
      
      const { data: vData } = await supabase.from('finance_vendors').select('*').eq('company_id', profile.company_id).order('name')
      setVendors(vData || [])
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
        name: formData.name,
        contact_person: formData.contact_person,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        notes: formData.notes
      }

      if (isEditing) {
        await supabase.from('finance_vendors').update(payload).eq('id', formData.id)
      } else {
        await supabase.from('finance_vendors').insert({ ...payload, company_id: profile?.company_id })
      }
      
      setIsOpen(false)
      loadVendors()
    } catch (e) {
      console.error(e)
      alert('Failed to save vendor')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return
    try {
      const supabase = createClient()
      await supabase.from('finance_vendors').delete().eq('id', id)
      loadVendors()
    } catch (e) {
      console.error(e)
      alert('Failed to delete vendor. They might be linked to existing transactions.')
    }
  }

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (v.contact_person || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold font-heading">Vendor Directory</h3>
          <p className="text-sm text-muted-foreground">Manage your suppliers, contractors, and service providers.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) { setFormData({ id: '', name: '', contact_person: '', phone: '', email: '', address: '', notes: '' }); setIsEditing(false) }
        }}>
          <DialogTrigger render={
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg gap-2">
              <Plus className="w-4 h-4" /> Add Vendor
            </Button>
          } />
          <DialogContent className="sm:max-w-[500px] rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Company/Vendor Name</Label>
                <Input required placeholder="e.g. Acme Supplies Ltd" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="rounded-xl bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input placeholder="e.g. John Doe" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} className="rounded-xl bg-background/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="rounded-xl bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="rounded-xl bg-background/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="rounded-xl bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="rounded-xl bg-background/50" />
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 mt-4">
                {isEditing ? 'Update Vendor' : 'Create Vendor'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input 
        placeholder="Search vendors..." 
        value={searchTerm} 
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-md rounded-xl bg-card/50 border-border/40"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">Loading vendors...</div>
        ) : filteredVendors.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">No vendors found.</div>
        ) : (
          filteredVendors.map(v => (
            <Card key={v.id} className="border-border/40 bg-card/40 backdrop-blur-sm hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-indigo-500" />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-indigo-500" onClick={() => {
                      setFormData({ id: v.id, name: v.name, contact_person: v.contact_person || '', phone: v.phone || '', email: v.email || '', address: v.address || '', notes: v.notes || '' })
                      setIsEditing(true)
                      setIsOpen(true)
                    }}><Edit3 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(v.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                
                <h3 className="font-bold text-lg leading-tight mb-3">{v.name}</h3>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  {v.contact_person && <p className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5 shrink-0" /> {v.contact_person}</p>}
                  {v.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 shrink-0" /> {v.phone}</p>}
                  {v.email && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 shrink-0" /> {v.email}</p>}
                  {v.address && <p className="flex items-center gap-2 items-start"><MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" /> <span className="line-clamp-2">{v.address}</span></p>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
