'use client'

import { useFundStore, type ComparisonData, type Recommendation } from '@/lib/store'
import { formatCurrency, formatPercent, formatBps, getPriorityColor, expenseRatioDiff } from '@/lib/helpers'
import { GitCompareArrows, TrendingUp, AlertTriangle, ArrowRight, Info, Shield, Zap, Lightbulb, Loader2, BarChart3, Target, Eye, Layers, Gauge, HelpCircle, IndianRupee, Percent, Building2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useMemo, useState } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const FUND_COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6']

const EXPECTED_RETURN_BY_CATEGORY: Record<string, number> = {
  Equity: 12, ELSS: 12, Index: 11, Hybrid: 9, Debt: 7,
}

// ─── Beginner-friendly metric explanations ─────────────────────────────────
const METRIC_EXPLANATIONS: Record<string, { title: string; desc: string; icon: React.ElementType }> = {
  'Expense Ratio': {
    title: 'Annual Fee',
    desc: 'The yearly charge the fund house deducts from your investment. Lower = more money stays with you.',
    icon: Percent,
  },
  'AUM': {
    title: 'Fund Size',
    desc: 'Total money invested in this fund by all investors. Larger funds are generally more stable.',
    icon: Building2,
  },
  'NAV': {
    title: 'Current Price',
    desc: 'The price of one unit of this fund today. Like a stock price, it changes daily.',
    icon: IndianRupee,
  },
}

export default function CompareView() {
  const {
    comparisons, comparisonsLoading, fetchComparisons, selectedFundIds,
    analysis, setActiveTab, holdings,
    aiInsights, aiInsightsLoading, fetchAiInsight,
  } = useFundStore()

  const [activeChartTab, setActiveChartTab] = useState<'overview' | 'fees' | 'projection'>('overview')

  useEffect(() => {
    if (selectedFundIds.length > 0 && comparisons.length === 0) {
      fetchComparisons()
    }
  }, [])

  useEffect(() => {
    comparisons?.forEach(comp => {
      if (!comp?.fundId || !comp?.direct) return
      if (!aiInsights?.[comp.fundId] && !aiInsightsLoading?.[comp.fundId]) {
        fetchAiInsight(comp.fundId, {
          fundName: comp.schemeName,
          directExpenseRatio: comp.direct.expenseRatio,
          regularExpenseRatio: comp.regular?.expenseRatio,
          directReturn1y: comp.direct.return1y,
          regularReturn1y: comp.regular?.return1y,
          expenseDiff: comp.expenseDiff,
          category: comp.category,
          subCategory: comp.subCategory,
          aumCrore: comp.aumCrore,
        })
      }
    })
  }, [comparisons, aiInsights, aiInsightsLoading, fetchAiInsight])

  const recommendations = analysis?.recommendations || []

  // ─── Radar chart: only show dimensions we have real data for ─────────────
  const radarData = useMemo(() => {
    if (!comparisons || comparisons.length < 2) return null

    // Only use dimensions where at least one fund has non-null data
    const allDimensions = [
      { key: 'Expense Ratio', label: 'Lower Fees', invert: true },
      { key: 'AUM', label: 'Fund Size', invert: false },
      { key: 'NAV', label: 'Unit Price', invert: false },
    ]

    const dimensions = allDimensions.filter(d =>
      comparisons.some(c => getDimensionValue(c, d.key) !== null && getDimensionValue(c, d.key)! > 0)
    )

    if (dimensions.length < 2) return null

    const ranges: Record<string, { min: number; max: number }> = {}
    for (const dim of dimensions) {
      const vals = comparisons.map(c => getDimensionValue(c, dim.key)).filter((v): v is number => v !== null && v > 0)
      ranges[dim.key] = vals.length > 0
        ? { min: Math.min(...vals), max: Math.max(...vals) }
        : { min: 0, max: 1 }
    }

    return dimensions.map(dim => {
      const entry: Record<string, string | number> = { dimension: dim.label }
      comparisons.forEach((comp) => {
        const raw = getDimensionValue(comp, dim.key)
        const { min, max } = ranges[dim.key]
        const range = max - min || 1
        const normalized = raw !== null ? ((dim.invert ? (max - raw) : (raw - min)) / range) * 100 : 0
        entry[comp.schemeName] = Math.max(0, Math.round(normalized))
      })
      return entry
    })
  }, [comparisons])

  // ─── Fee comparison bar chart ────────────────────────────────────────────
  const feeBarData = useMemo(() => {
    if (!comparisons || comparisons.length === 0) return []
    return comparisons.map(comp => ({
      name: comp.schemeName.length > 20 ? comp.schemeName.slice(0, 20) + '…' : comp.schemeName,
      'Direct Plan': comp.direct?.expenseRatio ?? 0,
      'Regular Plan': comp.regular?.expenseRatio ?? 0,
    }))
  }, [comparisons])

  // ─── Savings projection ──────────────────────────────────────────────────
  const portfolioProjectionData = useMemo(() => {
    if (!holdings || holdings.length === 0) return null
    const years = 30
    const breakdown: { year: number; directValue: number; regularValue: number }[] = []
    for (let y = 1; y <= years; y++) {
      let totalDirect = 0
      let totalRegular = 0
      for (const holding of holdings) {
        const fund = holding.fund
        const expected = EXPECTED_RETURN_BY_CATEGORY[fund.category] || 10
        const directRate = (expected - fund.directExpenseRatio) / 100
        const regularRate = (expected - fund.regularExpenseRatio) / 100
        totalRegular += holding.currentAmount * Math.pow(1 + regularRate, y)
        totalDirect += holding.currentAmount * Math.pow(1 + directRate, y)
      }
      breakdown.push({ year: y, directValue: Math.round(totalDirect), regularValue: Math.round(totalRegular) })
    }
    return breakdown
  }, [holdings])

  // ─── Total savings summary ───────────────────────────────────────────────
  const totalSavingsSummary = useMemo(() => {
    if (!comparisons || comparisons.length === 0) return null
    const totalExpenseDiff = comparisons.reduce((sum, c) => sum + (c.expenseDiff ?? 0), 0)
    const avgExpenseDiff = totalExpenseDiff / comparisons.length
    return {
      totalFunds: comparisons.length,
      avgSavingsBps: Math.round(avgExpenseDiff),
      yearlyOn5L: Math.round(avgExpenseDiff * 50),
      tenYearOn5L: Math.round(avgExpenseDiff * 50 * 10 * 1.5), // rough compound estimate
    }
  }, [comparisons])

  return (
    <div className="space-y-6">
      {/* ─── Beginner-friendly intro banner ─────────────────────────────── */}
      {selectedFundIds.length > 0 && comparisons.length > 0 && (
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground text-sm">What is Direct vs Regular?</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Every mutual fund offers two versions: <strong className="text-foreground">Direct</strong> (buy directly from the fund house) and <strong className="text-foreground">Regular</strong> (buy through a broker/agent). 
                  Both hold the <em>exact same stocks</em>. The only difference: Regular plans charge an extra commission (typically 0.5%–1% per year) that goes to your broker. 
                  Over 10–20 years, this small difference can cost you <strong className="text-primary">lakhs of rupees</strong>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="compare" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="compare" className="gap-2">
            <GitCompareArrows className="h-4 w-4" />
            Fund Comparison
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Recommendations
            {recommendations.length > 0 && (
              <Badge className="ml-1 h-5 min-w-5 text-[10px]">{recommendations.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── Comparison Tab ─────────────────────────────────────────────── */}
        <TabsContent value="compare" className="space-y-4 mt-4">
          {selectedFundIds.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <GitCompareArrows className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No funds selected</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Go to Explore Funds and select up to 5 funds to compare them side-by-side.
                </p>
                <Button onClick={() => setActiveTab('explore')} className="mt-4 gap-2">
                  Explore Funds
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ) : comparisonsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <>
              {/* Savings summary banner */}
              {totalSavingsSummary && totalSavingsSummary.avgSavingsBps > 0 && (
                <Card className="border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                          <IndianRupee className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Your Potential Savings</p>
                          <p className="text-xs text-muted-foreground">Across {totalSavingsSummary.totalFunds} funds compared</p>
                        </div>
                      </div>
                      <div className="flex gap-6 text-center">
                        <div>
                          <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">₹{totalSavingsSummary.yearlyOn5L.toLocaleString('en-IN')}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Saved per year on ₹5L</p>
                        </div>
                        <div>
                          <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{totalSavingsSummary.avgSavingsBps} bps</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Avg commission saved</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Chart tabs */}
              <div className="flex gap-2">
                {(['overview', 'fees', 'projection'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveChartTab(tab)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeChartTab === tab
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab === 'overview' && '📊 Overview'}
                    {tab === 'fees' && '💰 Fee Comparison'}
                    {tab === 'projection' && '📈 Long-term Impact'}
                  </button>
                ))}
              </div>

              {/* Overview: Radar chart */}
              {activeChartTab === 'overview' && radarData && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-foreground">
                      <Eye className="h-4 w-4 text-primary" />
                      Fund Comparison Overview
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Larger area = better overall. Each axis is scored 0–100 relative to other funds.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                          <PolarGrid strokeDasharray="3 3" opacity={0.3} className="stroke-border" />
                          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }} />
                          {comparisons.map((comp, i) => (
                            <Radar
                              key={comp.fundId}
                              name={comp.schemeName.length > 25 ? comp.schemeName.slice(0, 25) + '…' : comp.schemeName}
                              dataKey={comp.schemeName}
                              stroke={FUND_COLORS[i % FUND_COLORS.length]}
                              fill={FUND_COLORS[i % FUND_COLORS.length]}
                              fillOpacity={0.1}
                              strokeWidth={2}
                            />
                          ))}
                          <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--color-card)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '8px',
                              color: 'var(--color-card-foreground)',
                              fontSize: '12px',
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fee comparison bar chart */}
              {activeChartTab === 'fees' && feeBarData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-foreground">
                      <Percent className="h-4 w-4 text-primary" />
                      Expense Ratio: Direct vs Regular
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Green bars = Direct plan (lower fees). Red bars = Regular plan (higher fees). The gap is your wasted money.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={feeBarData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} className="stroke-border" />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }}
                            interval={0}
                            angle={-20}
                            textAnchor="end"
                            height={70}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--color-card)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '8px',
                              color: 'var(--color-card-foreground)',
                              fontSize: '12px',
                            }}
                            formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                          <Bar dataKey="Direct Plan" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                          <Bar dataKey="Regular Plan" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 p-3">
                      <p className="text-xs text-amber-800 dark:text-amber-300">
                        💡 <strong>What this means:</strong> The red bars are always taller because Regular plans include a broker commission. 
                        Switching to Direct (green) saves you that difference every single year — compounding over time.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Long-term projection */}
              {activeChartTab === 'projection' && portfolioProjectionData && holdings.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-foreground">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      What Happens Over 30 Years?
                    </CardTitle>
                    <CardDescription className="text-xs">
                      If you switch all Regular holdings to Direct, here's how much more your portfolio could grow.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={portfolioProjectionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <defs>
                            <linearGradient id="projDirect" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="projRegular" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} className="stroke-border" />
                          <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                          <YAxis
                            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                            tickFormatter={(v: number) => {
                              if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`
                              if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`
                              return `₹${(v / 1000).toFixed(0)}K`
                            }}
                          />
                          <Tooltip
                            formatter={(value: number) => [formatCurrency(value), '']}
                            labelFormatter={(label: number) => `Year ${label}`}
                            contentStyle={{
                              backgroundColor: 'var(--color-card)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '8px',
                              color: 'var(--color-card-foreground)',
                              fontSize: '12px',
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                          <Area type="monotone" dataKey="directValue" name="If All Direct" stroke="#10b981" fill="url(#projDirect)" strokeWidth={2} />
                          <Area type="monotone" dataKey="regularValue" name="Current (Mixed)" stroke="#ef4444" fill="url(#projRegular)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    {portfolioProjectionData.length > 0 && (() => {
                      const last = portfolioProjectionData[portfolioProjectionData.length - 1]
                      const yr20 = portfolioProjectionData[19]
                      const savings20 = yr20 ? yr20.directValue - yr20.regularValue : 0
                      const savings30 = last.directValue - last.regularValue
                      return (
                        <div className="mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50 p-4">
                          <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                            💡 <strong>The gap widens over time.</strong> By year 20, switching to Direct could add approximately{' '}
                            <strong className="text-base">{formatCurrency(savings20)}</strong> to your portfolio. 
                            By year 30: <strong>{formatCurrency(savings30)}</strong>. 
                            That's the power of saving even 0.5%–1% every year.
                          </p>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* ─── Per-fund detail cards ─────────────────────────────────── */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Fund-by-Fund Breakdown
                </h3>
                {comparisons?.map((comp) => (
                  <FundComparisonCard key={comp.fundId} comparison={comp} />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── Recommendations Tab ────────────────────────────────────────── */}
        <TabsContent value="recommendations" className="space-y-4 mt-4">
          {recommendations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Lightbulb className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No recommendations yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Add your holdings to the portfolio first. We'll analyze them and suggest switches from Regular to Direct plans.
                </p>
                <Button onClick={() => setActiveTab('portfolio')} className="mt-4 gap-2">
                  Go to Portfolio
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 dark:border-emerald-900 dark:from-emerald-950/20 dark:to-teal-950/20">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900">
                    <Zap className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Switch Summary</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      We found <strong>{recommendations.length} opportunity{recommendations.length !== 1 ? 'ies' : 'y'}</strong> to save on expenses.
                    </p>
                    <div className="mt-2 flex gap-4 text-sm text-foreground">
                      <span>Annual Savings: <strong className="text-emerald-700 dark:text-emerald-300">{formatCurrency(recommendations.reduce((s, r) => s + r.annualSaving, 0))}</strong></span>
                      <span>10yr Savings: <strong className="text-emerald-700 dark:text-emerald-300">{formatCurrency(recommendations.reduce((s, r) => s + r.tenYearSaving, 0))}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {['high', 'medium', 'low'].map(priority => {
                const recs = recommendations.filter(r => r.priority === priority)
                if (recs.length === 0) return null
                return (
                  <div key={priority}>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={getPriorityColor(priority)}>
                        {priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢'} {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                      </Badge>
                      <span className="text-sm text-muted-foreground">{recs.length} recommendation{recs.length !== 1 ? 's' : ''}</span>
                    </div>
                    {recs.map((rec, i) => (
                      <RecommendationCard key={`${rec.fundId}-${i}`} recommendation={rec} />
                    ))}
                  </div>
                )
              })}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function getDimensionValue(comp: ComparisonData, dim: string): number | null {
  if (!comp?.direct) return null
  switch (dim) {
    case 'Expense Ratio': return comp.direct?.expenseRatio ?? null
    case '1Y Return': return comp.direct?.return1y ?? null
    case '3Y Return': return comp.direct?.return3y ?? null
    case '5Y Return': return comp.direct?.return5y ?? null
    case 'Sharpe Ratio': return comp.direct?.sharpe1y ?? null
    case 'AUM': return comp.aumCrore ?? null
    case 'NAV': return comp.direct?.nav ?? null
    default: return null
  }
}

// ─── Fund Comparison Card ───────────────────────────────────────────────────
function FundComparisonCard({ comparison }: { comparison: ComparisonData }) {
  if (!comparison?.direct || !comparison?.regular) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Data unavailable for this fund.</p>
        </CardContent>
      </Card>
    )
  }

  const insight = useFundStore(s => s.aiInsights[comparison.fundId])
  const insightLoading = useFundStore(s => s.aiInsightsLoading[comparison.fundId])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base text-foreground">{comparison.schemeName}</CardTitle>
            <CardDescription>{comparison.fundHouse} · {comparison.category}</CardDescription>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Save {comparison.expenseDiff} bps/yr
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Plain English summary */}
        <div className="rounded-xl bg-muted/50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">The Bottom Line</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Both plans invest in the <strong className="text-foreground">exact same stocks</strong> with the <strong className="text-foreground">same fund manager</strong>. 
                The Regular plan costs <strong className="text-red-600 dark:text-red-400">{comparison.expenseDiff} bps more per year</strong> — that's ₹{Math.round(comparison.expenseDiff * 50)} extra on every ₹5 lakh invested. 
                Over 10 years, that adds up to roughly <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency((comparison.lifetimeSavings['500000']?.['10']) || comparison.expenseDiff * 50 * 10 * 1.3)}</strong> in lost wealth.
              </p>
            </div>
          </div>
        </div>

        {/* Key numbers at a glance */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50 p-3 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Direct Fee</p>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{comparison.direct.expenseRatio}%</p>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">✓ Lower cost</p>
          </div>
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/50 p-3 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Regular Fee</p>
            <p className="text-xl font-black text-red-700 dark:text-red-400 mt-1">{comparison.regular.expenseRatio}%</p>
            <p className="text-[10px] text-red-600/70 dark:text-red-400/70">✗ Includes commission</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 p-3 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">You Waste</p>
            <p className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">{comparison.expenseDiff}</p>
            <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">bps per year</p>
          </div>
        </div>

        {/* NAV comparison */}
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Current Unit Price (NAV)</p>
              <div className="flex gap-4 mt-1">
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Direct: ₹{comparison.direct.nav.toFixed(2)}</span>
                <span className="text-sm font-semibold text-red-700 dark:text-red-400">Regular: ₹{comparison.regular.nav.toFixed(2)}</span>
              </div>
            </div>
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            NAVs are nearly identical because both plans buy the same stocks. Tiny differences come from the fee deduction timing.
          </p>
        </div>

        {/* AUM */}
        {comparison.aumCrore && comparison.aumCrore > 0 && (
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Fund Size (AUM)</p>
                <p className="text-sm font-semibold text-foreground mt-1">₹{(comparison.aumCrore / 100).toFixed(1)} Crore</p>
              </div>
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              {comparison.aumCrore > 5000
                ? 'Large fund — generally more stable and liquid.'
                : comparison.aumCrore > 1000
                ? 'Mid-size fund — decent stability.'
                : 'Smaller fund — check if it has enough liquidity.'}
            </p>
          </div>
        )}

        {/* Lifetime savings table */}
        <div>
          <h4 className="text-sm font-semibold mb-2 text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            How Much You'd Save by Switching
          </h4>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-2 px-3 text-left font-medium text-muted-foreground">If you invest</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">3 years</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">5 years</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">10 years</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">20 years</th>
                </tr>
              </thead>
              <tbody>
                {['100000', '500000', '1000000'].map(amount => (
                  <tr key={amount} className="border-b last:border-0">
                    <td className="py-2 px-3 font-medium text-foreground">₹{parseInt(amount).toLocaleString('en-IN')}</td>
                    {['3', '5', '10', '20'].map(yr => (
                      <td key={yr} className="py-2 px-3 text-right font-medium text-emerald-700 dark:text-emerald-400">
                        {comparison.lifetimeSavings[amount]?.[yr] ? formatCurrency(comparison.lifetimeSavings[amount][yr]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            These are estimated savings from avoiding the Regular plan commission, assuming 12% annual returns. Actual savings may vary.
          </p>
        </div>

        {/* AI Insight */}
        <div>
          <h4 className="text-sm font-semibold mb-2 text-foreground flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            AI Explanation
          </h4>
          {insightLoading ? (
            <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
              <span className="text-sm text-amber-700 dark:text-amber-300">Generating insight...</span>
            </div>
          ) : insight ? (
            <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20">
              <p className="text-sm text-amber-800 dark:text-amber-300">{insight}</p>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <strong>Simple explanation:</strong> The Direct plan of {comparison.schemeName} charges <strong>{comparison.direct.expenseRatio}%</strong> per year, 
                  while the Regular plan charges <strong>{comparison.regular.expenseRatio}%</strong>. 
                  The extra {comparison.expenseDiff} bps goes to your broker as commission. 
                  You get zero additional benefit from paying it.
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Recommendation Card ──────────────────────────────────────────────────
function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm">{recommendation.schemeName}</h3>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
                Switch to Direct
              </Badge>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Fee Saving</p>
                <p className="font-bold text-emerald-600">{recommendation.expenseSavingBps} bps/yr</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Per Year</p>
                <p className="font-bold text-emerald-600">{formatCurrency(recommendation.annualSaving)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">10 Years</p>
                <p className="font-bold text-emerald-600">{formatCurrency(recommendation.tenYearSaving)}</p>
              </div>
            </div>

            <div className="mt-3 rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-foreground">{recommendation.reason}</p>
            </div>

            {recommendation.tradeoffs.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
                  <Shield className="h-3 w-3" />
                  Things to know before switching:
                </p>
                <ul className="space-y-1">
                  {recommendation.tradeoffs.map((tradeoff, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                      {tradeoff}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
