'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ShieldAlert, Banknote, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'

export default function EmergencyFund() {
  const [monthlyExpenses, setMonthlyExpenses] = useState(50000)
  const [monthsCover, setMonthsCover] = useState(6)
  const [buildMonths, setBuildMonths] = useState(12)
  const [result, setResult] = useState<{
    monthlyExpenses: number; monthsCover: number; targetFund: number
    comparison: { savingsAccount: { rate: number; annualReturn: number; risk: string; liquidity: string; note: string }; liquidFund: { rate: number; annualReturn: number; risk: string; liquidity: string; note: string }; extraFromLiquidOverSavings: number }
    recommendedFunds: { id: string; schemeName: string; directReturn1y: number | null; directExpenseRatio: number; aumCrore: number; riskometer: string }[]
    buildPlan: { monthlySavings: number; buildMonths: number; plan: { month: number; saved: number; total: number; projectedValue: number }[] }
    rules: string[]
  } | null>(null)

  const calculate = async () => {
    try {
      const res = await fetch('/api/funds/emergency', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyExpenses, monthsCover, buildMonths })
      })
      setResult(await res.json())
    } catch { /* */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
          <ShieldAlert className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Emergency Fund Planner</h2>
          <p className="text-sm text-muted-foreground">Build your safety net with smart planning</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div><Label>Monthly Expenses (₹)</Label><Input type="number" value={monthlyExpenses} onChange={e => setMonthlyExpenses(Number(e.target.value))} /></div>
            <div><Label>Months to Cover</Label><Input type="number" value={monthsCover} onChange={e => setMonthsCover(Number(e.target.value))} min={3} max={24} /></div>
            <div><Label>Build Period (Months)</Label><Input type="number" value={buildMonths} onChange={e => setBuildMonths(Number(e.target.value))} min={1} max={36} /></div>
          </div>
          <Button onClick={calculate} className="w-full bg-emerald-600 hover:bg-emerald-700">🛡️ Plan Emergency Fund</Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-amber-50/50 dark:bg-amber-950/20"><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Target Emergency Fund</p><p className="text-3xl font-bold text-amber-600">{formatCurrency(result.targetFund)}</p><p className="text-xs text-muted-foreground">{result.monthsCover} months of expenses</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Monthly Savings Needed</p><p className="text-3xl font-bold">₹{result.buildPlan.monthlySavings.toLocaleString('en-IN')}</p><p className="text-xs text-muted-foreground">for {result.buildPlan.buildMonths} months</p></CardContent></Card>
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/20"><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Extra from Liquid Fund</p><p className="text-3xl font-bold text-emerald-600">{formatCurrency(result.comparison.extraFromLiquidOverSavings)}</p><p className="text-xs text-muted-foreground">vs Savings Account/year</p></CardContent></Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Where to Park Emergency Fund</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2"><Banknote className="h-4 w-4 text-amber-600" /><p className="font-medium text-sm">Savings Account</p></div>
                    <p className="text-xs text-muted-foreground mt-1">Rate: {result.comparison.savingsAccount.rate}% · Return: {formatCurrency(result.comparison.savingsAccount.annualReturn)}/yr</p>
                    <p className="text-xs text-muted-foreground">{result.comparison.savingsAccount.liquidity} · {result.comparison.savingsAccount.note}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /><p className="font-medium text-sm">Liquid Fund <Badge className="ml-1 bg-emerald-600 text-[9px]">Recommended</Badge></p></div>
                    <p className="text-xs text-muted-foreground mt-1">Rate: {result.comparison.liquidFund.rate}% · Return: {formatCurrency(result.comparison.liquidFund.annualReturn)}/yr</p>
                    <p className="text-xs text-muted-foreground">{result.comparison.liquidFund.liquidity} · {result.comparison.liquidFund.note}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Build Plan</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={result.buildPlan.plan}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="projectedValue" stroke="#10b981" name="Fund Value" strokeWidth={2} />
                    <Line type="monotone" dataKey="total" stroke="#0d9488" name="Total Saved" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Recommended Liquid/Debt Funds</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.recommendedFunds.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div><p className="font-medium text-sm">{f.schemeName}</p><p className="text-xs text-muted-foreground">AUM: {formatCurrency(f.aumCrore * 10000000)} · Risk: {f.riskometer}</p></div>
                    <div className="text-right text-xs"><p>1Y: {f.directReturn1y?.toFixed(1) || '—'}%</p><p>Exp: {f.directExpenseRatio}%</p></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50/30 dark:bg-amber-950/10">
            <CardContent className="pt-6">
              <p className="font-bold text-amber-700 dark:text-amber-400 mb-2">⚡ Emergency Fund Rules</p>
              <ul className="space-y-1">
                {result.rules.map((r, i) => <li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-amber-500 mt-1">•</span>{r}</li>)}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
