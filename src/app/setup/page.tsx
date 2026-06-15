'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert, Compass, CheckCircle2, ShieldCheck } from 'lucide-react'

export default function SetupPage() {
  const router = useRouter()
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    checkSetupStatus()
  }, [])

  const checkSetupStatus = async () => {
    try {
      const res = await fetch('/api/setup')
      const data = await res.json()
      setSetupRequired(data.setupRequired)
    } catch (e) {
      console.error(e)
      setSetupRequired(false)
    } finally {
      setChecking(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

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

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to complete setup.')
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Compass className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Verifying platform configurations...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-[480px]">
        {/* Branding Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Compass className="h-8 w-8 text-indigo-500" />
          <span className="font-bold text-2xl bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            SitePilot
          </span>
        </div>

        {setupRequired === false ? (
          <Card className="glass-card shadow-xl border-none p-4 rounded-2xl neon-glow-pink">
            <CardHeader className="text-center">
              <ShieldAlert className="h-12 w-12 text-pink-500 mx-auto mb-2" />
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-pink-400 to-red-400 bg-clip-text text-transparent">Setup Wizard Locked</CardTitle>
              <CardDescription className="text-muted-foreground/80 mt-2">
                A Super Admin account is already registered on this database. Setup cannot be re-executed.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pt-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                To prevent security vulnerabilities, addition of extra Super Admin accounts is permanently disabled.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-border/20 pt-6">
              <Link href="/login">
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl px-6 py-5 font-semibold transition-all">
                  Go to Login
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ) : success ? (
          <Card className="glass-card shadow-xl border-none p-4 rounded-2xl neon-glow-indigo">
            <CardContent className="flex flex-col items-center text-center py-10 space-y-4">
              <div className="p-3 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                <CheckCircle2 className="h-12 w-12 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Super Admin Registered!
              </h3>
              <p className="text-sm text-muted-foreground/90 max-w-sm leading-relaxed">
                The setup database migrations have finished and your primary administrator account has been provisioned.
              </p>
              <Link href="/login" className="w-full mt-4">
                <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-6 font-semibold shadow-lg">
                  Go to Sign In
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card shadow-xl border-none p-2 rounded-2xl neon-glow-indigo">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Platform Setup Wizard
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground/80">
                Create the primary Super Admin account to initialize the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-3 mb-4 flex gap-2 items-center">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName" 
                    required 
                    placeholder="E.g., Charles Babbage"
                    className="rounded-xl h-11 border-border/40 bg-background/30 focus:ring-indigo-500/50"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    required 
                    placeholder="admin@sitepilot.co"
                    className="rounded-xl h-11 border-border/40 bg-background/30 focus:ring-indigo-500/50"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Login Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    required 
                    placeholder="••••••••"
                    className="rounded-xl h-11 border-border/40 bg-background/30 focus:ring-indigo-500/50"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    required 
                    placeholder="••••••••"
                    className="rounded-xl h-11 border-border/40 bg-background/30 focus:ring-indigo-500/50"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-6 text-sm font-semibold shadow-lg shadow-indigo-500/20 mt-4 transition-all duration-300 hover:shadow-indigo-500/30"
                >
                  {loading ? 'Initializing platform...' : 'Complete Platform Setup'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
