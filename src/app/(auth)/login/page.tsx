'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const cleanEmail = email.toLowerCase().trim()
    const supabase = createClient()

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      })

      if (authError || !authData.user) {
        setError(authError?.message || 'Login failed. Please verify your credentials.')
        setLoading(false)
        return
      }

      // Fetch user profile from public.users to get their role
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profile) {
        setError('No profile associated with this account. Please contact support.')
        setLoading(false)
        // Log out user since they don't have a profile
        await supabase.auth.signOut()
        return
      }

      // Block access if company is suspended
      if (profile.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('status')
          .eq('id', profile.company_id)
          .single()
          
        if (company && company.status === 'Suspended') {
          setError('Your company account has been suspended. Please contact support.')
          setLoading(false)
          await supabase.auth.signOut()
          return
        }
      }

      // Redirect based on role
      if (profile.role === 'SUPER_ADMIN') {
        router.push('/super-admin/dashboard')
      } else if (profile.role === 'CONTRACTOR_OWNER') {
        router.push('/contractor/dashboard')
      } else if (profile.role === 'SITE_ENGINEER') {
        router.push('/site-engineer/dashboard')
      } else {
        setError('Unknown account role.')
        await supabase.auth.signOut()
      }
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
          Welcome Back
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground/80">
          Enter your credentials to access your portal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-3 mb-4 flex gap-2 items-center">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="name@company.com" 
              required
              className="rounded-xl h-11 border-border/40 bg-background/30 backdrop-blur-md focus:border-indigo-500/50 focus:ring-indigo-500/50"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input 
              id="password" 
              type="password" 
              required
              placeholder="••••••••"
              className="rounded-xl h-11 border-border/40 bg-background/30 backdrop-blur-md focus:border-indigo-500/50 focus:ring-indigo-500/50"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-6 text-sm font-semibold shadow-lg shadow-indigo-500/20 mt-4 transition-all duration-300 hover:shadow-indigo-500/30"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t border-border/20 pt-6">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-indigo-400 hover:underline font-semibold transition-colors">Sign up</Link>
        </p>
      </CardFooter>
    </Card>
  )
}
