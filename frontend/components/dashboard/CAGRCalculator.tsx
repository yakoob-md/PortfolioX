'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Calculator, Clock } from 'lucide-react'
import { useFundStore } from '@/lib/store'
import { formatPercent } from '@/lib/helpers'

export default function CAGRCalculator() {
  const { funds } = useFundStore()
  const [mode, setMode] = useState<'fund' | 'manual'>('fund')
  const [selectedFundId, setSelectedFundId] = useState('')
  const [startValue, setStartValue] = useState(100000)
  const [endValue, setEndValue] = useState(300000)
  const [period, setPeriod] = useState(5)
  const [fundResult, setFundResult] = useState<{ id: string; schemeName: string; cagr1y: number | null; cagr3y: number | null; cagr5y: number | null; sinceInceptionCAGR: number | null; yearsSinceInception: number; alpha1y: number | null; alpha3y: number | null }[]>([])
  const [manualResult, setManualResult] = useState<{ cagr: number; totalReturn: number; ruleOf72: number; interpretation: string } | null>(null)

  useEffect(() => {
    if (mode === 'fund') {
      fetch('/api/funds/cagr').then(r => r.json()).then(d => setFundResult(d.funds || [])).catch(() => {})
    }
  }, [mode])

  const calculateManual = () => {
    fetch(`/api/funds/cagr?startValue=${startValue}&endValue=${endValue}&period=${period}`).then(r => r.json()).then(d => setManualResult(d)).catch(() => {})
  }

  const chartData = fundResult.slice(0, 15).map(f => ({
    name: f.schemeName.split(' ').slice(0, 3).join(' '),
    '1Y CAGR': f.cagr1y || 0,
    '3Y CAGR': f.cagr3y || 0,
    '5Y CAGR': f.cagr5y || 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <Calculator className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">CAGR Calculator</h2>
          <p className="text-sm text-muted-foreground">Compound Annual Growth Rate analysis</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant={mode === 'fund' ? 'default' : 'outline'} onClick={() => setMode('fund')} className={mode === 'fund' ? 'bg-emerald-600' : ''}>Fund CAGR</Button>
        <Button variant={mode === 'manual' ? 'default' : 'outline'} onClick={() => setMode('manual')} className={mode === 'manual' ? 'bg-emerald-600' : ''}>Manual Calculator</Button>
      </div>

      {mode === 'fund' && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-sm">CAGR Comparison (Top 15 Funds)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`]} />
                  <Legend />
                  <Bar dataKey="1Y CAGR" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="3Y CAGR" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="5Y CAGR" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Fund CAGR Details</CardTitle></CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b"><th className="text-left p-2">Fund</th><th className="text-right p-2">1Y</th><th className="text-right p-2">3Y</th><th className="text-right p-2">5Y</th><th className="text-right p-2">Since Inception</th><th className="text-right p-2">Alpha 3Y</th></tr></thead>
                  <tbody>
                    {fundResult.map(f => (
                      <tr key={f.id} className="border-b border-muted/30">
                        <td className="p-2 max-w-[200px] truncate">{f.schemeName}</td>
                        <td className="text-right p-2">{formatPercent(f.cagr1y)}</td>
                        <td className="text-right p-2">{formatPercent(f.cagr3y)}</td>
                        <td className="text-right p-2">{formatPercent(f.cagr5y)}</td>
                        <td className="text-right p-2">{f.sinceInceptionCAGR ? formatPercent(f.sinceInceptionCAGR) : '—'}</td>
                        <td className="text-right p-2"><Badge variant={f.alpha3y && f.alpha3y > 0 ? 'default' : 'destructive'} className="text-[9px]">{formatPercent(f.alpha3y)}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {mode === 'manual' && (
        <>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div><label className="text-sm font-medium">Start Value (₹)</label><Input type="number" value={startValue} onChange={e => setStartValue(Number(e.target.value))} /></div>
                <div><label className="text-sm font-medium">End Value (₹)</label><Input type="number" value={endValue} onChange={e => setEndValue(Number(e.target.value))} /></div>
                <div><label className="text-sm font-medium">Period (Years)</label><Input type="number" value={period} onChange={e => setPeriod(Number(e.target.value))} min={1} /></div>
              </div>
              <Button onClick={calculateManual} className="w-full bg-emerald-600 hover:bg-emerald-700">Calculate CAGR</Button>
            </CardContent>
          </Card>
          {manualResult && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-emerald-50/50 dark:bg-emerald-950/20"><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">CAGR</p><p className="text-3xl font-bold text-emerald-600">{manualResult.cagr}%</p></CardContent></Card>
              <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Total Return</p><p className="text-3xl font-bold">{manualResult.totalReturn}%</p></CardContent></Card>
              <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Rule of 72</p><p className="text-3xl font-bold">{manualResult.ruleOf72} <span className="text-sm font-normal">yrs to double</span></p></CardContent></Card>
              <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Verdict</p><Badge variant="outline" className="text-sm">{manualResult.interpretation}</Badge></CardContent></Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
