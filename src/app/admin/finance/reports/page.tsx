'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useCurrency } from '@/hooks/useCurrency'
import { BarChart3, Download, Calendar, ArrowUpRight, ArrowDownRight, Tag } from 'lucide-react'

export default function FinanceReportsPage() {
  const { symbol, formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(true)
  
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  
  const [reportData, setReportData] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    incomeByCategory: {} as Record<string, number>,
    expenseByCategory: {} as Record<string, number>
  })

  useEffect(() => {
    generateReport()
  }, [month, year])

  const generateReport = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
      if (!profile || !profile.company_id) return
      
      // Calculate date range
      const startDate = new Date(year, month, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

      const { data: txs } = await supabase.from('finance_transactions')
        .select('type, amount, category:finance_categories(name)')
        .eq('company_id', profile.company_id)
        .gte('date', startDate)
        .lte('date', endDate)
      
      let totalIncome = 0
      let totalExpense = 0
      const incomeByCategory: Record<string, number> = {}
      const expenseByCategory: Record<string, number> = {}

      if (txs) {
        txs.forEach(t => {
          const amt = parseFloat(t.amount)
          const cat = t.category as any
          const catName = (Array.isArray(cat) ? cat[0]?.name : cat?.name) || 'Uncategorized'
          
          if (t.type === 'INCOME') {
            totalIncome += amt
            incomeByCategory[catName] = (incomeByCategory[catName] || 0) + amt
          } else if (t.type === 'EXPENSE') {
            totalExpense += amt
            expenseByCategory[catName] = (expenseByCategory[catName] || 0) + amt
          }
        })
      }

      setReportData({
        totalIncome,
        totalExpense,
        netProfit: totalIncome - totalExpense,
        incomeByCategory,
        expenseByCategory
      })

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    const csvRows = [
      ['Category Type', 'Category Name', 'Amount'],
      ...Object.entries(reportData.incomeByCategory).map(([name, amt]) => ['Income', name, amt]),
      ...Object.entries(reportData.expenseByCategory).map(([name, amt]) => ['Expense', name, amt]),
      [],
      ['Summary', 'Total Income', reportData.totalIncome],
      ['Summary', 'Total Expense', reportData.totalExpense],
      ['Summary', 'Net Profit', reportData.netProfit]
    ]

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `finance_report_${year}_${month + 1}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold font-heading">Financial Reports</h3>
          <p className="text-sm text-muted-foreground">Generate and export monthly income and expense summaries.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            className="rounded-xl border border-border/40 bg-card/50 px-3 h-10 text-sm focus:outline-none"
            value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
          >
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select 
            className="rounded-xl border border-border/40 bg-card/50 px-3 h-10 text-sm focus:outline-none"
            value={year} onChange={(e) => setYear(parseInt(e.target.value))}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button onClick={exportCSV} variant="outline" className="rounded-xl gap-2 h-10">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-muted-foreground flex flex-col items-center">
          <BarChart3 className="w-8 h-8 animate-pulse mb-4 text-indigo-500/50" />
          <p>Generating report...</p>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <p className="text-sm font-semibold text-muted-foreground flex items-center justify-center gap-1 mb-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" /> Total Income
                </p>
                <h3 className="text-3xl font-bold text-emerald-500">{formatCurrency(reportData.totalIncome)}</h3>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <p className="text-sm font-semibold text-muted-foreground flex items-center justify-center gap-1 mb-2">
                  <ArrowDownRight className="w-4 h-4 text-pink-500" /> Total Expense
                </p>
                <h3 className="text-3xl font-bold text-pink-500">{formatCurrency(reportData.totalExpense)}</h3>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <p className="text-sm font-semibold text-muted-foreground flex items-center justify-center gap-1 mb-2">
                  <BarChart3 className="w-4 h-4 text-indigo-500" /> Net Profit
                </p>
                <h3 className={`text-3xl font-bold ${reportData.netProfit >= 0 ? 'text-indigo-500' : 'text-red-500'}`}>
                  {formatCurrency(reportData.netProfit)}
                </h3>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Income Breakdown */}
            <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
              <CardContent className="p-6">
                <h4 className="font-bold flex items-center gap-2 mb-6"><Tag className="w-5 h-5 text-emerald-500" /> Income Breakdown</h4>
                {Object.keys(reportData.incomeByCategory).length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No income recorded for this period.</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(reportData.incomeByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, amt]) => (
                        <div key={cat} className="flex justify-between items-center">
                          <span className="text-sm font-medium">{cat}</span>
                          <span className="font-bold text-emerald-500">{formatCurrency(amt)}</span>
                        </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
              <CardContent className="p-6">
                <h4 className="font-bold flex items-center gap-2 mb-6"><Tag className="w-5 h-5 text-pink-500" /> Expense Breakdown</h4>
                {Object.keys(reportData.expenseByCategory).length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No expenses recorded for this period.</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(reportData.expenseByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, amt]) => (
                        <div key={cat} className="flex justify-between items-center">
                          <span className="text-sm font-medium">{cat}</span>
                          <span className="font-bold text-pink-500">{formatCurrency(amt)}</span>
                        </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
