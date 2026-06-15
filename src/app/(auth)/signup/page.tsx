'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [availablePlans, setAvailablePlans] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    companyName: '',
    ownerName: '',
    email: '',
    password: '',
    planId: ''
  })

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('subscription_plans').select('*').order('price', { ascending: true })
      if (data && data.length > 0) {
        setAvailablePlans(data)
        setFormData(prev => ({ ...prev, planId: data[0].id }))
      }
    } catch (e) {
      console.error('Failed to load plans:', e)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const cleanEmail = formData.email.toLowerCase().trim()
    const supabase = createClient()

    try {
      // 1. Verify email uniqueness
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle()

      if (existingUser) {
        setError('An account with this email already exists.')
        setLoading(false)
        return
      }

      // 2. Create the company first (Public inserts are allowed to support signup workspace provision)
      const expiry = new Date()
      expiry.setDate(expiry.getDate() + 14) // 14-day trial
      const expiryStr = expiry.toISOString().split('T')[0]

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: formData.companyName,
          owner_email: cleanEmail,
          subscription_plan_id: formData.planId,
          status: 'Trial',
          expiry_date: expiryStr
        })
        .select()
        .single()

      if (companyError || !company) {
        setError(companyError?.message || 'Failed to initialize company workspace.')
        setLoading(false)
        return
      }

      // 3. Register Owner User in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: formData.password,
        options: {
          data: {
            role: 'CONTRACTOR_OWNER',
            first_name: formData.ownerName,
            company_id: company.id
          }
        }
      })

      if (authError || !authData.user) {
        // Rollback Company insert to maintain consistency
        await supabase.from('companies').delete().eq('id', company.id)
        setError(authError?.message || 'Authentication setup failed.')
        setLoading(false)
        return
      }

      // Log setup audit log (requires authenticated user context, but since signUp auto-authenticates, it's allowed)
      await supabase.from('audit_logs').insert({
        actor_id: authData.user.id,
        actor_email: cleanEmail,
        action: 'TENANT_SIGNUP',
        entity_type: 'COMPANY',
        entity_id: company.id,
        metadata: { companyName: formData.companyName }
      })

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="glass-card shadow-xl p-2 rounded-2xl border-none neon-glow-indigo">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Create Trial Workspace
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground/80">
          Set up your contractor profile to start your 14-day trial.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-3 mb-4 flex gap-2 items-center">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {submitted ? (
          <div className="flex flex-col items-center text-center py-10 space-y-4">
            <div className="p-3 bg-indigo-500/10 rounded-full border border-indigo-500/20">
              <CheckCircle2 className="h-12 w-12 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Workspace Initialized!
            </h3>
            <p className="text-sm text-muted-foreground/90 max-w-sm leading-relaxed">
              We have set up your <strong>{formData.companyName}</strong> workspace. You can now use your credentials to sign in.
            </p>
            <Link href="/login" className="w-full mt-4">
              <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-6 font-semibold shadow-lg shadow-indigo-500/20">
                Go to Login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input 
                id="companyName" 
                required 
                placeholder="Apex Contractors Ltd." 
                className="rounded-xl h-11 border-border/40 bg-background/30 backdrop-blur-md focus:border-indigo-500/50 focus:ring-indigo-500/50"
                value={formData.companyName}
                onChange={e => setFormData({...formData, companyName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerName">Owner Full Name</Label>
              <Input 
                id="ownerName" 
                required 
                placeholder="Jane Smith" 
                className="rounded-xl h-11 border-border/40 bg-background/30 backdrop-blur-md focus:border-indigo-500/50 focus:ring-indigo-500/50"
                value={formData.ownerName}
                onChange={e => setFormData({...formData, ownerName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work Email</Label>
              <Input 
                id="email" 
                type="email" 
                required 
                placeholder="jane@apex.com" 
                className="rounded-xl h-11 border-border/40 bg-background/30 backdrop-blur-md focus:border-indigo-500/50 focus:ring-indigo-500/50"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                placeholder="••••••••"
                className="rounded-xl h-11 border-border/40 bg-background/30 backdrop-blur-md focus:border-indigo-500/50 focus:ring-indigo-500/50"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">Select Trial Plan</Label>
              <select
                id="plan"
                className="flex w-full rounded-xl border border-border/40 bg-background/30 backdrop-blur-md px-3 h-11 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                value={formData.planId}
                onChange={e => setFormData({...formData, planId: e.target.value})}
              >
                {availablePlans.map(plan => (
                  <option key={plan.id} value={plan.id} className="bg-card">
                    {plan.name} Plan ({plan.projects} Projects, {plan.users} Users)
                  </option>
                ))}
              </select>
            </div>
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-6 text-sm font-semibold shadow-lg shadow-indigo-500/20 mt-6 transition-all duration-300 hover:shadow-indigo-500/30"
            >
              {loading ? 'Creating workspace...' : 'Initialize Trial'}
            </Button>
          </form>
        )}
      </CardContent>
      {!submitted && (
        <CardFooter className="flex justify-center border-t border-border/20 pt-6">
          <p className="text-sm text-muted-foreground">
            Already have a workspace?{' '}
            <Link href="/login" className="text-indigo-400 hover:underline font-semibold transition-colors">Sign in</Link>
          </p>
        </CardFooter>
      )}
    </Card>
  )
}
