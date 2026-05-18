'use client'

import { useFundStore, type ComparisonData, type Recommendation } from '@/lib/store'
import { formatCurrency, formatPercent, formatBps, formatSharpe, formatTrackingError, getRiskAdjustedColor, getPriorityColor, expenseRatioDiff } from '@/lib/helpers'
import { GitCompareArrows, TrendingUp, AlertTriangle, ArrowRight, Info, Shield, Zap, Lightbulb, Loader2, BarChart3, Target, Eye, Layers, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useMemo } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

// ─── Color palette for funds in radar chart ─────────────────────────────────
const FUND_COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6']

// ─── Expected return by category for portfolio projection ──────────────────
const EXPECTED_RETURN_BY_CATEGORY: Record<string, number> = {
  Equity: 12, ELSS: 12, Index: 11, Hybrid: 9, Debt: 7,
}

export default function CompareView() {
  const {
    comparisons, comparisonsLoading, fetchComparisons, selectedFundIds,
    analysis, setActiveTab, holdings,
    aiInsights, aiInsightsLoading, fetchAiInsight,
  } = useFundStore()

  useEffect(() => {
    if (selectedFundIds.length > 0 && comparisons.length === 0) {
      fetchComparisons()
    }
  }, [])

  // Fetch AI insights for comparisons
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

  // ─── Radar chart data (only when 2+ funds) ─────────────────────────────
  const radarData = useMemo(() => {
    if (!comparisons || comparisons.length < 2) return null

    const dimensions = ['Expense Ratio', '1Y Return', '3Y Return', '5Y Return', 'Sharpe Ratio', 'AUM']

    // Find min/max for each dimension to normalize
    const ranges: Record<string, { min: number; max: number }> = {}
    for (const dim of dimensions) {
      const vals = comparisons.map(c => getDimensionValue(c, dim)).filter((v): v is number => v !== null)
      if (vals.length === 0) {
        ranges[dim] = { min: 0, max: 1 }
      } else {
        ranges[dim] = {
          min: Math.min(...vals),
          max: Math.max(...vals),
        }
      }
    }

    // For expense ratio, lower is better → invert the normalization
    return dimensions.map(dim => {
      const entry: Record<string, string | number> = { dimension: dim }
      comparisons.forEach((comp, i) => {
        const raw = getDimensionValue(comp, dim)
        const { min, max } = ranges[dim]
        const range = max - min || 1
        let normalized: number
        if (dim === 'Expense Ratio') {
          // Invert: lower ER → higher score
          normalized = raw !== null ? ((max - raw) / range) * 100 : 0
        } else {
          normalized = raw !== null ? ((raw - min) / range) * 100 : 0
        }
        entry[comp.schemeName] = Math.round(normalized)
      })
      return entry
    })
  }, [comparisons])

  // ─── Diff bar chart data ───────────────────────────────────────────────
  const diffBarData = useMemo(() => {
    if (!comparisons || comparisons.length === 0) return []
    return comparisons.map(comp => ({
      name: comp.schemeName.length > 25 ? comp.schemeName.slice(0, 25) + '…' : comp.schemeName,
      'Direct Return': comp.direct?.return1y ?? 0,
      'Regular Return': comp.regular?.return1y ?? 0,
      'Savings (bps)': comp.expenseDiff ?? 0,
    }))
  }, [comparisons])

  // ─── Portfolio-level savings projection data ───────────────────────────
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

        if (holding.planType === 'regular') {
          // If regular, show what they'd have vs if they switched to direct
          totalRegular += holding.currentAmount * Math.pow(1 + regularRate, y)
          totalDirect += holding.currentAmount * Math.pow(1 + directRate, y)
        } else {
          // Already on direct, both values are the same
          totalDirect += holding.currentAmount * Math.pow(1 + directRate, y)
          totalRegular += holding.currentAmount * Math.pow(1 + regularRate, y)
        }
      }

      breakdown.push({
        year: y,
        directValue: Math.round(totalDirect),
        regularValue: Math.round(totalRegular),
      })
    }

    return breakdown
  }, [holdings])

  return (
    <div className="space-y-6">
      <Tabs defaultValue="compare" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="compare" className="gap-2">
            <GitCompareArrows className="h-4 w-4" />
            Direct vs Regular
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Switch Recommendations
            {recommendations.length > 0 && (
              <Badge className="ml-1 h-5 min-w-5 text-[10px]">{recommendations.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Direct vs Regular Comparison Tab */}
        <TabsContent value="compare" className="space-y-4 mt-4">
          {selectedFundIds.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <GitCompareArrows className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No funds selected for comparison</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Go to Explore Funds and select up to 5 funds to compare their Direct vs Regular variants side-by-side.
                </p>
                <Button onClick={() => setActiveTab('explore')} className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
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
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Comparing {comparisons.length} fund{comparisons.length !== 1 ? 's' : ''}
                </p>
                <Button size="sm" variant="outline" onClick={() => fetchComparisons()} className="gap-2">
                  Refresh
                </Button>
              </div>

              {/* ═══════ RADAR CHART (2+ funds) ═══════ */}
              {radarData && comparisons.length >= 2 && (
                <Card className="border-emerald-200/50 dark:border-emerald-900/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-card-foreground">
                      <Eye className="h-4 w-4 text-emerald-600" />
                      Multi-Fund Radar Comparison
                    </CardTitle>
                    <CardDescription className="text-xs">
                      All dimensions normalized to 0–100 scale. Higher = better (Expense Ratio is inverted — lower cost scores higher).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                          <PolarGrid strokeDasharray="3 3" opacity={0.3} className="stroke-border" />
                          <PolarAngleAxis
                            dataKey="dimension"
                            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                          />
                          <PolarRadiusAxis
                            angle={90}
                            domain={[0, 100]}
                            tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                          />
                            {comparisons?.map((comp, i) => (
                              <Radar
                                key={comp.fundId}
                                name={comp.schemeName.length > 30 ? comp.schemeName.slice(0, 30) + '…' : comp.schemeName}
                                dataKey={comp.schemeName}
                                stroke={FUND_COLORS[i % FUND_COLORS.length]}
                                fill={FUND_COLORS[i % FUND_COLORS.length]}
                                fillOpacity={0.12}
                                strokeWidth={2}
                              />
                            ))}
                          <Legend
                            wrapperStyle={{ fontSize: '11px' }}
                            iconSize={10}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              color: 'var(--card-foreground)',
                              fontSize: '12px',
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ═══════ DIFF VISUALIZATION BAR CHART ═══════ */}
              {comparisons.length > 0 && (
                <Card className="border-amber-200/50 dark:border-amber-900/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-card-foreground">
                      <BarChart3 className="h-4 w-4 text-amber-600" />
                      Return Difference: Direct vs Regular
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Grouped bars show 1Y returns. Amber overlay highlights the expense savings (bps) for each fund.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={diffBarData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} className="stroke-border" />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                            interval={0}
                            angle={-15}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              color: 'var(--card-foreground)',
                              fontSize: '12px',
                            }}
                            formatter={(value: number, name: string) => {
                              if (name === 'Savings (bps)') return [`${value} bps`, name]
                              return [`${value.toFixed(2)}%`, name]
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                          <Bar dataKey="Direct Return" fill="#10b981" radius={[4, 4, 0, 0]} barSize={comparisons.length > 3 ? 20 : 32} />
                          <Bar dataKey="Regular Return" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={comparisons.length > 3 ? 20 : 32} />
                          <Bar dataKey="Savings (bps)" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={comparisons.length > 3 ? 14 : 22} opacity={0.7} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ═══════ PER-FUND COMPARISON CARDS (existing) ═══════ */}
              {comparisons?.map((comp) => (
                <FundComparisonCard key={comp.fundId} comparison={comp} />
              ))}

              {/* ═══════ EXPOSURE TRADEOFF CARDS ═══════ */}
              {comparisons.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Layers className="h-5 w-5 text-emerald-600" />
                    Exposure Tradeoff Analysis
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {comparisons.map((comp, i) => (
                      <ExposureTradeoffCard key={comp.fundId} comparison={comp} colorIndex={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* ═══════ PORTFOLIO-LEVEL SAVINGS PROJECTION ═══════ */}
              {portfolioProjectionData && holdings.length > 0 && (
                <Card className="border-emerald-200/50 dark:border-emerald-900/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-card-foreground">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      Portfolio-Level Savings Projection
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Combined wealth projection for all {holdings.length} holdings. Shows total portfolio value if you switch Regular plans to Direct.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={portfolioProjectionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <defs>
                            <linearGradient id="portfolioDirectGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="portfolioRegularGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} className="stroke-border" />
                          <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                          <YAxis
                            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                            tickFormatter={(v: number) => {
                              if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`
                              if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`
                              return `₹${(v / 1000).toFixed(0)}K`
                            }}
                          />
                          <Tooltip
                            formatter={(value: number, name: string) => [formatCurrency(value), name]}
                            labelFormatter={(label: number) => `Year ${label}`}
                            contentStyle={{
                              backgroundColor: 'var(--card)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              color: 'var(--card-foreground)',
                              fontSize: '12px',
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                          <Area type="monotone" dataKey="directValue" name="All Direct" stroke="#10b981" fill="url(#portfolioDirectGrad)" strokeWidth={2} />
                          <Area type="monotone" dataKey="regularValue" name="Current Mix" stroke="#ef4444" fill="url(#portfolioRegularGrad)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Summary */}
                    {portfolioProjectionData.length > 0 && (() => {
                      const last = portfolioProjectionData[portfolioProjectionData.length - 1]
                      const savings20 = portfolioProjectionData[19] // year 20
                      return (
                        <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 p-3">
                          <p className="text-sm text-amber-800 dark:text-amber-300">
                            💡 Over <strong>20 years</strong>, switching all Regular holdings to Direct could save you approximately{' '}
                            <strong className="text-base">{savings20 ? formatCurrency(savings20.directValue - savings20.regularValue) : '—'}</strong>{' '}
                            in your portfolio. Over 30 years: <strong>{formatCurrency(last.directValue - last.regularValue)}</strong>.
                          </p>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Switch Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4 mt-4">
          {recommendations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Lightbulb className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No recommendations yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Add your holdings to the portfolio first. We&apos;ll analyze them and suggest switches from Regular to Direct plans.
                </p>
                <Button onClick={() => setActiveTab('portfolio')} className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
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
                      We found <strong>{recommendations.length} opportunity{recommendations.length !== 1 ? 'ies' : 'y'}</strong> to save on expenses by switching from Regular to Direct plans.
                    </p>
                    <div className="mt-2 flex gap-4 text-sm text-foreground">
                      <span>Annual Savings: <strong className="text-emerald-700 dark:text-emerald-300">{formatCurrency(recommendations.reduce((s, r) => s + r.annualSaving, 0))}</strong></span>
                      <span>10yr Savings: <strong className="text-emerald-700 dark:text-emerald-300">{formatCurrency(recommendations.reduce((s, r) => s + r.tenYearSaving, 0))}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sorted by priority */}
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

// ─── Helper: extract dimension value from comparison ──────────────────────────
function getDimensionValue(comp: ComparisonData, dim: string): number | null {
  if (!comp?.direct) return null
  switch (dim) {
    case 'Expense Ratio': return comp.direct?.expenseRatio ?? null
    case '1Y Return': return comp.direct?.return1y ?? null
    case '3Y Return': return comp.direct?.return3y ?? null
    case '5Y Return': return comp.direct?.return5y ?? null
    case 'Sharpe Ratio': return comp.direct?.sharpe1y ?? null
    case 'AUM': return comp.aumCrore ?? null
    default: return null
  }
}

// ─── Exposure Tradeoff Card ───────────────────────────────────────────────
function ExposureTradeoffCard({ comparison, colorIndex }: { comparison: ComparisonData; colorIndex: number }) {
  if (!comparison) return null
  const equityPct = comparison.equityPercentage ?? 0
  const debtPct = comparison.debtPercentage ?? 0
  const otherPct = Math.max(0, 100 - equityPct - debtPct)
  const trackingError = comparison.trackingErrorBps ?? 0
  const riskometer = comparison.riskometer || 'N/A'

  // Risk level color gradient
  const riskColorMap: Record<string, { bg: string; text: string; bar: string }> = {
    'Low': { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-300', bar: 'bg-emerald-500' },
    'Low to Moderate': { bg: 'bg-lime-50 dark:bg-lime-950/20', text: 'text-lime-700 dark:text-lime-300', bar: 'bg-lime-500' },
    'Moderate': { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-300', bar: 'bg-amber-500' },
    'Moderately High': { bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-700 dark:text-orange-300', bar: 'bg-orange-500' },
    'High': { bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-300', bar: 'bg-red-500' },
    'Very High': { bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-600 dark:text-red-300', bar: 'bg-red-600' },
  }
  const riskStyle = riskColorMap[riskometer] || { bg: 'bg-muted', text: 'text-muted-foreground', bar: 'bg-muted-foreground' }

  // Tracking error gauge (0-50 bps scale, typical range is 0-10)
  const teGaugeWidth = Math.min((trackingError / 50) * 100, 100)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-card-foreground leading-tight">
            {comparison.schemeName.length > 40 ? comparison.schemeName.slice(0, 40) + '…' : comparison.schemeName}
          </CardTitle>
          <Badge variant="outline" className="text-[10px] shrink-0 bg-muted text-muted-foreground">
            {comparison.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Equity vs Debt stacked bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-muted-foreground">Asset Allocation</span>
            <span className="text-muted-foreground">
              {equityPct > 0 && <span className="text-emerald-700 dark:text-emerald-400">{equityPct}% Eq</span>}
              {equityPct > 0 && debtPct > 0 && <span className="mx-1">·</span>}
              {debtPct > 0 && <span className="text-teal-700 dark:text-teal-400">{debtPct}% Debt</span>}
              {otherPct > 0 && <><span className="mx-1">·</span><span className="text-muted-foreground">{otherPct.toFixed(0)}% Other</span></>}
              {equityPct === 0 && debtPct === 0 && <span className="text-muted-foreground">N/A</span>}
            </span>
          </div>
          <div className="h-4 w-full rounded-full overflow-hidden bg-muted flex">
            {equityPct > 0 && (
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${equityPct}%` }} />
            )}
            {debtPct > 0 && (
              <div className="h-full bg-teal-500 transition-all" style={{ width: `${debtPct}%` }} />
            )}
            {otherPct > 0 && (
              <div className="h-full bg-muted-foreground/30 transition-all" style={{ width: `${otherPct}%` }} />
            )}
          </div>
          <div className="flex gap-3 mt-1.5">
            {equityPct > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Equity
              </div>
            )}
            {debtPct > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                Debt
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Risk level indicator */}
        <div className={`rounded-lg p-2.5 ${riskStyle.bg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className={`h-3.5 w-3.5 ${riskStyle.text}`} />
              <span className="text-xs font-medium text-muted-foreground">Risk Level</span>
            </div>
            <span className={`text-xs font-bold ${riskStyle.text}`}>{riskometer}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full ${riskStyle.bar} transition-all`}
              style={{
                width: `${
                  riskometer === 'Low' ? 15 :
                  riskometer === 'Low to Moderate' ? 30 :
                  riskometer === 'Moderate' ? 50 :
                  riskometer === 'Moderately High' ? 70 :
                  riskometer === 'High' ? 85 :
                  riskometer === 'Very High' ? 95 : 50
                }%`,
              }}
            />
          </div>
        </div>

        <Separator />

        {/* Tracking error gauge */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-muted-foreground flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-emerald-600" />
              Tracking Error
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              {formatTrackingError(comparison.trackingErrorBps)}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-emerald-200 via-amber-200 to-red-200 dark:from-emerald-900 dark:via-amber-900 dark:to-red-900 overflow-hidden relative">
            <div
              className="absolute top-0 h-full w-1.5 bg-foreground rounded-full shadow-sm transition-all"
              style={{ left: `${teGaugeWidth}%`, transform: 'translateX(-50%)' }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
            <span>0 bps (identical)</span>
            <span>50 bps (divergent)</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {trackingError < 5
              ? 'Near-zero — Direct & Regular hold the same stocks at the same weights.'
              : trackingError < 20
              ? 'Very low — Minor deviation expected from expense ratio difference only.'
              : 'Moderate — Some tracking difference beyond expense ratio.'
            }
          </p>
        </div>

        <Separator />

        {/* Same Stocks, Different Fees callout */}
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900 p-1">
              <Zap className="h-3 w-3 text-emerald-700 dark:text-emerald-300" />
            </div>
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              Same Stocks, Different Fees
            </span>
          </div>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
            Both plans hold <em>identical stocks</em> with <em>identical weights</em>. The only difference: Regular plan deducts <strong>{comparison.expenseDiff} bps/year</strong> extra as distributor commission.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Fund Comparison Card (existing, unchanged) ───────────────────────────
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

  const trackingError = comparison.trackingErrorBps
  const riskDelta = comparison.riskAdjustedReturnDelta
  const benchmarkReturns = comparison.benchmarkReturns

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg text-card-foreground">{comparison.schemeName}</CardTitle>
            <CardDescription>{comparison.fundHouse} · {comparison.category} · {comparison.subCategory}</CardDescription>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Save {comparison.expenseDiff} bps/yr
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Expense Ratio Visual Bar */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            Expense Ratio Comparison
          </h4>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-emerald-700 dark:text-emerald-400">Direct: {comparison.direct.expenseRatio}%</span>
                <span className="text-muted-foreground">Lower cost</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted">
                <div
                  className="h-3 rounded-full bg-emerald-500"
                  style={{ width: `${(comparison.direct.expenseRatio / 3) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-red-700 dark:text-red-400">Regular: {comparison.regular.expenseRatio}%</span>
                <span className="text-red-600 dark:text-red-400">+{comparison.expenseDiff} bps more</span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted">
                <div
                  className="h-3 rounded-full bg-red-500"
                  style={{ width: `${(comparison.regular.expenseRatio / 3) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Return Comparison */}
        <div className="grid grid-cols-3 gap-0 overflow-hidden rounded-xl border">
          <div className="bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">Metric</p>
          </div>
          <div className="bg-emerald-100/50 p-3 dark:bg-emerald-950/20">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">✓ DIRECT</p>
          </div>
          <div className="bg-red-100/50 p-3 dark:bg-red-950/20">
            <p className="text-xs font-bold text-red-700 dark:text-red-400">⚠ REGULAR</p>
          </div>

          <ComparisonRow label="Expense Ratio" direct={`${comparison.direct.expenseRatio}%`} regular={`${comparison.regular.expenseRatio}%`} />
          <ComparisonRow label="1Y Return" direct={formatPercent(comparison.direct.return1y)} regular={formatPercent(comparison.regular.return1y)} />
          <ComparisonRow label="3Y Return (CAGR)" direct={formatPercent(comparison.direct.return3y)} regular={formatPercent(comparison.regular.return3y)} />
          <ComparisonRow label="5Y Return (CAGR)" direct={formatPercent(comparison.direct.return5y)} regular={formatPercent(comparison.regular.return5y)} />
          <ComparisonRow label="NAV" direct={`₹${comparison.direct.nav.toFixed(2)}`} regular={`₹${comparison.regular.nav.toFixed(2)}`} />
        </div>

        <Separator />

        {/* Tracking Error */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-600" />
            Tracking Error Analysis
          </h4>
          <div className="rounded-xl border bg-emerald-50/50 p-4 dark:bg-emerald-950/10">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900">
                <Target className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Tracking Error: <strong className="text-emerald-700 dark:text-emerald-400">{formatTrackingError(trackingError)}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Direct and Regular plans track the <em>exact same portfolio</em>. The near-zero tracking error confirms both plans hold identical stocks with identical weights.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Risk-Adjusted Returns (Sharpe Ratio) */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Risk-Adjusted Returns (Sharpe Ratio)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-emerald-50/50 p-3 dark:bg-emerald-950/10">
              <p className="text-xs text-muted-foreground">Direct Plan</p>
              <div className="flex items-center gap-3 mt-1">
                <div>
                  <p className="text-xs text-muted-foreground">1Y Sharpe</p>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{formatSharpe(comparison.direct.sharpe1y)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">3Y Sharpe</p>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{formatSharpe(comparison.direct.sharpe3y)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-red-50/50 p-3 dark:bg-red-950/10">
              <p className="text-xs text-muted-foreground">Regular Plan</p>
              <div className="flex items-center gap-3 mt-1">
                <div>
                  <p className="text-xs text-muted-foreground">1Y Sharpe</p>
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">{formatSharpe(comparison.regular.sharpe1y)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">3Y Sharpe</p>
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">{formatSharpe(comparison.regular.sharpe3y)}</p>
                </div>
              </div>
            </div>
          </div>
          {riskDelta != null && (
            <p className={`text-xs mt-2 font-medium ${getRiskAdjustedColor(riskDelta)}`}>
              {riskDelta > 0 ? '↑' : '↓'} Direct plan has {Math.abs(riskDelta).toFixed(2)}% better risk-adjusted return
            </p>
          )}
        </div>

        <Separator />

        {/* Benchmark Comparison */}
        {benchmarkReturns && (
          <>
            <div>
              <h4 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                Benchmark Comparison
              </h4>
              <div className="rounded-lg border p-3">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="font-medium text-muted-foreground">Period</div>
                  <div className="font-medium text-muted-foreground">Benchmark</div>
                  <div className="font-medium text-emerald-700 dark:text-emerald-400">Direct</div>
                  <div className="font-medium text-red-700 dark:text-red-400">Regular</div>

                  <div className="text-foreground">1Y</div>
                  <div className="text-foreground">{formatPercent(benchmarkReturns.return1y)}</div>
                  <div className="text-emerald-700 dark:text-emerald-400">{formatPercent(comparison.direct.return1y)}</div>
                  <div className="text-red-700 dark:text-red-400">{formatPercent(comparison.regular.return1y)}</div>

                  <div className="text-foreground">3Y</div>
                  <div className="text-foreground">{formatPercent(benchmarkReturns.return3y)}</div>
                  <div className="text-emerald-700 dark:text-emerald-400">{formatPercent(comparison.direct.return3y)}</div>
                  <div className="text-red-700 dark:text-red-400">{formatPercent(comparison.regular.return3y)}</div>

                  <div className="text-foreground">5Y</div>
                  <div className="text-foreground">{formatPercent(benchmarkReturns.return5y)}</div>
                  <div className="text-emerald-700 dark:text-emerald-400">{formatPercent(comparison.direct.return5y)}</div>
                  <div className="text-red-700 dark:text-red-400">{formatPercent(comparison.regular.return5y)}</div>
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Exposure Analysis */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" />
            Exposure Analysis
          </h4>
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/10">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900">
                <Shield className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div className="text-sm text-foreground">
                <p className="font-medium">Identical Stock Exposure</p>
                <p className="text-muted-foreground mt-1">
                  Both Direct and Regular plans of <strong>{comparison.schemeName}</strong> hold the <em>exact same stocks</em> with the <em>same weights</em>.
                  The ONLY difference is that the Regular plan deducts an additional <strong>{comparison.expenseDiff} bps</strong> per year as distributor commission from your returns.
                  There is zero difference in portfolio composition, fund management strategy, or risk profile.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Lifetime savings table */}
        <div>
          <h4 className="text-sm font-semibold mb-2 text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Lifetime Savings if You Switch to Direct
          </h4>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-2 px-3 text-left font-medium text-muted-foreground">Investment</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">3yr</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">5yr</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">10yr</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">20yr</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">30yr</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(comparison.lifetimeSavings).map(([amount, years]) => (
                  <tr key={amount} className="border-b last:border-0">
                    <td className="py-2 px-3 font-medium text-foreground">{formatCurrency(parseInt(amount))}</td>
                    {['3', '5', '10', '20', '30'].map(yr => (
                      <td key={yr} className="py-2 px-3 text-right font-medium text-emerald-700 dark:text-emerald-400">
                        {years[yr] ? formatCurrency(years[yr]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insight */}
        <div>
          <h4 className="text-sm font-semibold mb-2 text-foreground flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            AI-Generated Explanation
          </h4>
          {insightLoading ? (
            <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
              <span className="text-sm text-amber-700 dark:text-amber-300">Generating AI insight...</span>
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
                  <strong>What this means:</strong> The Direct plan of {comparison.schemeName} has an expense ratio that is <strong>{comparison.expenseDiff} basis points lower</strong> than the Regular plan.
                  Both plans hold the <em>exact same stocks</em> with the <em>same fund manager</em>. The only difference is that the Regular plan pays a commission to your distributor.
                  On a ₹5L investment held for 20 years, switching to Direct saves you approximately <strong>{formatCurrency(comparison.lifetimeSavings['500000']?.['20'] || 0)}</strong>.
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Comparison Row ───────────────────────────────────────────────────────
function ComparisonRow({ label, direct, regular }: { label: string; direct: string; regular: string }) {
  return (
    <>
      <div className="border-t p-3">
        <p className="text-xs font-medium text-foreground">{label}</p>
      </div>
      <div className="border-t bg-emerald-50/30 p-3 dark:bg-emerald-950/5">
        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{direct}</p>
      </div>
      <div className="border-t bg-red-50/30 p-3 dark:bg-red-950/5">
        <p className="text-sm font-bold text-red-700 dark:text-red-400">{regular}</p>
      </div>
    </>
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
              <h3 className="font-semibold text-card-foreground">{recommendation.schemeName}</h3>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
                Switch to Direct
              </Badge>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Expense Saving</p>
                <p className="font-bold text-emerald-600">{recommendation.expenseSavingBps} bps/yr</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Annual Saving</p>
                <p className="font-bold text-emerald-600">{formatCurrency(recommendation.annualSaving)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">10yr Saving</p>
                <p className="font-bold text-emerald-600">{formatCurrency(recommendation.tenYearSaving)}</p>
              </div>
            </div>

            {/* Plain language reason */}
            <div className="mt-3 rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-foreground">{recommendation.reason}</p>
            </div>

            {/* Tradeoffs */}
            {recommendation.tradeoffs.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
                  <Shield className="h-3 w-3" />
                  Trade-offs to consider:
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
