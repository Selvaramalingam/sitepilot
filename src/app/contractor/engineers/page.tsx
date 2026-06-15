'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser, UserProfile } from '@/lib/auth-helpers'
import { ShieldAlert, Plus, Trash2, User, Mail, Search, ShieldCheck } from 'lucide-react'

export default function EngineersPage() {
  const router = useRouter()
  const [contractor, setContractor] = useState<UserProfile | null>(null)
  const [engineers, setEngineers] = useState<UserProfile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingList, setLoadingList] = useState(true)

  // Form fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchSession()
  }, [])

  const fetchSession = async () => {
    const profile = await getCurrentUser()
    if (profile && profile.role === 'CONTRACTOR_OWNER') {
      setContractor(profile)
      loadEngineers(profile.company_id)
    } else {
      router.push('/login')
    }
  }

  const loadEngineers = async (companyId?: string) => {
    if (!companyId) return
    setLoadingList(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', companyId)
        .eq('role', 'SITE_ENGINEER')
        .order('full_name', { ascending: true })

      if (data) {
        setEngineers(data as UserProfile[])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingList(false)
    }
  }

  const handleCreateEngineer = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!contractor || !contractor.company_id) {
      setError('Invalid owner session.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/engineers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password
        })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create site engineer.')
        setLoading(false)
        return
      }

      setFullName('')
      setEmail('')
      setPassword('')
      
      setSuccess('Site Engineer registered successfully!')
      loadEngineers(contractor.company_id)
    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEngineer = async (engineer: UserProfile) => {
    if (confirm(`Are you sure you want to delete engineer: ${engineer.full_name}?`)) {
      try {
        const res = await fetch(`/api/engineers?id=${engineer.id}`, {
          method: 'DELETE'
        })
        if (res.ok) {
          if (contractor) {
            loadEngineers(contractor.company_id)
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  const filteredEngineers = engineers.filter(eng => 
    eng.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eng.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Manage Site Engineers
          </h2>
          <p className="text-muted-foreground text-sm">
            Deploy site engineers to field projects and configure login access credentials.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Add Engineer Form */}
        <div className="lg:col-span-1">
          <Card className="glass-card border-none rounded-2xl shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                Register Engineer
              </CardTitle>
              <CardDescription>
                Create new credentials for a site engineer under your company.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-3 mb-4 flex gap-2 items-center">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl p-3 mb-4 flex gap-2 items-center">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleCreateEngineer} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName" 
                    required 
                    placeholder="E.g., Alan Turing"
                    className="rounded-xl h-11 border-border/40 bg-background/30 backdrop-blur-md focus:border-indigo-500/50 focus:ring-indigo-500/50"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email"
                    required 
                    placeholder="alan@company.com"
                    className="rounded-xl h-11 border-border/40 bg-background/30 backdrop-blur-md focus:border-indigo-500/50 focus:ring-indigo-500/50"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Login Password</Label>
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
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-5 text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all duration-300"
                >
                  {loading ? 'Registering...' : 'Register Engineer'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right column: List of Engineers */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground pointer-events-none">
              <Search className="h-4.5 w-4.5" />
            </span>
            <Input 
              type="text" 
              placeholder="Search engineers by name or email..."
              className="pl-10 h-12 rounded-xl border-border/40 bg-card/40 backdrop-blur-md shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <Card className="glass-card border-none rounded-2xl">
            <CardContent className="p-6">
              {loadingList ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-2">
                  <div className="w-6 h-6 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                  <p className="text-xs text-muted-foreground">Fetching engineers...</p>
                </div>
              ) : filteredEngineers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                  <div className="p-4 bg-muted/50 rounded-full">
                    <User className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">No Engineers Found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {searchQuery ? 'No match found for your search query.' : 'Add your first site engineer using the form on the left.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/20">
                  {filteredEngineers.map((eng) => (
                    <div key={eng.email} className="flex justify-between items-center py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                          {eng.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">{eng.full_name}</h4>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 inline" />
                            {eng.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteEngineer(eng)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
