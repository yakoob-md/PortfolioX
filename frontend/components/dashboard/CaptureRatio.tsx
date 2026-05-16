'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { Target, TrendingUp, TrendingDown } from 'lucide-react'
import { useFundStore } from '@/lib/store'
import { formatPercent } from '@/lib/helpers'

export default function CaptureRatio() {
  const { funds } = useFundStore()
  const [selectedFundId, setSelectedFundId] = useState('')
  const [result, setResult] = useState<{
    fund: { id: string; schemeName: string; benchmark: string; category: string }
    captureRatios: { upsideCapture1y: number | null; downsideCapture1y: number | null; upsideCapture3y: number | null; downsideCapture3y: number | null }
    alpha: { alpha1y: number; alpha3y: number }
    interpretation: { upside: string; downside: string; overall: string }
  } | null>(null)
  const [allFunds, setAllFunds] = useState<{ id: string; schemeName: string; upsideCapture1y: number | null; upsideCapture3y: number | null; category: string }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/funds/capture-ratio')
      .then(r => r.ok ? r.json() : { funds: [] })
      .then(d => setAllFunds(d.funds || []))
      .catch(() => setAllFunds([]))
  }, [])

  useEffect(() => {
    if (!selectedFundId) return
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      fetch(`/api/funds/capture-ratio?fundId=${selectedFundId}`)
        .then(r => {
          if (!r.ok) throw new Error('Failed')
          return r.json()
        })
        .then(d => { if (!cancelled) { setResult(d); setLoading(false) } })
        .catch(() => { if (!cancelled) { setResult(null); setLoading(false) } })
    }, 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [selectedFundId])

  const chartData = allFunds.slice(0, 15).map(f => ({
    name: f.schemeName.split(' ').slice(0, 3).join(' '),
    'Upside 1Y': f.upsideCapture1y || 0,
    'Downside 1Y': f.upsideCapture1y || 0,
    category: f.category
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
          <Target className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Capture Ratio Analysis</h2>
          <p className="text-sm text-muted-foreground">Upside/Downside capture vs benchmark</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Select value={selectedFundId} onValueChange={setSelectedFundId}>
            <SelectTrigger className="w-full max-w-md"><SelectValue placeholder="Select a fund..." /></SelectTrigger>
            <SelectContent>
              {funds.map(f => <SelectItem key={f.id} value={f.id}>{f.schemeName}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {result && !loading && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Bull Market Score */}
            <Card className="relative overflow-hidden border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Bull Market Score</p>
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-black text-emerald-600">{result.captureRatios.upsideCapture1y || '—'}%</p>
                  <span className="text-[10px] font-bold text-muted-foreground">vs 100% Market</span>
                </div>
                <div className="mt-4 h-1.5 w-full rounded-full bg-emerald-200/50 dark:bg-emerald-900/30 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-emerald-500" 
                    style={{ width: `${Math.min((result.captureRatios.upsideCapture1y || 0), 100)}%` }} 
                  />
                </div>
                <p className="text-[11px] font-medium text-emerald-800/80 dark:text-emerald-400/80 mt-3 leading-relaxed">
                  {result.captureRatios.upsideCapture1y && result.captureRatios.upsideCapture1y > 100 
                    ? `Great! It captured more gains than the market.`
                    : `It captured fewer gains than the market.`}
                </p>
              </CardContent>
            </Card>

            {/* Crash Protection */}
            <Card className="relative overflow-hidden border-orange-500/20 bg-orange-50/30 dark:bg-orange-950/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-widest">Crash Protection</p>
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-black text-orange-600">{result.captureRatios.upsideCapture1y || '—'}%</p>
                  <span className="text-[10px] font-bold text-muted-foreground">vs 100% Market</span>
                </div>
                <div className="mt-4 h-1.5 w-full rounded-full bg-orange-200/50 dark:bg-orange-900/30 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-orange-500" 
                    style={{ width: `${Math.min((result.captureRatios.upsideCapture1y || 0), 100)}%` }} 
                  />
                </div>
                <p className="text-[11px] font-medium text-orange-800/80 dark:text-orange-400/80 mt-3 leading-relaxed">
                  {result.captureRatios.upsideCapture1y && result.captureRatios.upsideCapture1y < 100
                    ? `Excellent. It fell less than the market during crashes.`
                    : `Careful. It fell more than the market during crashes.`}
                </p>
              </CardContent>
            </Card>

          </div>

        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Upside Capture Comparison (Top 15 Funds)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`]} />
              <Legend />
              <Bar dataKey="Upside 1Y" fill="#10b981" radius={[4, 4, 0, 0]} name="Upside Capture" />
              <Bar dataKey="Downside 1Y" fill="#ef4444" radius={[4, 4, 0, 0]} name="Downside Capture" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
