'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Cell, Legend } from 'recharts'
import { Crosshair } from 'lucide-react'
import { formatPercent, formatAUM } from '@/lib/helpers'

interface FundPoint {
  id: string; schemeName: string; category: string; subCategory: string;
  return1y: number | null; return3y: number | null; return5y: number | null;
  riskScore: number; riskometer: string; aumCrore: number; expenseRatio: number;
  sharpe1y: number | null; expenseSaving: number;
}

const catColors: Record<string, string> = { 'Equity': '#10b981', 'Debt': '#0d9488', 'Hybrid': '#7c3aed', 'Index': '#06b6d4', 'ELSS': '#f59e0b' }

export default function RiskReturnScatter() {
  const [funds, setFunds] = useState<FundPoint[]>([])
  const [period, setPeriod] = useState<'1y' | '3y' | '5y'>('3y')
  const [selectedFund, setSelectedFund] = useState<FundPoint | null>(null)

  useEffect(() => {
    fetch('/api/funds/risk-return').then(r => r.json()).then(d => setFunds(d.funds || [])).catch(() => {})
  }, [])

  const data = funds.filter(f => {
    const ret = period === '1y' ? f.return1y : period === '3y' ? f.return3y : f.return5y
    return ret !== null
  }).map(f => ({
    ...f,
    x: f.riskScore,
    y: period === '1y' ? f.return1y : period === '3y' ? f.return3y : f.return5y,
    z: Math.max(20, Math.min(200, f.aumCrore / 200)),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <Crosshair className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Risk-Return Scatter</h2>
            <p className="text-sm text-muted-foreground">Visualize risk vs return for all funds</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['1y', '3y', '5y'] as const).map(p => (
            <Button key={p} size="sm" variant={period === p ? 'default' : 'outline'} onClick={() => setPeriod(p)} className={period === p ? 'bg-emerald-600' : ''}>
              {p.toUpperCase()} Return
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" dataKey="x" name="Risk" tick={{ fontSize: 10 }} tickFormatter={(v) => ['', 'Low', 'Low-Med', 'Med', 'Med-High', 'High', 'V.High'][v] || ''} domain={[0, 7]} label={{ value: 'Risk Level →', position: 'insideBottom', offset: -5, fontSize: 11 }} />
              <YAxis type="number" dataKey="y" name="Return" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} label={{ value: 'Return % →', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <ZAxis type="number" dataKey="z" range={[40, 400]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: number, name: string) => [name === 'Return' ? `${v.toFixed(1)}%` : v, name]} content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0].payload as FundPoint
                return (
                  <div className="bg-background border rounded-lg p-3 shadow-lg text-xs">
                    <p className="font-bold">{d.schemeName}</p>
                    <p className="text-muted-foreground">{d.category} · {d.subCategory}</p>
                    <p>Return: {formatPercent(period === '1y' ? d.return1y : period === '3y' ? d.return3y : d.return5y)}</p>
                    <p>Risk: {d.riskometer} · AUM: {formatAUM(d.aumCrore)}</p>
                  </div>
                )
              }} />
              <Scatter data={data} onClick={(d) => setSelectedFund(d.payload as FundPoint)}>
                {data.map((entry, idx) => <Cell key={idx} fill={catColors[entry.category] || '#8884d8'} fillOpacity={0.8} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="flex gap-3 flex-wrap">
        {Object.entries(catColors).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1.5 text-xs">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            <span>{cat}</span>
          </div>
        ))}
      </div>

      {selectedFund && (
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold">{selectedFund.schemeName}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline">{selectedFund.category}</Badge>
                  <Badge variant="outline">{selectedFund.riskometer}</Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedFund(null)}>✕</Button>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
              <div><span className="text-muted-foreground text-xs">1Y Return</span><p className="font-bold">{formatPercent(selectedFund.return1y)}</p></div>
              <div><span className="text-muted-foreground text-xs">3Y Return</span><p className="font-bold">{formatPercent(selectedFund.return3y)}</p></div>
              <div><span className="text-muted-foreground text-xs">AUM</span><p className="font-bold">{formatAUM(selectedFund.aumCrore)}</p></div>
              <div><span className="text-muted-foreground text-xs">Sharpe</span><p className="font-bold">{selectedFund.sharpe1y?.toFixed(2) || '—'}</p></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
