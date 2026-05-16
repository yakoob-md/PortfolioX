'use client'

import { formatCurrency, formatAUM, getCategoryColor } from '@/lib/helpers'
import { Building2, PieChart as PieIcon, TrendingUp, BarChart3, Loader2, ArrowUpDown, ChevronRight, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

interface AMCCategory {
  category: string
  fundCount: number
  aum: number
}

interface AMCData {
  fundHouse: string
  fundCount: number
  totalAum: number
  avgDirectER: number
  avgRegularER: number
  avgDirectReturn1y: number | null
  avgRegularReturn1y: number | null
  categories: AMCCategory[]
}

const AMC_COLORS = [
  '#10b981', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#a855f7', '#22c55e', '#eab308', '#e11d48', '#0ea5e9',
]

const SORT_OPTIONS = [
  { value: 'aum', label: 'Total AUM' },
  { value: 'fundCount', label: 'Fund Count' },
  { value: 'avgER', label: 'Avg Expense Ratio' },
  { value: 'avgReturns', label: 'Avg 1Y Returns' },
]

export default function AMCAnalysis() {
  const [loading, setLoading] = useState(false)
  const [amcs, setAmcs] = useState<AMCData[]>([])
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState('aum')
  const [selectedAMC, setSelectedAMC] = useState<string | null>(null)

  useEffect(() => {
    fetchAMCs()
  }, [])

  const fetchAMCs = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/funds/amc')
      if (!res.ok) throw new Error('Failed to fetch AMC data')
      const data = await res.json()
      setAmcs(data.amcs || [])
    } catch {
      setError('Failed to load AMC analysis. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const sortedAMCs = useMemo(() => {
    const sorted = [...amcs]
    switch (sortBy) {
      case 'aum':
        sorted.sort((a, b) => b.totalAum - a.totalAum)
        break
      case 'fundCount':
        sorted.sort((a, b) => b.fundCount - a.fundCount)
        break
      case 'avgER':
        sorted.sort((a, b) => a.avgDirectER - b.avgDirectER)
        break
      case 'avgReturns':
        sorted.sort((a, b) => (b.avgDirectReturn1y || 0) - (a.avgDirectReturn1y || 0))
        break
    }
    return sorted
  }, [amcs, sortBy])

  const pieData = useMemo(() => {
    return sortedAMCs.slice(0, 15).map((amc, i) => ({
      name: amc.fundHouse.length > 20 ? amc.fundHouse.slice(0, 20) + '…' : amc.fundHouse,
      fullName: amc.fundHouse,
      value: Math.round(amc.totalAum),
      color: AMC_COLORS[i % AMC_COLORS.length],
    }))
  }, [sortedAMCs])

  const selectedAMCData = useMemo(() => {
    if (!selectedAMC) return null
    return sortedAMCs.find(a => a.fundHouse === selectedAMC) || null
  }, [sortedAMCs, selectedAMC])

  const barChartData = useMemo(() => {
    return sortedAMCs.slice(0, 10).map((amc) => ({
      name: amc.fundHouse.length > 15 ? amc.fundHouse.slice(0, 15) + '…' : amc.fundHouse,
      fullName: amc.fundHouse,
      AUM: Math.round(amc.totalAum),
      'Fund Count': amc.fundCount,
    }))
  }, [sortedAMCs])

  const totalAUM = useMemo(() => amcs.reduce((sum, a) => sum + a.totalAum, 0), [amcs])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <Building2 className="h-5 w-5 text-emerald-600" />
            AMC Analysis
            {amcs.length > 0 && (
              <Badge variant="outline" className="ml-2 text-[10px]">{amcs.length} AMCs</Badge>
            )}
          </CardTitle>
          <CardDescription>Compare fund houses by AUM, fund count, expense ratios, and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sort By</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedAMC && (
              <Button variant="outline" onClick={() => setSelectedAMC(null)} className="gap-1.5 mt-4">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to All AMCs
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      )}

      {/* Content */}
      {!loading && amcs.length > 0 && (
        <AnimatePresence mode="wait">
          {!selectedAMC ? (
            <motion.div key="all" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              {/* Summary Stats */}
              <div className="grid gap-4 sm:grid-cols-4">
                <Card className="border-emerald-200 dark:border-emerald-900">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total AMCs</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{amcs.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total AUM</p>
                    <p className="text-2xl font-bold text-foreground">{formatAUM(totalAUM)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Funds</p>
                    <p className="text-2xl font-bold text-foreground">{amcs.reduce((s, a) => s + a.fundCount, 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Avg Expense Ratio</p>
                    <p className="text-2xl font-bold text-foreground">
                      {(amcs.reduce((s, a) => s + a.avgDirectER, 0) / amcs.length).toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* AUM Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                    <PieIcon className="h-4 w-4 text-emerald-600" />
                    AUM Distribution Across AMCs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={110}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [formatAUM(value), 'AUM']}
                          contentStyle={{
                            backgroundColor: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            color: 'var(--card-foreground)',
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '10px' }}
                          iconSize={8}
                          layout="horizontal"
                          verticalAlign="bottom"
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* AMC Comparison Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-emerald-600" />
                    AMC Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-background z-10">
                        <tr className="border-b">
                          <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">#</th>
                          <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Fund House</th>
                          <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Funds</th>
                          <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Total AUM</th>
                          <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Avg Direct ER</th>
                          <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Avg 1Y Return</th>
                          <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">AUM Share</th>
                          <th className="py-2.5 px-3 text-center font-medium text-muted-foreground">View</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedAMCs.map((amc, idx) => {
                          const aumShare = totalAUM > 0 ? (amc.totalAum / totalAUM) * 100 : 0
                          return (
                            <motion.tr
                              key={amc.fundHouse}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.02 }}
                              className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => setSelectedAMC(amc.fundHouse)}
                            >
                              <td className="py-2.5 px-3 text-muted-foreground font-medium">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: AMC_COLORS[idx % AMC_COLORS.length] }} />
                                  <span className="font-medium text-foreground line-clamp-1">{amc.fundHouse}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right text-foreground font-medium">{amc.fundCount}</td>
                              <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatAUM(amc.totalAum)}</td>
                              <td className="py-2.5 px-3 text-right text-foreground">{amc.avgDirectER.toFixed(2)}%</td>
                              <td className="py-2.5 px-3 text-right">
                                <span className={amc.avgDirectReturn1y !== null && amc.avgDirectReturn1y >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                                  {amc.avgDirectReturn1y !== null ? `${amc.avgDirectReturn1y >= 0 ? '+' : ''}${amc.avgDirectReturn1y.toFixed(2)}%` : '—'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 rounded-full bg-muted overflow-hidden flex-1">
                                    <div
                                      className="h-full rounded-full bg-emerald-500"
                                      style={{ width: `${Math.min(aumShare * 2, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-muted-foreground text-[10px]">{aumShare.toFixed(1)}%</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : selectedAMCData ? (
            <motion.div key="detail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              {/* AMC Detail Header */}
              <Card className="border-emerald-200 dark:border-emerald-900">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0">
                      <Building2 className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{selectedAMCData.fundHouse}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedAMCData.fundCount} funds · AUM: {formatAUM(selectedAMCData.totalAum)} · Avg ER: {selectedAMCData.avgDirectER.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AMC Metrics */}
              <div className="grid gap-4 sm:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Funds</p>
                    <p className="text-2xl font-bold text-foreground">{selectedAMCData.fundCount}</p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-200 dark:border-emerald-900">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total AUM</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatAUM(selectedAMCData.totalAum)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Avg Direct ER</p>
                    <p className="text-2xl font-bold text-foreground">{selectedAMCData.avgDirectER.toFixed(2)}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Avg 1Y Return</p>
                    <p className={`text-2xl font-bold ${selectedAMCData.avgDirectReturn1y !== null && selectedAMCData.avgDirectReturn1y >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {selectedAMCData.avgDirectReturn1y !== null ? `${selectedAMCData.avgDirectReturn1y >= 0 ? '+' : ''}${selectedAMCData.avgDirectReturn1y.toFixed(2)}%` : '—'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-card-foreground">Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedAMCData.categories.length > 0 ? (
                    <div className="space-y-3">
                      {selectedAMCData.categories.map((cat) => (
                        <div key={cat.category} className="flex items-center gap-3">
                          <Badge variant="outline" className={`text-xs min-w-[80px] justify-center ${getCategoryColor(cat.category)}`}>
                            {cat.category}
                          </Badge>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">{cat.fundCount} funds</span>
                              <span className="font-medium text-foreground">{formatAUM(cat.aum)}</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${Math.min((cat.aum / selectedAMCData.totalAum) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">No category data available</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}

      {/* Empty State */}
      {!loading && amcs.length === 0 && !error && (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="h-16 w-16 text-emerald-200 dark:text-emerald-900 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">No AMC data available. Click the button above to load.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
