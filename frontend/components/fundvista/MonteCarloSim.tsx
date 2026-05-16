'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Dice5, TrendingUp, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'

export default function MonteCarloSim() {
  const [investmentAmount, setInvestmentAmount] = useState(1000000)
  const [years, setYears] = useState(15)
  const [equityPct, setEquityPct] = useState(60)
  const [result, setResult] = useState<{
    results: { median: number; medianGain: number; medianGainPct: number; worst10pct: number; best10pct: number; potentialLoss10pct: number }
    yearlyBands: { year: number; p10: number; p25: number; p50: number; p75: number; p90: number }[]
    probabilityOfGain: number; probabilityOfDoubling: number
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const runSimulation = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/portfolio/monte-carlo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investmentAmount, years, equityPct, debtPct: 100 - equityPct, simulations: 1000 })
      })
      const data = await res.json()
      setResult(data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  const debtPct = 100 - equityPct

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center">
          <Dice5 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Monte Carlo Simulation</h2>
          <p className="text-sm text-muted-foreground">1000 simulations for portfolio projection</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><Label>Investment Amount (₹)</Label><Input type="number" value={investmentAmount} onChange={e => setInvestmentAmount(Number(e.target.value))} /></div>
            <div><Label>Time Horizon (Years)</Label><Input type="number" value={years} onChange={e => setYears(Number(e.target.value))} min={1} max={40} /></div>
            <div><Label>Equity Allocation (%)</Label><Input type="number" value={equityPct} onChange={e => setEquityPct(Math.min(100, Math.max(0, Number(e.target.value))))} min={0} max={100} /></div>
            <div><Label>Debt Allocation (%)</Label><Input type="number" value={debtPct} disabled /></div>
          </div>
          <Button onClick={runSimulation} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
            {loading ? 'Running 1000 Simulations...' : '🎲 Run Monte Carlo Simulation'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="pt-6 text-center">
                <TrendingUp className="mx-auto h-6 w-6 text-emerald-600" />
                <p className="text-xs text-muted-foreground mt-1">Median Outcome</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(result.results.median)}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(result.results.medianGain)} gain</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50/50 dark:bg-red-950/20">
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="mx-auto h-6 w-6 text-red-600" />
                <p className="text-xs text-muted-foreground mt-1">Worst Case (10th %ile)</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(result.results.worst10pct)}</p>
                <p className="text-xs text-red-500">Loss: {formatCurrency(result.results.potentialLoss10pct)}</p>
              </CardContent>
            </Card>
            <Card className="bg-teal-50/50 dark:bg-teal-950/20">
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground mt-1">Best Case (90th %ile)</p>
                <p className="text-xl font-bold text-teal-600">{formatCurrency(result.results.best10pct)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground mt-1">Probability of Gain</p>
                <p className="text-xl font-bold">{result.probabilityOfGain}%</p>
                <Badge variant="outline" className="mt-1 text-[10px]">Doubling: {result.probabilityOfDoubling}%</Badge>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Simulation Fan Chart (Percentile Bands)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={result.yearlyBands}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="p10" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                  <Area type="monotone" dataKey="p25" stackId="2" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="p50" stackId="3" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="p75" stackId="4" stroke="#0d9488" fill="#0d9488" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="p90" stackId="5" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground justify-center flex-wrap">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> 10th %ile (Worst)</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> 25th %ile</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Median</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-teal-500" /> 75th %ile</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" /> 90th %ile (Best)</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
