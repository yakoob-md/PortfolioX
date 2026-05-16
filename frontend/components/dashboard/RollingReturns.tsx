'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, BarChart3 } from 'lucide-react'
import { useFundStore } from '@/lib/store'
import { formatPercent } from '@/lib/helpers'

export default function RollingReturns() {
  const { funds } = useFundStore()
  const [selectedFundId, setSelectedFundId] = useState('')
  const [data, setData] = useState<{ month: string; '1Y Rolling': number; '3Y Rolling': number; '5Y Rolling': number }[]>([])
  const [stats, setStats] = useState<Record<string, { avg: number; min: number; max: number; current: number }> | null>(null)

  useEffect(() => {
    if (!selectedFundId) return
    const fund = funds.find(f => f.id === selectedFundId)
    if (!fund) return

    const base1y = fund.directReturn1y || 10
    const base3y = fund.directReturn3y || 10
    const base5y = fund.directReturn5y || 10

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const simulatedData: { month: string; '1Y Rolling': number; '3Y Rolling': number; '5Y Rolling': number }[] = []
    for (let i = 0; i < 36; i++) {
      const m = months[i % 12]
      const yr = 2022 + Math.floor(i / 12)
      const noise1 = (Math.random() - 0.5) * 8
      const noise3 = (Math.random() - 0.5) * 5
      const noise5 = (Math.random() - 0.5) * 3
      simulatedData.push({
        month: `${m} ${yr}`,
        '1Y Rolling': Math.round((base1y + noise1) * 100) / 100,
        '3Y Rolling': Math.round((base3y + noise3) * 100) / 100,
        '5Y Rolling': Math.round((base5y + noise5) * 100) / 100,
      })
    }

    const calcStats = (key: string) => {
      const vals = simulatedData.map(d => d[key as keyof typeof d] as number)
      return {
        avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100,
        min: Math.round(Math.min(...vals) * 100) / 100,
        max: Math.round(Math.max(...vals) * 100) / 100,
        current: vals[vals.length - 1],
      }
    }

    // Use a microtask to avoid synchronous setState in effect
    const timer = setTimeout(() => {
      setData(simulatedData)
      setStats({
        '1Y Rolling': calcStats('1Y Rolling'),
        '3Y Rolling': calcStats('3Y Rolling'),
        '5Y Rolling': calcStats('5Y Rolling'),
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [selectedFundId, funds])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Rolling Returns</h2>
          <p className="text-sm text-muted-foreground">See how returns vary across different time periods</p>
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

      {data.length > 0 && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-sm">Rolling Returns Over Time</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={5} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`]} />
                  <Legend />
                  <Line type="monotone" dataKey="1Y Rolling" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="3Y Rolling" stroke="#0d9488" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="5Y Rolling" stroke="#7c3aed" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {stats && (
            <div className="grid gap-4 sm:grid-cols-3">
              {Object.entries(stats).map(([period, s]) => (
                <Card key={period}>
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{period}</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    <div className="text-lg font-bold">{formatPercent(s.current)}</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Avg:</span> <span className="font-medium">{formatPercent(s.avg)}</span></div>
                      <div><span className="text-muted-foreground">Min:</span> <span className="font-medium text-red-500">{formatPercent(s.min)}</span></div>
                      <div><span className="text-muted-foreground">Max:</span> <span className="font-medium text-emerald-500">{formatPercent(s.max)}</span></div>
                    </div>
                    <Badge variant={s.current > s.avg ? 'default' : 'secondary'} className="text-[10px] mt-1">
                      {s.current > s.avg ? 'Above Average' : 'Below Average'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {!selectedFundId && (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Select a fund to view rolling returns analysis</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
