'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { PieChart as PieIcon, TrendingUp } from 'lucide-react'
import { formatAUM, formatPercent } from '@/lib/helpers'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface CategoryData {
  category: string; subCategory: string; fundCount: number;
  avgReturn1y: number; avgReturn3y: number; avgReturn5y: number;
  avgExpenseRatio: number; totalAumCrore: number; avgAumCrore: number;
}

export default function CategoryPerformance() {
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/funds/category-performance').then(r => r.json()).then(d => { setCategories(d.categories || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const chartData = categories.map(c => ({
    name: c.subCategory,
    '1Y Return': c.avgReturn1y,
    '3Y Return': c.avgReturn3y,
    '5Y Return': c.avgReturn5y,
  }))

  const catColors: Record<string, string> = { 'Equity': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', 'Debt': 'bg-teal-500/10 text-teal-700 dark:text-teal-400', 'Hybrid': 'bg-violet-500/10 text-violet-700 dark:text-violet-400', 'Index': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400' }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <PieIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Category Performance</h2>
          <p className="text-sm text-muted-foreground">Compare returns across fund categories</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Average Returns by Category</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`]} />
              <Legend />
              <Bar dataKey="1Y Return" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="3Y Return" fill="#0d9488" radius={[4, 4, 0, 0]} />
              <Bar dataKey="5Y Return" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Detailed Category Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Funds</TableHead>
                  <TableHead className="text-right">1Y Avg</TableHead>
                  <TableHead className="text-right">3Y Avg</TableHead>
                  <TableHead className="text-right">5Y Avg</TableHead>
                  <TableHead className="text-right">Exp Ratio</TableHead>
                  <TableHead className="text-right">Total AUM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={catColors[c.category] || ''}>{c.category}</Badge>
                        <span className="text-xs">{c.subCategory}</span>
                      </div>
                    </TableCell>
                    <TableCell>{c.fundCount}</TableCell>
                    <TableCell className="text-right font-medium">{formatPercent(c.avgReturn1y)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPercent(c.avgReturn3y)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPercent(c.avgReturn5y)}</TableCell>
                    <TableCell className="text-right">{c.avgExpenseRatio}%</TableCell>
                    <TableCell className="text-right">{formatAUM(c.totalAumCrore)}</TableCell>
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
