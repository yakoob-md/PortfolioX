'use client'

import { useFundStore, type FundData } from '@/lib/store'
import { formatCurrency, formatAUM, formatPercent } from '@/lib/helpers'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useMemo, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, BarChart3, DollarSign, Activity, PieChart,
  ArrowUpRight, ArrowDownRight, Wallet, Landmark, Percent, Users,
} from 'lucide-react'
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
} from 'recharts'

// ─── Simulated Market Data ────────────────────────────────────────────────────

interface MarketIndex {
  id: string
  name: string
  value: number
  change: number
  sparkline: { day: number; value: number }[]
}

function generateSparkline(base: number, volatility: number, days: number): { day: number; value: number }[] {
  const data: { day: number; value: number }[] = []
  let current = base * (1 - volatility * 2)
  for (let i = 0; i < days; i++) {
    current += (Math.random() - 0.45) * volatility * base * 0.15
    current = Math.max(current, base * 0.7)
    current = Math.min(current, base * 1.3)
    data.push({ day: i + 1, value: Math.round(current * 100) / 100 })
  }
  // Ensure the last value is close to the actual value
  data[days - 1].value = base
  return data
}

const SIMULATED_INDICES: MarketIndex[] = [
  {
    id: 'nifty50',
    name: 'Nifty 50',
    value: 22456.8,
    change: 0.87,
    sparkline: generateSparkline(22456.8, 0.03, 30),
  },
  {
    id: 'sensex',
    name: 'Sensex',
    value: 73852.94,
    change: 0.72,
    sparkline: generateSparkline(73852.94, 0.03, 30),
  },
  {
    id: 'niftymidcap',
    name: 'Nifty Midcap 100',
    value: 48234.55,
    change: -0.34,
    sparkline: generateSparkline(48234.55, 0.04, 30),
  },
  {
    id: 'bond10y',
    name: '10Y Govt Bond Yield',
    value: 7.12,
    change: -0.05,
    sparkline: generateSparkline(7.12, 0.01, 30),
  },
]

// ─── Category Performance ─────────────────────────────────────────────────────

interface CategoryPerf {
  category: string
  avgReturn1y: number
  avgReturn3y: number
  fundCount: number
  totalAum: number
}

const CATEGORY_ORDER = ['Large Cap', 'Mid Cap', 'Small Cap', 'Flexi Cap', 'ELSS', 'Debt', 'Hybrid']

const CATEGORY_COLORS: Record<string, string> = {
  'Large Cap': 'from-emerald-500/10 to-emerald-600/5',
  'Mid Cap': 'from-teal-500/10 to-teal-600/5',
  'Small Cap': 'from-amber-500/10 to-amber-600/5',
  'Flexi Cap': 'from-cyan-500/10 to-cyan-600/5',
  'ELSS': 'from-rose-500/10 to-rose-600/5',
  'Debt': 'from-violet-500/10 to-violet-600/5',
  'Hybrid': 'from-orange-500/10 to-orange-600/5',
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Large Cap': Landmark,
  'Mid Cap': BarChart3,
  'Small Cap': TrendingUp,
  'Flexi Cap': PieChart,
  'ELSS': Percent,
  'Debt': Wallet,
  'Hybrid': Activity,
}

function computeCategoryPerformance(funds: FundData[]): CategoryPerf[] {
  const categoryMap = new Map<string, { returns1y: number[]; returns3y: number[]; aum: number }>()

  for (const fund of funds) {
    const cat = fund.subCategory || fund.category
    // Map to our expected categories
    const mappedCat = mapSubCategory(cat)
    if (!mappedCat) continue

    const existing = categoryMap.get(mappedCat) || { returns1y: [], returns3y: [], aum: 0 }
    if (fund.directReturn1y !== null) existing.returns1y.push(fund.directReturn1y)
    if (fund.directReturn3y !== null) existing.returns3y.push(fund.directReturn3y)
    existing.aum += fund.aumCrore
    categoryMap.set(mappedCat, existing)
  }

  return CATEGORY_ORDER.map((category) => {
    const data = categoryMap.get(category) || { returns1y: [], returns3y: [], aum: 0 }
    return {
      category,
      avgReturn1y: data.returns1y.length > 0 ? data.returns1y.reduce((a, b) => a + b, 0) / data.returns1y.length : 0,
      avgReturn3y: data.returns3y.length > 0 ? data.returns3y.reduce((a, b) => a + b, 0) / data.returns3y.length : 0,
      fundCount: data.returns1y.length,
      totalAum: data.aum,
    }
  })
}

function mapSubCategory(sub: string): string | null {
  const lower = sub.toLowerCase()
  if (lower.includes('large cap')) return 'Large Cap'
  if (lower.includes('mid cap')) return 'Mid Cap'
  if (lower.includes('small cap')) return 'Small Cap'
  if (lower.includes('flexi cap') || lower.includes('flexicap')) return 'Flexi Cap'
  if (lower.includes('elss')) return 'ELSS'
  if (lower.includes('debt') || lower.includes('liquid') || lower.includes('money market') || lower.includes('overnight') || lower.includes('gilt') || lower.includes('corporate bond') || lower.includes('banking') || lower.includes('short') || lower.includes('medium') || lower.includes('long')) return 'Debt'
  if (lower.includes('hybrid') || lower.includes('balanced') || lower.includes('conservative') || lower.includes('aggressive hybrid')) return 'Hybrid'
  // Fallback by category
  if (lower === 'equity') return 'Large Cap'
  if (lower === 'debt') return 'Debt'
  if (lower === 'hybrid') return 'Hybrid'
  return null
}

// ─── Animated Counter Hook ─────────────────────────────────────────────────────

function useAnimatedCounter(target: number, duration = 1200, decimals = 0): number {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const startValue = 0

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const value = startValue + (target - startValue) * eased
      setCurrent(Number(value.toFixed(decimals)))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [target, duration, decimals])

  return current
}

// ─── Sparkline Mini Component ──────────────────────────────────────────────────

function SparklineMini({ data, positive }: { data: { day: number; value: number }[]; positive: boolean }) {
  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={positive ? '#10b981' : '#ef4444'}
            strokeWidth={1.5}
            dot={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontSize: '10px',
              color: 'var(--card-foreground)',
            }}
            formatter={(value: number) => [value.toLocaleString('en-IN', { maximumFractionDigits: 2 }), '']}
            labelFormatter={() => ''}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function MarketDashboard() {
  const { funds, fetchFunds } = useFundStore()
  const [indices] = useState(SIMULATED_INDICES)

  useEffect(() => {
    if (funds.length === 0) {
      fetchFunds()
    }
  }, [funds.length, fetchFunds])

  // ─── Computed Data ───────────────────────────────────────────────────────────
  const categoryPerf = useMemo(() => computeCategoryPerformance(funds), [funds])

  const topMovers = useMemo(() => {
    const withReturns = funds
      .filter((f) => f.directReturn1y !== null)
      .map((f) => ({
        id: f.id,
        name: f.schemeName,
        return1y: f.directReturn1y!,
        expenseDiff: Math.round((f.regularExpenseRatio - f.directExpenseRatio) * 100),
      }))
      .sort((a, b) => b.return1y - a.return1y)

    return {
      best: withReturns.slice(0, 5),
      worst: withReturns.slice(-5).reverse(),
    }
  }, [funds])

  const quickStats = useMemo(() => {
    const totalFunds = funds.length
    const totalAum = funds.reduce((sum, f) => sum + f.aumCrore, 0)
    const avgDirectSaving = funds.length > 0
      ? funds.reduce((sum, f) => sum + (f.regularExpenseRatio - f.directExpenseRatio), 0) / funds.length
      : 0
    const avgExpenseDiff = funds.length > 0
      ? funds.reduce((sum, f) => sum + (f.regularExpenseRatio - f.directExpenseRatio) * 100, 0) / funds.length
      : 0

    return { totalFunds, totalAum, avgDirectSaving, avgExpenseDiff }
  }, [funds])

  // Animated counters
  const animatedTotalFunds = useAnimatedCounter(quickStats.totalFunds, 1000, 0)
  const animatedExpenseDiff = useAnimatedCounter(quickStats.avgExpenseDiff, 1200, 1)

  // ─── Color coding for category performance ──────────────────────────────────
  const getPerfColor = useCallback((value: number, allValues: number[]) => {
    if (allValues.length === 0) return 'text-muted-foreground'
    const sorted = [...allValues].sort((a, b) => a - b)
    const idx = sorted.findIndex((v) => v >= value)
    const percentile = idx / sorted.length
    if (percentile >= 0.75) return 'text-emerald-500'
    if (percentile >= 0.5) return 'text-emerald-500/70'
    if (percentile >= 0.25) return 'text-amber-500'
    return 'text-red-500'
  }, [])

  const all1yReturns = categoryPerf.map((c) => c.avgReturn1y).filter((v) => v !== 0)

  return (
    <div className="space-y-8 pb-12">
      {/* Header with Glass effect */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-emerald-500" />
            </div>
            Market Insight
          </h2>
          <p className="text-sm font-medium text-muted-foreground/70 mt-2 max-w-md">
            Real-time mutual fund category analytics and institutional-grade market indicators.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl glass border-emerald-500/10">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Last Updated:</span>
          <span className="text-xs font-bold text-foreground">Just Now</span>
        </div>
      </div>

      {/* ─── Quick Stats - Glass Cards ────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Funds Analyzed',
            value: animatedTotalFunds,
            suffix: '',
            icon: Users,
            color: 'text-emerald-500',
            glow: 'card-glow-emerald'
          },
          {
            label: 'Network AUM',
            value: formatAUM(quickStats.totalAum),
            isText: true,
            icon: DollarSign,
            color: 'text-teal-500',
            glow: 'card-glow-emerald'
          },
          {
            label: 'Direct Advantage',
            value: quickStats.avgDirectSaving.toFixed(2),
            suffix: '%',
            isText: true,
            icon: TrendingUp,
            color: 'text-emerald-500',
            glow: 'card-glow-emerald'
          },
          {
            label: 'Comm. Leakage',
            value: animatedExpenseDiff,
            suffix: ' bps',
            icon: Percent,
            color: 'text-amber-500',
            glow: 'card-glow-emerald'
          },
        ].map((stat, idx) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`glass-card rounded-2xl p-5 ${stat.glow}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`h-8 w-8 rounded-lg bg-background/50 flex items-center justify-center border border-border/40`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</span>
              </div>
              <p className={`text-2xl font-black ${stat.color} tracking-tight`}>
                {stat.isText ? stat.value : stat.value}{stat.suffix}
              </p>
            </motion.div>
          )
        })}
      </div>

      {/* ─── Market Indices ───────────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-6 dark:border-white/10 border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Institutional Indices
            </h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Simulated Real-Time Benchmarks</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="rounded-lg bg-background/40">Equity</Badge>
            <Badge variant="outline" className="rounded-lg bg-background/40">Debt</Badge>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {indices.map((index, idx) => {
            const isPositive = index.change >= 0
            return (
              <motion.div
                key={index.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="flex items-center justify-between rounded-2xl border border-border/40 bg-background/20 p-4 hover:bg-background/40 transition-all hover:shadow-lg group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter truncate">{index.name}</p>
                  <p className="text-lg font-black text-foreground mt-0.5 tracking-tight">
                    {index.id === 'bond10y' ? `${index.value.toFixed(2)}%` : index.value.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {isPositive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                    </div>
                    <span className={`text-[11px] font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                      {isPositive ? '+' : ''}{index.change.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="group-hover:scale-110 transition-transform">
                  <SparklineMini data={index.sparkline} positive={isPositive} />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ─── Category Performance Summary ─────────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-6 dark:border-white/10 border-border">
        <div className="flex items-center gap-3 mb-8">
           <div className="h-10 w-10 rounded-2xl bg-teal-500/10 flex items-center justify-center">
             <PieChart className="h-5 w-5 text-teal-500" />
           </div>
           <div>
             <h3 className="font-bold text-lg">Category Performance Matrix</h3>
             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Aggregated Asset Class Returns</p>
           </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categoryPerf.map((cat, idx) => {
            const Icon = CATEGORY_ICONS[cat.category] || BarChart3
            const return1yColor = getPerfColor(cat.avgReturn1y, all1yReturns)
            const isPositive = cat.avgReturn1y >= 0

            return (
              <motion.div
                key={cat.category}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.04 }}
                className="relative overflow-hidden group"
              >
                <div className="glass-card rounded-2xl p-5 dark:border-white/5 border-border hover:dark:border-white/20 hover:border-primary/20 transition-all hover:shadow-xl">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/50 border border-border/40 group-hover:bg-teal-500/10 transition-colors">
                        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-teal-500 transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground leading-none">{cat.category}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5">{cat.fundCount} funds</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-background/30 border border-border/20">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Avg 1Y</span>
                      <p className={`text-sm font-black ${return1yColor} mt-1 flex items-center gap-0.5`}>
                        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {formatPercent(cat.avgReturn1y)}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-background/30 border border-border/20">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Avg 3Y</span>
                      <p className={`text-sm font-black ${cat.avgReturn3y >= 0 ? 'text-emerald-500' : 'text-red-500'} mt-1`}>
                        {formatPercent(cat.avgReturn3y)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total AUM</span>
                    <span className="text-xs font-black text-foreground">{formatAUM(cat.totalAum)}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ─── Top Movers ───────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Best Performers */}
        <div className="glass-card rounded-3xl p-6 dark:border-emerald-500/10 border-emerald-200/50 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="h-40 w-40 text-emerald-500" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Top Alpha Generators</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Best Performing Schemes (1Y)</p>
              </div>
            </div>

            <div className="space-y-3">
              {topMovers.best.map((fund, idx) => (
                <motion.div
                  key={fund.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between rounded-2xl border border-border/40 bg-background/20 p-4 hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all hover:shadow-lg group"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-xs font-black text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/20">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{fund.name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                         Leakage Revoked: <span className="text-emerald-500">{fund.expenseDiff} bps</span>
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black px-3 py-1 rounded-xl border-emerald-500/20 ml-4 shrink-0">
                    {formatPercent(fund.return1y)}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Performers */}
        <div className="glass-card rounded-3xl p-6 dark:border-red-500/10 border-red-200/50 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingDown className="h-40 w-40 text-red-500" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-red-600/80">Laggard Analysis</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Bottom Performing Schemes (1Y)</p>
              </div>
            </div>

            <div className="space-y-3">
              {topMovers.worst.map((fund, idx) => (
                <motion.div
                  key={fund.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between rounded-2xl border border-border/40 bg-background/20 p-4 hover:bg-red-500/5 hover:border-red-500/20 transition-all hover:shadow-lg group"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 text-xs font-black text-red-600 dark:text-red-400 shrink-0 border border-red-500/20">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{fund.name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                         Fee Impact: <span className="text-red-500">{fund.expenseDiff} bps</span>
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-black px-3 py-1 rounded-xl border-red-500/20 ml-4 shrink-0">
                    {formatPercent(fund.return1y)}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
