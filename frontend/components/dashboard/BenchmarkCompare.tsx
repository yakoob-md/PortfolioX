'use client'

import { useFundStore } from '@/lib/store'
import { formatPercent } from '@/lib/helpers'
import { BarChart3, TrendingUp, TrendingDown, Minus, Scale, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'

export default function BenchmarkCompare() {
  const { funds, fetchFunds } = useFundStore()
  const [selectedFundId, setSelectedFundId] = useState('')

  useEffect(() => {
    if (funds.length === 0) fetchFunds()
  }, [])

  const selectedFund = useMemo(() => {
    if (!selectedFundId) return funds.length > 0 ? funds[0] : null
    return funds.find(f => f.id === selectedFundId) || null
  }, [funds, selectedFundId])

  // Ensure we have a fund selected
  const effectiveFundId = selectedFundId || (funds.length > 0 ? funds[0].id : '')

  const comparisonData = useMemo(() => {
    if (!selectedFund) return []
    const periods = [
      { period: '1Y', fundReturn: selectedFund.directReturn1y, benchReturn: selectedFund.benchmarkReturn1y },
      { period: '3Y', fundReturn: selectedFund.directReturn3y, benchReturn: selectedFund.benchmarkReturn3y },
      { period: '5Y', fundReturn: selectedFund.directReturn5y, benchReturn: selectedFund.benchmarkReturn5y },
    ]
    return periods.filter(p => p.fundReturn !== null && p.benchReturn !== null)
  }, [selectedFund])

  const alphaCards = useMemo(() => {
    if (!selectedFund) return []
    const cards: { label: string; fund: number; bench: number; alpha: number }[] = []
    const periods: { label: string; fund: number | null; bench: number | null }[] = [
      { label: '1 Year', fund: selectedFund.directReturn1y, bench: selectedFund.benchmarkReturn1y },
      { label: '3 Year', fund: selectedFund.directReturn3y, bench: selectedFund.benchmarkReturn3y },
      { label: '5 Year', fund: selectedFund.directReturn5y, bench: selectedFund.benchmarkReturn5y },
    ]
    for (const p of periods) {
      if (p.fund !== null && p.bench !== null) {
        const alpha = p.fund - p.bench
        cards.push({ label: p.label, fund: p.fund, bench: p.bench, alpha })
      }
    }
    return cards
  }, [selectedFund])

  return (
    <div className="space-y-6">
      {/* Fund Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <Scale className="h-5 w-5 text-emerald-600" />
            Benchmark Comparison
          </CardTitle>
          <CardDescription>Compare fund performance against its benchmark across multiple time periods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Select value={effectiveFundId} onValueChange={setSelectedFundId}>
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

          {selectedFund && (
            <div className="mt-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p><strong>{selectedFund.schemeName}</strong></p>
              <p className="mt-1">
                {selectedFund.category} · {selectedFund.subCategory} · Benchmark: <strong>{selectedFund.benchmark}</strong>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedFund && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Alpha Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {alphaCards.length > 0 ? alphaCards.map((card) => {
              const isBeat = card.alpha > 0
              const isSignificant = Math.abs(card.alpha) > 1
              return (
                <Card
                  key={card.label}
                  className={`border-2 ${
                    isBeat
                      ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10'
                      : 'border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground font-medium">{card.label} Alpha</p>
                      <Badge
                        className={`text-[10px] ${
                          isBeat
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
                        }`}
                        variant="outline"
                      >
                        {isBeat ? (
                          <span className="flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" /> BEAT</span>
                        ) : (
                          <span className="flex items-center gap-0.5"><ArrowDownRight className="h-3 w-3" /> MISSED</span>
                        )}
                      </Badge>
                    </div>
                    <p className={`text-3xl font-bold ${isBeat ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {card.alpha >= 0 ? '+' : ''}{card.alpha.toFixed(2)}%
                    </p>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fund Return</span>
                        <span className={`font-medium ${isBeat ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatPercent(card.fund)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Benchmark</span>
                        <span className="text-foreground font-medium">{formatPercent(card.bench)}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between font-medium">
                        <span className="text-muted-foreground">Alpha</span>
                        <span className={isBeat ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                          {card.alpha >= 0 ? '+' : ''}{card.alpha.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            }) : (
              <Card className="sm:col-span-3">
                <CardContent className="py-12 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No benchmark return data available for this fund.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Bar Chart: Fund vs Benchmark */}
          {comparisonData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  Fund Returns vs Benchmark
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} barGap={8}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} className="stroke-border" />
                      <XAxis dataKey="period" tick={{ fontSize: 13, fontWeight: 600 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
                      <Tooltip
                        formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--card-foreground)',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} iconSize={10} />
                      <Bar dataKey="fundReturn" name="Fund Return" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="benchReturn" name="Benchmark Return" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Detailed Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Period</th>
                      <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Fund Return</th>
                      <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Benchmark</th>
                      <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Alpha</th>
                      <th className="py-2.5 px-3 text-center font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alphaCards.map((card) => {
                      const isBeat = card.alpha > 0
                      return (
                        <tr key={card.label} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2.5 px-3 font-medium text-foreground">{card.label}</td>
                          <td className={`py-2.5 px-3 text-right font-medium ${isBeat ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatPercent(card.fund)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-foreground">{formatPercent(card.bench)}</td>
                          <td className={`py-2.5 px-3 text-right font-bold ${isBeat ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {card.alpha >= 0 ? '+' : ''}{card.alpha.toFixed(2)}%
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              className={`text-[10px] ${
                                isBeat
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-red-500/10 text-red-700 dark:text-red-400'
                              }`}
                            >
                              {isBeat ? 'Beat' : 'Underperformed'}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Overall Verdict */}
          {alphaCards.length > 0 && (
            <div className={`rounded-xl p-5 ${
              alphaCards.every(c => c.alpha > 0)
                ? 'bg-emerald-50 dark:bg-emerald-950/20'
                : alphaCards.every(c => c.alpha < 0)
                ? 'bg-red-50 dark:bg-red-950/20'
                : 'bg-amber-50 dark:bg-amber-950/20'
            }`}>
              <div className="flex items-start gap-3">
                {alphaCards.every(c => c.alpha > 0) ? (
                  <TrendingUp className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                ) : alphaCards.every(c => c.alpha < 0) ? (
                  <TrendingDown className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                ) : (
                  <Minus className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                )}
                <div className={`text-sm space-y-2 ${
                  alphaCards.every(c => c.alpha > 0)
                    ? 'text-emerald-800 dark:text-emerald-300'
                    : alphaCards.every(c => c.alpha < 0)
                    ? 'text-red-800 dark:text-red-300'
                    : 'text-amber-800 dark:text-amber-300'
                }`}>
                  <p className="font-medium">
                    {alphaCards.every(c => c.alpha > 0)
                      ? '🏆 This fund consistently outperforms its benchmark across all periods.'
                      : alphaCards.every(c => c.alpha < 0)
                      ? '⚠️ This fund consistently underperforms its benchmark. Consider alternatives.'
                      : '📊 This fund has mixed performance vs its benchmark across time periods.'}
                  </p>
                  <p>
                    Average alpha: <strong>{(alphaCards.reduce((sum, c) => sum + c.alpha, 0) / alphaCards.length).toFixed(2)}%</strong>
                    {' · '}Beat benchmark in <strong>{alphaCards.filter(c => c.alpha > 0).length}/{alphaCards.length}</strong> periods
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
