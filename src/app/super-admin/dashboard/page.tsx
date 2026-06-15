'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  Building2, 
  Users, 
  Briefcase, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  ShieldCheck, 
  CalendarRange,
  Compass
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState([
    { name: 'Total Companies', value: '0', change: 'Live', type: 'up', icon: Building2, desc: 'Registered tenants' },
    { name: 'Active Subscriptions', value: '0', change: 'Live', type: 'up', icon: ShieldCheck, desc: 'Paid plans' },
    { name: 'Monthly Revenue', value: '$0', change: 'Live', type: 'up', icon: DollarSign, desc: 'MRR sum' },
    { name: 'Active Projects', value: '0', change: 'Live', type: 'up', icon: Briefcase, desc: 'Under construction' }
  ])
  const [recentCompanies, setRecentCompanies] = useState<any[]>([])
  const [systemLogs, setSystemLogs] = useState<any[]>([])

  useEffect(() => {
    loadDashboardMetrics()
  }, [])

  const loadDashboardMetrics = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // 1. Fetch Plans
      const { data: plans } = await supabase.from('subscription_plans').select('*')
      const planMap = new Map(plans?.map(p => [p.id, p]) || [])

      // 2. Fetch Companies
      const { data: companies } = await supabase.from('companies').select('*')
      const totalCompaniesCount = companies?.length || 0
      const activeCompanies = companies?.filter(c => c.status === 'Active') || []
      const activeCount = activeCompanies.length

      // Calculate MRR
      const mrr = companies?.reduce((sum, c) => {
        const plan = planMap.get(c.subscription_plan_id)
        return sum + (plan ? Number(plan.price) : 0)
      }, 0) || 0

      // 3. Fetch Projects
      const { count: projectsCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })

      // 4. Fetch Owner Profiles to link with Recent Companies
      const { data: owners } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'CONTRACTOR_OWNER')

      // Set Stats
      setStats([
        { name: 'Total Companies', value: totalCompaniesCount.toString(), change: 'Live', type: 'up', icon: Building2, desc: 'Registered tenants' },
        { name: 'Active Subscriptions', value: activeCount.toString(), change: 'Live', type: 'up', icon: ShieldCheck, desc: 'Paid plans' },
        { name: 'Monthly Revenue', value: `$${mrr.toLocaleString()}`, change: 'Live', type: 'up', icon: DollarSign, desc: 'MRR sum' },
        { name: 'Active Projects', value: (projectsCount || 0).toString(), change: 'Live', type: 'up', icon: Briefcase, desc: 'Under construction' }
      ])

      // Map recent companies
      const sortedCompanies = [...(companies || [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4)

      const mappedRecent = sortedCompanies.map(c => {
        const owner = owners?.find(o => o.company_id === c.id)
        const plan = planMap.get(c.subscription_plan_id)
        return {
          name: c.name,
          owner: owner?.full_name || 'No Owner',
          plan: plan ? (plan as any).name : 'Custom',
          status: c.status,
          date: new Date(c.created_at).toLocaleDateString()
        }
      })
      setRecentCompanies(mappedRecent)

      // 5. Fetch Audit Logs
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(4)

      const mappedLogs = logs?.map(l => {
        const diffMs = Date.now() - new Date(l.timestamp).getTime()
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
        let timeStr = `${diffHrs} hours ago`
        if (diffHrs === 0) {
          const diffMins = Math.floor(diffMs / (1000 * 60))
          timeStr = diffMins === 0 ? 'Just now' : `${diffMins} mins ago`
        } else if (diffHrs >= 24) {
          timeStr = `${Math.floor(diffHrs / 24)} days ago`
        }

        return {
          title: l.title || l.action.replace('_', ' '),
          desc: l.description || `Performed action: ${l.action} on ${l.entity_type}`,
          time: timeStr
        }
      }) || []
      setSystemLogs(mappedLogs)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Banner with gradient */}
      <div className="rounded-2xl p-6 md:p-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white relative overflow-hidden shadow-xl shadow-indigo-500/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -z-10" />
        <div className="space-y-2 relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold font-heading">Welcome Back, Platform Super Admin</h2>
          <p className="text-white/80 max-w-xl text-sm leading-relaxed">
            Monitor infrastructure usage, analyze recurring revenue pipelines, approve extensions, and override feature options.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-2">
          <Compass className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Computing dashboard aggregates...</p>
        </div>
      ) : (
        <>
          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <Card key={idx} className="glass-card border-none hover:scale-[1.02] hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <span className="text-sm font-semibold text-muted-foreground">{stat.name}</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:bg-indigo-500/5">
                    <stat.icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-extrabold tracking-tight text-foreground">{stat.value}</div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="flex items-center text-xs font-semibold text-emerald-400">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      {stat.change}
                    </span>
                    <span className="text-xs text-muted-foreground">{stat.desc}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Visual Revenue Performance Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 glass-card border-none">
              <CardHeader className="flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-bold">Monthly Recurring Revenue Pipeline</CardTitle>
                  <CardDescription>Visual stats for the past 6 months of active subscription billings</CardDescription>
                </div>
                <TrendingUp className="h-5 w-5 text-indigo-500" />
              </CardHeader>
              <CardContent className="h-72 flex flex-col justify-end pt-6">
                <div className="flex-grow flex items-end gap-4 h-full pb-4 px-2">
                  {[
                    { label: 'Jan', val: 14200, height: '40%' },
                    { label: 'Feb', val: 16800, height: '50%' },
                    { label: 'Mar', val: 18500, height: '62%' },
                    { label: 'Apr', val: 21000, height: '75%' },
                    { label: 'May', val: 22800, height: '82%' },
                    { label: 'Jun', val: 24580, height: '95%' }
                  ].map((bar, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      <div className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 text-white dark:bg-indigo-400 dark:text-black px-1.5 py-0.5 rounded shadow">
                        ${bar.val.toLocaleString()}
                      </div>
                      <div 
                        className="w-full bg-gradient-to-t from-indigo-500 via-indigo-600 to-purple-500 rounded-t-xl group-hover:from-indigo-400 group-hover:to-pink-500 transition-all duration-300"
                        style={{ height: bar.height }}
                      />
                      <span className="text-xs text-muted-foreground font-semibold">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Feature Activations */}
            <Card className="glass-card border-none">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Most Used Feature Modules</CardTitle>
                <CardDescription>Percentage activation across registered tenants</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {[
                  { name: 'Project Management', percent: '98%', width: 'w-[98%]', color: 'bg-indigo-500' },
                  { name: 'Expense Auditing', percent: '92%', width: 'w-[92%]', color: 'bg-purple-500' },
                  { name: 'Material Ledgers', percent: '86%', width: 'w-[86%]', color: 'bg-pink-500' },
                  { name: 'Accounting Module', percent: '74%', width: 'w-[74%]', color: 'bg-cyan-500' },
                  { name: 'PDF/Excel Reports', percent: '68%', width: 'w-[68%]', color: 'bg-emerald-500' }
                ].map((module, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>{module.name}</span>
                      <span className="text-muted-foreground">{module.percent}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${module.color} ${module.width} transition-all`} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Grid for list tables & logs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Companies */}
            <Card className="glass-card border-none">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Recent Registrations</CardTitle>
                <CardDescription>New companies setting up workspaces</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-border/20 text-xs font-semibold text-muted-foreground">
                        <th className="px-6 py-3">Company</th>
                        <th className="px-6 py-3">Owner</th>
                        <th className="px-6 py-3">Plan</th>
                        <th className="px-6 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20 text-sm">
                      {recentCompanies.map((c, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 font-semibold text-foreground">{c.name}</td>
                          <td className="px-6 py-4 text-muted-foreground">{c.owner}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400">
                              {c.plan}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400">
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Audit Logs */}
            <Card className="glass-card border-none">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Platform Activity Logs</CardTitle>
                <CardDescription>Real-time audit trailing across SaaS resources</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {systemLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No platform activity logged yet.</p>
                ) : (
                  systemLogs.map((log, i) => (
                    <div key={i} className="flex justify-between items-start gap-4 p-3 hover:bg-muted/40 rounded-xl transition-all border border-transparent hover:border-border/30">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-foreground">{log.title}</h4>
                        <p className="text-xs text-muted-foreground">{log.desc}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-medium">{log.time}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
