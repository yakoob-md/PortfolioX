'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, Zap } from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'

export default function SIPStepUp() {
  const [initialSip, setInitialSip] = useState(10000)
  const [stepUpPct, setStepUpPct] = useState(10)
  const [expectedReturn, setExpectedReturn] = useState(12)
  const [years, setYears] = useState(15)
  const [result, setResult] = useState<{
    regular: { totalInvested: number; finalCorpus: number; gain: number; yearly: { year: number; monthlySip: number; annualInvested: number; cumulativeInvested: number; corpusValue: number }[] }
    stepUp: { totalInvested: number; finalCorpus: number; gain: number; yearly: { year: number; monthlySip: number; annualInvested: number; cumulativeInvested: number; corpusValue: number }[] }
    comparison: { extraCorpus: number; extraInvested: number; stepUpAdvantagePct: number }
  } | null>(null)

  const calculate = async () => {
    try {
      const res = await fetch('/api/sip/stepup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialSip, stepUpPct, expectedReturn, years })
      })
      setResult(await res.json())
    } catch { /* */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">SIP Step-Up Calculator</h2>
          <p className="text-sm text-muted-foreground">See how annual SIP increase creates wealth</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><Label>Initial Monthly SIP (₹)</Label><Input type="number" value={initialSip} onChange={e => setInitialSip(Number(e.target.value))} /></div>
            <div><Label>Annual Step-Up (%)</Label><Input type="number" value={stepUpPct} onChange={e => setStepUpPct(Number(e.target.value))} min={0} max={50} /></div>
            <div><Label>Expected Return (%)</Label><Input type="number" value={expectedReturn} onChange={e => setExpectedReturn(Number(e.target.value))} /></div>
            <div><Label>Duration (Years)</Label><Input type="number" value={years} onChange={e => setYears(Number(e.target.value))} min={1} max={40} /></div>
          </div>
          <Button onClick={calculate} className="w-full bg-emerald-600 hover:bg-emerald-700">🚀 Calculate Step-Up SIP</Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-muted/50"><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Regular SIP Corpus</p><p className="text-xl font-bold">{formatCurrency(result.regular.finalCorpus)}</p><p className="text-xs text-muted-foreground">Invested: {formatCurrency(result.regular.totalInvested)}</p></CardContent></Card>
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/20"><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Step-Up SIP Corpus</p><p className="text-xl font-bold text-emerald-600">{formatCurrency(result.stepUp.finalCorpus)}</p><p className="text-xs text-muted-foreground">Invested: {formatCurrency(result.stepUp.totalInvested)}</p></CardContent></Card>
            <Card className="bg-amber-50/50 dark:bg-amber-950/20"><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Extra Corpus from Step-Up</p><p className="text-xl font-bold text-amber-600">{formatCurrency(result.comparison.extraCorpus)}</p><p className="text-xs text-muted-foreground">Step-Up advantage: {result.comparison.stepUpAdvantagePct}%</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Final Monthly SIP</p><p className="text-xl font-bold">₹{result.stepUp.yearly[result.stepUp.yearly.length - 1]?.monthlySip.toLocaleString('en-IN')}</p><p className="text-xs text-muted-foreground">Started at ₹{initialSip.toLocaleString('en-IN')}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Growth Comparison: Regular vs Step-Up SIP</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={result.regular.yearly.map((ry, i) => ({
                  year: ry.year,
                  'Regular SIP': ry.corpusValue,
                  'Step-Up SIP': result.stepUp.yearly[i]?.corpusValue || 0,
                  'Regular Invested': ry.cumulativeInvested,
                  'Step-Up Invested': result.stepUp.yearly[i]?.cumulativeInvested || 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="Step-Up SIP" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="Regular SIP" stroke="#0d9488" fill="#0d9488" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Year-by-Year Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b"><th className="text-left p-2">Year</th><th className="text-right p-2">Regular SIP</th><th className="text-right p-2">Step-Up SIP</th><th className="text-right p-2">Step-Up Corpus</th><th className="text-right p-2">Difference</th></tr></thead>
                  <tbody>
                    {result.regular.yearly.map((ry, i) => {
                      const sy = result.stepUp.yearly[i]
                      return <tr key={i} className="border-b border-muted/30"><td className="p-2">{ry.year}</td><td className="text-right p-2">₹{ry.monthlySip.toLocaleString('en-IN')}</td><td className="text-right p-2">₹{sy?.monthlySip.toLocaleString('en-IN')}</td><td className="text-right p-2">{formatCurrency(sy?.corpusValue || 0)}</td><td className="text-right p-2 text-emerald-600 font-medium">+{formatCurrency((sy?.corpusValue || 0) - ry.corpusValue)}</td></tr>
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
