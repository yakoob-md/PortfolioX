'use client'

import { useFundStore, type HoldingData } from '@/lib/store'
import { formatCurrency, formatPercent } from '@/lib/helpers'
import {
  ShieldAlert, TrendingDown, AlertTriangle, Zap, TrendingUp,
  Briefcase, ChevronDown, ChevronUp, ArrowRight, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'

// ─── Scenario definitions ────────────────────────────────────────────────────
interface ScenarioImpact {
  equity: number
  debt: number
  hybrid: number
}

interface StressScenario {
  id: string
  name: string
  description: string
  icon: React.ElementType
  impact: ScenarioImpact
  color: string
  bgGradient: string
  year: string
}

const STRESS_SCENARIOS: StressScenario[] = [
  {
    id: '2008-crisis',
    name: '2008 Financial Crisis',
    description: 'Global financial meltdown, Lehman collapse',
    icon: ShieldAlert,
    impact: { equity: -50, debt: 5, hybrid: -25 },
    color: 'text-red-600 dark:text-red-400',
    bgGradient: 'from-red-500/10 to-red-600/5',
    year: '2008',
  },
  {
    id: 'covid-crash',
    name: 'COVID-19 Crash',
    description: 'Pandemic-driven selloff, sharp V-shaped recovery',
    icon: TrendingDown,
    impact: { equity: -35, debt: 2, hybrid: -18 },
    color: 'text-orange-600 dark:text-orange-400',
    bgGradient: 'from-orange-500/10 to-orange-600/5',
    year: '2020',
  },
  {
    id: 'mild-correction',
    name: 'Mild Correction',
    description: 'Standard 10-15% equity pullback',
    icon: AlertTriangle,
    impact: { equity: -15, debt: 1, hybrid: -8 },
    color: 'text-amber-600 dark:text-amber-400',
    bgGradient: 'from-amber-500/10 to-amber-600/5',
    year: 'Typical',
  },
  {
    id: 'rate-hike',
    name: 'Rate Hike Shock',
    description: 'Aggressive rate hikes hurting both equity & debt',
    icon: Zap,
    impact: { equity: -10, debt: -8, hybrid: -6 },
    color: 'text-yellow-600 dark:text-yellow-400',
    bgGradient: 'from-yellow-500/10 to-yellow-500/5',
    year: '2022-like',
  },
  {
    id: 'bull-run',
    name: 'Bull Run',
    description: 'Strong market rally across all categories',
    icon: TrendingUp,
    impact: { equity: 30, debt: 6, hybrid: 18 },
    color: 'text-emerald-600 dark:text-emerald-400',
    bgGradient: 'from-emerald-500/10 to-emerald-600/5',
    year: '2021-like',
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────
interface HoldingImpact {
  name: string
  category: string
  currentValue: number
  impactPct: number
  impactAmount: number
  stressedValue: number
}

interface StressResult {
  scenarioId: string
  scenario: StressScenario
  totalImpact: number
  totalImpactPct: number
  holdings: HoldingImpact[]
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function mapCategory(cat: string): 'equity' | 'debt' | 'hybrid' {
  const lower = cat.toLowerCase()
  if (lower === 'debt') return 'debt'
  if (lower === 'hybrid') return 'hybrid'
  return 'equity' // Equity, ELSS, Index all count as equity
}

function computeStressResult(holdings: HoldingData[], scenario: StressScenario): StressResult {
  let totalImpact = 0
  let totalCurrent = 0

  const holdingImpacts: HoldingImpact[] = holdings.map((h) => {
    const cat = mapCategory(h.fund.category)
    const impactPct = scenario.impact[cat]
    const impactAmount = h.currentAmount * (impactPct / 100)
    const stressedValue = h.currentAmount + impactAmount

    totalImpact += impactAmount
    totalCurrent += h.currentAmount

    return {
      name: h.fund.schemeName,
      category: cat,
      currentValue: h.currentAmount,
      impactPct,
      impactAmount,
      stressedValue,
    }
  })

  return {
    scenarioId: scenario.id,
    scenario,
    totalImpact,
    totalImpactPct: totalCurrent > 0 ? (totalImpact / totalCurrent) * 100 : 0,
    holdings: holdingImpacts,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function StressTest() {
  const { holdings, fetchHoldings, sessionId, setActiveTab } = useFundStore()

  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showComparison, setShowComparison] = useState(false)

  useEffect(() => {
    fetchHoldings()
  }, [])

  // Compute results client-side (with optional API refresh via button)
  const results = useMemo<Record<string, StressResult>>(() => {
    const map: Record<string, StressResult> = {}
    for (const scenario of STRESS_SCENARIOS) {
      map[scenario.id] = computeStressResult(holdings, scenario)
    }
    return map
  }, [holdings])

  // Optional: Refresh from API via button click
  const refreshFromApi = async () => {
    if (holdings.length === 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/portfolio/stress-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (res.ok) {
        // API results are structurally identical to client-side, so we just confirm success
        await res.json()
      }
    } catch {
      // Already showing client-side results, no action needed
    }
    setLoading(false)
  }

  const activeResult = selectedScenario ? results[selectedScenario] : null

  const toggleScenario = (id: string) => {
    setSelectedScenarios((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  // ─── Comparison chart data ──────────────────────────────────────────────────
  const comparisonData = useMemo(() => {
    if (!showComparison || selectedScenarios.length === 0) return []
    return selectedScenarios.map((id) => {
      const r = results[id]
      return {
        name: r.scenario.name.length > 18 ? r.scenario.name.slice(0, 18) + '…' : r.scenario.name,
        'Current Value': Math.round(holdings.reduce((s, h) => s + h.currentAmount, 0)),
        'Stressed Value': Math.round(holdings.reduce((s, h) => s + h.currentAmount, 0) + r.totalImpact),
        impact: r.totalImpact,
      }
    })
  }, [showComparison, selectedScenarios, results, holdings])

  // ─── Empty state ────────────────────────────────────────────────────────────
  if (holdings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10 ring-1 ring-red-500/20">
            <ShieldAlert className="h-10 w-10 text-red-500" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground">No Portfolio to Stress Test</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Add holdings to your portfolio first, then come back to see how they perform under market stress.
        </p>
        <Button
          onClick={() => setActiveTab('portfolio')}
          className="mt-6 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Briefcase className="h-4 w-4" />
          Go to Portfolio
        </Button>
      </div>
    )
  }

  const totalPortfolioValue = holdings.reduce((s, h) => s + h.currentAmount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            Portfolio Stress Test
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Simulate how your portfolio handles different market scenarios
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedScenarios.length > 1 && (
            <Button
              size="sm"
              variant={showComparison ? 'default' : 'outline'}
              onClick={() => setShowComparison(!showComparison)}
              className={showComparison ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
            >
              Compare ({selectedScenarios.length})
            </Button>
          )}
          <Badge variant="outline" className="text-xs">
            Portfolio: {formatCurrency(totalPortfolioValue)}
          </Badge>
        </div>
      </div>

      {/* Scenario Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {STRESS_SCENARIOS.map((scenario, idx) => {
          const Icon = scenario.icon
          const isSelected = selectedScenario === scenario.id
          const isInCompare = selectedScenarios.includes(scenario.id)
          const result = results[scenario.id]
          const isGain = result.totalImpact >= 0

          return (
            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card
                className={`cursor-pointer transition-all duration-200 hover:shadow-md relative overflow-hidden ${
                  isSelected
                    ? 'ring-2 ring-emerald-500 shadow-lg'
                    : isInCompare
                    ? 'ring-2 ring-amber-400/50'
                    : 'hover:ring-1 hover:ring-border'
                }`}
                onClick={() => {
                  setSelectedScenario(isSelected ? null : scenario.id)
                }}
              >
                {/* Gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${scenario.bgGradient} opacity-60`} />

                <CardContent className="relative p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-background/80 ring-1 ring-border`}>
                      <Icon className={`h-4 w-4 ${scenario.color}`} />
                    </div>
                    <div className="flex items-center gap-1">
                      {isInCompare && (
                        <Badge className="text-[9px] px-1.5 bg-amber-500 text-white">Comparing</Badge>
                      )}
                      <Badge variant="outline" className="text-[9px] px-1.5">{scenario.year}</Badge>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">{scenario.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{scenario.description}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Equity</span>
                      <span className={scenario.impact.equity >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                        {formatPercent(scenario.impact.equity, 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Debt</span>
                      <span className={scenario.impact.debt >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                        {formatPercent(scenario.impact.debt, 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Hybrid</span>
                      <span className={scenario.impact.hybrid >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                        {formatPercent(scenario.impact.hybrid, 0)}
                      </span>
                    </div>
                  </div>

                  <Separator className="opacity-50" />

                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">Portfolio Impact</p>
                    <p className={`text-lg font-bold ${isGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isGain ? '+' : ''}{formatCurrency(result.totalImpact)}
                    </p>
                    <p className={`text-xs font-medium ${isGain ? 'text-emerald-600/80' : 'text-red-600/80'}`}>
                      {isGain ? '+' : ''}{result.totalImpactPct.toFixed(1)}%
                    </p>
                  </div>

                  {/* Compare toggle button */}
                  <Button
                    size="sm"
                    variant={isInCompare ? 'secondary' : 'outline'}
                    className="w-full text-[11px] h-7"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleScenario(scenario.id)
                      if (!isInCompare && selectedScenarios.length === 0) {
                        setShowComparison(false)
                      }
                    }}
                  >
                    {isInCompare ? 'Remove from Compare' : 'Add to Compare'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Detailed Impact for selected scenario */}
      <AnimatePresence>
        {activeResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${activeResult.scenario.bgGradient} ring-1 ring-border`}>
                      <activeResult.scenario.icon className={`h-5 w-5 ${activeResult.scenario.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{activeResult.scenario.name}</CardTitle>
                      <CardDescription className="text-xs">{activeResult.scenario.description}</CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${activeResult.totalImpact >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {activeResult.totalImpact >= 0 ? '+' : ''}{formatCurrency(activeResult.totalImpact)}
                    </p>
                    <p className={`text-sm font-medium ${activeResult.totalImpact >= 0 ? 'text-emerald-600/80' : 'text-red-600/80'}`}>
                      {activeResult.totalImpact >= 0 ? '+' : ''}{activeResult.totalImpactPct.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Per-holding breakdown table */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-3">Per-Holding Impact</p>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b">
                          <th className="py-2 px-2 text-left font-medium text-muted-foreground">Fund</th>
                          <th className="py-2 px-2 text-center font-medium text-muted-foreground">Category</th>
                          <th className="py-2 px-2 text-right font-medium text-muted-foreground">Current</th>
                          <th className="py-2 px-2 text-center font-medium text-muted-foreground">Impact %</th>
                          <th className="py-2 px-2 text-right font-medium text-muted-foreground">Impact ₹</th>
                          <th className="py-2 px-2 text-right font-medium text-muted-foreground">Stressed Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeResult.holdings.map((h, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-2 px-2 font-medium text-foreground truncate max-w-[160px] sm:max-w-none">{h.name}</td>
                            <td className="py-2 px-2 text-center">
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 capitalize"
                                style={{
                                  color: h.category === 'equity' ? '#10b981' : h.category === 'debt' ? '#14b8a6' : '#8b5cf6',
                                  borderColor: h.category === 'equity' ? '#10b981' : h.category === 'debt' ? '#14b8a6' : '#8b5cf6',
                                }}
                              >
                                {h.category}
                              </Badge>
                            </td>
                            <td className="py-2 px-2 text-right text-muted-foreground">{formatCurrency(h.currentValue)}</td>
                            <td className={`py-2 px-2 text-center font-medium ${h.impactPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {h.impactPct >= 0 ? '+' : ''}{h.impactPct}%
                            </td>
                            <td className={`py-2 px-2 text-right font-medium ${h.impactAmount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {h.impactAmount >= 0 ? '+' : ''}{formatCurrency(h.impactAmount)}
                            </td>
                            <td className={`py-2 px-2 text-right font-medium ${h.stressedValue >= h.currentValue ? 'text-emerald-600' : 'text-red-600'}`}>
                              {formatCurrency(h.stressedValue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Current vs Stressed bar chart */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-3">Current vs Stressed Value</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={activeResult.holdings.map((h) => ({
                          name: h.name.length > 20 ? h.name.slice(0, 20) + '…' : h.name,
                          'Current': Math.round(h.currentValue),
                          'Stressed': Math.round(h.stressedValue),
                          isGain: h.stressedValue >= h.currentValue,
                        }))}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} className="stroke-border" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}K`} />
                        <Tooltip
                          formatter={(value: number, name: string) => [formatCurrency(value), name]}
                          contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--card-foreground)' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                        <Bar dataKey="Current" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Stressed" radius={[4, 4, 0, 0]}>
                          {activeResult.holdings.map((h, i) => (
                            <Cell key={i} fill={h.stressedValue >= h.currentValue ? '#10b981' : '#ef4444'} fillOpacity={0.7} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multi-scenario comparison chart */}
      <AnimatePresence>
        {showComparison && comparisonData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-card-foreground">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Scenario Comparison
                </CardTitle>
                <CardDescription className="text-xs">
                  Compare how your portfolio performs across selected stress scenarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}K`} />
                      <Tooltip
                        formatter={(value: number, name: string) => [formatCurrency(value), name]}
                        contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--card-foreground)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                      <Bar dataKey="Current Value" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Stressed Value" radius={[4, 4, 0, 0]}>
                        {comparisonData.map((entry, i) => (
                          <Cell key={i} fill={entry.impact >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.7} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Quick comparison cards */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedScenarios.map((id) => {
                    const r = results[id]
                    const isGain = r.totalImpact >= 0
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <r.scenario.icon className={`h-4 w-4 shrink-0 ${r.scenario.color}`} />
                          <span className="text-xs font-medium truncate">{r.scenario.name}</span>
                        </div>
                        <span className={`text-sm font-bold shrink-0 ml-2 ${isGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {isGain ? '+' : ''}{formatCurrency(r.totalImpact)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="ml-3 text-sm text-muted-foreground">Running stress test…</span>
        </div>
      )}
    </div>
  )
}
