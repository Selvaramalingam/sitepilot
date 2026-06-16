'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Mail, 
  Search, 
  Trash2, 
  Clock, 
  Building2, 
  User, 
  Phone, 
  Compass,
  ArrowUpDown,
  FileText
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SuperAdminInbox() {
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<any[]>([])
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: sortOrder === 'asc' })

      if (error) throw error
      setMessages(data || [])
    } catch (e) {
      console.error('Failed to load contact messages:', e)
    } finally {
      setLoading(false)
    }
  }

  // Reload messages when sort order changes
  useEffect(() => {
    loadMessages()
  }, [sortOrder])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this contact message?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id)

      if (error) throw error
      setMessages(prev => prev.filter(m => m.id !== id))
      if (selectedMessage?.id === id) {
        setSelectedMessage(null)
      }
    } catch (e) {
      console.error('Failed to delete message:', e)
    }
  }

  // Filter messages based on search query
  const filteredMessages = messages.filter(msg => {
    const q = searchQuery.toLowerCase()
    return (
      msg.name.toLowerCase().includes(q) ||
      msg.email.toLowerCase().includes(q) ||
      (msg.company && msg.company.toLowerCase().includes(q)) ||
      msg.message.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Landing Page Submissions
          </h1>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Review contact form requests, client trial inquiries, and sales leads.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Messages List Column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/60" />
              <Input
                placeholder="Search inbox..."
                className="pl-9 h-11 rounded-xl bg-background/30 border-border/40 focus:ring-indigo-500/50"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl border-border/40 hover:bg-muted/40"
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              title="Toggle sort order"
            >
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>

          <Card className="glass-card border-none rounded-2xl overflow-hidden max-h-[600px] overflow-y-auto">
            <CardContent className="p-0 divide-y divide-border/10">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-2">
                  <Compass className="w-6 h-6 text-indigo-500 animate-spin" />
                  <span className="text-xs text-muted-foreground">Syncing inbox...</span>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <Mail className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground/80 font-medium">No messages found.</p>
                </div>
              ) : (
                filteredMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`p-4 cursor-pointer hover:bg-muted/30 transition-all text-left ${
                      selectedMessage?.id === msg.id ? 'bg-indigo-500/5 border-l-4 border-indigo-500' : ''
                    }`}
                    onClick={() => setSelectedMessage(msg)}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h4 className="font-semibold text-sm text-foreground truncate max-w-[150px]">
                        {msg.name}
                      </h4>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        {new Date(msg.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {msg.company && (
                      <p className="text-xs text-indigo-400 font-medium truncate mb-1">
                        {msg.company}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {msg.message}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Message Viewer Column */}
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <Card className="glass-card border-none rounded-2xl overflow-hidden neon-glow-indigo">
              <CardHeader className="border-b border-border/10 bg-muted/20 pb-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold">{selectedMessage.name}</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        <a href={`mailto:${selectedMessage.email}`} className="hover:underline text-indigo-400">
                          {selectedMessage.email}
                        </a>
                      </span>
                      {selectedMessage.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          <a href={`tel:${selectedMessage.phone}`} className="hover:underline">
                            {selectedMessage.phone}
                          </a>
                        </span>
                      )}
                      {selectedMessage.company && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Building2 className="w-3.5 h-3.5" />
                          {selectedMessage.company}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                    onClick={(e) => handleDelete(selectedMessage.id, e)}
                    title="Delete Message"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                    <FileText className="w-3.5 h-3.5" />
                    <span>INQUIRY MESSAGE</span>
                  </div>
                  <div className="p-4 rounded-xl bg-background/40 border border-border/30 text-sm leading-relaxed whitespace-pre-wrap text-foreground max-h-[400px] overflow-y-auto">
                    {selectedMessage.message}
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-border/15 pt-4">
                  <a href={`mailto:${selectedMessage.email}?subject=Re: SitePilot Inquiry`}>
                    <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl px-5 font-semibold text-xs py-5">
                      Reply via Email
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-card border-none rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
              <Mail className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-bold text-lg text-foreground">No Message Selected</h3>
              <p className="text-sm text-muted-foreground/80 max-w-sm mt-1 leading-relaxed">
                Choose a landing page submission from the inbox sidebar to view contact details and responder messages.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
