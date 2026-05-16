'use client'

import { useFundStore, type HoldingData } from '@/lib/store'
import { formatCurrency } from '@/lib/helpers'
import {
  ArrowRightLeft, AlertTriangle, CheckCircle2, TrendingUp, Info, Calculator, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface HoldingExitLoad {
  holdingId: string
  fundName: string
  category: string
  investedAmount: number
  currentAmount: number
  exitLoadPct: number
  exitLoadRule: string
  holdingDays: number
  exitLoadCost: number
  capitalGainsTax: number
  totalSwitchingCost: number
  expenseDiff: number
  annualSaving: number
  breakEvenMonths: number
  netAnnualSavingAfterBE: number
}

interface ExitLoadSummary {
  holdings: HoldingExitLoad[]
  totalExitLoadCost: number
  totalCapitalGainsTax: number
  totalSwitchingCost: number
  totalAnnualSaving: number
  weightedBreakEvenMonths: number
  netAnnualSavingAfterBE: number
  decisionColor: 'green' | 'yellow' | 'red'
  decisionLabel: string
}

function parseExitLoad(exitLoadStr: string): { pct: number; thresholdDays: number; rule: string } {
  if (!exitLoadStr || exitLoadStr.toLowerCase() === 'nil' || exitLoadStr.trim() === '') {
    return { pct: 0, thresholdDays: 0, rule: 'Nil' }
  }

  // Common pattern: "1% for redemption within 365 days", "1% if redeemed within 1 year", "1% within 6 months"
  // This covers most variations of "within", "for redemption within", "if redeemed within"
  const withinMatch = exitLoadStr.match(/([\d.]+)%\s*(?:for\s+redemption\s+|if\s+redeemed\s+)?within\s+(\d+)\s*(year|month|day)s?/i)
  if (withinMatch) {
    const pct = parseFloat(withinMatch[1])
    const num = parseInt(withinMatch[2])
    const unit = withinMatch[3].toLowerCase()
    let thresholdDays = num
    if (unit === 'year') thresholdDays = num * 365
    else if (unit === 'month') thresholdDays = num * 30
    return { pct, thresholdDays, rule: `${pct}% within ${num} ${unit}${num > 1 ? 's' : ''}` }
  }

  // Pattern for "<" or "before": "1% for < 1 year", "1% before 365 days", "1% prior to 1 year"
  const beforeMatch = exitLoadStr.match(/([\d.]+)%\s*(?:for\s*<\s*|before\s+|prior\s+to\s+)(\d+)\s*(year|month|day)s?/i)
  if (beforeMatch) {
    const pct = parseFloat(beforeMatch[1])
    const num = parseInt(beforeMatch[2])
    const unit = beforeMatch[3].toLowerCase()
    let thresholdDays = num
    if (unit === 'year') thresholdDays = num * 365
    else if (unit === 'month') thresholdDays = num * 30
    return { pct, thresholdDays, rule: `${pct}% before ${num} ${unit}${num > 1 ? 's' : ''}` }
  }

  // Simple percentage match: "1% for 365 days"
  const simpleMatch = exitLoadStr.match(/([\d.]+)%\s*for\s*(\d+)\s*(year|month|day)s?/i)
  if (simpleMatch) {
    const pct = parseFloat(simpleMatch[1])
    const num = parseInt(simpleMatch[2])
    const unit = simpleMatch[3].toLowerCase()
    let thresholdDays = num
    if (unit === 'year') thresholdDays = num * 365
    else if (unit === 'month') thresholdDays = num * 30
    return { pct, thresholdDays, rule: `${pct}% for ${num} ${unit}${num > 1 ? 's' : ''}` }
  }

  return { pct: 0, thresholdDays: 0, rule: exitLoadStr }
}

function mapCategory(cat: string): 'equity' | 'debt' | 'hybrid' {
  if (cat === 'Debt') return 'debt'
  if (cat === 'Hybrid') return 'hybrid'
  return 'equity'
}

const TAX_RULES = {
  equity: { stcgRate: 0.20, ltcgRate: 0.125, ltcgExemption: 125000, stThreshold: 365 },
  debt: { slabRate: 0.30 },
  hybrid: { stcgRate: 0.20, ltcgRate: 0.125, ltcgExemption: 125000, stThreshold: 365 },
}

export default function ExitLoadCalc() {
  const { holdings, fetchHoldings } = useFundStore()

  const [selectedHoldings, setSelectedHoldings] = useState<Set<string>>(new Set())
  const [holdingPeriodOverrides, setHoldingPeriodOverrides] = useState<Record<string, string>>({})
  const [calculated, setCalculated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ExitLoadSummary | null>(null)

  useEffect(() => {
    fetchHoldings()
  }, [fetchHoldings])

  // Auto-select regular plan holdings
  const regularHoldings = useMemo(() => {
    return holdings.filter(h => h.planType === 'regular')
  }, [holdings])

  useEffect(() => {
    if (regularHoldings.length > 0 && selectedHoldings.size === 0) {
      setSelectedHoldings(new Set(regularHoldings.map(h => h.id)))
    }
  }, [regularHoldings, selectedHoldings.size])

  const toggleHolding = (id: string) => {
    setSelectedHoldings(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setCalculated(false)
  }

  const getHoldingDays = (h: HoldingData): number => {
    const override = holdingPeriodOverrides[h.id]
    if (override) return parseInt(override) || 0
    if (h.purchaseDate) {
      return Math.floor((Date.now() - new Date(h.purchaseDate).getTime()) / (1000 * 60 * 60 * 24))
    }
    return 365 // default 1 year
  }

  const calculate = useCallback(() => {
    const selected = regularHoldings.filter(h => selectedHoldings.has(h.id))
    if (selected.length === 0) {
      toast.error('Select at least one Regular plan holding')
      return
    }

    setLoading(true)

    try {
      const holdingResults: HoldingExitLoad[] = []
      let equityLtcgExemptionUsed = 0

      for (const h of selected) {
        const fund = h?.fund
        if (!fund) continue

        const cat = mapCategory(fund.category)
        const holdingDays = getHoldingDays(h)
        const gain = (h?.currentAmount ?? 0) - (h?.investedAmount ?? 0)

        // Exit load
        const { pct: exitLoadPct, rule: exitLoadRule, thresholdDays } = parseExitLoad(fund.exitLoad)
        const effectiveExitLoadPct = holdingDays < thresholdDays ? exitLoadPct : 0
        const exitLoadCost = (h?.currentAmount ?? 0) * (effectiveExitLoadPct / 100)

        // Capital gains tax
        let capitalGainsTax = 0
        if (cat === 'debt') {
          capitalGainsTax = Math.max(0, gain * TAX_RULES.debt.slabRate)
        } else {
          const rules = TAX_RULES[cat]
          if (holdingDays >= rules.stThreshold) {
            const remainingExemption = Math.max(0, rules.ltcgExemption - equityLtcgExemptionUsed)
            const taxableGain = Math.max(0, gain - remainingExemption)
            equityLtcgExemptionUsed += Math.min(Math.max(0, gain), remainingExemption)
            capitalGainsTax = Math.max(0, taxableGain * rules.ltcgRate)
          } else {
            capitalGainsTax = Math.max(0, gain * rules.stcgRate)
          }
        }

        const totalSwitchingCost = exitLoadCost + capitalGainsTax
        const expenseDiff = (fund?.regularExpenseRatio ?? 0) - (fund?.directExpenseRatio ?? 0)
        const annualSaving = (h?.currentAmount ?? 0) * (expenseDiff / 100)
        const breakEvenMonths = annualSaving > 0 ? Math.ceil((totalSwitchingCost / annualSaving) * 12) : 999
        const netAnnualSavingAfterBE = annualSaving

        holdingResults.push({
          holdingId: h.id,
          fundName: fund.schemeName,
          category: cat,
          investedAmount: h?.investedAmount ?? 0,
          currentAmount: h?.currentAmount ?? 0,
          exitLoadPct: effectiveExitLoadPct,
          exitLoadRule,
          holdingDays,
          exitLoadCost,
          capitalGainsTax,
          totalSwitchingCost,
          expenseDiff,
          annualSaving,
          breakEvenMonths,
          netAnnualSavingAfterBE,
        })
      }

      const totalExitLoadCost = holdingResults.reduce((s, h) => s + h.exitLoadCost, 0)
      const totalCapitalGainsTax = holdingResults.reduce((s, h) => s + h.capitalGainsTax, 0)
      const totalSwitchingCost = holdingResults.reduce((s, h) => s + h.totalSwitchingCost, 0)
      const totalAnnualSaving = holdingResults.reduce((s, h) => s + h.annualSaving, 0)
      const weightedBreakEvenMonths = totalAnnualSaving > 0
        ? Math.ceil((totalSwitchingCost / totalAnnualSaving) * 12)
        : 999
      const netAnnualSavingAfterBE = totalAnnualSaving

      let decisionColor: 'green' | 'yellow' | 'red' = 'green'
      let decisionLabel = 'Switch Now'
      if (weightedBreakEvenMonths > 24) {
        decisionColor = 'red'
        decisionLabel = 'Wait & Watch'
      } else if (weightedBreakEvenMonths > 12) {
        decisionColor = 'yellow'
        decisionLabel = 'Consider Carefully'
      }

      setResult({
        holdings: holdingResults,
        totalExitLoadCost,
        totalCapitalGainsTax,
        totalSwitchingCost,
        totalAnnualSaving,
        weightedBreakEvenMonths,
        netAnnualSavingAfterBE,
        decisionColor,
        decisionLabel,
      })
      setCalculated(true)
    } catch {
      toast.error('Calculation failed')
    } finally {
      setLoading(false)
    }
  }, [regularHoldings, selectedHoldings, holdingPeriodOverrides])

  const chartData = useMemo(() => {
    if (!result) return []
    return [
      {
        name: 'Switching Cost',
        value: Math.round(result.totalSwitchingCost),
        fill: '#ef4444',
      },
      {
        name: '1yr Savings',
        value: Math.round(result.totalAnnualSaving * 1),
        fill: '#10b981',
      },
      {
        name: '3yr Savings',
        value: Math.round(result.totalAnnualSaving * 3),
        fill: '#14b8a6',
      },
      {
        name: '5yr Savings',
        value: Math.round(result.totalAnnualSaving * 5),
        fill: '#059669',
      },
      {
        name: '10yr Savings',
        value: Math.round(result.totalAnnualSaving * 10),
        fill: '#047857',
      },
    ]
  }, [result])

  const decisionStyles = useMemo(() => {
    if (!result) return {}
    const styles: Record<string, string> = {
      green: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30',
      yellow: 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
      red: 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
    }
    const iconStyles: Record<string, string> = {
      green: 'text-emerald-600 dark:text-emerald-400',
      yellow: 'text-amber-600 dark:text-amber-400',
      red: 'text-red-600 dark:text-red-400',
    }
    const textStyles: Record<string, string> = {
      green: 'text-emerald-800 dark:text-emerald-300',
      yellow: 'text-amber-800 dark:text-amber-300',
      red: 'text-red-800 dark:text-red-300',
    }
    return {
      card: styles[result.decisionColor],
      icon: iconStyles[result.decisionColor],
      text: textStyles[result.decisionColor],
    }
  }, [result])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <ArrowRightLeft className="h-5 w-5 text-emerald-600" />
            Exit Load & Switching Cost Calculator
            <Badge variant="outline" className="ml-2 text-[10px]">Regular → Direct</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Calculate the true cost of switching from Regular to Direct plans, including exit loads and capital gains tax.
            See how long it takes to break even and start saving.
          </p>

          {/* Regular plan holdings selection */}
          {regularHoldings.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Select Regular Plan Holdings</Label>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => {
                    if (selectedHoldings.size === regularHoldings.length) {
                      setSelectedHoldings(new Set())
                    } else {
                      setSelectedHoldings(new Set(regularHoldings.map(h => h.id)))
                    }
                    setCalculated(false)
                  }}
                >
                  {selectedHoldings.size === regularHoldings.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {regularHoldings.map((h) => {
                  const isSelected = selectedHoldings.has(h.id)
                  const { pct, thresholdDays, rule } = parseExitLoad(h?.fund?.exitLoad || '')
                  const holdingDays = getHoldingDays(h)
                  const willApplyExitLoad = holdingDays < thresholdDays

                  return (
                    <motion.div
                      key={h.id}
                      initial={false}
                      animate={{ opacity: isSelected ? 1 : 0.5 }}
                      className={`rounded-lg border p-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                      onClick={() => toggleHolding(h.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground/30'
                            }`}>
                              {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                            </div>
                            <span className="text-sm font-medium text-foreground truncate">{h?.fund?.schemeName || 'Unknown Fund'}</span>
                          </div>
                          <div className="ml-6 mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>Current: {formatCurrency(h?.currentAmount ?? 0)}</span>
                            <span>Gain: <span className={(h?.currentAmount ?? 0) - (h?.investedAmount ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                              {formatCurrency((h?.currentAmount ?? 0) - (h?.investedAmount ?? 0))}
                            </span></span>
                            <span className="flex items-center gap-1">
                              Exit Load:
                              {pct === 0 ? (
                                <Badge variant="outline" className="text-[9px] px-1 h-4 text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-800">Nil</Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1 h-4 ${
                                    willApplyExitLoad
                                      ? 'text-red-600 border-red-300 dark:text-red-400 dark:border-red-800'
                                      : 'text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-800'
                                  }`}
                                >
                                  {rule} {willApplyExitLoad ? '⚠ Applies' : '✓ Passed'}
                                </Badge>
                              )}
                            </span>
                            <span>ER Diff: <span className="text-emerald-600 dark:text-emerald-400">{((h?.fund?.regularExpenseRatio ?? 0) - (h?.fund?.directExpenseRatio ?? 0)).toFixed(2)}%</span></span>
                          </div>
                        </div>
                      </div>

                      {/* Holding period override */}
                      {isSelected && pct > 0 && (
                        <div className="ml-6 mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Holding period (days):</Label>
                          <Input
                            type="number"
                            value={holdingPeriodOverrides[h.id] ?? String(holdingDays)}
                            onChange={(e) => {
                              setHoldingPeriodOverrides(prev => ({ ...prev, [h.id]: e.target.value }))
                              setCalculated(false)
                            }}
                            className="h-7 w-24 text-xs"
                            placeholder={String(holdingDays)}
                          />
                          <span className="text-[10px] text-muted-foreground">
                            (~{Math.round((holdingPeriodOverrides[h.id] ? parseInt(holdingPeriodOverrides[h.id]) || holdingDays : holdingDays) / 30)} months)
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <ArrowRightLeft className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No Regular plan holdings in your portfolio.</p>
              <p className="text-xs text-muted-foreground mt-1">Add Regular plan holdings in the Portfolio tab to use this calculator.</p>
            </div>
          )}

          {/* Tax rules reference */}
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Tax Rules Applied:</p>
            <p>• Equity/Hybrid STCG (&lt;12 months): 20% · LTCG (&gt;12 months): 12.5% with ₹1.25L exemption</p>
            <p>• Debt funds: Taxed at slab rate (30% used as estimate)</p>
            <p>• Exit load is deducted from redemption amount before tax calculation</p>
          </div>

          {/* Calculate button */}
          <Button
            onClick={calculate}
            disabled={loading || selectedHoldings.size === 0}
            className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            Calculate Switching Cost
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {calculated && result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Decision indicator */}
          <Card className={`border-2 ${decisionStyles.card}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {result.decisionColor === 'green' && <CheckCircle2 className={`h-10 w-10 ${decisionStyles.icon} shrink-0`} />}
                {result.decisionColor === 'yellow' && <AlertTriangle className={`h-10 w-10 ${decisionStyles.icon} shrink-0`} />}
                {result.decisionColor === 'red' && <AlertTriangle className={`h-10 w-10 ${decisionStyles.icon} shrink-0`} />}
                <div>
                  <h3 className={`text-xl font-bold ${decisionStyles.text}`}>{result.decisionLabel}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total switching cost: <strong>{formatCurrency(result.totalSwitchingCost)}</strong>.
                    You&apos;ll break even in <strong>{result.weightedBreakEvenMonths} months</strong>.
                    After that, you save <strong>{formatCurrency(result.netAnnualSavingAfterBE)}/year</strong>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-red-200 dark:border-red-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Exit Load Cost</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(result.totalExitLoadCost)}</p>
                <p className="text-xs text-muted-foreground mt-1">One-time penalty</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Capital Gains Tax</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(result.totalCapitalGainsTax)}</p>
                <p className="text-xs text-muted-foreground mt-1">On redemption</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Annual Saving (Direct)</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(result.totalAnnualSaving)}</p>
                <p className="text-xs text-muted-foreground mt-1">From lower expense ratio</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Break-Even Period</p>
                <p className={`text-2xl font-bold ${
                  result.weightedBreakEvenMonths <= 12 ? 'text-emerald-600' :
                  result.weightedBreakEvenMonths <= 24 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {result.weightedBreakEvenMonths > 120 ? '99+ months' : `${result.weightedBreakEvenMonths} months`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Until savings cover costs</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-holding breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Per-Holding Switching Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="py-2 px-2 text-left font-medium text-muted-foreground">Fund</th>
                      <th className="py-2 px-2 text-center font-medium text-muted-foreground">Holding Days</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Exit Load</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Tax</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Total Cost</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Annual Saving</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Break-Even</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.holdings.map((h) => (
                      <tr key={h.holdingId} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-2">
                          <div className="font-medium text-foreground truncate max-w-[140px] sm:max-w-none">{h.fundName}</div>
                          <div className="text-muted-foreground text-[10px]">{h.exitLoadRule}</div>
                        </td>
                        <td className="py-2 px-2 text-center text-muted-foreground">{h.holdingDays}d</td>
                        <td className={`py-2 px-2 text-right font-medium ${h.exitLoadCost > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {h.exitLoadCost > 0 ? formatCurrency(h.exitLoadCost) : 'Nil'}
                        </td>
                        <td className="py-2 px-2 text-right font-medium text-amber-600 dark:text-amber-400">
                          {formatCurrency(h.capitalGainsTax)}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(h.totalSwitchingCost)}
                        </td>
                        <td className="py-2 px-2 text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(h.annualSaving)}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 ${
                              h.breakEvenMonths <= 12 ? 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400' :
                              h.breakEvenMonths <= 24 ? 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400' :
                              'border-red-300 text-red-700 dark:border-red-800 dark:text-red-400'
                            }`}
                          >
                            {h.breakEvenMonths > 120 ? '99+' : h.breakEvenMonths}mo
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Stacked bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Switching Cost vs Long-Term Savings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--card-foreground)',
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> Cost</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Savings</span>
              </div>
            </CardContent>
          </Card>

          {/* Summary statement */}
          <div className="rounded-xl bg-emerald-50 p-5 dark:bg-emerald-950/20">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-sm text-emerald-800 dark:text-emerald-300 space-y-2">
                <p>
                  <strong>Your Switch Summary:</strong>
                </p>
                <p>
                  Switching your {result.holdings.length} Regular plan holding{result.holdings.length > 1 ? 's' : ''} to Direct
                  will cost <strong>{formatCurrency(result.totalSwitchingCost)}</strong> in exit loads and taxes.
                  But you&apos;ll save <strong>{formatCurrency(result.totalAnnualSaving)}/year</strong> from the lower expense ratio.
                </p>
                <p>
                  You&apos;ll break even in <strong>{result.weightedBreakEvenMonths} months</strong> ({(result.weightedBreakEvenMonths / 12).toFixed(1)} years).
                  {result.weightedBreakEvenMonths <= 12 && ' That\'s less than a year — switching is a no-brainer!'}
                  {result.weightedBreakEvenMonths > 12 && result.weightedBreakEvenMonths <= 24 && ' Consider switching if you plan to hold for 2+ years.'}
                  {result.weightedBreakEvenMonths > 24 && ' The high switching cost means you should evaluate if you\'ll hold long enough to benefit.'}
                </p>
                <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                  💡 After breaking even, you save {formatCurrency(result.netAnnualSavingAfterBE)}/year for the rest of your investment horizon — that compounds significantly over time.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
