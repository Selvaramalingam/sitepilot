'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Briefcase, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  DollarSign, 
  Users, 
  CheckCircle,
  Truck,
  Plus
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser, UserProfile } from '@/lib/auth-helpers'

export default function ContractorDashboard() {
  const router = useRouter()
  const [contractor, setContractor] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Live aggregated stats
  const [kpis, setKpis] = useState<any[]>([])
  const [projectCosts, setProjectCosts] = useState<any[]>([])
  const [monthlyChart, setMonthlyChart] = useState<any[]>([])
  const [targetMetPct, setTargetMetPct] = useState('0.0%')
  const [netProfitText, setNetProfitText] = useState('$0')
  const [grossYieldText, setGrossYieldText] = useState('0.0%')

  useEffect(() => {
    fetchSession()
  }, [])

  const fetchSession = async () => {
    const profile = await getCurrentUser()
    if (profile && profile.role === 'CONTRACTOR_OWNER') {
      setContractor(profile)
      loadDashboardData(profile.company_id!)
    } else if (profile && profile.role === 'SUPER_ADMIN') {
      const urlParams = new URLSearchParams(window.location.search)
      const companyId = urlParams.get('companyId')
      if (companyId) {
        setContractor(profile)
        loadDashboardData(companyId)
      } else {
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }

  const loadDashboardData = async (companyId: string) => {
    setLoading(true)
    try {
      const supabase = createClient()

      // 1. Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', companyId)

      // 2. Fetch expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*, project:projects!inner(*)')
        .eq('projects.company_id', companyId)

      // 3. Fetch materials
      const { data: materialsData } = await supabase
        .from('materials')
        .select('*, project:projects!inner(*)')
        .eq('projects.company_id', companyId)

      // 4. Fetch client payments
      const { data: clientPaymentsData } = await supabase
        .from('client_payments')
        .select('*, project:projects!inner(*)')
        .eq('projects.company_id', companyId)

      // 5. Fetch supplier payments
      const { data: supplierPaymentsData } = await supabase
        .from('supplier_payments')
        .select('*, project:projects!inner(*)')
        .eq('projects.company_id', companyId)

      const dbProjects = projectsData || []
      const dbExpenses = expensesData || []
      const dbMaterials = materialsData || []
      const dbClientPayments = clientPaymentsData || []
      const dbSupplierPayments = supplierPaymentsData || []

      // --- CALCULATIONS ---
      const activeProjectsCount = dbProjects.filter(p => p.status !== 'Archived').length

      const totalExpensesSum = dbExpenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0)
      const totalMaterialsSum = dbMaterials.reduce((acc, m) => acc + (parseFloat(m.cost) || 0), 0)
      const totalSupplierPayouts = dbSupplierPayments.reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0)
      const totalClientPayments = dbClientPayments.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0)

      const outstandingSupplierDues = Math.max(totalMaterialsSum - totalSupplierPayouts, 0)
      const moneyIn = totalClientPayments
      const moneyOut = totalExpensesSum + totalSupplierPayouts
      const accruedProjectCost = totalExpensesSum + totalMaterialsSum

      // Set KPIs
      setKpis([
        { name: 'Total Money In', value: `$${moneyIn.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: `Client Payments`, type: 'up', icon: ArrowUpRight, desc: 'Total Received' },
        { name: 'Total Money Out', value: `$${moneyOut.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: `Expenses & Suppliers`, type: 'warn', icon: ArrowDownRight, desc: 'Total Paid Out' },
        { name: 'Accrued Material Costs', value: `$${totalMaterialsSum.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: `Materials Only`, type: 'info', icon: Receipt, desc: 'Logged invoices' },
        { name: 'Outstanding Dues', value: `$${outstandingSupplierDues.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: 'To Suppliers', type: 'warn', icon: Truck, desc: 'Payable balance' }
      ])

      // Margins
      const netProfit = moneyIn - accruedProjectCost
      const grossYield = moneyIn > 0 ? (netProfit / moneyIn) * 100 : 0
      
      setNetProfitText(`$${netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`)
      setGrossYieldText(`${grossYield.toFixed(1)}%`)
      // Target operational profit set to $50,000 for calculation
      const targetMet = Math.min(Math.max((netProfit / 50000) * 100, 0), 100)
      setTargetMetPct(`${targetMet.toFixed(1)}%`)

      // Project Financial Audit Table
      const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-amber-500']
      const mappedCosts = dbProjects.map((p, idx) => {
        const pExpenses = dbExpenses.filter(e => e.project_id === p.id).reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0)
        const pMaterials = dbMaterials.filter(m => m.project_id === p.id).reduce((acc, m) => acc + (parseFloat(m.cost) || 0), 0)
        const pSupplierPays = dbSupplierPayments.filter(s => s.project_id === p.id).reduce((acc, s) => acc + (parseFloat(s.amount) || 0), 0)
        const projectCost = pExpenses + pMaterials
        const projectBudget = parseFloat(p.budget) || 0
        const progress = projectBudget > 0 ? Math.min(Math.round((projectCost / projectBudget) * 100), 100) : 0

        return {
          name: p.name,
          budget: `$${projectBudget.toLocaleString()}`,
          cost: `$${projectCost.toLocaleString()}`,
          progress,
          color: colors[idx % colors.length]
        }
      })
      setProjectCosts(mappedCosts)

      // Monthly Chart Data (revenues vs costs for last 5 months)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const currentMonth = new Date().getMonth()
      const lastFiveMonths: { name: string; index: number; revenue: number; cost: number }[] = []
      
      for (let i = 4; i >= 0; i--) {
        const mIdx = (currentMonth - i + 12) % 12
        lastFiveMonths.push({
          name: months[mIdx],
          index: mIdx,
          revenue: 0,
          cost: 0
        })
      }

      dbClientPayments.forEach(p => {
        const date = new Date(p.payment_date)
        const mIdx = date.getMonth()
        const match = lastFiveMonths.find(m => m.index === mIdx)
        if (match) match.revenue += parseFloat(p.amount) || 0
      })

      dbMaterials.forEach(m => {
        const date = new Date(m.purchase_date)
        const mIdx = date.getMonth()
        const match = lastFiveMonths.find(m => m.index === mIdx)
        if (match) match.cost += parseFloat(m.cost) || 0
      })

      dbExpenses.forEach(e => {
        const date = new Date(e.expense_date)
        const mIdx = date.getMonth()
        const match = lastFiveMonths.find(m => m.index === mIdx)
        if (match) match.cost += parseFloat(e.amount) || 0
      })

      const maxVal = Math.max(...lastFiveMonths.map(m => Math.max(m.revenue, m.cost)), 1)
      const chartMapped = lastFiveMonths.map(m => ({
        month: m.name,
        rHeight: `${(m.revenue / maxVal) * 100}%`,
        cHeight: `${(m.cost / maxVal) * 100}%`
      }))
      setMonthlyChart(chartMapped)

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Compiling dashboard analytics...</p>
        </div>
      ) : (
        <>
          {/* Overview stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((stat, idx) => (
              <Card key={idx} className="border border-border/40 bg-card/40 backdrop-blur-sm hover:border-indigo-500/30 hover:scale-[1.02] hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <span className="text-sm font-semibold text-muted-foreground">{stat.name}</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 dark:bg-indigo-500/5">
                    <stat.icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-extrabold tracking-tight">{stat.value}</div>
                  <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold">
                    <span className={`${
                      stat.type === 'up' ? 'text-emerald-500' : 
                      stat.type === 'warn' ? 'text-amber-500' : 'text-indigo-500'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-muted-foreground">{stat.desc}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Profits summary and layout charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border border-border/40 bg-card/40 backdrop-blur-sm">
              <CardHeader className="flex flex-row justify-between items-center pb-4">
                <div>
                  <CardTitle className="text-lg font-bold">Accumulated Margins vs. Project Costs</CardTitle>
                  <CardDescription>Monthly visual breakdown of revenues and accumulated costs</CardDescription>
                </div>
                <TrendingUp className="h-5 w-5 text-indigo-500" />
              </CardHeader>
              <CardContent className="h-72 flex flex-col justify-end">
                <div className="flex-grow flex items-end gap-6 h-full pb-4 px-4">
                  {monthlyChart.map((bar, i) => (
                    <div key={i} className="flex-grow flex flex-col items-center gap-2 group h-full justify-end">
                      <div className="flex gap-2 items-end h-full w-full justify-center">
                        {/* Revenue bar */}
                        <div 
                          className="w-4 bg-gradient-to-t from-indigo-500 to-indigo-600 rounded-t-lg group-hover:from-indigo-400 transition-all duration-300"
                          style={{ height: bar.rHeight }}
                        />
                        {/* Cost bar */}
                        <div 
                          className="w-4 bg-gradient-to-t from-pink-500 to-pink-600 rounded-t-lg group-hover:from-pink-400 transition-all duration-300"
                          style={{ height: bar.cHeight }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground font-semibold">{bar.month}</span>
                    </div>
                  ))}
                </div>
                {/* Chart Legend */}
                <div className="flex justify-center gap-6 border-t border-border/40 pt-4 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-indigo-500 rounded-sm" />
                    <span>Client Invoiced Payments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-pink-500 rounded-sm" />
                    <span>Project Costs (Materials + Expenses)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Profit Margin Summary */}
            <Card className="border border-border/40 bg-card/40 backdrop-blur-sm flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Operational Profit Target</CardTitle>
                <CardDescription>Net target yield (Quarterly Target: $50,000)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4 flex-1 flex flex-col justify-center">
                <div className="flex justify-center relative items-center">
                  {/* Circular progress visual */}
                  <div className="w-36 h-36 rounded-full border-8 border-indigo-500/10 flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border-8 border-indigo-500 border-t-transparent border-r-transparent animate-pulse" />
                    <div className="text-center">
                      <span className="text-3xl font-extrabold tracking-tight">{targetMetPct}</span>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Target Met</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center border-t border-border/40 pt-4">
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">Net Profit Margin</span>
                    <h4 className="text-lg font-bold text-indigo-500 mt-0.5">{netProfitText}</h4>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold">Gross Yield</span>
                    <h4 className="text-lg font-bold text-pink-500 mt-0.5">{grossYieldText}</h4>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projects Budget Completion List */}
          <Card className="border border-border/40 bg-card/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Active Projects Financial Audit</CardTitle>
              <CardDescription>Current accrued cost versus designated contract budget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              {projectCosts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No project budgets logged.</p>
              ) : (
                projectCosts.map((project, idx) => (
                  <div key={idx} className="space-y-2 p-3 hover:bg-muted/40 rounded-xl transition-all border border-transparent hover:border-border/30">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span>{project.name}</span>
                      <span className="text-muted-foreground">{project.cost} / <strong className="text-foreground">{project.budget}</strong></span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
                      <div className={`h-full rounded-full ${project.color}`} style={{ width: `${project.progress}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                      <span>Accrued Cost Progress</span>
                      <span>{project.progress}% consumed</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
