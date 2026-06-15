'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser, UserProfile } from '@/lib/auth-helpers'
import { ShieldAlert, CheckCircle2, User, Key, Mail, Edit3, Compass } from 'lucide-react'

interface ProfilePageClientProps {
  role: 'SUPER_ADMIN' | 'CONTRACTOR_OWNER' | 'SITE_ENGINEER'
}

export function ProfilePageClient({ role }: ProfilePageClientProps) {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setFetching(true)
    const profile = await getCurrentUser()
    if (profile) {
      setCurrentUser(profile)
      setFullName(profile.full_name)
      setEmail(profile.email)
    } else {
      router.push('/login')
    }
    setFetching(false)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!currentUser) return

    const cleanEmail = email.toLowerCase().trim()
    const supabase = createClient()

    // Password validation if they try to update it
    const isUpdatingPassword = password.trim() !== ''
    if (isUpdatingPassword) {
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        setLoading(false)
        return
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters long.')
        setLoading(false)
        return
      }
    }

    try {
      // 1. Verify email uniqueness if changed
      if (cleanEmail !== currentUser.email.toLowerCase()) {
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('email', cleanEmail)
          .maybeSingle()

        if (existing) {
          setError('This email address is already in use by another user.')
          setLoading(false)
          return
        }
      }

      // 2. Update Auth email/password if necessary
      const authUpdates: any = {}
      if (cleanEmail !== currentUser.email.toLowerCase()) {
        authUpdates.email = cleanEmail
      }
      if (isUpdatingPassword) {
        authUpdates.password = password
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdates)
        if (authError) {
          setError('Authentication update failed: ' + authError.message)
          setLoading(false)
          return
        }
      }

      // 3. Update public user profile
      const { error: profileError } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          email: cleanEmail
        })
        .eq('id', currentUser.id)

      if (profileError) {
        setError('Profile update failed: ' + profileError.message)
        setLoading(false)
        return
      }

      // Log action to audit
      await supabase.from('audit_logs').insert({
        actor_id: currentUser.id,
        actor_email: currentUser.email,
        action: 'PROFILE_UPDATED',
        entity_type: 'USER',
        entity_id: currentUser.id,
        metadata: { fieldUpdated: 'profile_settings', emailChanged: cleanEmail !== currentUser.email }
      })

      setSuccess('Profile updated successfully!')
      setPassword('')
      setConfirmPassword('')
      fetchProfile()
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const roleNameMap = {
    SUPER_ADMIN: 'Super Admin',
    CONTRACTOR_OWNER: 'Contractor Owner',
    SITE_ENGINEER: 'Site Engineer'
  }

  if (fetching) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-2">
        <Compass className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">Fetching profile...</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Profile Overview Card */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="glass-card border-none neon-glow-indigo rounded-2xl overflow-hidden">
          <div className="h-28 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative">
            <div className="absolute -bottom-10 left-6">
              <div className="w-20 h-20 rounded-2xl bg-card border-4 border-background flex items-center justify-center font-bold text-2xl text-indigo-500 shadow-xl">
                {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
          </div>
          <CardContent className="pt-14 pb-6 px-6">
            <h3 className="text-xl font-bold text-foreground">{fullName || 'User Profile'}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{currentUser?.email}</p>
            
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <User className="w-3.5 h-3.5" />
                {roleNameMap[role]}
              </span>
              {currentUser?.company_id && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ID: {currentUser.company_id}
                </span>
              )}
            </div>
            
            <div className="border-t border-border/20 mt-6 pt-6 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Status</span>
                <span className="font-semibold text-emerald-400">Active</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Session Tier</span>
                <span className="font-semibold text-indigo-400">Supabase Authenticated</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Form */}
      <div className="lg:col-span-2">
        <Card className="glass-card border-none rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-400" />
              Account Settings
            </CardTitle>
            <CardDescription>
              Update your personal details, email address, and account password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-3 mb-6 flex gap-2 items-center">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl p-3 mb-6 flex gap-2 items-center">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground">
                      <User className="h-4 w-4" />
                    </span>
                    <Input 
                      id="fullName" 
                      required 
                      className="pl-10 rounded-xl h-11 border-border/40 bg-background/30 backdrop-blur-md focus:border-indigo-500/50 focus:ring-indigo-500/50"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </span>
                    <Input 
                      id="email" 
                      type="email"
                      required 
                      className="pl-10 rounded-xl h-11 border-border/40 bg-background/30 backdrop-blur-md focus:border-indigo-500/50 focus:ring-indigo-500/50"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/20 my-6 pt-6">
                <h4 className="text-sm font-semibold mb-4 text-foreground flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-indigo-400" />
                  Security credentials
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password (Leave blank to keep current)</Label>
                    <Input 
                      id="password" 
                      type="password"
                      placeholder="••••••••"
                      className="rounded-xl h-11 border-border/40 bg-background/30 backdrop-blur-md focus:border-indigo-500/50 focus:ring-indigo-500/50"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password"
                      placeholder="••••••••"
                      className="rounded-xl h-11 border-border/40 bg-background/30 backdrop-blur-md focus:border-indigo-500/50 focus:ring-indigo-500/50"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/10">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-5 px-6 text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all duration-300"
                >
                  {loading ? 'Saving Changes...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
