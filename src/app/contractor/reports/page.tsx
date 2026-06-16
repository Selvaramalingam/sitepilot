'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, Play, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUser, UserProfile } from '@/lib/auth-helpers'
import { useCurrency } from '@/hooks/useCurrency'

export default function ContractorReports() {
  const router = useRouter()
  const { symbol, formatCurrency } = useCurrency()
  const [contractor, setContractor] = useState<UserProfile | null>(null)
  const [exportingReport, setExportingReport] = useState<string | null>(null)
  const [successReport, setSuccessReport] = useState<string | null>(null)

  useEffect(() => {
    fetchSession()
  }, [])

  const fetchSession = async () => {
    const profile = await getCurrentUser()
    if (profile && profile.role === 'CONTRACTOR_OWNER') {
      setContractor(profile)
    } else {
      router.push('/login')
    }
  }

  const fetchReportData = async (companyId: string) => {
    const supabase = createClient()
    const [
      { data: projects },
      { data: materials },
      { data: expenses },
      { data: clientPayments },
      { data: supplierPayments },
      { data: suppliers }
    ] = await Promise.all([
      supabase.from('projects').select('*').eq('company_id', companyId),
      supabase.from('materials').select('*, project:projects!inner(*), supplier:suppliers(*)').eq('projects.company_id', companyId),
      supabase.from('expenses').select('*, project:projects!inner(*)').eq('projects.company_id', companyId),
      supabase.from('client_payments').select('*, project:projects!inner(*)').eq('projects.company_id', companyId),
      supabase.from('supplier_payments').select('*, project:projects!inner(*), supplier:suppliers(*)').eq('projects.company_id', companyId),
      supabase.from('suppliers').select('*').eq('company_id', companyId)
    ])

    return {
      projects: projects || [],
      materials: materials || [],
      expenses: expenses || [],
      clientPayments: clientPayments || [],
      supplierPayments: supplierPayments || [],
      suppliers: suppliers || []
    }
  }

  const handleExport = async (reportName: string, format: 'PDF' | 'Excel') => {
    if (!contractor?.company_id) {
      alert("Please wait until session is active.")
      return
    }

    setExportingReport(`${reportName}-${format}`)
    setSuccessReport(null)

    try {
      const db = await fetchReportData(contractor.company_id)
      
      if (format === 'Excel') {
        let csvContent = ''
        
        if (reportName === 'Project Cost Report') {
          csvContent = 'Project Name,Client,Address,Start Date,End Date,Status,Budget,Materials Cost,Expenses Cost,Total Accrued Cost,Remaining Budget\n'
          db.projects.forEach(p => {
            const mCost = db.materials.filter((m: any) => m.project_id === p.id).reduce((acc: number, m: any) => acc + (parseFloat(m.cost) || 0), 0)
            const eCost = db.expenses.filter((e: any) => e.project_id === p.id).reduce((acc: number, e: any) => acc + (parseFloat(e.amount) || 0), 0)
            const totalCost = mCost + eCost
            const budget = parseFloat(p.budget) || 0
            csvContent += `"${p.name}","${p.client_name}","${p.address}","${p.start_date}","${p.end_date}","${p.status}",${budget},${mCost},${eCost},${totalCost},${budget - totalCost}\n`
          })
        } 
        else if (reportName === 'Material Ledger Report') {
          csvContent = 'Purchase Date,Material Name,Project Name,Supplier Name,Quantity,Unit,Total Cost\n'
          db.materials.forEach((m: any) => {
            csvContent += `"${m.purchase_date}","${m.name}","${m.project?.name || 'Unknown'}","${m.supplier?.name || 'Unknown'}",${m.quantity},"${m.unit}",${m.cost}\n`
          })
        } 
        else if (reportName === 'Expense Audit Report') {
          csvContent = 'Expense Date,Category,Project Name,Amount,Audit Notes\n'
          db.expenses.forEach((e: any) => {
            csvContent += `"${e.expense_date}","${e.category}","${e.project?.name || 'Unknown'}",${e.amount},"${(e.notes || '').replace(/"/g, '""')}"\n`
          })
        } 
        else if (reportName === 'Supplier Outstanding Statement') {
          csvContent = 'Supplier Name,Total Materials Cost,Total Paid Out,Outstanding Balance\n'
          db.suppliers.forEach(s => {
            const totalMaterials = db.materials.filter((m: any) => m.supplier_id === s.id).reduce((acc: number, m: any) => acc + (parseFloat(m.cost) || 0), 0)
            const totalPaid = db.supplierPayments.filter((sp: any) => sp.supplier_id === s.id).reduce((acc: number, sp: any) => acc + (parseFloat(sp.amount) || 0), 0)
            const outstanding = Math.max(totalMaterials - totalPaid, 0)
            csvContent += `"${s.name}",${totalMaterials},${totalPaid},${outstanding}\n`
          })
        } 
        else if (reportName === 'Client Payment Ledger') {
          csvContent = 'Payment Date,Client Name,Project Name,Amount,Payment Method\n'
          db.clientPayments.forEach((cp: any) => {
            csvContent += `"${cp.payment_date}","${cp.client_name}","${cp.project?.name || 'Unknown'}",${cp.amount},"${cp.payment_method}"\n`
          })
        } 
        else if (reportName === 'Company Profitability Report') {
          csvContent = 'Metric,Value\n'
          const totalClientPayments = db.clientPayments.reduce((acc: number, cp: any) => acc + (parseFloat(cp.amount) || 0), 0)
          const totalMaterials = db.materials.reduce((acc: number, m: any) => acc + (parseFloat(m.cost) || 0), 0)
          const totalExpenses = db.expenses.reduce((acc: number, e: any) => acc + (parseFloat(e.amount) || 0), 0)
          const totalAccrued = totalMaterials + totalExpenses
          const profit = totalClientPayments - totalAccrued
          const yieldPct = totalClientPayments > 0 ? (profit / totalClientPayments) * 100 : 0
          const totalSuppPaid = db.supplierPayments.reduce((acc: number, sp: any) => acc + (parseFloat(sp.amount) || 0), 0)
          const outstandingSupp = Math.max(totalMaterials - totalSuppPaid, 0)

          csvContent += `Total Client Payments (Money In),${totalClientPayments}\n`
          csvContent += `Accrued Material Costs,${totalMaterials}\n`
          csvContent += `Accrued Expense Costs,${totalExpenses}\n`
          csvContent += `Total Accrued Costs,${totalAccrued}\n`
          csvContent += `Net Profit Margin,${profit}\n`
          csvContent += `Gross Yield %,${yieldPct.toFixed(2)}\n`
          csvContent += `Total Supplier Payouts (Money Out),${totalSuppPaid}\n`
          csvContent += `Outstanding Supplier Dues,${outstandingSupp}\n`
        } 
        else if (reportName === 'Consolidated Project Summary') {
          csvContent = 'Project Name,Budget,Client Payments In,Materials Incurred,Expenses Incurred,Supplier Paid,Outstanding Supplier Dues,Project Yield\n'
          db.projects.forEach(p => {
            const budget = parseFloat(p.budget) || 0
            const cpIn = db.clientPayments.filter((cp: any) => cp.project_id === p.id).reduce((acc: number, cp: any) => acc + (parseFloat(cp.amount) || 0), 0)
            const mCost = db.materials.filter((m: any) => m.project_id === p.id).reduce((acc: number, m: any) => acc + (parseFloat(m.cost) || 0), 0)
            const eCost = db.expenses.filter((e: any) => e.project_id === p.id).reduce((acc: number, e: any) => acc + (parseFloat(e.amount) || 0), 0)
            const sPaid = db.supplierPayments.filter((sp: any) => sp.project_id === p.id).reduce((acc: number, sp: any) => acc + (parseFloat(sp.amount) || 0), 0)
            const oDues = Math.max(mCost - sPaid, 0)
            const netYield = cpIn - (mCost + eCost)
            csvContent += `"${p.name}",${budget},${cpIn},${mCost},${eCost},${sPaid},${oDues},${netYield}\n`
          })
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `${reportName.replace(/\s+/g, '_')}_Report.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } 
      else {
        // PDF Report Generation (Render beautiful HTML table printable on a blank window)
        const win = window.open('', '_blank')
        if (win) {
          let reportHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>${reportName}</title>
              <style>
                body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1e293b; margin: 40px; line-height: 1.5; font-size: 13px; }
                .header { border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
                .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
                .company { font-size: 14px; font-weight: 600; color: #4f46e5; margin-top: 5px; }
                .meta { font-size: 11px; color: #64748b; text-align: right; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #f8fafc; color: #475569; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 12px 10px; border-bottom: 2px solid #e2e8f0; text-align: left; }
                td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; }
                .text-right { text-align: right; }
                .font-bold { font-weight: 700; }
                .total-row { background: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; }
                .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }
                .badge-planning { background: #e0e7ff; color: #4338ca; }
                .badge-active { background: #d1fae5; color: #065f46; }
                .badge-delayed { background: #fef3c7; color: #92400e; }
                .badge-archived { background: #f1f5f9; color: #334155; }
              </style>
            </head>
            <body>
              <div class="header">
                <div>
                  <div class="title">${reportName}</div>
                  <div class="company">${contractor.full_name}'s SitePilot Workspace</div>
                </div>
                <div class="meta">
                  <div>Generated on: ${new Date().toLocaleDateString()}</div>
                  <div>Security Clear: Authorized</div>
                </div>
              </div>
          `

          if (reportName === 'Project Cost Report') {
            let totalBudget = 0
            let totalMCost = 0
            let totalECost = 0
            let totalAllCost = 0
            
            reportHtml += `
              <table>
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Client</th>
                    <th>Status</th>
                    <th class="text-right">Budget</th>
                    <th class="text-right">Materials Cost</th>
                    <th class="text-right">Expenses Cost</th>
                    <th class="text-right">Accrued Cost</th>
                    <th class="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
            `
            db.projects.forEach(p => {
              const mCost = db.materials.filter((m: any) => m.project_id === p.id).reduce((acc: number, m: any) => acc + (parseFloat(m.cost) || 0), 0)
              const eCost = db.expenses.filter((e: any) => e.project_id === p.id).reduce((acc: number, e: any) => acc + (parseFloat(e.amount) || 0), 0)
              const accrued = mCost + eCost
              const budget = parseFloat(p.budget) || 0
              const balance = budget - accrued
              
              totalBudget += budget
              totalMCost += mCost
              totalECost += eCost
              totalAllCost += accrued

              const statusBadge = p.status === 'Planning' ? '<span class="badge badge-planning">Planning</span>' :
                                  p.status === 'Active' ? '<span class="badge badge-active">Active</span>' :
                                  p.status === 'Delayed' ? '<span class="badge badge-delayed">Delayed</span>' :
                                  '<span class="badge badge-archived">Archived</span>'

              reportHtml += `
                <tr>
                  <td class="font-bold">${p.name}</td>
                  <td>${p.client_name}</td>
                  <td>${statusBadge}</td>
                  <td class="text-right">${formatCurrency(budget)}</td>
                  <td class="text-right">${formatCurrency(mCost)}</td>
                  <td class="text-right">${formatCurrency(eCost)}</td>
                  <td class="text-right font-bold">${formatCurrency(accrued)}</td>
                  <td class="text-right ${balance < 0 ? 'font-bold' : ''}" style="${balance < 0 ? 'color: #ef4444;' : ''}">${formatCurrency(balance)}</td>
                </tr>
              `
            })

            reportHtml += `
                  <tr class="total-row">
                    <td colspan="3">Total</td>
                    <td class="text-right">${formatCurrency(totalBudget)}</td>
                    <td class="text-right">${formatCurrency(totalMCost)}</td>
                    <td class="text-right">${formatCurrency(totalECost)}</td>
                    <td class="text-right">${formatCurrency(totalAllCost)}</td>
                    <td class="text-right">${formatCurrency(totalBudget - totalAllCost)}</td>
                  </tr>
                </tbody>
              </table>
            `
          } 
          else if (reportName === 'Material Ledger Report') {
            let grandTotal = 0
            reportHtml += `
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Material Item</th>
                    <th>Project</th>
                    <th>Supplier</th>
                    <th class="text-right">Qty</th>
                    <th>Unit</th>
                    <th class="text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
            `
            db.materials.forEach((m: any) => {
              grandTotal += m.cost
              reportHtml += `
                <tr>
                  <td>${m.purchase_date}</td>
                  <td class="font-bold">${m.name}</td>
                  <td>${m.project?.name || 'Unknown'}</td>
                  <td>${m.supplier?.name || 'Unknown'}</td>
                  <td class="text-right">${m.quantity.toLocaleString()}</td>
                  <td>${m.unit}</td>
                  <td class="text-right font-bold">${formatCurrency(m.cost)}</td>
                </tr>
              `
            })
            reportHtml += `
                  <tr class="total-row">
                    <td colspan="6">Grand Total</td>
                    <td class="text-right">${formatCurrency(grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            `
          } 
          else if (reportName === 'Expense Audit Report') {
            let grandTotal = 0
            reportHtml += `
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Project Name</th>
                    <th>Audit Notes</th>
                    <th class="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
            `
            db.expenses.forEach((e: any) => {
              grandTotal += e.amount
              reportHtml += `
                <tr>
                  <td>${e.expense_date}</td>
                  <td class="font-bold">${e.category}</td>
                  <td>${e.project?.name || 'Unknown'}</td>
                  <td style="font-size: 11px; max-width: 300px;">${e.notes || ''}</td>
                  <td class="text-right font-bold">${formatCurrency(e.amount)}</td>
                </tr>
              `
            })
            reportHtml += `
                  <tr class="total-row">
                    <td colspan="4">Total Field Expenditures</td>
                    <td class="text-right">${formatCurrency(grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            `
          } 
          else if (reportName === 'Supplier Outstanding Statement') {
            let grandTotalMat = 0
            let grandTotalPaid = 0
            let grandTotalOut = 0

            reportHtml += `
              <table>
                <thead>
                  <tr>
                    <th>Supplier / Vendor</th>
                    <th class="text-right">Total Invoices Cost</th>
                    <th class="text-right">Total Payouts Made</th>
                    <th class="text-right">Outstanding Balance Due</th>
                  </tr>
                </thead>
                <tbody>
            `
            db.suppliers.forEach(s => {
              const totalMaterials = db.materials.filter((m: any) => m.supplier_id === s.id).reduce((acc: number, m: any) => acc + (parseFloat(m.cost) || 0), 0)
              const totalPaid = db.supplierPayments.filter((sp: any) => sp.supplier_id === s.id).reduce((acc: number, sp: any) => acc + (parseFloat(sp.amount) || 0), 0)
              const outstanding = Math.max(totalMaterials - totalPaid, 0)
              
              grandTotalMat += totalMaterials
              grandTotalPaid += totalPaid
              grandTotalOut += outstanding

              reportHtml += `
                <tr>
                  <td class="font-bold">${s.name}</td>
                  <td class="text-right">${formatCurrency(totalMaterials)}</td>
                  <td class="text-right" style="color: #10b981;">${formatCurrency(totalPaid)}</td>
                  <td class="text-right font-bold" style="${outstanding > 0 ? 'color: #f59e0b;' : ''}">${formatCurrency(outstanding)}</td>
                </tr>
              `
            })
            reportHtml += `
                  <tr class="total-row">
                    <td>Total Accounts Payable</td>
                    <td class="text-right">${formatCurrency(grandTotalMat)}</td>
                    <td class="text-right">${formatCurrency(grandTotalPaid)}</td>
                    <td class="text-right">${formatCurrency(grandTotalOut)}</td>
                  </tr>
                </tbody>
              </table>
            `
          } 
          else if (reportName === 'Client Payment Ledger') {
            let grandTotal = 0
            reportHtml += `
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Client Name</th>
                    <th>Project Name</th>
                    <th>Payment Method</th>
                    <th class="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
            `
            db.clientPayments.forEach((cp: any) => {
              grandTotal += cp.amount
              reportHtml += `
                <tr>
                  <td>${cp.payment_date}</td>
                  <td class="font-bold">${cp.client_name}</td>
                  <td>${cp.project?.name || 'Unknown'}</td>
                  <td>${cp.payment_method}</td>
                  <td class="text-right font-bold" style="color: #10b981;">${formatCurrency(cp.amount)}</td>
                </tr>
              `
            })
            reportHtml += `
                  <tr class="total-row">
                    <td colspan="4">Total Clearances Received</td>
                    <td class="text-right" style="color: #10b981;">${formatCurrency(grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            `
          } 
          else if (reportName === 'Company Profitability Report') {
            const totalClientPayments = db.clientPayments.reduce((acc: number, cp: any) => acc + (parseFloat(cp.amount) || 0), 0)
            const totalMaterials = db.materials.reduce((acc: number, m: any) => acc + (parseFloat(m.cost) || 0), 0)
            const totalExpenses = db.expenses.reduce((acc: number, e: any) => acc + (parseFloat(e.amount) || 0), 0)
            const totalAccrued = totalMaterials + totalExpenses
            const profit = totalClientPayments - totalAccrued
            const yieldPct = totalClientPayments > 0 ? (profit / totalClientPayments) * 100 : 0
            const totalSuppPaid = db.supplierPayments.reduce((acc: number, sp: any) => acc + (parseFloat(sp.amount) || 0), 0)
            const outstandingSupp = Math.max(totalMaterials - totalSuppPaid, 0)

            reportHtml += `
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 20px; margin-bottom: 40px;">
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 12px; text-align: center;">
                  <div style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #065f46;">Revenue (Client Payments)</div>
                  <div style="font-size: 28px; font-weight: 800; color: #047857; margin-top: 5px;">${formatCurrency(totalClientPayments)}</div>
                </div>
                <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 20px; border-radius: 12px; text-align: center;">
                  <div style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #991b1b;">Total Accrued Costs</div>
                  <div style="font-size: 28px; font-weight: 800; color: #b91c1c; margin-top: 5px;">${formatCurrency(totalAccrued)}</div>
                </div>
                <div style="background: #e0e7ff; border: 1px solid #c7d2fe; padding: 20px; border-radius: 12px; text-align: center;">
                  <div style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #3730a3;">Net Operating Margins</div>
                  <div style="font-size: 28px; font-weight: 800; color: #4338ca; margin-top: 5px;">${formatCurrency(profit)}</div>
                </div>
                <div style="background: #ecfeff; border: 1px solid #a5f3fc; padding: 20px; border-radius: 12px; text-align: center;">
                  <div style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #155e75;">Yield Target Met %</div>
                  <div style="font-size: 28px; font-weight: 800; color: #0e7490; margin-top: 5px;">${yieldPct.toFixed(1)}%</div>
                </div>
              </div>

              <h3>Breakdown Analysis</h3>
              <table>
                <thead>
                  <tr>
                    <th>Ledger Item Summary</th>
                    <th class="text-right">Value Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Logged Material Invoices (Cost Incurred)</td>
                    <td class="text-right font-bold">${formatCurrency(totalMaterials)}</td>
                  </tr>
                  <tr>
                    <td>Logged Direct Operations Expenses (Labour, Transport, Fuel)</td>
                    <td class="text-right font-bold">${formatCurrency(totalExpenses)}</td>
                  </tr>
                  <tr style="background: #f8fafc;">
                    <td class="font-bold">Sum Accrued Costs</td>
                    <td class="text-right font-bold">${formatCurrency(totalAccrued)}</td>
                  </tr>
                  <tr>
                    <td>Real Cash Supplier Disbursements (Paid Out)</td>
                    <td class="text-right" style="color: #ef4444;">${formatCurrency(totalSuppPaid)}</td>
                  </tr>
                  <tr>
                    <td class="font-bold" style="color: #d97706;">Outstanding Payables (Supplier Liabilities)</td>
                    <td class="text-right font-bold" style="color: #d97706;">${formatCurrency(outstandingSupp)}</td>
                  </tr>
                </tbody>
              </table>
            `
          } 
          else if (reportName === 'Consolidated Project Summary') {
            let sumBudget = 0
            let sumCpIn = 0
            let sumMIncurred = 0
            let sumEIncurred = 0
            let sumPaidSupp = 0
            let sumOutDues = 0
            let sumYield = 0

            reportHtml += `
              <table style="font-size: 11px;">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th class="text-right">Budget</th>
                    <th class="text-right">Client Paid</th>
                    <th class="text-right">Materials</th>
                    <th class="text-right">Expenses</th>
                    <th class="text-right">Supp Paid</th>
                    <th class="text-right">Out Dues</th>
                    <th class="text-right">Project Yield</th>
                  </tr>
                </thead>
                <tbody>
            `
            db.projects.forEach(p => {
              const budget = parseFloat(p.budget) || 0
              const cpIn = db.clientPayments.filter((cp: any) => cp.project_id === p.id).reduce((acc: number, cp: any) => acc + (parseFloat(cp.amount) || 0), 0)
              const mCost = db.materials.filter((m: any) => m.project_id === p.id).reduce((acc: number, m: any) => acc + (parseFloat(m.cost) || 0), 0)
              const eCost = db.expenses.filter((e: any) => e.project_id === p.id).reduce((acc: number, e: any) => acc + (parseFloat(e.amount) || 0), 0)
              const sPaid = db.supplierPayments.filter((sp: any) => sp.project_id === p.id).reduce((acc: number, sp: any) => acc + (parseFloat(sp.amount) || 0), 0)
              const oDues = Math.max(mCost - sPaid, 0)
              const netYield = cpIn - (mCost + eCost)

              sumBudget += budget
              sumCpIn += cpIn
              sumMIncurred += mCost
              sumEIncurred += eCost
              sumPaidSupp += sPaid
              sumOutDues += oDues
              sumYield += netYield

              reportHtml += `
                <tr>
                  <td class="font-bold">${p.name}</td>
                  <td class="text-right">${formatCurrency(budget)}</td>
                  <td class="text-right" style="color: #10b981;">${formatCurrency(cpIn)}</td>
                  <td class="text-right">${formatCurrency(mCost)}</td>
                  <td class="text-right">${formatCurrency(eCost)}</td>
                  <td class="text-right">${formatCurrency(sPaid)}</td>
                  <td class="text-right" style="color: #f59e0b;">${formatCurrency(oDues)}</td>
                  <td class="text-right font-bold ${netYield < 0 ? 'text-red-500' : ''}" style="${netYield < 0 ? 'color: #ef4444;' : ''}">${formatCurrency(netYield)}</td>
                </tr>
              `
            })
            reportHtml += `
                  <tr class="total-row">
                    <td>Consolidated sums</td>
                    <td class="text-right">${formatCurrency(sumBudget)}</td>
                    <td class="text-right">${formatCurrency(sumCpIn)}</td>
                    <td class="text-right">${formatCurrency(sumMIncurred)}</td>
                    <td class="text-right">${formatCurrency(sumEIncurred)}</td>
                    <td class="text-right">${formatCurrency(sumPaidSupp)}</td>
                    <td class="text-right">${formatCurrency(sumOutDues)}</td>
                    <td class="text-right">${formatCurrency(sumYield)}</td>
                  </tr>
                </tbody>
              </table>
            `
          }

          reportHtml += `
            </body>
            </html>
          `

          win.document.write(reportHtml)
          win.document.close()
          win.print()
        }
      }

      setSuccessReport(`${reportName} exported as ${format} successfully!`)
    } catch (e) {
      console.error(e)
      alert("Error compiling report data.")
    } finally {
      setExportingReport(null)
    }
  }

  const reportsList = [
    { name: 'Project Cost Report', desc: 'Accrued cost summaries vs budget lines per project.' },
    { name: 'Material Ledger Report', desc: 'Chronological logistics records, quantities, and supplier costs.' },
    { name: 'Expense Audit Report', desc: 'Categorized field expenditures and wage payroll logs.' },
    { name: 'Supplier Outstanding Statement', desc: 'Summary of outstanding accounts payable per material vendor.' },
    { name: 'Client Payment Ledger', desc: 'Statement of incoming project invoice clearances and milestones.' },
    { name: 'Company Profitability Report', desc: 'Gross margins, net profit metrics, and project yield analytics.' },
    { name: 'Consolidated Project Summary', desc: 'Single-sheet outline of overall project milestones, progress, and logs.' }
  ]

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card className="border border-border/50 bg-card/40 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            <CardTitle className="text-lg font-bold">Financial Statements & Operations Reports</CardTitle>
          </div>
          <CardDescription>
            Compile and generate project audits. All files can be exported into standard vector PDF or spreadsheet formats.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Success notification banner */}
      {successReport && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-semibold rounded-2xl p-4 flex gap-2.5 items-center animate-in fade-in zoom-in-95">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successReport}</span>
        </div>
      )}

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportsList.map((report, idx) => (
          <Card key={idx} className="border border-border/50 bg-card/40 backdrop-blur-sm hover:border-indigo-500/30 hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold font-heading">{report.name}</CardTitle>
              <CardDescription className="text-xs pt-1.5 leading-relaxed">{report.desc}</CardDescription>
            </CardHeader>
            <CardContent className="border-t border-border/40 bg-muted/10 px-6 py-4 flex gap-3 rounded-b-2xl justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={!!exportingReport}
                onClick={() => handleExport(report.name, 'PDF')}
                className="rounded-lg border-border hover:bg-muted/80 gap-1.5 text-xs font-semibold"
              >
                {exportingReport === `${report.name}-PDF` ? (
                  <>
                    <Play className="h-3.5 w-3.5 animate-spin text-indigo-500" /> Compiling...
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5 text-indigo-500" /> Export PDF
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!!exportingReport}
                onClick={() => handleExport(report.name, 'Excel')}
                className="rounded-lg border-border hover:bg-muted/80 gap-1.5 text-xs font-semibold"
              >
                {exportingReport === `${report.name}-Excel` ? (
                  <>
                    <Play className="h-3.5 w-3.5 animate-spin text-pink-500" /> Compiling...
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5 text-pink-500" /> Export Excel
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
