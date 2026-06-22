'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useCurrency } from '@/hooks/useCurrency'
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Wallet,
  Clock,
  ArrowRightLeft,
  ExternalLink
} from 'lucide-react'

export default function FinanceDashboardPage() {
  const { symbol, formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(true)
  
  const [cashBalance, setCashBalance] = useState(0)
  const [bankBalance, setBankBalance] = useState(0)
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpense, setTotalExpense] = useState(0)
  const [pendingBills, setPendingBills] = useState<any[]>([])
  const [recentTx, setRecentTx] = useState<any[]>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
      if (!profile || !profile.company_id) return
      
      const companyId = profile.company_id

      // 1. Fetch Accounts to calculate total Cash vs Bank
      const { data: accounts } = await supabase.from('finance_accounts').select('type, balance').eq('company_id', companyId)
      if (accounts) {
        let cash = 0
        let bank = 0
        accounts.forEach(acc => {
          if (acc.type === 'Cash') cash += parseFloat(acc.balance)
          else bank += parseFloat(acc.balance)
        })
        setCashBalance(cash)
        setBankBalance(bank)
      }

      // 2. Fetch Transactions for Income/Expense totals (Current Month)
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      const startStr = startOfMonth.toISOString().split('T')[0]

      const { data: txs } = await supabase.from('finance_transactions')
        .select('type, amount, date')
        .eq('company_id', companyId)
        .gte('date', startStr)

      if (txs) {
        let inc = 0
        let exp = 0
        txs.forEach(t => {
          if (t.type === 'INCOME') inc += parseFloat(t.amount)
          if (t.type === 'EXPENSE') exp += parseFloat(t.amount)
        })
        setTotalIncome(inc)
        setTotalExpense(exp)
      }

      // 3. Fetch Recent Transactions
      const { data: recent } = await supabase.from('finance_transactions')
        .select('*, account:finance_accounts(name), category:finance_categories(name)')
        .eq('company_id', companyId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5)
      
      setRecentTx(recent || [])

      // 4. Fetch upcoming recurring bills (next 14 days)
      const today = new Date()
      const in14Days = new Date()
      in14Days.setDate(today.getDate() + 14)

      const { data: bills } = await supabase.from('finance_recurring_bills')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .lte('next_due_date', in14Days.toISOString().split('T')[0])
        .order('next_due_date', { ascending: true })
      
      setPendingBills(bills || [])

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading dashboard...</div>

  const netProfit = totalIncome - totalExpense

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Cash Balance</span>
              <h3 className="text-2xl font-bold mt-1 text-emerald-500">{formatCurrency(cashBalance)}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><DollarSign className="w-5 h-5" /></div>
          </CardContent>
        </Card>
        
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Bank & Digital</span>
              <h3 className="text-2xl font-bold mt-1 text-indigo-500">{formatCurrency(bankBalance)}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500"><Wallet className="w-5 h-5" /></div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Monthly Income</span>
              <h3 className="text-2xl font-bold mt-1 text-cyan-500">{formatCurrency(totalIncome)}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500"><ArrowUpRight className="w-5 h-5" /></div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Monthly Expenses</span>
              <h3 className="text-2xl font-bold mt-1 text-pink-500">{formatCurrency(totalExpense)}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500"><ArrowDownRight className="w-5 h-5" /></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Transactions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold font-heading flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-500" /> Recent Transactions
            </h3>
            <Link href="/admin/finance/transactions" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              View All <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
            <CardContent className="p-0">
              {recentTx.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No recent transactions found.{' '}
                  <Link href="/admin/finance/transactions" className="text-indigo-400 hover:underline">Add one →</Link>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {recentTx.map(tx => (
                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          tx.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 
                          tx.type === 'EXPENSE' ? 'bg-pink-500/10 text-pink-500' : 'bg-indigo-500/10 text-indigo-500'
                        }`}>
                          {tx.type === 'INCOME' ? <ArrowUpRight className="w-5 h-5" /> : 
                           tx.type === 'EXPENSE' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowRightLeft className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {tx.notes || (tx.type === 'TRANSFER' ? 'Transfer' : tx.category?.name || 'Uncategorized')}
                          </p>
                          <p className="text-xs text-muted-foreground flex gap-2">
                            <span>{new Date(tx.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{tx.account?.name}</span>
                          </p>
                        </div>
                      </div>
                      <div className={`font-bold ${
                          tx.type === 'INCOME' ? 'text-emerald-500' : 
                          tx.type === 'EXPENSE' ? 'text-pink-500' : 'text-indigo-500'
                      }`}>
                        {tx.type === 'EXPENSE' ? '-' : tx.type === 'INCOME' ? '+' : ''}{formatCurrency(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Bills */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold font-heading flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" /> Upcoming Bills
          </h3>
          <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
            <CardContent className="p-0">
              {pendingBills.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No upcoming bills in the next 14 days.</div>
              ) : (
                <div className="divide-y divide-border/40">
                  {pendingBills.map(bill => {
                    const isOverdue = new Date(bill.next_due_date) < new Date(new Date().setHours(0,0,0,0))
                    return (
                      <div key={bill.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="text-sm font-bold text-foreground">{bill.title}</p>
                          <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                            Due: {new Date(bill.next_due_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="font-bold text-foreground">
                          {formatCurrency(bill.amount)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
