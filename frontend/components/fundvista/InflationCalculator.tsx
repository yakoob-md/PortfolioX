'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { IndianRupee, TrendingDown } from 'lucide-react'
import { useFundStore } from '@/lib/store'
import { formatCurrency, formatPercent } from '@/lib/helpers'

export default function InflationCalculator() {
  const { funds } = useFundStore()
  const [selectedFundId, setSelectedFundId] = useState('')
  const [inflationRate, setInflationRate] = useState(6)
  const [result, setResult] = useState<{
    nominalReturns: Record<string, number | null>; realReturns: Record<string, number | null>
    purchasingPowerErosion: { year: number; nominalValue: number; realValue: number; purchasingPower: number }[]
  } | null>(null)

  useEffect(() => {
    if (!selectedFundId) return
    fetch(`/api/funds/inflation?fundId=${selectedFundId}&inflation=${inflationRate}`).then(r => r.json()).then(d => setResult(d)).catch(() => {})
  }, [selectedFundId, inflationRate])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
          <TrendingDown className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Inflation Calculator</h2>
          <p className="text-sm text-muted-foreground">See real returns after inflation</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="text-sm font-medium">Select Fund</label>
              <Select value={selectedFundId} onValueChange={setSelectedFundId}>
                <SelectTrigger><SelectValue placeholder="Select a fund..." /></SelectTrigger>
                <SelectContent>{funds.map(f => <SelectItem key={f.id} value={f.id}>{f.schemeName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium">Inflation Rate (%)</label><Input type="number" value={inflationRate} onChange={e => setInflationRate(Number(e.target.value))} min={0} max={20} step={0.5} /></div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {Object.entries(result.nominalReturns).map(([period, nominal]) => {
              const real = result.realReturns[period]
              const erosion = nominal !== null && real !== null ? nominal - real : null
              return (
                <Card key={period}>
                  <CardContent className="pt-6 text-center">
                    <p className="text-xs text-muted-foreground">{period} Returns</p>
                    <div className="flex justify-center gap-4 mt-2">
                      <div><p className="text-xs text-muted-foreground">Nominal</p><p className="text-lg font-bold">{formatPercent(nominal)}</p></div>
                      <div className="border-l pl-4"><p className="text-xs text-muted-foreground">Real</p><p className={`text-lg font-bold ${real && real > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPercent(real)}</p></div>
                    </div>
                    {erosion !== null && <Badge variant={erosion > 5 ? 'destructive' : 'secondary'} className="mt-2 text-[10px]">Inflation eats {erosion.toFixed(1)}%</Badge>}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">₹1 Lakh: Nominal vs Real Value Over Time</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={result.purchasingPowerErosion}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="nominalValue" stroke="#10b981" name="Nominal Value" strokeWidth={2} />
                  <Line type="monotone" dataKey="realValue" stroke="#ef4444" name="Real Value (Inflation-Adjusted)" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-amber-50/30 dark:bg-amber-950/10">
            <CardContent className="pt-6">
              <p className="text-sm font-medium">💡 Key Insight: At {inflationRate}% inflation, ₹1 lakh today will have purchasing power of only ₹{Math.round(100000 / Math.pow(1 + inflationRate / 100, 20)).toLocaleString('en-IN')} in 20 years. Invest in assets that beat inflation!</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
