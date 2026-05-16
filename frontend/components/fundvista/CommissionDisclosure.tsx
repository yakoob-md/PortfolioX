'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { AlertTriangle, Eye, IndianRupee } from 'lucide-react'
import { formatCurrency, formatAUM } from '@/lib/helpers'

interface CommissionFund {
  id: string; schemeName: string; fundHouse: string; category: string; subCategory: string;
  directExpenseRatio: number; regularExpenseRatio: number; commissionBps: number; commissionPct: number;
  annualCommissionOn10L: number; lifetimeCost: { '10y': number; '20y': number; '30y': number }; opportunityCost10y: number;
}

export default function CommissionDisclosure() {
  const [funds, setFunds] = useState<CommissionFund[]>([])
  const [summary, setSummary] = useState<{ avgCommissionBps: number; highestCommission: CommissionFund } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/funds/commission').then(r => r.json()).then(d => {
      setFunds(d.funds || []); setSummary(d.summary || null); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const chartData = funds.slice(0, 15).map(f => ({
    name: f.schemeName.split(' ').slice(0, 3).join(' '),
    'Commission (bps)': f.commissionBps,
    'Annual on ₹10L': f.annualCommissionOn10L,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Commission Disclosure</h2>
          <p className="text-sm text-muted-foreground">Hidden commission in Regular plans exposed</p>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-red-50/50 dark:bg-red-950/20"><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Average Commission</p><p className="text-3xl font-bold text-red-600">{summary.avgCommissionBps} bps</p><p className="text-xs text-muted-foreground">Regular → Direct difference</p></CardContent></Card>
          <Card className="bg-amber-50/50 dark:bg-amber-950/20"><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Highest Commission Fund</p><p className="text-sm font-bold">{summary.highestCommission?.schemeName}</p><p className="text-lg font-bold text-amber-600">{summary.highestCommission?.commissionBps} bps</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Impact on ₹10L over 20Y</p><p className="text-3xl font-bold text-red-600">{formatCurrency(summary.highestCommission?.lifetimeCost['20y'] || 0)}</p><p className="text-xs text-muted-foreground">Wealth destroyed by commission</p></CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Commission Comparison (Top 15 Funds)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v} bps`} />
              <Tooltip formatter={(v: number, name: string) => [name.includes('bps') ? `${v} bps` : formatCurrency(v), name]} />
              <Bar dataKey="Commission (bps)" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Full Commission Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b"><th className="text-left p-2">Fund</th><th className="text-right p-2">Commission</th><th className="text-right p-2">Annual/₹10L</th><th className="text-right p-2">20Y Cost</th><th className="text-right p-2">Opportunity</th></tr></thead>
              <tbody>
                {funds.map(f => (
                  <tr key={f.id} className="border-b border-muted/30 hover:bg-muted/20">
                    <td className="p-2"><p className="font-medium truncate max-w-[200px]">{f.schemeName}</p><p className="text-[10px] text-muted-foreground">{f.subCategory}</p></td>
                    <td className="text-right p-2"><Badge variant={f.commissionBps > 80 ? 'destructive' : f.commissionBps > 50 ? 'secondary' : 'outline'} className="text-[9px]">{f.commissionBps} bps</Badge></td>
                    <td className="text-right p-2 font-medium">₹{f.annualCommissionOn10L.toLocaleString('en-IN')}</td>
                    <td className="text-right p-2 text-red-600">{formatCurrency(f.lifetimeCost['20y'])}</td>
                    <td className="text-right p-2 text-amber-600">{formatCurrency(f.opportunityCost10y)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-red-50/30 dark:bg-red-950/10 border-red-200 dark:border-red-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-700 dark:text-red-400">⚠️ Important: Commission = Your Money</p>
              <p className="text-sm text-muted-foreground mt-1">The difference between Regular and Direct plan expense ratios goes to your distributor/agent as commission. By choosing Direct plans, you keep this money invested and compounding for yourself. Over 20-30 years, this can mean lakhs of rupees in additional wealth.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
