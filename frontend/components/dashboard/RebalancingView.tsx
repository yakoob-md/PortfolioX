'use client'

import { useFundStore, type HoldingData } from '@/lib/store'
import { formatCurrency, formatPercent } from '@/lib/helpers'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PieChart as PieChartIcon, Target, AlertTriangle, ArrowRight, ArrowLeftRight,
  TrendingUp, Shield, ShieldCheck, ShieldAlert, RefreshCw, Briefcase, Loader2,
  BarChart3,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskProfile = 'conservative' | 'moderate' | 'aggressive'

interface AllocationTarget {
  equity: number
  debt: number
  hybrid: number
}

interface DriftItem {
  category: string
  currentPct: number
  targetPct: number
  driftPct: number
  currentAmount: number
  targetAmount: number
  suggestedAmount: number
  action: 'increase' | 'decrease' | 'hold'
}

interface RebalanceSuggestion {
  fromFund: string
  toFund: string
  amount: number
  fromCategory: string
  toCategory: string
  driftReduction: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RISK_TARGETS: Record<RiskProfile, AllocationTarget> = {
  conservative: { equity: 30, debt: 50, hybrid: 20 },
  moderate: { equity: 55, debt: 25, hybrid: 20 },
  aggressive: { equity: 75, debt: 10, hybrid: 15 },
}

const RISK_ICONS: Record<RiskProfile, React.ElementType> = {
  conservative: Shield,
  moderate: ShieldCheck,
  aggressive: ShieldAlert,
}

const RISK_COLORS: Record<RiskProfile, string> = {
  conservative: 'text-teal-600 dark:text-teal-400',
  moderate: 'text-emerald-600 dark:text-emerald-400',
  aggressive: 'text-orange-600 dark:text-orange-400',
}

const RISK_BG: Record<RiskProfile, string> = {
  conservative: 'from-teal-500/10 to-teal-600/5',
  moderate: 'from-emerald-500/10 to-emerald-600/5',
  aggressive: 'from-orange-500/10 to-orange-600/5',
}

const CATEGORY_COLORS_MAP: Record<string, string> = {
  equity: '#10b981',
  debt: '#14b8a6',
  hybrid: '#8b5cf6',
}

const CATEGORY_LABELS: Record<string, string> = {
  equity: 'Equity',
  debt: 'Debt',
  hybrid: 'Hybrid',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeCategory(category: string): 'equity' | 'debt' | 'hybrid' {
  const lower = category.toLowerCase()
  if (lower === 'equity' || lower === 'elss' || lower === 'index') return 'equity'
  if (lower === 'debt') return 'debt'
  return 'hybrid'
}

function computeCurrentAllocation(holdings: HoldingData[]) {
  const amounts: Record<string, number> = { equity: 0, debt: 0, hybrid: 0 }
  let total = 0

  for (const h of holdings) {
    const cat = normalizeCategory(h.fund.category)
    amounts[cat] += h.currentAmount
    total += h.currentAmount
  }

  return {
    amounts,
    total,
    pcts: {
      equity: total > 0 ? Math.round((amounts.equity / total) * 10000) / 100 : 0,
      debt: total > 0 ? Math.round((amounts.debt / total) * 10000) / 100 : 0,
      hybrid: total > 0 ? Math.round((amounts.hybrid / total) * 10000) / 100 : 0,
    },
  }
}

function computeDrift(
  holdings: HoldingData[],
  target: AllocationTarget
): { driftItems: DriftItem[]; totalPortfolio: number; currentPcts: Record<string, number> } {
  const { amounts, total, pcts } = computeCurrentAllocation(holdings)

  const categories: ('equity' | 'debt' | 'hybrid')[] = ['equity', 'debt', 'hybrid']
  const driftItems: DriftItem[] = categories.map((cat) => {
    const currentPct = pcts[cat]
    const targetPct = target[cat]
    const driftPct = Math.round((currentPct - targetPct) * 100) / 100
    const targetAmount = (targetPct / 100) * total
    const suggestedAmount = Math.round(Math.abs(targetAmount - amounts[cat]) * 100) / 100

    let action: 'increase' | 'decrease' | 'hold' = 'hold'
    if (currentPct > targetPct + 5) action = 'decrease'
    else if (currentPct < targetPct - 5) action = 'increase'

    return {
      category: cat,
      currentPct,
      targetPct,
      driftPct,
      currentAmount: amounts[cat],
      targetAmount,
      suggestedAmount,
      action,
    }
  })

  return { driftItems, totalPortfolio: total, currentPcts: pcts }
}

function generateSuggestions(holdings: HoldingData[], driftItems: DriftItem[]): RebalanceSuggestion[] {
  const suggestions: RebalanceSuggestion[] = []

  // Find categories that need increase and decrease
  const needsIncrease = driftItems.filter((d) => d.action === 'increase').sort((a, b) => a.driftPct - b.driftPct)
  const needsDecrease = driftItems.filter((d) => d.action === 'decrease').sort((a, b) => b.driftPct - a.driftPct)

  // Get funds by category
  const fundsByCategory = new Map<string, HoldingData[]>()
  for (const h of holdings) {
    const cat = normalizeCategory(h.fund.category)
    const existing = fundsByCategory.get(cat) || []
    existing.push(h)
    fundsByCategory.set(cat, existing)
  }

  for (const decreaseCat of needsDecrease) {
    const decreaseFunds = (fundsByCategory.get(decreaseCat.category) || [])
      .sort((a, b) => b.currentAmount - a.currentAmount)

    for (const increaseCat of needsIncrease) {
      const increaseFunds = (fundsByCategory.get(increaseCat.category) || [])
        .sort((a, b) => a.currentAmount - b.currentAmount)

      if (decreaseFunds.length > 0 && increaseFunds.length > 0) {
        const amount = Math.min(
          decreaseCat.suggestedAmount / Math.max(needsIncrease.length, 1),
          decreaseFunds[0].currentAmount * 0.3
        )

        if (amount > 100) {
          suggestions.push({
            fromFund: decreaseFunds[0].fund.schemeName,
            toFund: increaseFunds[0].fund.schemeName,
            amount: Math.round(amount),
            fromCategory: decreaseCat.category,
            toCategory: increaseCat.category,
            driftReduction: Math.round(Math.abs(decreaseCat.driftPct) + Math.abs(increaseCat.driftPct)) / 2,
          })
        }
      }
    }
  }

  return suggestions.sort((a, b) => b.driftReduction - a.driftReduction).slice(0, 5)
}

// ─── Donut Chart Component ────────────────────────────────────────────────────

function AllocationDonut({
  data,
  title,
  subtitle,
}: {
  data: { name: string; value: number; pct: number }[]
  title: string
  subtitle: string
}) {
  return (
    <div className="space-y-2">
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CATEGORY_COLORS_MAP[entry.name] || '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => {
                const item = data.find((d) => d.name === name)
                return [`${formatCurrency(value)} (${item?.pct.toFixed(1) || 0}%)`, CATEGORY_LABELS[name] || name]
              }}
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '11px',
                color: 'var(--card-foreground)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 text-[10px]">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS_MAP[item.name] || '#94a3b8' }}
            />
            <span className="text-muted-foreground">{CATEGORY_LABELS[item.name] || item.name}</span>
            <span className="font-semibold text-foreground">{item.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Drift Bar Component ──────────────────────────────────────────────────────

function DriftBar({ current, target, category }: { current: number; target: number; category: string }) {
  const maxVal = Math.max(Math.abs(current), Math.abs(target), 10)
  const currentWidth = (Math.abs(current) / maxVal) * 100
  const targetWidth = (Math.abs(target) / maxVal) * 100
  const drift = Math.abs(current - target)
  const driftColor = drift <= 5 ? '#10b981' : drift <= 15 ? '#f59e0b' : '#ef4444'

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-[10px]">
        <span className="w-12 text-muted-foreground text-right">Current</span>
        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${currentWidth}%` }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="h-full rounded-full"
            style={{ backgroundColor: CATEGORY_COLORS_MAP[category] || '#94a3b8' }}
          />
        </div>
        <span className="w-12 text-right font-medium">{current.toFixed(1)}%</span>
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <span className="w-12 text-muted-foreground text-right">Target</span>
        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${targetWidth}%` }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="h-full rounded-full opacity-50"
            style={{ backgroundColor: CATEGORY_COLORS_MAP[category] || '#94a3b8' }}
          />
        </div>
        <span className="w-12 text-right font-medium">{target.toFixed(1)}%</span>
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <span className="w-12 text-muted-foreground text-right">Drift</span>
        <div className="flex-1 flex items-center">
          <div className="h-1.5 rounded-full w-full" style={{ backgroundColor: `${driftColor}33` }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((drift / maxVal) * 100, 100)}%` }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="h-full rounded-full"
              style={{ backgroundColor: driftColor }}
            />
          </div>
        </div>
        <span className="w-12 text-right font-semibold" style={{ color: driftColor }}>
          {drift <= 5 ? '✓' : drift <= 15 ? '⚠' : '✗'} {drift.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function RebalancingView() {
  const { holdings, fetchHoldings, sessionId, setActiveTab } = useFundStore()

  const [riskProfile, setRiskProfile] = useState<RiskProfile>('moderate')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchHoldings()
  }, [fetchHoldings])

  const target = RISK_TARGETS[riskProfile]
  const RiskIcon = RISK_ICONS[riskProfile]

  // ─── Client-side computation ────────────────────────────────────────────────
  const { driftItems, totalPortfolio, currentPcts } = useMemo(
    () => computeDrift(holdings, target),
    [holdings, target]
  )

  const suggestions = useMemo(
    () => generateSuggestions(holdings, driftItems),
    [holdings, driftItems]
  )

  // ─── Donut chart data ───────────────────────────────────────────────────────
  const currentDonutData = useMemo(() => [
    { name: 'equity', value: Math.round(currentPcts.equity * totalPortfolio / 100), pct: currentPcts.equity },
    { name: 'debt', value: Math.round(currentPcts.debt * totalPortfolio / 100), pct: currentPcts.debt },
    { name: 'hybrid', value: Math.round(currentPcts.hybrid * totalPortfolio / 100), pct: currentPcts.hybrid },
  ], [currentPcts, totalPortfolio])

  const targetDonutData = useMemo(() => [
    { name: 'equity', value: Math.round(target.equity * totalPortfolio / 100), pct: target.equity },
    { name: 'debt', value: Math.round(target.debt * totalPortfolio / 100), pct: target.debt },
    { name: 'hybrid', value: Math.round(target.hybrid * totalPortfolio / 100), pct: target.hybrid },
  ], [target, totalPortfolio])

  // ─── Diversification score ──────────────────────────────────────────────────
  const diversificationScore = useMemo(() => {
    // Compute a simple diversification score based on how close current is to target
    const totalDrift = driftItems.reduce((sum, d) => sum + Math.abs(d.driftPct), 0)
    return Math.max(0, Math.round(100 - totalDrift * 2))
  }, [driftItems])

  const projectedScore = useMemo(() => {
    // After rebalancing, drift should be ~0
    return Math.min(100, diversificationScore + Math.round((100 - diversificationScore) * 0.7))
  }, [diversificationScore])

  // ─── Before/After metrics ───────────────────────────────────────────────────
  const beforeAfterData = useMemo(() => {
    const currentWeightedReturn = holdings.reduce((sum, h) => {
      const ret = h.fund.directReturn1y || 0
      return sum + (h.currentAmount / totalPortfolio) * ret
    }, 0)

    // Projected return after rebalancing (weighted by target allocation)
    const catReturns: Record<string, number[]> = { equity: [], debt: [], hybrid: [] }
    for (const h of holdings) {
      const cat = normalizeCategory(h.fund.category)
      if (h.fund.directReturn1y !== null) catReturns[cat].push(h.fund.directReturn1y)
    }

    const avgCatReturn: Record<string, number> = {}
    for (const cat of ['equity', 'debt', 'hybrid'] as const) {
      avgCatReturn[cat] = catReturns[cat].length > 0
        ? catReturns[cat].reduce((a, b) => a + b, 0) / catReturns[cat].length
        : 0
    }

    const projectedReturn = (target.equity / 100) * avgCatReturn.equity
      + (target.debt / 100) * avgCatReturn.debt
      + (target.hybrid / 100) * avgCatReturn.hybrid

    const currentRisk = holdings.reduce((sum, h) => {
      const riskMap: Record<string, number> = { equity: 0.8, debt: 0.2, hybrid: 0.5 }
      const cat = normalizeCategory(h.fund.category)
      return sum + (h.currentAmount / totalPortfolio) * riskMap[cat]
    }, 0)

    const targetRisk = (target.equity / 100) * 0.8 + (target.debt / 100) * 0.2 + (target.hybrid / 100) * 0.5

    return {
      currentReturn: currentWeightedReturn,
      projectedReturn,
      currentRisk: Math.round(currentRisk * 100),
      targetRisk: Math.round(targetRisk * 100),
    }
  }, [holdings, totalPortfolio, target])

  // ─── API refresh ────────────────────────────────────────────────────────────
  const refreshFromApi = async () => {
    if (holdings.length === 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/portfolio/rebalancing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          targetAllocation: target,
        }),
      })
      if (res.ok) {
        await res.json()
      }
    } catch {
      // Client-side fallback is already active
    }
    setLoading(false)
  }

  // ─── Empty state ────────────────────────────────────────────────────────────
  if (holdings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 ring-1 ring-violet-500/20">
            <ArrowLeftRight className="h-10 w-10 text-violet-500" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground">No Portfolio to Rebalance</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Add holdings to your portfolio first, then come back to analyze rebalancing opportunities.
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-violet-500" />
            Portfolio Rebalancing
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Detect drift and get rebalancing suggestions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={riskProfile}
            onValueChange={(v) => setRiskProfile(v as RiskProfile)}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Risk Profile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conservative">Conservative</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="aggressive">Aggressive</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={refreshFromApi}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
          <Badge variant="outline" className="text-xs">
            {formatCurrency(totalPortfolio)}
          </Badge>
        </div>
      </div>

      {/* ─── Risk Profile Target Card ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${RISK_BG[riskProfile]} opacity-60`} />
          <CardContent className="relative p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/80 ring-1 ring-border">
                <RiskIcon className={`h-5 w-5 ${RISK_COLORS[riskProfile]}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground capitalize">{riskProfile} Target Allocation</p>
                <p className="text-xs text-muted-foreground">
                  Equity {target.equity}% · Debt {target.debt}% · Hybrid {target.hybrid}%
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Badge className={`text-[10px] ${riskProfile === 'conservative' ? 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20' : riskProfile === 'moderate' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20'}`}>
                  {riskProfile === 'conservative' ? 'Low Risk' : riskProfile === 'moderate' ? 'Balanced' : 'High Growth'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Current vs Target Donut Charts ──────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <AllocationDonut
              data={currentDonutData}
              title="Current Allocation"
              subtitle={`Based on ${holdings.length} holdings`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <AllocationDonut
              data={targetDonutData}
              title="Target Allocation"
              subtitle={`${riskProfile.charAt(0).toUpperCase() + riskProfile.slice(1)} profile`}
            />
          </CardContent>
        </Card>
      </div>

      {/* ─── Drift Analysis Table ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-500" />
            Drift Analysis
          </CardTitle>
          <CardDescription className="text-xs">
            Categories with drift beyond ±5% need rebalancing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-[120px_1fr_80px_80px_80px_120px] gap-2 text-[10px] font-medium text-muted-foreground px-3">
            <span>Category</span>
            <span>Allocation</span>
            <span className="text-right">Current</span>
            <span className="text-right">Target</span>
            <span className="text-right">Drift</span>
            <span className="text-right">Action</span>
          </div>

          {driftItems.map((item, idx) => {
            const absDrift = Math.abs(item.driftPct)
            const driftColor = absDrift <= 5 ? 'text-emerald-600 dark:text-emerald-400' : absDrift <= 15 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
            const driftBg = absDrift <= 5 ? 'bg-emerald-500/10' : absDrift <= 15 ? 'bg-amber-500/10' : 'bg-red-500/10'
            const catColor = CATEGORY_COLORS_MAP[item.category] || '#94a3b8'

            return (
              <motion.div
                key={item.category}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="rounded-lg border p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: catColor }} />
                    <span className="text-sm font-semibold text-foreground capitalize">{item.category}</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 capitalize">
                      {CATEGORY_LABELS[item.category]}
                    </Badge>
                  </div>
                  <span className={`text-sm font-bold ${driftColor}`}>
                    {item.driftPct >= 0 ? '+' : ''}{item.driftPct.toFixed(1)}%
                  </span>
                </div>

                {/* Drift bar visualization */}
                <DriftBar current={item.currentPct} target={item.targetPct} category={item.category} />

                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span>Amount:</span>
                    <span className="font-medium text-foreground">{formatCurrency(item.currentAmount)}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 ${driftBg}`}>
                    {item.action === 'hold' ? (
                      <Shield className="h-3 w-3 text-emerald-600" />
                    ) : item.action === 'increase' ? (
                      <TrendingUp className="h-3 w-3 text-amber-600" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                    )}
                    <span className={`font-medium ${driftColor}`}>
                      {item.action === 'hold'
                        ? 'Hold'
                        : item.action === 'increase'
                        ? `Increase by ${formatCurrency(item.suggestedAmount)}`
                        : `Decrease by ${formatCurrency(item.suggestedAmount)}`
                      }
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </CardContent>
      </Card>

      {/* ─── Rebalancing Suggestions ─────────────────────────────────────────── */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-violet-500" />
              Rebalancing Suggestions
            </CardTitle>
            <CardDescription className="text-xs">
              Priority-ordered moves to reduce portfolio drift
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <AnimatePresence>
              {suggestions.map((sug, idx) => (
                <motion.div
                  key={`${sug.fromFund}-${sug.toFund}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.08 }}
                >
                  <Card className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-purple-500/5 opacity-60" />
                    <CardContent className="relative p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-[11px] font-bold text-violet-600 dark:text-violet-400 shrink-0">
                          #{idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
                              {sug.fromFund}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                            <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
                              {sug.toFund}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                            <span className="capitalize">{sug.fromCategory}</span>
                            <span>→</span>
                            <span className="capitalize">{sug.toCategory}</span>
                            <span>·</span>
                            <span>Drift reduction: {sug.driftReduction.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-violet-600 dark:text-violet-400">
                            {formatCurrency(sug.amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">to move</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Estimated improvement */}
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-2">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-[11px]">
                <span className="text-muted-foreground">Estimated improvement in diversification score: </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {diversificationScore} → {projectedScore} (+{projectedScore - diversificationScore} pts)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Rebalancing Impact ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-teal-500" />
            Rebalancing Impact
          </CardTitle>
          <CardDescription className="text-xs">
            Before vs After comparison of key portfolio metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Before/After comparison cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-lg border p-3 space-y-1"
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Weighted Return (1Y)</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground line-through">
                  {formatPercent(beforeAfterData.currentReturn)}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className={`text-sm font-bold ${beforeAfterData.projectedReturn >= beforeAfterData.currentReturn ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatPercent(beforeAfterData.projectedReturn)}
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-lg border p-3 space-y-1"
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Risk Score</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground line-through">
                  {beforeAfterData.currentRisk}%
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className={`text-sm font-bold ${beforeAfterData.targetRisk <= beforeAfterData.currentRisk ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {beforeAfterData.targetRisk}%
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-lg border p-3 space-y-1"
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Diversification</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground line-through">
                  {diversificationScore}/100
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {projectedScore}/100
                </span>
              </div>
            </motion.div>
          </div>

          <Separator />

          {/* Projected improvement bar chart */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Category Allocation Change</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      category: 'Equity',
                      current: currentPcts.equity,
                      target: target.equity,
                    },
                    {
                      category: 'Debt',
                      current: currentPcts.debt,
                      target: target.debt,
                    },
                    {
                      category: 'Hybrid',
                      current: currentPcts.hybrid,
                      target: target.hybrid,
                    },
                  ]}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} className="stroke-border" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: 'var(--card-foreground)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                  <Bar dataKey="current" name="Current" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="target" name="Target" fill="#8b5cf6" radius={[4, 4, 0, 0]} fillOpacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk-adjusted return note */}
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">Projected risk-adjusted improvement: </span>
              Rebalancing to your {riskProfile} target allocation would{' '}
              {beforeAfterData.projectedReturn >= beforeAfterData.currentReturn
                ? 'improve projected returns by ' + formatPercent(beforeAfterData.projectedReturn - beforeAfterData.currentReturn)
                : 'reduce projected returns by ' + formatPercent(Math.abs(beforeAfterData.projectedReturn - beforeAfterData.currentReturn))
              }{' '}
              while{' '}
              {beforeAfterData.targetRisk <= beforeAfterData.currentRisk
                ? 'lowering portfolio risk'
                : 'increasing portfolio risk exposure'
              }
              . This aligns your portfolio with your stated {riskProfile} risk tolerance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
