'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { LayoutGrid, TrendingUp, Shield } from 'lucide-react'
import { formatCurrency } from '@/lib/helpers'

const COLORS = ['#10b981', '#0d9488', '#f59e0b', '#7c3aed']

export default function AssetAllocation() {
  const [riskProfile, setRiskProfile] = useState('moderate')
  const [investmentAmount, setInvestmentAmount] = useState(1000000)
  const [years, setYears] = useState(10)
  const [result, setResult] = useState<{
    allocation: { equity: number; debt: number; gold: number; international: number }
    expectedReturn: number; projectedValue: number; projectedGain: number
    fundSuggestions: { equity: { id: string; schemeName: string; directReturn3y: number | null; allocationPct: number }[]; debt: { id: string; schemeName: string; directReturn3y: number | null; allocationPct: number }[]; hybrid: { id: string; schemeName: string; directReturn3y: number | null; allocationPct: number }[] }
    riskReturnProfile: { expectedAnnualReturn: string; riskLevel: string; maxDrawdownEstimate: string }
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const calculate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/portfolio/asset-allocation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskProfile, investmentAmount, years })
      })
      setResult(await res.json())
    } catch { /* */ }
    setLoading(false)
  }

  const pieData = result ? [
    { name: 'Equity', value: result.allocation.equity },
    { name: 'Debt', value: result.allocation.debt },
    { name: 'Gold', value: result.allocation.gold },
    { name: 'International', value: result.allocation.international },
  ] : []

  const profileComparison = [
    { profile: 'Conservative', equity: 25, debt: 50, gold: 10, intl: 15, return: 8.2 },
    { profile: 'Moderate', equity: 50, debt: 25, gold: 10, intl: 15, return: 10.5 },
    { profile: 'Aggressive', equity: 70, debt: 10, gold: 8, intl: 12, return: 11.8 },
    { profile: 'Very Aggressive', equity: 85, debt: 5, gold: 5, intl: 5, return: 12.5 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
          <LayoutGrid className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Asset Allocation Planner</h2>
          <p className="text-sm text-muted-foreground">Strategic allocation based on risk profile</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Risk Profile</label>
              <Select value={riskProfile} onValueChange={setRiskProfile}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                  <SelectItem value="veryAggressive">Very Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium">Investment (₹)</label><input type="number" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={investmentAmount} onChange={e => setInvestmentAmount(Number(e.target.value))} /></div>
            <div><label className="text-sm font-medium">Duration (Years)</label><input type="number" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={years} onChange={e => setYears(Number(e.target.value))} min={1} max={40} /></div>
          </div>
          <Button onClick={calculate} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
            {loading ? 'Calculating...' : '📊 Get Asset Allocation'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Recommended Allocation</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Projected Outcome</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-xs text-muted-foreground">Expected Annual Return</span><p className="text-lg font-bold text-emerald-600">{result.expectedReturn}%</p></div>
                  <div><span className="text-xs text-muted-foreground">Risk Level</span><p className="text-lg font-bold">{result.riskReturnProfile.riskLevel}</p></div>
                  <div><span className="text-xs text-muted-foreground">Projected Value ({years}Y)</span><p className="text-lg font-bold text-emerald-600">{formatCurrency(result.projectedValue)}</p></div>
                  <div><span className="text-xs text-muted-foreground">Projected Gain</span><p className="text-lg font-bold">{formatCurrency(result.projectedGain)}</p></div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-xs">
                  <p>📉 Max Drawdown Estimate: {result.riskReturnProfile.maxDrawdownEstimate}</p>
                  <p>💡 Equity: Higher returns, higher volatility | Debt: Stable income, lower returns</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Suggested Funds</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {result.fundSuggestions.equity.length > 0 && (
                  <div><p className="text-xs font-medium text-emerald-600 mb-2">Equity Funds ({result.allocation.equity}%)</p>
                    {result.fundSuggestions.equity.map(f => <div key={f.id} className="text-xs p-2 rounded bg-muted/30 mb-1"><p className="font-medium">{f.schemeName}</p><p className="text-muted-foreground">3Y: {f.directReturn3y?.toFixed(1) || '—'}% · Allocate: {f.allocationPct}%</p></div>)}
                  </div>
                )}
                {result.fundSuggestions.debt.length > 0 && (
                  <div><p className="text-xs font-medium text-teal-600 mb-2">Debt Funds ({result.allocation.debt}%)</p>
                    {result.fundSuggestions.debt.map(f => <div key={f.id} className="text-xs p-2 rounded bg-muted/30 mb-1"><p className="font-medium">{f.schemeName}</p><p className="text-muted-foreground">3Y: {f.directReturn3y?.toFixed(1) || '—'}% · Allocate: {f.allocationPct}%</p></div>)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Risk Profile Comparison</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={profileComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="profile" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="equity" stackId="a" fill="#10b981" name="Equity" />
              <Bar dataKey="debt" stackId="a" fill="#0d9488" name="Debt" />
              <Bar dataKey="gold" stackId="a" fill="#f59e0b" name="Gold" />
              <Bar dataKey="intl" stackId="a" fill="#7c3aed" name="International" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
