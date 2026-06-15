'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, FileText, Download, Play, CheckCircle2 } from 'lucide-react'

export default function ContractorReports() {
  const [exportingReport, setExportingReport] = useState<string | null>(null)
  const [successReport, setSuccessReport] = useState<string | null>(null)

  const handleExport = (reportName: string, format: 'PDF' | 'Excel') => {
    setExportingReport(`${reportName}-${format}`)
    setSuccessReport(null)

    setTimeout(() => {
      setExportingReport(null)
      setSuccessReport(`${reportName} exported as ${format} successfully!`)
    }, 1500)
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
