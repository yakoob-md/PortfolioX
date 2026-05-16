'use client'

import { type FundData } from '@/lib/store'
import {
  formatCurrency, formatCurrencyFull, formatPercent,
  formatSharpe, formatTrackingError, getRiskAdjustedColor,
  getRiskColor, getCategoryColor, formatAUM, expenseRatioDiff,
} from '@/lib/helpers'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts'
import { motion } from 'framer-motion'
import {
  TrendingUp, Shield, AlertTriangle, CheckCircle2,
  Info, Users, CalendarDays, BarChart3, Briefcase, Scale,
  ChevronRight, ExternalLink,
} from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'

// ─── Props ───────────────────────────────────────────────────────────────────

interface FundDetailProps {
  fund: FundData
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EXPECTED_RETURN_BY_CATEGORY: Record<string, number> = {
  Equity: 12, ELSS: 12, Index: 11, Hybrid: 9, Debt: 7,
}

function calcLifetimeSavings(
  directER: number, regularER: number, category: string,
): Record<string, Record<string, number>> {
  const amounts = ['100000', '500000', '1000000', '5000000', '10000000']
  const years = ['3', '5', '10', '15', '20', '30']
  const expected = EXPECTED_RETURN_BY_CATEGORY[category] || 10
  const result: Record<string, Record<string, number>> = {}
  for (const amt of amounts) {
    result[amt] = {}
    const pv = parseFloat(amt)
    for (const yr of years) {
      const n = parseInt(yr)
      const dRate = (expected - directER) / 100
      const rRate = (expected - regularER) / 100
      result[amt][yr] = Math.round(pv * Math.pow(1 + dRate, n) - pv * Math.pow(1 + rRate, n))
    }
  }
  return result
}

function amtLabel(key: string): string {
  const n = parseInt(key)
  if (n >= 10000000) return `₹${n / 10000000} Cr`
  if (n >= 100000) return `₹${n / 100000} L`
  return `₹${n.toLocaleString('en-IN')}`
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899']

// ─── Animation variants ─────────────────────────────────────────────────────

const sectionVar = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FundDetail({ fund, open, onOpenChange }: FundDetailProps) {
  const [activeSection, setActiveSection] = useState('overview')
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Derived data
  const expDiffBps = expenseRatioDiff(fund?.directExpenseRatio ?? 0, fund?.regularExpenseRatio ?? 0)
  const lifetimeSavings = useMemo(
    () => calcLifetimeSavings(fund?.directExpenseRatio ?? 0, fund?.regularExpenseRatio ?? 0, fund?.category || 'Equity'),
    [fund?.directExpenseRatio, fund?.regularExpenseRatio, fund?.category],
  )

  // Allocation data for pie chart
  const allocationData = useMemo(() => {
    const items: { name: string; value: number }[] = []
    if (fund?.equityPercentage && fund.equityPercentage > 0) items.push({ name: 'Equity', value: fund.equityPercentage })
    if (fund?.debtPercentage && fund.debtPercentage > 0) items.push({ name: 'Debt', value: fund.debtPercentage })
    const accounted = items.reduce((s, i) => s + i.value, 0)
    if (accounted < 100 && accounted > 0) items.push({ name: 'Others', value: Math.round(100 - accounted) })
    if (items.length === 0) items.push({ name: 'N/A', value: 100 })
    return items
  }, [fund?.equityPercentage, fund?.debtPercentage])

  // Benchmark comparison rows
  const benchmarkRows = useMemo(() => {
    const rows: { period: string; direct: number | null; regular: number | null; benchmark: number | null }[] = [
      { period: '1 Year', direct: fund?.directReturn1y ?? null, regular: fund?.regularReturn1y ?? null, benchmark: fund?.benchmarkReturn1y ?? null },
      { period: '3 Years', direct: fund?.directReturn3y ?? null, regular: fund?.regularReturn3y ?? null, benchmark: fund?.benchmarkReturn3y ?? null },
      { period: '5 Years', direct: fund?.directReturn5y ?? null, regular: fund?.regularReturn5y ?? null, benchmark: fund?.benchmarkReturn5y ?? null },
    ]
    return rows
  }, [fund])

  // Expense ratio bar widths (max 3% scale)
  const maxER = 3
  const directERWidth = Math.min(((fund?.directExpenseRatio ?? 0) / maxER) * 100, 100)
  const regularERWidth = Math.min(((fund?.regularExpenseRatio ?? 0) / maxER) * 100, 100)

  // Recommendation
  const recommendation = useMemo(() => {
    if (expDiffBps <= 0) return { text: 'Direct and Regular plans have similar costs.', type: 'neutral' as const }
    if (expDiffBps < 50) return { text: `Small saving of ${expDiffBps} bps with Direct. Consider switching if you're comfortable managing investments yourself.`, type: 'low' as const }
    if (expDiffBps < 100) return { text: `Moderate saving of ${expDiffBps} bps with Direct plan. Switching is recommended — you'll save meaningfully over time without any change in fund management.`, type: 'medium' as const }
    return { text: `Significant saving of ${expDiffBps} bps with Direct plan. Strongly recommend switching — you're paying extra for the same fund with no additional benefit.`, type: 'high' as const }
  }, [expDiffBps])

  const recColorMap = {
    neutral: 'bg-muted text-muted-foreground',
    low: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
    medium: 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
    high: 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300',
  }

  const recIconMap = {
    neutral: <Info className="h-5 w-5 shrink-0" />,
    low: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />,
    medium: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />,
    high: <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />,
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={`${isMobile ? 'h-[92vh] rounded-t-2xl' : 'sm:max-w-xl md:max-w-2xl lg:max-w-3xl'} p-0 gap-0 overflow-hidden`}
      >
        <ScrollArea className="h-full">
          {/* ── Header ────────────────────────────────────────────────── */}
          <SheetHeader className="p-6 pb-4 space-y-3 border-b bg-gradient-to-b from-emerald-50/50 to-transparent dark:from-emerald-950/20">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-lg font-bold leading-tight text-foreground">
                  {fund.schemeName}
                </SheetTitle>
                <SheetDescription className="mt-1 text-sm text-muted-foreground">
                  {fund.fundHouse}
                </SheetDescription>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className={`text-[11px] px-2 ${getCategoryColor(fund.category)}`}>
                {fund.category}
              </Badge>
              <Badge variant="outline" className="text-[11px] px-2 bg-muted text-muted-foreground">
                {fund.subCategory}
              </Badge>
              <Badge variant="outline" className={`text-[11px] px-2 ${getRiskColor(fund.riskometer)}`}>
                {fund.riskometer}
              </Badge>
              <Badge variant="outline" className="text-[11px] px-2 bg-muted text-muted-foreground">
                {fund.benchmark}
              </Badge>
            </div>
          </SheetHeader>

          {/* ── Tabs ──────────────────────────────────────────────────── */}
          <div className="px-6 pt-4">
            <Tabs value={activeSection} onValueChange={setActiveSection}>
              <TabsList className="w-full h-auto flex-wrap gap-1">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="portfolio" className="text-xs">Portfolio</TabsTrigger>
                <TabsTrigger value="benchmark" className="text-xs">Benchmark</TabsTrigger>
                <TabsTrigger value="savings" className="text-xs">Savings</TabsTrigger>
                <TabsTrigger value="recommend" className="text-xs">Switch?</TabsTrigger>
              </TabsList>

              {/* ═══════ OVERVIEW TAB ═══════ */}
              <TabsContent value="overview" className="mt-4 space-y-5 pb-8">
                {/* Direct vs Regular mini comparison */}
                <motion.div custom={0} variants={sectionVar} initial="hidden" animate="visible" className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Scale className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Direct vs Regular
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Direct */}
                    <div className="rounded-xl bg-emerald-50/80 p-3 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Direct Plan</p>
                      <div className="mt-2 space-y-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Expense Ratio</p>
                          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{fund.directExpenseRatio}%</p>
                          <div className="mt-1 h-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${directERWidth}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className="h-full rounded-full bg-emerald-500"
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">NAV</p>
                          <p className="text-sm font-semibold text-foreground">₹{fund.directNav.toFixed(2)}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <div>
                            <p className="text-[9px] text-muted-foreground">1Y</p>
                            <p className="text-xs font-semibold text-foreground">{formatPercent(fund.directReturn1y)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-muted-foreground">3Y</p>
                            <p className="text-xs font-semibold text-foreground">{formatPercent(fund.directReturn3y)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-muted-foreground">5Y</p>
                            <p className="text-xs font-semibold text-foreground">{formatPercent(fund.directReturn5y)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Regular */}
                    <div className="rounded-xl bg-red-50/80 p-3 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/50">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">Regular Plan</p>
                      <div className="mt-2 space-y-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Expense Ratio</p>
                          <p className="text-xl font-bold text-red-700 dark:text-red-400">{fund.regularExpenseRatio}%</p>
                          <div className="mt-1 h-2 rounded-full bg-red-100 dark:bg-red-900/50 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${regularERWidth}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className="h-full rounded-full bg-red-500"
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">NAV</p>
                          <p className="text-sm font-semibold text-foreground">₹{fund.regularNav.toFixed(2)}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <div>
                            <p className="text-[9px] text-muted-foreground">1Y</p>
                            <p className="text-xs font-semibold text-foreground">{formatPercent(fund.regularReturn1y)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-muted-foreground">3Y</p>
                            <p className="text-xs font-semibold text-foreground">{formatPercent(fund.regularReturn3y)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-muted-foreground">5Y</p>
                            <p className="text-xs font-semibold text-foreground">{formatPercent(fund.regularReturn5y)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Savings callout */}
                  {expDiffBps > 0 && (
                    <div className="rounded-lg bg-amber-50 px-4 py-2.5 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        💰 You save <strong>{expDiffBps} bps/year</strong> with Direct — that&apos;s{' '}
                        <strong>~₹{Math.round(expDiffBps * 50)}/yr</strong> on ₹5L invested
                      </p>
                    </div>
                  )}
                </motion.div>

                <Separator />

                {/* Key Metrics Grid */}
                <motion.div custom={1} variants={sectionVar} initial="hidden" animate="visible">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Key Metrics
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard icon={<Briefcase className="h-4 w-4" />} label="AUM" value={formatAUM(fund.aumCrore)} />
                    <MetricCard icon={<Users className="h-4 w-4" />} label="Fund Manager" value={fund.fundManager || '—'} />
                    <MetricCard icon={<Shield className="h-4 w-4" />} label="Min Investment" value={formatCurrencyFull(fund.minInvestment)} />
                    <MetricCard icon={<CalendarDays className="h-4 w-4" />} label="Launch Date" value={fund.launchDate ? new Date(fund.launchDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'} />
                    <MetricCard icon={<AlertTriangle className="h-4 w-4" />} label="Exit Load" value={fund.exitLoad || 'None'} />
                    <MetricCard icon={<Info className="h-4 w-4" />} label="Tracking Error" value={formatTrackingError(fund.trackingErrorBps)} />
                  </div>
                </motion.div>

                <Separator />

                {/* Risk-Adjusted Returns */}
                <motion.div custom={2} variants={sectionVar} initial="hidden" animate="visible">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Risk-Adjusted Returns (Sharpe Ratio)
                  </h3>
                  <div className="rounded-xl border p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div />
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Direct</p>
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400">Regular</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <p className="text-xs text-muted-foreground text-left">1Y Sharpe</p>
                      <p className={`text-sm font-semibold ${fund.directSharpe1y !== null && fund.regularSharpe1y !== null && fund.directSharpe1y > fund.regularSharpe1y ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                        {formatSharpe(fund.directSharpe1y)}
                      </p>
                      <p className={`text-sm font-semibold ${fund.regularSharpe1y !== null && fund.directSharpe1y !== null && fund.regularSharpe1y > fund.directSharpe1y ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                        {formatSharpe(fund.regularSharpe1y)}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <p className="text-xs text-muted-foreground text-left">3Y Sharpe</p>
                      <p className={`text-sm font-semibold ${fund.directSharpe3y !== null && fund.regularSharpe3y !== null && fund.directSharpe3y > fund.regularSharpe3y ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                        {formatSharpe(fund.directSharpe3y)}
                      </p>
                      <p className={`text-sm font-semibold ${fund.regularSharpe3y !== null && fund.directSharpe3y !== null && fund.regularSharpe3y > fund.directSharpe3y ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                        {formatSharpe(fund.regularSharpe3y)}
                      </p>
                    </div>
                    {fund.directSharpe1y !== null && fund.regularSharpe1y !== null && (
                      <p className="text-xs text-muted-foreground pt-1 border-t">
                        Δ Sharpe (1Y): <span className={getRiskAdjustedColor(fund.directSharpe1y - fund.regularSharpe1y)}>
                          {(fund.directSharpe1y - fund.regularSharpe1y).toFixed(2)}
                        </span>
                      </p>
                    )}
                  </div>
                </motion.div>

                <Separator />

                {/* Tracking Error Explanation */}
                {fund.trackingErrorBps !== null && fund.trackingErrorBps > 0 && (
                  <motion.div custom={3} variants={sectionVar} initial="hidden" animate="visible" className="rounded-xl border border-blue-200/50 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 p-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Tracking Error Explained
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      The Direct and Regular plans of this fund have a tracking error of{' '}
                      <strong className="text-foreground">{formatTrackingError(fund.trackingErrorBps)}</strong>.
                      This means the returns between the two plans deviate by approximately{' '}
                      {fund.trackingErrorBps.toFixed(1)} bps annually. Since both plans hold the same portfolio,
                      this deviation is <em>entirely</em> due to the expense ratio difference — the Regular plan
                      deducts a higher fee (commission to distributors), while the Direct plan passes those savings to you.
                    </p>
                  </motion.div>
                )}
              </TabsContent>

              {/* ═══════ PORTFOLIO TAB ═══════ */}
              <TabsContent value="portfolio" className="mt-4 space-y-5 pb-8">
                {/* Portfolio Characteristics */}
                <motion.div custom={0} variants={sectionVar} initial="hidden" animate="visible">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Portfolio Characteristics
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard icon={<BarChart3 className="h-4 w-4" />} label="P/E Ratio" value={fund.portfolioPeRatio !== null ? fund.portfolioPeRatio.toFixed(1) : '—'} />
                    <MetricCard icon={<BarChart3 className="h-4 w-4" />} label="P/B Ratio" value={fund.portfolioPbRatio !== null ? fund.portfolioPbRatio.toFixed(2) : '—'} />
                    <MetricCard icon={<Users className="h-4 w-4" />} label="No. of Stocks" value={fund.numStocks !== null ? String(fund.numStocks) : '—'} />
                    <MetricCard icon={<Briefcase className="h-4 w-4" />} label="Top Holding" value={fund.topHolding || '—'} sub={fund.topHoldingWeight !== null ? `${fund.topHoldingWeight.toFixed(1)}% weight` : undefined} />
                  </div>
                </motion.div>

                <Separator />

                {/* Allocation Pie Chart */}
                <motion.div custom={1} variants={sectionVar} initial="hidden" animate="visible">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Scale className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Asset Allocation
                  </h3>
                  <div className="rounded-xl border p-4">
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={allocationData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {allocationData.map((_, index) => (
                              <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string) => [`${value}%`, name]}
                            contentStyle={{
                              borderRadius: '8px',
                              fontSize: '12px',
                              border: '1px solid var(--border)',
                              backgroundColor: 'var(--background)',
                              color: 'var(--foreground)',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                      {allocationData.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-1.5 text-xs">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                          <span className="text-muted-foreground">{item.name}</span>
                          <span className="font-semibold text-foreground">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </TabsContent>

              {/* ═══════ BENCHMARK TAB ═══════ */}
              <TabsContent value="benchmark" className="mt-4 space-y-5 pb-8">
                <motion.div custom={0} variants={sectionVar} initial="hidden" animate="visible">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Fund Returns vs Benchmark ({fund.benchmark})
                  </h3>
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Period</TableHead>
                          <TableHead className="text-xs text-center">
                            <span className="text-emerald-600 dark:text-emerald-400">Direct</span>
                          </TableHead>
                          <TableHead className="text-xs text-center">
                            <span className="text-red-600 dark:text-red-400">Regular</span>
                          </TableHead>
                          <TableHead className="text-xs text-center">Benchmark</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {benchmarkRows.map((row) => {
                          const directAlpha = row.direct !== null && row.benchmark !== null ? row.direct - row.benchmark : null
                          const regularAlpha = row.regular !== null && row.benchmark !== null ? row.regular - row.benchmark : null
                          return (
                            <TableRow key={row.period}>
                              <TableCell className="text-xs font-medium">{row.period}</TableCell>
                              <TableCell className="text-xs text-center">
                                <span className="font-semibold">{formatPercent(row.direct)}</span>
                                {directAlpha !== null && (
                                  <span className={`ml-1 text-[10px] ${directAlpha > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                    ({directAlpha > 0 ? '+' : ''}{directAlpha.toFixed(2)}%)
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-center">
                                <span className="font-semibold">{formatPercent(row.regular)}</span>
                                {regularAlpha !== null && (
                                  <span className={`ml-1 text-[10px] ${regularAlpha > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                    ({regularAlpha > 0 ? '+' : ''}{regularAlpha.toFixed(2)}%)
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-center font-semibold text-muted-foreground">
                                {formatPercent(row.benchmark)}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Values in parentheses show alpha (excess return) over the benchmark.
                  </p>
                </motion.div>
              </TabsContent>

              {/* ═══════ SAVINGS TAB ═══════ */}
              <TabsContent value="savings" className="mt-4 space-y-5 pb-8">
                <motion.div custom={0} variants={sectionVar} initial="hidden" animate="visible">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
                    💰 Lifetime Savings with Direct Plan
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Projected savings (Direct vs Regular) based on {EXPECTED_RETURN_BY_CATEGORY[fund.category] || 10}% expected return for {fund.category} funds.
                    Expense ratio difference: <strong className="text-foreground">{expDiffBps} bps</strong>.
                  </p>

                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Investment</TableHead>
                          <TableHead className="text-xs text-center">3Y</TableHead>
                          <TableHead className="text-xs text-center">5Y</TableHead>
                          <TableHead className="text-xs text-center">10Y</TableHead>
                          <TableHead className="text-xs text-center">15Y</TableHead>
                          <TableHead className="text-xs text-center">20Y</TableHead>
                          <TableHead className="text-xs text-center">30Y</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(lifetimeSavings).map(([amtKey, years]) => {
                          const savings = Object.values(years)
                          const maxSaving = Math.max(...savings)
                          return (
                            <TableRow key={amtKey}>
                              <TableCell className="text-xs font-medium">{amtLabel(amtKey)}</TableCell>
                              {Object.entries(years).map(([yr, val]) => (
                                <TableCell key={yr} className="text-xs text-center">
                                  <span className={`font-semibold ${val > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                    {formatCurrency(val)}
                                  </span>
                                  {maxSaving > 0 && val > 0 && (
                                    <div className="mt-0.5 mx-auto w-12 h-1 rounded-full bg-muted overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-emerald-500"
                                        style={{ width: `${(val / maxSaving) * 100}%` }}
                                      />
                                    </div>
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Highlight box for common investment amount */}
                  {lifetimeSavings['500000'] && (
                    <div className="mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50 p-3">
                      <p className="text-xs text-emerald-800 dark:text-emerald-300">
                        💡 On a <strong>₹5 Lakh</strong> investment over <strong>20 years</strong>, the Direct plan saves you approximately{' '}
                        <strong className="text-base">{formatCurrency(lifetimeSavings['500000']['20'])}</strong>{' '}
                        compared to the Regular plan.
                      </p>
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              {/* ═══════ RECOMMEND TAB ═══════ */}
              <TabsContent value="recommend" className="mt-4 space-y-5 pb-8">
                <motion.div custom={0} variants={sectionVar} initial="hidden" animate="visible">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <ChevronRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Switch Recommendation
                  </h3>

                  <div className={`rounded-xl border p-5 space-y-3 ${recColorMap[recommendation.type]}`}>
                    <div className="flex items-start gap-3">
                      {recIconMap[recommendation.type]}
                      <p className="text-sm font-medium leading-relaxed">{recommendation.text}</p>
                    </div>
                  </div>

                  {/* Tradeoffs */}
                  <div className="mt-4 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tradeoffs to Consider</h4>
                    
                    <div className="rounded-xl border p-4 space-y-3">
                      <TradeoffItem
                        icon={<CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                        title="Lower Cost"
                        description={`Direct plan saves ${expDiffBps} bps in expense ratio, compounding to significant savings over time.`}
                      />
                      <TradeoffItem
                        icon={<AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />}
                        title="No Advisory Support"
                        description="Regular plans include distributor commission for advisory services. With Direct, you manage investment decisions yourself."
                      />
                      <TradeoffItem
                        icon={<AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />}
                        title="Tax Implications"
                        description="Switching from Regular to Direct is treated as a redemption + new purchase. Equity fund switches held < 1Y incur 15% STCG; > 1Y incur 10% LTCG (above ₹1L exemption)."
                      />
                      <TradeoffItem
                        icon={<Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                        title="Same Fund Manager & Portfolio"
                        description="Both Direct and Regular plans are managed by the same fund manager with identical portfolios. The only difference is the expense ratio."
                      />
                      {fund.subCategory === 'ELSS' && (
                        <TradeoffItem
                          icon={<AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />}
                          title="ELSS Lock-in"
                          description="ELSS funds have a 3-year lock-in. If switching, the new Direct plan units will start a fresh 3-year lock-in period."
                        />
                      )}
                    </div>
                  </div>

                  {/* Quick action */}
                  <div className="mt-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50 p-4 flex items-center gap-3">
                    <div className="rounded-full bg-emerald-100 dark:bg-emerald-900 p-2">
                      <ExternalLink className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Ready to switch?</p>
                      <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                        Visit your fund house&apos;s website or use a platform like MFUtility, Coin, or Kuvera to switch to Direct plan.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({ icon, label, value, sub }: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="text-sm font-semibold text-foreground truncate" title={value}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

function TradeoffItem({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      {icon}
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
