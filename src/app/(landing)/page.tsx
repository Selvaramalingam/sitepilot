'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Compass, 
  Layers, 
  BarChart3, 
  Users, 
  ShieldCheck, 
  FileSpreadsheet, 
  ArrowRight,
  TrendingUp,
  Receipt,
  FileCheck,
  Check,
  Plus
} from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
} as const

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100
    }
  }
} as const

export default function LandingHome() {
  return (
    <div className="relative overflow-hidden bg-background">
      {/* Decorative Glow Elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[100px] -z-10 dark:bg-indigo-500/5" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] rounded-full bg-purple-500/10 blur-[120px] -z-10 dark:bg-purple-500/5" />
      
      {/* Hero Section */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-16 md:pt-32 md:pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/5 text-indigo-500 text-xs font-semibold tracking-wide mb-6 dark:border-indigo-400/20"
        >
          <Layers className="h-3.5 w-3.5" />
          <span>SitePilot v1.0 is Now Live</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.1]"
        >
          Take Complete Command of Your{' '}
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Construction Projects
          </span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-medium"
        >
          Manage materials, track daily progress, audit expenses, and monitor real-time company profitability from a single unified portal.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link href="/book-demo">
            <Button size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 px-8 text-base shadow-lg shadow-indigo-500/25 transition-all">
              Book a Live Demo
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-xl py-6 px-8 text-base border-border hover:bg-muted/50 transition-all gap-2">
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>

        {/* Dashboard Mockup Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 md:mt-24 relative rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-2 shadow-2xl max-w-5xl mx-auto"
        >
          <div className="rounded-xl overflow-hidden border border-border bg-background aspect-[16/9] shadow-inner flex flex-col">
            {/* Mock Header */}
            <div className="h-10 border-b border-border bg-muted/40 flex items-center justify-between px-4">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="text-xs text-muted-foreground font-mono bg-background px-4 py-0.5 rounded border border-border">
                sitepilot.app/dashboard
              </div>
              <div className="w-12" />
            </div>
            
            {/* Mock Layout */}
            <div className="flex-1 flex text-left">
              {/* Sidebar */}
              <div className="w-1/5 border-r border-border bg-muted/20 p-4 space-y-4 hidden sm:block">
                <div className="h-8 bg-indigo-600/10 rounded-lg flex items-center px-3 gap-2">
                  <Compass className="h-4 w-4 text-indigo-500" />
                  <div className="h-3 w-16 bg-indigo-500/30 rounded" />
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-7 hover:bg-muted/50 rounded-lg flex items-center px-3 gap-2">
                      <div className="h-4 w-4 bg-muted-foreground/30 rounded" />
                      <div className="h-2.5 w-20 bg-muted-foreground/20 rounded" />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Dashboard Content */}
              <div className="flex-1 p-6 space-y-6 overflow-hidden">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="h-4 w-28 bg-foreground/30 rounded" />
                    <div className="h-2.5 w-48 bg-muted-foreground/20 rounded" />
                  </div>
                  <div className="h-8 w-24 bg-indigo-600/10 border border-indigo-500/20 rounded-lg" />
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Active Projects', val: '12', color: 'indigo' },
                    { label: 'Total Expenses', val: '$42,500', color: 'purple' },
                    { label: 'Outstanding Balance', val: '$18,900', color: 'pink' }
                  ].map((stat, i) => (
                    <div key={i} className="border border-border/50 bg-card p-4 rounded-xl shadow-sm space-y-2">
                      <div className="h-2 w-16 bg-muted-foreground/30 rounded" />
                      <div className="h-6 w-20 bg-foreground/80 rounded" />
                      <div className="h-2 w-24 bg-muted-foreground/20 rounded" />
                    </div>
                  ))}
                </div>
                
                {/* Visual Chart Placeholder */}
                <div className="border border-border bg-card rounded-xl p-4 flex-1 flex flex-col justify-end gap-2 h-40">
                  <div className="flex justify-between items-end gap-1.5 h-full">
                    {[35, 60, 45, 80, 55, 90, 70, 85, 100].map((h, idx) => (
                      <div 
                        key={idx} 
                        className="w-full bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-20 md:py-32 border-t border-border/40 bg-muted/10">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Engineered Specially for Builders & General Contractors
            </h2>
            <p className="text-muted-foreground text-lg">
              Say goodbye to messy spreadsheets, missing receipts, and mismanaged materials.
            </p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16"
          >
            {[
              {
                icon: Compass,
                title: 'Project Orchestration',
                desc: 'Plan, update, and manage construction projects seamlessly. Allocate engineers and track visual completion metrics.'
              },
              {
                icon: Receipt,
                title: 'Granular Expense Auditing',
                desc: 'Categorize spending across labour, materials, machinery, fuel, and transport. Site engineers upload receipts in real-time.'
              },
              {
                icon: FileSpreadsheet,
                title: 'Material Ledger Tracking',
                desc: 'Keep exhaustive ledgers for steel, cement, bricks, and resources. Track units, unit costs, and suppliers per project.'
              },
              {
                icon: TrendingUp,
                title: 'Real-time Profit Intelligence',
                desc: 'Automatic accounting equations compute gross margins. Instantly map payments received vs. costs accumulated.'
              },
              {
                icon: Users,
                title: 'Multi-Tenant Security',
                desc: 'Strict role levels keep Super Admins, Contractor Owners, and Site Engineers in clear, secure information boundaries.'
              },
              {
                icon: FileCheck,
                title: 'Exportable Site Audits',
                desc: 'Compile and download clean Project Summaries, Profitability, and Expense sheets in PDF/Excel format.'
              }
            ].map((feat, idx) => (
              <motion.div key={idx} variants={itemVariants}>
                <Card className="h-full border border-border/50 bg-card/60 backdrop-blur-sm hover:border-indigo-500/30 hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-4 dark:bg-indigo-500/5">
                      <feat.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-xl">{feat.title}</CardTitle>
                    <CardDescription className="text-sm pt-2 leading-relaxed">{feat.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-32 border-t border-border/40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Flexible Plans Crafted for Every Scale
            </h2>
            <p className="text-muted-foreground text-lg">
              Select the plan that matches your current pipeline. All plans include standard platform updates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-5xl mx-auto">
            {[
              {
                name: 'Starter',
                price: '$49',
                desc: 'Best for individual builders managing single projects.',
                features: ['3 Active Projects', '2 User Profiles', 'Standard Expense Tracking', 'Email Support']
              },
              {
                name: 'Professional',
                price: '$149',
                desc: 'Designed for growing contracting firms and contractors.',
                features: ['20 Active Projects', '5 User Profiles', 'Full Material Ledgers', 'Priority Email Support', 'Custom Exportable Audits'],
                popular: true
              },
              {
                name: 'Business',
                price: '$299',
                desc: 'Ideal for major companies and multi-site contractors.',
                features: ['Unlimited Projects', 'Unlimited Users', 'All Core Modules', '24/7 Priority Support', 'API Access', 'Premium Account Manager']
              }
            ].map((plan, idx) => (
              <div 
                key={idx}
                className={`relative rounded-2xl border bg-card p-8 shadow-sm flex flex-col justify-between ${
                  plan.popular 
                    ? 'border-indigo-600 dark:border-indigo-400 ring-1 ring-indigo-600 dark:ring-indigo-400' 
                    : 'border-border/60'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white dark:bg-indigo-400 dark:text-black text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-xl">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{plan.desc}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                    <span className="text-sm font-semibold text-muted-foreground">/mo</span>
                  </div>
                  <ul className="mt-8 space-y-3.5">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-8">
                  <Link href="/signup">
                    <Button 
                      className={`w-full py-6 rounded-xl text-sm font-semibold ${
                        plan.popular
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                          : 'bg-muted hover:bg-muted/80 text-foreground'
                      }`}
                    >
                      Start Free Trial
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 md:py-32 border-t border-border/40 bg-muted/10">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Got questions about SitePilot? We have answers.</p>
          </div>

          <div className="mt-16 space-y-6">
            {[
              {
                q: 'What is the role partition between Contractor and Site Engineer?',
                a: 'Contractor Owners have absolute clearance inside their companies, allowing them to manage user access, accounting, reports, and payments. Site Engineers have restricted portal viewports, letting them register material entries, expenses, and upload files only on projects assigned to them.'
              },
              {
                q: 'How does multi-tenant isolation work?',
                a: 'SitePilot uses PostgreSQL Row Level Security (RLS) policies at the database layer. This ensures that even though data is housed inside a shared database cluster, any database query is automatically checked for company isolation boundaries, making crossover access impossible.'
              },
              {
                q: 'Is there a setup fee or custom implementation cost?',
                a: 'No. SitePilot is fully cloud-hosted. You can set up your company profile and register your team members in under 5 minutes.'
              }
            ].map((faq, idx) => (
              <div key={idx} className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold text-lg text-foreground">{faq.q}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mt-2">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 border-t border-border/40 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-purple-500/5 -z-10" />
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto">
            Ready to Bring Precision to Your Construction Operations?
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mt-6">
            Start organizing your materials, logs, and profitability reporting today. Register your company profile.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-6 px-8 text-base">
                Create Trial Account
              </Button>
            </Link>
            <Link href="/book-demo">
              <Button size="lg" variant="ghost" className="w-full sm:w-auto hover:bg-muted/50 rounded-xl py-6 px-8 text-base gap-2 border border-border">
                Speak with Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
