'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Calendar, Clock, Globe, ShieldAlert } from 'lucide-react'

export default function BookDemoPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    size: '1-10',
    date: '',
    time: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const constructedMessage = `Requested a live 1-on-1 demo walkthrough.\nScheduled Date: ${formData.date}\nScheduled Time: ${formData.time}\nCompany Size: ${formData.size}`

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          message: constructedMessage
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit demo request.')
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative overflow-hidden bg-background py-20 md:py-32">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[100px] -z-10 dark:bg-indigo-500/5" />
      
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          {/* Left: Heading and Details */}
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              See SitePilot in Action
            </h1>
            <p className="text-muted-foreground text-lg">
              Schedule a personalized 1-on-1 walkthrough with one of our product experts. Discover how we can streamline your construction management.
            </p>
            <div className="space-y-4 pt-4">
              {[
                { icon: Calendar, text: 'Custom 20-minute product tour' },
                { icon: Clock, text: 'Q&A session tailored to your workflows' },
                { icon: Globe, text: 'Reviewing database isolation & engineering permissions' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:bg-indigo-500/5">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Booking Form */}
          <Card className="border border-border/50 bg-card/60 backdrop-blur-sm shadow-xl p-2 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Request a Live Demo</CardTitle>
              <CardDescription>Select a date and time slot for your personalized tour.</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-3 mb-4 flex gap-2 items-center">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {submitted ? (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center text-center py-12 space-y-4"
                >
                  <CheckCircle2 className="h-16 w-16 text-indigo-500" />
                  <h3 className="text-xl font-bold">Demo Requested!</h3>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    We have received your demo request. A calendar invitation has been sent to <strong>{formData.email}</strong>.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      required 
                      placeholder="Jane Smith" 
                      className="rounded-xl h-11 border-border"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Work Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      required 
                      placeholder="jane@builders.com" 
                      className="rounded-xl h-11 border-border"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company">Company Name</Label>
                      <Input 
                        id="company" 
                        required 
                        placeholder="Apex Contractors" 
                        className="rounded-xl h-11 border-border"
                        value={formData.company}
                        onChange={e => setFormData({...formData, company: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="size">Company Size</Label>
                      <select 
                        id="size"
                        className="flex w-full rounded-xl border border-border bg-background px-3 h-11 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={formData.size}
                        onChange={e => setFormData({...formData, size: e.target.value})}
                      >
                        <option value="1-10">1-10 Employees</option>
                        <option value="11-50">11-50 Employees</option>
                        <option value="51-200">51-200 Employees</option>
                        <option value="200+">200+ Employees</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Select Date</Label>
                      <Input 
                        id="date" 
                        type="date" 
                        required
                        className="rounded-xl h-11 border-border"
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Preferred Time</Label>
                      <Input 
                        id="time" 
                        type="time" 
                        required
                        className="rounded-xl h-11 border-border"
                        value={formData.time}
                        onChange={e => setFormData({...formData, time: e.target.value})}
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 text-sm font-semibold shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {loading ? 'Scheduling Walkthrough...' : 'Schedule Walkthrough'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
