'use client'

import { useFundStore } from '@/lib/store'
import { TrendingUp, Search, Briefcase, ArrowRight, Shield, Calculator, BarChart3, Target, Activity, PieChart, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useRef } from 'react'

function AnimatedCounter({ target, prefix = '₹', suffix = 'L' }: { target: number; prefix?: string; suffix?: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const controls = animate(count, target, {
      duration: 2,
      ease: 'easeOut',
    })
    return controls.stop
  }, [target, count])

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${v.toLocaleString('en-IN')}${suffix}`
      }
    })
    return unsubscribe
  }, [rounded, prefix, suffix])

  return <span ref={ref}>{prefix}0{suffix}</span>
}

const features = [
  { icon: Search, label: 'Explore 71+ Funds', tab: 'explore' as const },
  { icon: Activity, label: 'Market Dashboard', tab: 'market' as const },
  { icon: Shield, label: 'Risk Profiler', tab: 'risk' as const },
  { icon: Calculator, label: 'SIP/STP/SWP Planner', tab: 'sip' as const },
  { icon: BarChart3, label: 'Stress Test', tab: 'stress' as const },
  { icon: Target, label: 'Goal Planning', tab: 'goals' as const },
  { icon: PieChart, label: 'Sector Exposure', tab: 'sector' as const },
  { icon: TrendingUp, label: 'NAV History', tab: 'nav' as const },
]

export default function HeroSection() {
  const setActiveTab = useFundStore(s => s.setActiveTab)

  return (
    <section className="relative overflow-hidden mesh-gradient py-16 lg:py-24">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
            rotate: [0, 45, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-emerald-500/20 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.05, 0.15, 0.05],
            rotate: [45, 0, 45]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-teal-500/20 rounded-full blur-[120px]" 
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          {/* Left content */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                <div className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="tracking-wide uppercase text-[10px]">AI-Powered Insights</span>
                <span className="h-3 w-px bg-emerald-500/30 mx-1" />
                <span className="text-xs">20+ Institutional Grade Tools</span>
              </div>
            </motion.div>

            <div className="space-y-4">
              <motion.h1
                className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
              >
                <span className="text-gradient">Stop Losing</span>
                <br />
                <span className="text-gradient-emerald">Wealth to Fees</span>
              </motion.h1>

              <motion.p
                className="max-w-lg text-lg text-muted-foreground/80 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                90% of Indian mutual fund investors are overpaying by <strong>₹1.2L+ yearly</strong> on commissions. 
                Our co-pilot reveals the hidden cost of Regular plans and helps you switch to Direct — saving you millions.
              </motion.p>
            </div>

            {/* Key stats with glass cards */}
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="glass-card rounded-2xl p-4 group hover:border-emerald-500/30 transition-colors">
                <p className="text-3xl font-black text-red-500/80 tracking-tighter">0.86%</p>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-1">Avg. Leakage</p>
              </div>
              <div className="glass-card rounded-2xl p-4 group hover:border-emerald-500/30 transition-colors">
                <p className="text-3xl font-black text-emerald-500 tracking-tighter">
                  <AnimatedCounter target={20} suffix=".9L" />
                </p>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-1">Direct Savings</p>
              </div>
              <div className="glass-card rounded-2xl p-4 group hover:border-emerald-500/30 transition-colors col-span-2 sm:col-span-1">
                <p className="text-3xl font-black text-amber-500 tracking-tighter">73%</p>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-1">Unaware Investors</p>
              </div>
            </motion.div>

            <motion.div
              className="flex flex-wrap gap-4 pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Button 
                onClick={() => {
                  setActiveTab('explore')
                  setTimeout(() => {
                    document.getElementById('explore-section')?.scrollIntoView({ behavior: 'smooth' })
                  }, 100)
                }} 
                className="rounded-2xl px-8 h-14 text-base font-bold bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 group"
              >
                <Search className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Start Exploring
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" onClick={() => setActiveTab('portfolio')} className="rounded-2xl px-8 h-14 text-base font-bold glass hover:bg-muted/50">
                <Briefcase className="mr-2 h-5 w-5" />
                Build Portfolio
              </Button>
            </motion.div>
          </div>

          {/* Right - Visual comparison card with "Float" animation */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="absolute -inset-4 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none" />
            <div className="relative glass-card rounded-3xl p-8 shadow-2xl border-white/20">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-xl tracking-tight">The "Silent" Tax</h3>
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-emerald-500" />
                </div>
              </div>

              <div className="space-y-6">
                {/* Regular plan - Loss state */}
                <div className="relative p-5 rounded-2xl border bg-background/40 border-red-500/10 group overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingDown className="h-20 w-20 text-red-500" />
                  </div>
                  <div className="relative flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-red-500/70">Regular Plan</span>
                      <h4 className="text-2xl font-black text-foreground/90 mt-1">₹35.6 Lakhs</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase">Expense Ratio</p>
                      <p className="text-lg font-bold text-red-500/80">1.75%</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '60%' }}
                        transition={{ duration: 1, delay: 0.8 }}
                        className="h-full bg-red-500/50" 
                      />
                    </div>
                    <span className="text-[10px] font-medium text-red-500/70 shrink-0">₹1.75L Yearly Cost</span>
                  </div>
                </div>

                {/* Connection line */}
                <div className="flex flex-col items-center gap-1 opacity-40">
                   <div className="h-4 w-px bg-gradient-to-b from-red-500 to-emerald-500" />
                   <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">The Upgrade</span>
                   <div className="h-4 w-px bg-gradient-to-b from-red-500 to-emerald-500" />
                </div>

                {/* Direct plan - Gain state */}
                <div className="relative p-5 rounded-2xl border bg-emerald-500/5 border-emerald-500/20 group overflow-hidden card-glow-emerald">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingUp className="h-20 w-20 text-emerald-500" />
                  </div>
                  <div className="relative flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Direct Plan</span>
                      <h4 className="text-2xl font-black text-foreground mt-1 text-gradient-emerald">₹42.0 Lakhs</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase">Expense Ratio</p>
                      <p className="text-lg font-bold text-emerald-500">0.80%</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1.2, delay: 1 }}
                        className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                      />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-500 shrink-0">+ ₹6.4L Total Alpha</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-4 px-2">
                <div className="flex -space-x-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-muted" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Join <span className="font-bold text-foreground">12,000+</span> investors maximizing their wealth.</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Dynamic Feature Ribbon */}
        <div className="mt-16 pt-8 border-t border-foreground/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center mb-8">Integrated Analysis Ecosystem</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {features.map((feature, i) => (
              <motion.button
                key={feature.label}
                onClick={() => setActiveTab(feature.tab)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.05 }}
                className="group flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-card transition-all hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-1"
              >
                <div className="h-10 w-10 rounded-xl bg-muted group-hover:bg-emerald-500/10 flex items-center justify-center transition-colors">
                  <feature.icon className="h-5 w-5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground transition-colors text-center">{feature.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
