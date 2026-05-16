'use client'

import { useFundStore } from '@/lib/store'
import { formatPercent } from '@/lib/helpers'
import { Gauge, AlertTriangle, TrendingDown, Activity, Shield, BarChart3, Loader2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'

interface VolatilityResult {
  fundId: string
  schemeName: string
  category: string
  annualizedVolatility: number
  maxDrawdown: number
  sortinoRatio: number
  calmarRatio: number
  downsideDeviation: number
  sharpeRatio: number | null
}

const CATEGORY_AVG_VOLATILITY: Record<string, number> = {
  Equity: 20,
  ELSS: 20,
  Index: 18,
  Hybrid: 12,
  Debt: 6,
}

function getRiskClassification(volatility: number): { label: string; color: string; bgColor: string } {
  if (volatility < 8) return { label: 'Low', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500' }
  if (volatility < 15) return { label: 'Moderate', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500' }
  if (volatility < 25) return { label: 'High', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-500' }
  return { label: 'Very High', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500' }
}

function GaugeMeter({ value, max, label, unit, color }: { value: number; max: number; label: string; unit: string; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-bold text-foreground">{value.toFixed(2)}{unit}</span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`absolute inset-y-0 left-0 rounded-full ${color}`}
        />
      </div>
    </div>
  )
}

export default function VolatilityAnalysis() {
  const { funds, fetchFunds } = useFundStore()

  const [selectedFundId, setSelectedFundId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VolatilityResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (funds.length === 0) fetchFunds()
  }, [])

  const effectiveFundId = selectedFundId || (funds.length > 0 ? funds[0].id : '')

  const handleAnalyze = async () => {
    if (!effectiveFundId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/funds/volatility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fundId: effectiveFundId }),
      })

      if (!res.ok) throw new Error('Analysis failed')
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Failed to analyze volatility. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-analyze on first load
  useEffect(() => {
    if (effectiveFundId && !result && !loading) {
      handleAnalyze()
    }
  }, [effectiveFundId])

  const riskClass = useMemo(() => {
    if (!result) return null
    return getRiskClassification(result.annualizedVolatility)
  }, [result])

  const categoryAvgVol = useMemo(() => {
    if (!result) return 0
    return CATEGORY_AVG_VOLATILITY[result.category] || 18
  }, [result])

  return (
    <div className="space-y-6">
      {/* Fund Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <Gauge className="h-5 w-5 text-emerald-600" />
            Volatility & Drawdown Analysis
          </CardTitle>
          <CardDescription>Analyze risk metrics including volatility, max drawdown, and risk-adjusted ratios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="max-w-md flex-1 min-w-[200px]">
              <Select value={effectiveFundId} onValueChange={(v) => { setSelectedFundId(v); setResult(null) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a fund" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {funds.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      <span className="text-xs">{f.schemeName}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={loading || !effectiveFundId}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Risk Classification Banner */}
          {riskClass && (
            <Card className={`border-2 ${riskClass.label === 'Low' ? 'border-emerald-300 dark:border-emerald-800' : riskClass.label === 'Moderate' ? 'border-amber-300 dark:border-amber-800' : riskClass.label === 'High' ? 'border-orange-300 dark:border-orange-800' : 'border-red-300 dark:border-red-800'}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${riskClass.label === 'Low' ? 'bg-emerald-100 dark:bg-emerald-900' : riskClass.label === 'Moderate' ? 'bg-amber-100 dark:bg-amber-900' : riskClass.label === 'High' ? 'bg-orange-100 dark:bg-orange-900' : 'bg-red-100 dark:bg-red-900'}`}>
                  <Shield className={`h-6 w-6 ${riskClass.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risk Classification</p>
                  <p className={`text-xl font-bold ${riskClass.color}`}>{riskClass.label} Risk</p>
                  <p className="text-xs text-muted-foreground">
                    Annualized volatility of {result.annualizedVolatility.toFixed(2)}% — {riskClass.label === 'Low' ? 'suitable for conservative investors' : riskClass.label === 'Moderate' ? 'suitable for moderate risk appetite' : riskClass.label === 'High' ? 'requires high risk tolerance' : 'extremely risky, only for aggressive investors'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Annualized Volatility */}
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="h-3 w-3" /> Annualized Volatility</p>
                <p className="text-2xl font-bold text-foreground mt-1">{result.annualizedVolatility.toFixed(2)}%</p>
                <div className="mt-3">
                  <GaugeMeter value={result.annualizedVolatility} max={50} label="Volatility Level" unit="%" color={riskClass?.bgColor || 'bg-amber-500'} />
                </div>
              </CardContent>
            </Card>

            {/* Max Drawdown */}
            <Card className="border-red-200 dark:border-red-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Max Drawdown</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">-{result.maxDrawdown.toFixed(2)}%</p>
                <div className="mt-3">
                  <GaugeMeter value={result.maxDrawdown} max={50} label="Drawdown Severity" unit="%" color="bg-red-500" />
                </div>
              </CardContent>
            </Card>

            {/* Sortino Ratio */}
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Sortino Ratio</p>
                <p className={`text-2xl font-bold mt-1 ${result.sortinoRatio > 1 ? 'text-emerald-600 dark:text-emerald-400' : result.sortinoRatio > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                  {result.sortinoRatio.toFixed(2)}
                </p>
                <div className="mt-3">
                  <GaugeMeter value={Math.abs(result.sortinoRatio)} max={3} label="Downside Risk-Adjusted" unit="" color={result.sortinoRatio > 0 ? 'bg-emerald-500' : 'bg-red-500'} />
                </div>
              </CardContent>
            </Card>

            {/* Calmar Ratio */}
            <Card className="border-teal-200 dark:border-teal-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Gauge className="h-3 w-3" /> Calmar Ratio</p>
                <p className={`text-2xl font-bold mt-1 ${result.calmarRatio > 0.5 ? 'text-teal-600 dark:text-teal-400' : result.calmarRatio > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                  {result.calmarRatio.toFixed(2)}
                </p>
                <div className="mt-3">
                  <GaugeMeter value={Math.abs(result.calmarRatio)} max={2} label="Return vs Drawdown" unit="" color={result.calmarRatio > 0 ? 'bg-teal-500' : 'bg-red-500'} />
                </div>
              </CardContent>
            </Card>

            {/* Downside Deviation */}
            <Card className="border-amber-200 dark:border-amber-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Downside Deviation</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{result.downsideDeviation.toFixed(2)}%</p>
                <div className="mt-3">
                  <GaugeMeter value={result.downsideDeviation} max={35} label="Downside Risk" unit="%" color="bg-amber-500" />
                </div>
              </CardContent>
            </Card>

            {/* Sharpe Ratio */}
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Sharpe Ratio</p>
                <p className={`text-2xl font-bold mt-1 ${result.sharpeRatio !== null && result.sharpeRatio > 1 ? 'text-emerald-600 dark:text-emerald-400' : result.sharpeRatio !== null && result.sharpeRatio > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                  {result.sharpeRatio !== null ? result.sharpeRatio.toFixed(2) : '—'}
                </p>
                <div className="mt-3">
                  <GaugeMeter value={result.sharpeRatio ? Math.abs(result.sharpeRatio) : 0} max={3} label="Risk-Adjusted Return" unit="" color={result.sharpeRatio && result.sharpeRatio > 0 ? 'bg-emerald-500' : 'bg-red-500'} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                Volatility vs Category Average
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">This Fund</span>
                    <span className="font-bold text-foreground">{result.annualizedVolatility.toFixed(2)}%</span>
                  </div>
                  <div className="relative h-4 w-full rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((result.annualizedVolatility / 50) * 100, 100)}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Category Average ({result.category})</span>
                    <span className="font-medium text-foreground">{categoryAvgVol.toFixed(2)}%</span>
                  </div>
                  <div className="relative h-4 w-full rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((categoryAvgVol / 50) * 100, 100)}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="absolute inset-y-0 left-0 rounded-full bg-slate-400"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={`text-xs ${result.annualizedVolatility < categoryAvgVol ? 'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' : 'text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'}`}>
                    {result.annualizedVolatility < categoryAvgVol
                      ? `${(categoryAvgVol - result.annualizedVolatility).toFixed(2)}% less volatile than category`
                      : `${(result.annualizedVolatility - categoryAvgVol).toFixed(2)}% more volatile than category`}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <div className="rounded-xl bg-emerald-50 p-5 dark:bg-emerald-950/20">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-sm text-emerald-800 dark:text-emerald-300 space-y-2">
                <p><strong>Understanding these metrics:</strong></p>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>Volatility</strong>: Lower is better. Measures how much returns fluctuate. &lt;8% = Low, 8-15% = Moderate, 15-25% = High, &gt;25% = Very High</li>
                  <li><strong>Max Drawdown</strong>: The worst peak-to-trough decline. Lower is better.</li>
                  <li><strong>Sortino Ratio</strong>: Like Sharpe, but only penalizes downside volatility. Higher is better (&gt;1 is good).</li>
                  <li><strong>Calmar Ratio</strong>: Return per unit of max drawdown. Higher is better.</li>
                  <li><strong>Sharpe Ratio</strong>: Risk-adjusted return. Higher is better (&gt;1 is good, &gt;2 is excellent).</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
