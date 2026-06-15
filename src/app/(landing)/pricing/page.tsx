'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import Link from 'next/link'

export default function PricingPage() {
  return (
    <div className="relative overflow-hidden bg-background py-20 md:py-32">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[100px] -z-10 dark:bg-indigo-500/5" />
      
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Plans for Builders of All Sizes
          </h1>
          <p className="text-muted-foreground text-lg">
            Choose a plan that matches your project pipeline. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-5xl mx-auto">
          {[
            {
              name: 'Starter',
              price: '$49',
              desc: 'Best for individual builders managing single projects.',
              features: [
                'Up to 3 Active Projects',
                '2 User Profiles',
                'Standard Expense Log',
                'Basic Material Ledgers',
                'Email Support'
              ]
            },
            {
              name: 'Professional',
              price: '$149',
              desc: 'Designed for growing contracting firms and builders.',
              features: [
                'Up to 20 Active Projects',
                '5 User Profiles',
                'Full Material & Expense Ledgers',
                'Supplier Outstanding Tracking',
                'Client Receivable Auditing',
                'Exportable Statements (PDF/Excel)',
                'Priority Email Support'
              ],
              popular: true
            },
            {
              name: 'Business',
              price: '$299',
              desc: 'Ideal for major companies and multi-site contractors.',
              features: [
                'Unlimited Active Projects',
                'Unlimited User Profiles',
                'All Core Modules & Analytics',
                'Advanced Reporting',
                '24/7 Priority Support',
                'Custom Integrations API'
              ]
            }
          ].map((plan, idx) => (
            <motion.div 
              key={idx}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative rounded-2xl border bg-card p-8 shadow-sm flex flex-col justify-between ${
                plan.popular 
                  ? 'border-indigo-600 dark:border-indigo-400 ring-1 ring-indigo-600 dark:ring-indigo-400 shadow-md' 
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
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
