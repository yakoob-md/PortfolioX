'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useFundStore } from '@/lib/store'
import { formatPercent } from '@/lib/helpers'

export default function AlphaBeta() {
  const { funds } = useFundStore()
  const [allFunds, setAllFunds] = useState<{ id: string; schemeName: string; category: string; subCategory: string; beta1y: number; alpha1y: number; rSquared: number; sharpe1y: number | null; directReturn1y: number | null; riskometer: string }[]>([])
  const [sortBy, setSortBy] = useState<'alpha1y' | 'beta1y' | 'rSquared'>('alpha1y')

  useEffect(() => {
    fetch('/api/funds/alpha-beta')
      .then(r => r.ok ? r.json() : { funds: [] })
      .then(d => setAllFunds(d.funds || []))
      .catch(() => setAllFunds([]))
  }, [])

  const sorted = [...allFunds].sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0))

  const scatterData = allFunds.map(f => ({
    x: f.beta1y,
    y: f.alpha1y,
    name: f.schemeName,
    category: f.category,
    rSq: f.rSquared,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Alpha & Beta Analysis</h2>
          <p className="text-sm text-muted-foreground">Risk-adjusted performance metrics (CAPM)</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="pt-6 text-center">
            <ArrowUpRight className="mx-auto h-6 w-6 text-emerald-600" />
            <p className="text-xs text-muted-foreground mt-1">Positive Alpha Funds</p>
            <p className="text-2xl font-bold text-emerald-600">{allFunds.filter(f => f.alpha1y > 0).length}</p>
            <p className="text-xs text-muted-foreground">Outperforming benchmark</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-6 text-center">
            <Activity className="mx-auto h-6 w-6 text-amber-600" />
            <p className="text-xs text-muted-foreground mt-1">Avg Beta</p>
            <p className="text-2xl font-bold text-amber-600">
              {allFunds.length > 0 ? (allFunds.reduce((s, f) => s + f.beta1y, 0) / allFunds.length).toFixed(2) : '0.00'}
            </p>
            <p className="text-xs text-muted-foreground">Market sensitivity</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground mt-1">Avg R²</p>
            <p className="text-2xl font-bold">
              {allFunds.length > 0 ? (allFunds.reduce((s, f) => s + f.rSquared, 0) / allFunds.length).toFixed(0) : '0'}%
            </p>
            <p className="text-xs text-muted-foreground">Benchmark correlation</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Security Market Line (Beta vs Alpha)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" dataKey="x" name="Beta" tick={{ fontSize: 10 }} label={{ value: 'Beta →', position: 'insideBottom', offset: -5, fontSize: 11 }} />
              <YAxis type="number" dataKey="y" name="Alpha" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} label={{ value: 'Alpha →', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" />
              <ReferenceLine x={1} stroke="#6b7280" strokeDasharray="5 5" />
              <Tooltip content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0].payload
                return (<div className="bg-background border rounded-lg p-2 shadow-lg text-xs"><p className="font-bold">{d.name}</p><p>Beta: {d.x.toFixed(2)} · Alpha: {d.y.toFixed(2)}%</p><p>R²: {d.rSq}%</p></div>)
              }} />
              <Scatter data={scatterData} fill="#10b981" fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground justify-center">
            <span>Red line = Zero Alpha (fairly priced)</span>
            <span>Gray line = Beta = 1 (market risk)</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Fund-wise Metrics</CardTitle>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alpha1y">Sort by Alpha</SelectItem>
              <SelectItem value="beta1y">Sort by Beta</SelectItem>
              <SelectItem value="rSquared">Sort by R²</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund</TableHead>
                  <TableHead className="text-right">Alpha (1Y)</TableHead>
                  <TableHead className="text-right">Beta (1Y)</TableHead>
                  <TableHead className="text-right">R²</TableHead>
                  <TableHead className="text-right">Sharpe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.slice(0, 20).map(f => (
                  <TableRow key={f.id}>
                    <TableCell><p className="text-xs font-medium truncate max-w-[200px]">{f.schemeName}</p><p className="text-[10px] text-muted-foreground">{f.subCategory}</p></TableCell>
                    <TableCell className="text-right"><Badge variant={f.alpha1y > 0 ? 'default' : 'destructive'} className="text-[10px]">{formatPercent(f.alpha1y)}</Badge></TableCell>
                    <TableCell className="text-right text-xs font-medium">{f.beta1y.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs">{f.rSquared}%</TableCell>
                    <TableCell className="text-right text-xs">{f.sharpe1y?.toFixed(2) || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
