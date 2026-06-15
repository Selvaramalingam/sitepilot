'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  Truck, 
  DollarSign, 
  FileText,
  Edit3
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser, UserProfile } from '@/lib/auth-helpers'

interface Material {
  id: string
  projectId: string
  projectName: string
  name: string
  quantity: number
  unit: string
  supplier: string
  cost: number
  date: string
}

export default function ContractorMaterials() {
  const router = useRouter()
  const [contractor, setContractor] = useState<UserProfile | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState('All')
  const [loading, setLoading] = useState(true)

  // New Material form state
  const [newMaterial, setNewMaterial] = useState({
    projectId: '', name: '', quantity: '', unit: 'Tons', supplier: '', cost: '', date: ''
  })
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Edit Material form states
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [editMaterialForm, setEditMaterialForm] = useState({
    projectId: '', name: '', quantity: '', unit: 'Tons', supplier: '', cost: '', date: ''
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

      if (activeProjects.length > 0 && !newMaterial.projectId) {
        setNewMaterial(prev => ({ ...prev, projectId: activeProjects[0].id }))
      }

      // Fetch suppliers
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true })
      setSuppliers(suppliersData || [])

      // Fetch materials joined with projects and suppliers
      const { data: materialsData } = await supabase
        .from('materials')
        .select('*, project:projects!inner(*), supplier:suppliers(*)')
        .eq('projects.company_id', companyId)
        .order('purchase_date', { ascending: false })

      if (materialsData) {
        const mapped = materialsData.map((m: any) => ({
          id: m.id,
          projectId: m.project_id,
          projectName: m.project?.name || 'Unknown Project',
          name: m.name,
          quantity: parseFloat(m.quantity) || 0,
          unit: m.unit,
          supplier: m.supplier?.name || 'Unknown Supplier',
          cost: parseFloat(m.cost) || 0,
          date: m.purchase_date
        }))
        setMaterials(mapped)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contractor || !contractor.company_id) return

    const trimmedSupplier = newMaterial.supplier.trim()
    const projectId = newMaterial.projectId
    if (!projectId || !trimmedSupplier) return

    try {
      const supabase = createClient()
      
      // 1. Resolve or Create Supplier
      let supplierId = ''
      const { data: existingSupplier } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', contractor.company_id)
        .ilike('name', trimmedSupplier)
        .maybeSingle()

      if (existingSupplier) {
        supplierId = existingSupplier.id
      } else {
        const { data: newSup, error: supErr } = await supabase
          .from('suppliers')
          .insert({
            company_id: contractor.company_id,
            name: trimmedSupplier
          })
          .select()
          .single()

        if (supErr) {
          alert('Failed to resolve supplier: ' + supErr.message)
          return
        }
        supplierId = newSup.id
      }

      // 2. Insert material
      const { error: matErr } = await supabase
        .from('materials')
        .insert({
          project_id: projectId,
          name: newMaterial.name,
          quantity: parseFloat(newMaterial.quantity) || 0,
          unit: newMaterial.unit,
          supplier_id: supplierId,
          cost: parseFloat(newMaterial.cost) || 0,
          purchase_date: newMaterial.date || new Date().toISOString().split('T')[0]
        })

      if (matErr) {
        alert('Failed to register material: ' + matErr.message)
        return
      }

      setNewMaterial({
        projectId: projects[0]?.id || '',
        name: '',
        quantity: '',
        unit: 'Tons',
        supplier: '',
        cost: '',
        date: ''
      })
      setIsCreateOpen(false)
      loadData(contractor.company_id)
    } catch (err) {
      console.error(err)
    }
  }

  const handleEditMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMaterial || !contractor?.company_id) return

    const trimmedSupplier = editMaterialForm.supplier.trim()
    const projectId = editMaterialForm.projectId
    if (!projectId || !trimmedSupplier) return

    try {
      const supabase = createClient()
      
      let supplierId = ''
      const { data: existingSupplier } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', contractor.company_id)
        .ilike('name', trimmedSupplier)
        .maybeSingle()

      if (existingSupplier) {
        supplierId = existingSupplier.id
      } else {
        const { data: newSup } = await supabase
          .from('suppliers')
          .insert({ company_id: contractor.company_id, name: trimmedSupplier })
          .select().single()
        if (newSup) supplierId = newSup.id
      }

      await supabase
        .from('materials')
        .update({
          project_id: projectId,
          name: editMaterialForm.name,
          quantity: parseFloat(editMaterialForm.quantity) || 0,
          unit: editMaterialForm.unit,
          supplier_id: supplierId,
          cost: parseFloat(editMaterialForm.cost) || 0,
          purchase_date: editMaterialForm.date
        })
        .eq('id', editingMaterial.id)

      setEditingMaterial(null)
      loadData(contractor.company_id)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material log?')) return
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id)

      if (error) {
        alert('Delete failed: ' + error.message)
        return
      }

      if (contractor) loadData(contractor.company_id!)
    } catch (e) {
      console.error(e)
    }
  }

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProject = selectedProject === 'All' || m.projectId === selectedProject
    return matchesSearch && matchesProject
  })

  const totalCost = filteredMaterials.reduce((acc, m) => acc + m.cost, 0)

  return (
    <div className="space-y-6">
      <datalist id="supplier-list">
        {suppliers.map(s => <option key={s.id} value={s.name} />)}
      </datalist>

      {/* Top metrics bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border border-border/40 bg-card/40 backdrop-blur-sm p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Total Material Cost</span>
            <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-indigo-500">${totalCost.toLocaleString()}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>
        <Card className="border border-border/40 bg-card/40 backdrop-blur-sm p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Total Purchases logged</span>
            <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-pink-500">{filteredMaterials.length} entries</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </Card>
        <Card className="border border-border/40 bg-card/40 backdrop-blur-sm p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Active Suppliers</span>
            <h3 className="text-2xl font-extrabold tracking-tight mt-1 text-cyan-500">
              {new Set(filteredMaterials.map(m => m.supplier)).size} suppliers
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
            <Truck className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Filter and Add button */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
            <Input 
              placeholder="Search materials..." 
              className="pl-10 rounded-xl border-border/40 bg-card/50"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="flex rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none w-full sm:w-48"
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
          >
            <option value="All">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 gap-2 w-full md:w-auto py-5">
              <Plus className="h-4.5 w-4.5" /> Log Material Purchase
            </Button>
          } />
          <DialogContent className="sm:max-w-[450px] rounded-2xl bg-card border-border/40">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-heading">Register Material Delivery</DialogTitle>
              <CardDescription>Enter details from the material receipt/invoice.</CardDescription>
            </DialogHeader>
            <form onSubmit={handleCreateMaterial} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="m-project">Associate with Project</Label>
                <select
                  id="m-project"
                  className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none"
                  value={newMaterial.projectId}
                  onChange={e => setNewMaterial({...newMaterial, projectId: e.target.value})}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-name">Material Item Name</Label>
                <Input 
                  id="m-name" required placeholder="e.g. Portland Cement Grade 53"
                  className="rounded-xl border-border/40 bg-background/30 h-11"
                  value={newMaterial.name}
                  onChange={e => setNewMaterial({...newMaterial, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="m-quantity">Quantity Delivered</Label>
                  <Input 
                    id="m-quantity" required type="number" step="0.01" placeholder="200"
                    className="rounded-xl border-border/40 bg-background/30 h-11"
                    value={newMaterial.quantity}
                    onChange={e => setNewMaterial({...newMaterial, quantity: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-unit">Unit Metric</Label>
                  <select
                    id="m-unit"
                    className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none"
                    value={newMaterial.unit}
                    onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})}
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
                  list="supplier-list"
                  className="rounded-xl border-border/40 bg-background/30 h-11"
                  value={newMaterial.supplier}
                  onChange={e => setNewMaterial({...newMaterial, supplier: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="m-cost">Total Invoice Cost ($)</Label>
                  <Input 
                    id="m-cost" required type="number" placeholder="4200"
                    className="rounded-xl border-border/40 bg-background/30 h-11"
                    value={newMaterial.cost}
                    onChange={e => setNewMaterial({...newMaterial, cost: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-date">Delivery Date</Label>
                  <Input 
                    id="m-date" type="date" required
                    className="rounded-xl border-border/40 bg-background/30 h-11"
                    value={newMaterial.date}
                    onChange={e => setNewMaterial({...newMaterial, date: e.target.value})}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 font-semibold shadow-lg shadow-indigo-500/20 mt-4">
                Register Material & Add to Ledger
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Ledger Table */}
      <Card className="border border-border/40 bg-card/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Material Ledger Transactions</CardTitle>
          <CardDescription>Historical purchases and inventory logs for active projects</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading ledger transactions...</div>
            ) : filteredMaterials.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No material delivery logs found.</div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/40 text-xs font-semibold text-muted-foreground bg-muted/20">
                    <th className="px-6 py-3.5">Material</th>
                    <th className="px-6 py-3.5">Project</th>
                    <th className="px-6 py-3.5">Supplier</th>
                    <th className="px-6 py-3.5">Quantity / Unit</th>
                    <th className="px-6 py-3.5">Total Cost</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-sm">
                  {filteredMaterials.map(m => (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        <span>{m.name}</span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{m.projectName}</td>
                      <td className="px-6 py-4">{m.supplier}</td>
                      <td className="px-6 py-4 font-medium">
                        {m.quantity.toLocaleString()} <span className="text-muted-foreground text-xs">{m.unit}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-indigo-500">${m.cost.toLocaleString()}</td>
                      <td className="px-6 py-4 text-muted-foreground">{m.date}</td>
                      <td className="px-6 py-4 text-right flex justify-end gap-1">
                        <Dialog open={editingMaterial?.id === m.id} onOpenChange={(open) => !open && setEditingMaterial(null)}>
                          <DialogTrigger render={
                            <Button variant="ghost" size="icon" onClick={() => {
                              setEditingMaterial(m)
                              setEditMaterialForm({
                                projectId: m.projectId, name: m.name, quantity: m.quantity.toString(), unit: m.unit, supplier: m.supplier, cost: m.cost.toString(), date: m.date
                              })
                            }} className="rounded-lg text-muted-foreground hover:text-indigo-500">
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          } />
                          <DialogContent className="sm:max-w-[450px] rounded-2xl bg-card border-border/40">
                            <DialogHeader><DialogTitle className="text-xl font-bold font-heading">Edit Material</DialogTitle></DialogHeader>
                            <form onSubmit={handleEditMaterialSubmit} className="space-y-4 mt-2">
                              <div className="space-y-2">
                                <Label>Project</Label>
                                <select className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none" value={editMaterialForm.projectId} onChange={e => setEditMaterialForm({...editMaterialForm, projectId: e.target.value})}>
                                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <Label>Material Item Name</Label>
                                <Input required className="rounded-xl border-border/40 bg-background/30 h-11" value={editMaterialForm.name} onChange={e => setEditMaterialForm({...editMaterialForm, name: e.target.value})} />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Quantity</Label><Input required type="number" step="0.01" className="rounded-xl border-border/40 bg-background/30 h-11" value={editMaterialForm.quantity} onChange={e => setEditMaterialForm({...editMaterialForm, quantity: e.target.value})} /></div>
                                <div className="space-y-2">
                                  <Label>Unit Metric</Label>
                                  <select className="flex w-full rounded-xl border border-border/40 bg-background/30 px-3 h-11 text-sm focus-visible:outline-none" value={editMaterialForm.unit} onChange={e => setEditMaterialForm({...editMaterialForm, unit: e.target.value})}>
                                    <option value="Tons">Tons</option>
                                    <option value="Bags">Bags</option>
                                    <option value="Cum">Cum</option>
                                    <option value="Pcs">Pieces</option>
                                    <option value="Litres">Litres</option>
                                  </select>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Supplier</Label>
                                <Input required list="supplier-list" className="rounded-xl border-border/40 bg-background/30 h-11" value={editMaterialForm.supplier} onChange={e => setEditMaterialForm({...editMaterialForm, supplier: e.target.value})} />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Total Cost ($)</Label><Input required type="number" className="rounded-xl border-border/40 bg-background/30 h-11" value={editMaterialForm.cost} onChange={e => setEditMaterialForm({...editMaterialForm, cost: e.target.value})} /></div>
                                <div className="space-y-2"><Label>Delivery Date</Label><Input type="date" required className="rounded-xl border-border/40 bg-background/30 h-11" value={editMaterialForm.date} onChange={e => setEditMaterialForm({...editMaterialForm, date: e.target.value})} /></div>
                              </div>
                              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 font-semibold mt-4">Save Changes</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(m.id)}
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
