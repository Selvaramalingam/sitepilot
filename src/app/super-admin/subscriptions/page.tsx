'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Check, Settings, ShieldCheck, ToggleLeft, ToggleRight, Sparkles, CheckCircle2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Plan {
  id: string
  name: string
  price: number
  projects: string
  users: string
  storage: string
  features: { [key: string]: boolean }
}

export default function SuperAdminSubscriptions() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [globalFeatures, setGlobalFeatures] = useState({
    Accounting: true,
    Materials: true,
    Expenses: true,
    Reports: true,
    Documents: true,
    AI: true
  })
  const [successMsg, setSuccessMsg] = useState('')

  // Add plan form state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newPlan, setNewPlan] = useState({
    name: '',
    price: 99,
    projects: '10',
    users: '5',
    storage: '10 GB',
    features: {
      Accounting: true,
      Materials: true,
      Expenses: true,
      Reports: false,
      Documents: true,
      AI: false
    }
  })

  // Edit plan form state
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan({ ...plan })
    setIsEditOpen(true)
  }

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlan) return

    const trimmedName = editingPlan.name.trim()
    if (!trimmedName) return

    if (plans.some(p => p.id !== editingPlan.id && p.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert('A subscription tier with this name already exists.')
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('subscription_plans')
        .update({
          name: trimmedName,
          price: editingPlan.price,
          projects: editingPlan.projects,
          users: editingPlan.users,
          storage: editingPlan.storage,
          features: editingPlan.features,
          updated_by: user?.id
        })
        .eq('id', editingPlan.id)

      if (error) {
        alert('Failed to update plan: ' + error.message)
        return
      }

      // Log action
      await supabase.from('audit_logs').insert({
        actor_id: user?.id,
        actor_email: user?.email,
        action: 'PLAN_UPDATED',
        entity_type: 'PLAN',
        entity_id: editingPlan.id,
        metadata: { planName: trimmedName, action: 'FULL_UPDATE' }
      })

      setIsEditOpen(false)
      setEditingPlan(null)
      setSuccessMsg(`Package tier "${trimmedName}" updated successfully!`)
      loadData()
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
    // Load global override setting if any exists
    if (typeof window !== 'undefined') {
      const globalFeats = localStorage.getItem('sp_global_features')
      if (globalFeats) {
        try {
          setGlobalFeatures(JSON.parse(globalFeats))
        } catch (e) {
          console.error(e)
        }
      }
    }
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true })

      if (data) {
        setPlans(data as Plan[])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePrice = async (name: string, newPrice: number) => {
    setPlans(prev => prev.map(p => p.name === name ? { ...p, price: newPrice } : p))
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      await supabase
        .from('subscription_plans')
        .update({ 
          price: newPrice,
          updated_by: user?.id
        })
        .eq('name', name)

      // Log action
      await supabase.from('audit_logs').insert({
        actor_id: user?.id,
        actor_email: user?.email,
        action: 'PLAN_UPDATED',
        entity_type: 'PLAN',
        metadata: { planName: name, newPrice }
      })
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateLimit = async (name: string, field: 'projects' | 'users' | 'storage', val: string) => {
    setPlans(prev => prev.map(p => p.name === name ? { ...p, [field]: val } : p))
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      await supabase
        .from('subscription_plans')
        .update({ 
          [field]: val,
          updated_by: user?.id
        })
        .eq('name', name)

      // Log action
      await supabase.from('audit_logs').insert({
        actor_id: user?.id,
        actor_email: user?.email,
        action: 'PLAN_UPDATED',
        entity_type: 'PLAN',
        metadata: { planName: name, field, value: val }
      })
    } catch (e) {
      console.error(e)
    }
  }

  const togglePlanFeature = async (name: string, featureName: string) => {
    let updatedFeatures: any = {}
    const updated = plans.map(p => {
      if (p.name === name) {
        updatedFeatures = {
          ...p.features,
          [featureName]: !p.features[featureName]
        }
        return {
          ...p,
          features: updatedFeatures
        }
      }
      return p
    })
    setPlans(updated)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      await supabase
        .from('subscription_plans')
        .update({ 
          features: updatedFeatures,
          updated_by: user?.id
        })
        .eq('name', name)

      // Log action
      await supabase.from('audit_logs').insert({
        actor_id: user?.id,
        actor_email: user?.email,
        action: 'PLAN_UPDATED',
        entity_type: 'PLAN',
        metadata: { planName: name, featureName, isEnabled: updatedFeatures[featureName] }
      })
    } catch (e) {
      console.error(e)
    }
  }

  const toggleGlobalFeature = (featureName: keyof typeof globalFeatures) => {
    const updated = {
      ...globalFeatures,
      [featureName]: !globalFeatures[featureName]
    }
    setGlobalFeatures(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sp_global_features', JSON.stringify(updated))
    }
  }

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = newPlan.name.trim()
    if (!trimmedName) return

    if (plans.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert('A subscription tier with this name already exists.')
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('subscription_plans')
        .insert({
          name: trimmedName,
          price: newPlan.price,
          projects: newPlan.projects,
          users: newPlan.users,
          storage: newPlan.storage,
          features: newPlan.features,
          created_by: user?.id,
          updated_by: user?.id
        })
        .select()
        .single()

      if (error) {
        alert('Failed to create plan: ' + error.message)
        return
      }

      // Log action
      await supabase.from('audit_logs').insert({
        actor_id: user?.id,
        actor_email: user?.email,
        action: 'PLAN_CREATED',
        entity_type: 'PLAN',
        entity_id: data.id,
        metadata: { planName: trimmedName }
      })

      // Reset Form
      setNewPlan({
        name: '',
        price: 99,
        projects: '10',
        users: '5',
        storage: '10 GB',
        features: {
          Accounting: true,
          Materials: true,
          Expenses: true,
          Reports: false,
          Documents: true,
          AI: false
        }
      })
      setIsAddOpen(false)

      setSuccessMsg(`New package tier "${trimmedName}" created successfully!`)
      loadData()
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeletePlan = async (plan: Plan) => {
    if (confirm(`Are you sure you want to delete the plan tier: ${plan.name}?`)) {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const { error } = await supabase
          .from('subscription_plans')
          .delete()
          .eq('id', plan.id)

        if (error) {
          alert('Delete failed: ' + error.message)
          return
        }

        // Log action
        await supabase.from('audit_logs').insert({
          actor_id: user?.id,
          actor_email: user?.email,
          action: 'PLAN_DELETED',
          entity_type: 'PLAN',
          entity_id: plan.id,
          metadata: { planName: plan.name }
        })

        setSuccessMsg(`Package "${plan.name}" deleted.`)
        loadData()
        setTimeout(() => setSuccessMsg(''), 3000)
      } catch (e) {
        console.error(e)
      }
    }
  }

  const toggleNewPlanFeature = (featureName: string) => {
    setNewPlan({
      ...newPlan,
      features: {
        ...newPlan.features,
        [featureName]: !newPlan.features[featureName as keyof typeof newPlan.features]
      }
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Package Tiers & Permissions
          </h2>
          <p className="text-muted-foreground text-sm">
            Define subscription values, threshold limits, and SaaS package settings in Supabase.
          </p>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          {/* Add New Plan Modal */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={
              <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-5 px-5 font-semibold shadow-lg shadow-indigo-500/20 transition-all duration-300 gap-2 flex-1 sm:flex-none">
                <Plus className="w-4.5 h-4.5" /> Add New Plan
              </Button>
            } />
            <DialogContent className="sm:max-w-[450px] rounded-2xl bg-card border-border/40 max-h-[90vh] overflow-y-auto pr-2">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Create Subscription Plan
                </DialogTitle>
                <CardDescription>Configure pricing thresholds and modules for a new SaaS tier option.</CardDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePlan} className="space-y-4 mt-2">
                <div className="space-y-1">
                  <Label htmlFor="plan-name">Plan Name</Label>
                  <Input 
                    id="plan-name" required placeholder="e.g. Enterprise Plus"
                    className="rounded-xl border-border/40 bg-background/30 h-10 text-sm"
                    value={newPlan.name}
                    onChange={e => setNewPlan({...newPlan, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="plan-price">Base Price (USD / Month)</Label>
                  <Input 
                    id="plan-price" type="number" required placeholder="e.g. 199"
                    className="rounded-xl border-border/40 bg-background/30 h-10 text-sm"
                    value={newPlan.price}
                    onChange={e => setNewPlan({...newPlan, price: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="plan-projects" className="text-xs">Max Projects</Label>
                    <Input 
                      id="plan-projects" required placeholder="e.g. 15 or Unlimited"
                      className="rounded-xl border-border/40 bg-background/30 h-10 text-xs text-center"
                      value={newPlan.projects}
                      onChange={e => setNewPlan({...newPlan, projects: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="plan-users" className="text-xs">Max Users</Label>
                    <Input 
                      id="plan-users" required placeholder="e.g. 5 or Unlimited"
                      className="rounded-xl border-border/40 bg-background/30 h-10 text-xs text-center"
                      value={newPlan.users}
                      onChange={e => setNewPlan({...newPlan, users: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="plan-storage" className="text-xs">Storage Limit</Label>
                    <Input 
                      id="plan-storage" required placeholder="e.g. 50 GB"
                      className="rounded-xl border-border/40 bg-background/30 h-10 text-xs text-center"
                      value={newPlan.storage}
                      onChange={e => setNewPlan({...newPlan, storage: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/20">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Module Permissions</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {Object.keys(newPlan.features).map(feat => {
                      const isAllowed = newPlan.features[feat as keyof typeof newPlan.features]
                      return (
                        <div 
                          key={feat}
                          onClick={() => toggleNewPlanFeature(feat)}
                          className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-medium cursor-pointer transition-all ${
                            isAllowed 
                              ? 'border-indigo-500/30 bg-indigo-500/5 text-indigo-400' 
                              : 'border-border/20 hover:bg-muted/40 text-muted-foreground'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border border-current flex items-center justify-center ${isAllowed ? 'bg-indigo-500 text-white border-transparent' : ''}`}>
                            {isAllowed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span>{feat}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <Button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-5 font-semibold mt-4 transition-all">
                  Initialize Package
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Plan Modal */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-[450px] rounded-2xl bg-card border-border/40 max-h-[90vh] overflow-y-auto pr-2">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Edit Subscription Plan
                </DialogTitle>
                <CardDescription>Modify settings and permissions for this plan tier.</CardDescription>
              </DialogHeader>
              {editingPlan && (
                <form onSubmit={handleUpdatePlan} className="space-y-4 mt-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit-plan-name">Plan Name</Label>
                    <Input 
                      id="edit-plan-name" required placeholder="e.g. Enterprise Plus"
                      className="rounded-xl border-border/40 bg-background/30 h-10 text-sm"
                      value={editingPlan.name}
                      onChange={e => setEditingPlan({...editingPlan, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-plan-price">Base Price (USD / Month)</Label>
                    <Input 
                      id="edit-plan-price" type="number" required placeholder="e.g. 199"
                      className="rounded-xl border-border/40 bg-background/30 h-10 text-sm"
                      value={editingPlan.price}
                      onChange={e => setEditingPlan({...editingPlan, price: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="edit-plan-projects" className="text-xs">Max Projects</Label>
                      <Input 
                        id="edit-plan-projects" required placeholder="e.g. 15 or Unlimited"
                        className="rounded-xl border-border/40 bg-background/30 h-10 text-xs text-center"
                        value={editingPlan.projects}
                        onChange={e => setEditingPlan({...editingPlan, projects: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-plan-users" className="text-xs">Max Users</Label>
                      <Input 
                        id="edit-plan-users" required placeholder="e.g. 5 or Unlimited"
                        className="rounded-xl border-border/40 bg-background/30 h-10 text-xs text-center"
                        value={editingPlan.users}
                        onChange={e => setEditingPlan({...editingPlan, users: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-plan-storage" className="text-xs">Storage Limit</Label>
                      <Input 
                        id="edit-plan-storage" required placeholder="e.g. 50 GB"
                        className="rounded-xl border-border/40 bg-background/30 h-10 text-xs text-center"
                        value={editingPlan.storage}
                        onChange={e => setEditingPlan({...editingPlan, storage: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/20">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Module Permissions</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {Object.keys(editingPlan.features).map(feat => {
                        const isAllowed = editingPlan.features[feat]
                        return (
                          <div 
                            key={feat}
                            onClick={() => {
                              setEditingPlan({
                                ...editingPlan,
                                features: {
                                  ...editingPlan.features,
                                  [feat]: !editingPlan.features[feat]
                                }
                              })
                            }}
                            className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-medium cursor-pointer transition-all ${
                              isAllowed 
                                ? 'border-indigo-500/30 bg-indigo-500/5 text-indigo-400' 
                                : 'border-border/20 hover:bg-muted/40 text-muted-foreground'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full border border-current flex items-center justify-center ${isAllowed ? 'bg-indigo-500 text-white border-transparent' : ''}`}>
                              {isAllowed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span>{feat}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-5 font-semibold mt-4 transition-all">
                    Save Changes
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl p-4 flex gap-2 items-center">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Global overrides panel */}
      <Card className="glass-card border-none rounded-2xl shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-400" />
            <CardTitle className="text-lg font-bold">Global Module Feature Switches</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground/80">
            Enable or disable modules globally across the entire SaaS platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-2">
          {(Object.keys(globalFeatures) as Array<keyof typeof globalFeatures>).map(feat => {
            const isEnabled = globalFeatures[feat]
            return (
              <div 
                key={feat}
                onClick={() => toggleGlobalFeature(feat)}
                className={`flex justify-between items-center p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                  isEnabled 
                    ? 'border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400' 
                    : 'border-border/30 hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                    {feat === 'AI' && <Sparkles className="h-4 w-4 text-pink-500" />}
                    {feat}
                  </h4>
                  <span className="text-[10px] text-muted-foreground">
                    {isEnabled ? 'Globally Active' : 'Globally Disabled'}
                  </span>
                </div>
                {isEnabled ? (
                  <ToggleRight className="h-9 w-9 text-indigo-500" />
                ) : (
                  <ToggleLeft className="h-9 w-9 text-muted-foreground" />
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading subscription configurations...</p>
        </div>
      ) : (
        /* Plan Configurations */
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight font-heading">Subscription Tier Configuration</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {plans.map(plan => (
              <Card key={plan.name} className="glass-card border-none rounded-2xl flex flex-col justify-between hover:shadow-lg transition-all duration-300">
                <CardHeader className="border-b border-border/20 pb-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold font-heading">{plan.name} Tier</CardTitle>
                      <span className="text-xs text-muted-foreground">Package Option</span>
                    </div>
                    <ShieldCheck className="h-6 w-6 text-indigo-400" />
                  </div>
                </CardHeader>
                <CardContent className="py-6 space-y-5">
                  {/* Price configuration */}
                  <div className="space-y-2">
                    <Label htmlFor={`${plan.name}-price`}>Base Price (USD / Month)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-semibold">$</span>
                      <Input 
                        id={`${plan.name}-price`}
                        type="number"
                        className="rounded-xl border-border/40 bg-background/30 backdrop-blur-md focus:border-indigo-500/50 focus:ring-indigo-500/50"
                        value={plan.price}
                        onChange={e => handleUpdatePrice(plan.name, parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Threshold limits */}
                  <div className="grid grid-cols-3 gap-3 text-xs font-semibold">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Projects</Label>
                      <Input 
                        className="rounded-lg border-border/40 h-9 text-center p-1 bg-background/30 backdrop-blur-md focus:border-indigo-500/50 focus:ring-indigo-500/50 text-xs"
                        value={plan.projects}
                        onChange={e => handleUpdateLimit(plan.name, 'projects', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Users</Label>
                      <Input 
                        className="rounded-lg border-border/40 h-9 text-center p-1 bg-background/30 backdrop-blur-md focus:border-indigo-500/50 focus:ring-indigo-500/50 text-xs"
                        value={plan.users}
                        onChange={e => handleUpdateLimit(plan.name, 'users', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Storage</Label>
                      <Input 
                        className="rounded-lg border-border/40 h-9 text-center p-1 bg-background/30 backdrop-blur-md focus:border-indigo-500/50 focus:ring-indigo-500/50 text-xs"
                        value={plan.storage}
                        onChange={e => handleUpdateLimit(plan.name, 'storage', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Feature Toggles inside Plan */}
                  <div className="space-y-2 pt-2 border-t border-border/20">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Module Permissions</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      {Object.keys(plan.features).map(feat => {
                        const isAllowed = plan.features[feat]
                        return (
                          <div 
                            key={feat}
                            onClick={() => togglePlanFeature(plan.name, feat)}
                            className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-medium cursor-pointer transition-all ${
                              isAllowed 
                                ? 'border-indigo-500/30 bg-indigo-500/5 text-indigo-400 hover:bg-indigo-500/10' 
                                : 'border-border/20 hover:bg-muted/40 text-muted-foreground'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full border border-current flex items-center justify-center ${isAllowed ? 'bg-indigo-500 text-white border-transparent' : ''}`}>
                              {isAllowed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span>{feat}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Action buttons (Edit & Delete) */}
                  <div className="pt-4 mt-2 border-t border-border/10 flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleOpenEdit(plan)}
                      className="text-xs text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl px-3 h-8"
                    >
                      Edit Plan
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleDeletePlan(plan)}
                      className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl px-3 h-8"
                    >
                      Delete Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
