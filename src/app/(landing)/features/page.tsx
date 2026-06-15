'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Compass, 
  Receipt, 
  FileSpreadsheet, 
  TrendingUp, 
  Users, 
  FileCheck, 
  ShieldCheck, 
  Database, 
  CloudLightning 
} from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
} as const

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100 }
  }
} as const

export default function FeaturesPage() {
  return (
    <div className="relative overflow-hidden bg-background py-20 md:py-32">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[100px] -z-10 dark:bg-indigo-500/5" />
      
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Complete Toolkit for Modern Contractors
          </h1>
          <p className="text-muted-foreground text-lg">
            SitePilot brings clarity and structure to the chaos of construction management.
          </p>
        </div>

        {/* Feature Sections */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16"
        >
          {[
            {
              icon: Compass,
              title: 'Project Management',
              desc: 'Create and edit projects, set timeline schedules, assign site engineers, and track real-time visual progress from planning to completion.'
            },
            {
              icon: FileSpreadsheet,
              title: 'Material Ledger & Inventory',
              desc: 'Log and monitor purchase history per project. Record exact quantity, unit pricing, suppliers, and view detailed balance tracking.'
            },
            {
              icon: Receipt,
              title: 'Real-time Expense Auditing',
              desc: 'Classify project spending under Labour, Transport, Fuel, Machinery, and Food. Easily upload invoice receipts from the field.'
            },
            {
              icon: TrendingUp,
              title: 'Project Accounting',
              desc: 'Compute Net Profits and margins automatically. Compare client payments received against current project costs.'
            },
            {
              icon: Users,
              title: 'Tenant Data Isolation',
              desc: 'Robust PostgreSQL RLS policies guarantee absolute isolation. Engineers only view projects they are assigned to.'
            },
            {
              icon: FileCheck,
              title: 'Comprehensive Audits',
              desc: 'Export high-fidelity project cost, expense, material, and profitability statements directly to PDF and Excel.'
            }
          ].map((feat, idx) => (
            <motion.div key={idx} variants={itemVariants}>
              <Card className="h-full border border-border/50 bg-card/60 backdrop-blur-sm hover:border-indigo-500/30 hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-4 dark:bg-indigo-500/5">
                    <feat.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{feat.title}</CardTitle>
                  <CardDescription className="text-sm pt-2 leading-relaxed">{feat.desc}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
