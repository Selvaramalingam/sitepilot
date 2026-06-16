'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Mail, Phone, MapPin, ShieldAlert } from 'lucide-react'

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message.')
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start max-w-5xl mx-auto">
          {/* Left Side: Contact Info */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                Let&apos;s Build Something Great Together
              </h1>
              <p className="text-muted-foreground text-lg">
                Have questions about SitePilot? Reach out to our engineering and product team.
              </p>
            </div>

            <div className="space-y-6">
              {[
                { icon: Mail, label: 'Email Support', val: 'support@sitepilot.co' },
                { icon: Phone, label: 'Phone Line', val: '+1 (555) 019-2834' },
                { icon: MapPin, label: 'Office Address', val: '100 Construction Way, Suite 400, San Francisco, CA' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0 dark:bg-indigo-500/5">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</h3>
                    <p className="text-sm font-medium text-foreground">{item.val}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Form */}
          <Card className="border border-border/50 bg-card/60 backdrop-blur-sm shadow-xl p-2 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Contact Our Sales & Support</CardTitle>
              <CardDescription>Fill out the form below and we will get back to you within 24 hours.</CardDescription>
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
                  <h3 className="text-xl font-bold">Message Sent!</h3>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    Thank you for reaching out. A representative will contact you shortly at <strong>{formData.email}</strong>.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Your Name</Label>
                      <Input 
                        id="name" 
                        required 
                        placeholder="John Doe" 
                        className="rounded-xl h-11 border-border"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        required 
                        placeholder="john@example.com" 
                        className="rounded-xl h-11 border-border"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input 
                        id="phone" 
                        placeholder="+1 (555) 123-4567" 
                        className="rounded-xl h-11 border-border"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company Name</Label>
                      <Input 
                        id="company" 
                        placeholder="Acme Builders" 
                        className="rounded-xl h-11 border-border"
                        value={formData.company}
                        onChange={e => setFormData({...formData, company: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Your Message</Label>
                    <textarea 
                      id="message" 
                      required 
                      rows={4}
                      placeholder="How can we help you?"
                      className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.message}
                      onChange={e => setFormData({...formData, message: e.target.value})}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 text-sm font-semibold shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {loading ? 'Sending Message...' : 'Send Message'}
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
