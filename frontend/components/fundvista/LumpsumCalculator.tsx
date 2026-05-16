'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, IndianRupee } from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'

export default function LumpsumCalculator() {
  const [amount, setAmount] = useState(500000)
  const [expectedReturn, setExpectedReturn] = useState(12)
  const [years, setYears] = useState(10)
  const [result, setResult] = useState<{
    lumpsum: { investedAmount: number; finalValue: number; totalGain: number; gainPct: number; cagr: number; yearly: { year: number; value: number; gain: number; gainPct: number }[] }
    sipComparison: { monthlySip: number; totalInvested: number; sipCorpus: number; sipGain: number }
    ruleOf72: { yearsToDouble: number; doublingPeriod: string }
    inflationImpact: { realValueAt6pctInflation: number; purchasingPowerLoss: number }
  } | null>(null)

  const calculate = async () => {
    try {
      const res = await fetch('/api/sip/lumpsum', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, expectedReturn, years })
      })
      setResult(await res.json())
    } catch { /* */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
          <IndianRupee className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Lumpsum Calculator</h2>
          <p className="text-sm text-muted-foreground">One-time investment growth projection</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div><Label>Investment Amount (₹)</Label><Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} /></div>
            <div><Label>Expected Return (%)</Label><Input type="number" value={expectedReturn} onChange={e => setExpectedReturn(Number(e.target.value))} /></div>
            <div><Label>Duration (Years)</Label><Input type="number" value={years} onChange={e => setYears(Number(e.target.value))} min={1} max={40} /></div>
          </div>
          <Button onClick={calculate} className="w-full bg-emerald-600 hover:bg-emerald-700">💰 Calculate Lumpsum Returns</Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/20"><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Final Value</p><p className="text-2xl font-bold text-emerald-600">{formatCurrency(result.lumpsum.finalValue)}</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Total Gain</p><p className="text-2xl font-bold">{formatCurrency(result.lumpsum.totalGain)}</p><p className="text-xs text-muted-foreground">{result.lumpsum.gainPct}% returns</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Rule of 72</p><p className="text-2xl font-bold">{result.ruleOf72.yearsToDouble} <span className="text-sm">yrs</span></p><p className="text-xs text-muted-foreground">to double your money</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Real Value (6% inflation)</p><p className="text-2xl font-bold text-amber-600">{formatCurrency(result.inflationImpact.realValueAt6pctInflation)}</p><p className="text-xs text-red-500">{result.inflationImpact.purchasingPowerLoss}% lost to inflation</p></CardContent></Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Growth Over Time</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={result.lumpsum.yearly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="value" fill="#10b981" name="Portfolio Value" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Lumpsum vs SIP Comparison</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                  <div className="flex justify-between"><span className="text-sm">Lumpsum Invested</span><span className="font-bold">{formatCurrency(amount)}</span></div>
                  <div className="flex justify-between"><span className="text-sm">Lumpsum Final Value</span><span className="font-bold text-emerald-600">{formatCurrency(result.lumpsum.finalValue)}</span></div>
                  <hr className="border-muted" />
                  <div className="flex justify-between"><span className="text-sm">Equivalent Monthly SIP</span><span className="font-bold">₹{result.sipComparison.monthlySip.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span className="text-sm">SIP Total Invested</span><span className="font-bold">{formatCurrency(result.sipComparison.totalInvested)}</span></div>
                  <div className="flex justify-between"><span className="text-sm">SIP Final Value</span><span className="font-bold text-teal-600">{formatCurrency(result.sipComparison.sipCorpus)}</span></div>
                </div>
                <div className="text-xs text-muted-foreground p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg">
                  💡 Lumpsum gives {formatCurrency(result.lumpsum.finalValue - result.sipComparison.sipCorpus)} more than SIP, but SIP reduces timing risk through rupee cost averaging.
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
