'use client'

import { useFundStore } from '@/lib/store'
import { formatPercent } from '@/lib/helpers'
import {
  Grid3X3, Filter, Info, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────
interface HeatmapCell {
  subCategory: string
  timeframe: string
  avgReturn: number
  fundCount: number
  minReturn: number
  maxReturn: number
  avgExpenseDiff: number
}

interface HeatmapRow {
  subCategory: string
  category: string
  fundCount: number
  cells: Record<string, HeatmapCell>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TIMEFRAMES = ['1Y', '3Y', '5Y'] as const

// All known sub-categories mapped to their main category
const SUB_CATEGORY_ORDER = [
  { name: 'Large Cap', category: 'Equity' },
  { name: 'Mid Cap', category: 'Equity' },
  { name: 'Small Cap', category: 'Equity' },
  { name: 'Flexi Cap', category: 'Equity' },
  { name: 'ELSS', category: 'Equity' },
  { name: 'Sectoral/Thematic', category: 'Equity' },
  { name: 'Dividend Yield', category: 'Equity' },
  { name: 'Gilt', category: 'Debt' },
  { name: 'Corporate Bond', category: 'Debt' },
  { name: 'Short Duration', category: 'Debt' },
  { name: 'Liquid', category: 'Debt' },
  { name: 'Conservative Hybrid', category: 'Hybrid' },
  { name: 'Balanced Advantage', category: 'Hybrid' },
  { name: 'Aggressive Hybrid', category: 'Hybrid' },
]

function getReturnField(tf: string, plan: 'direct' | 'regular'): string {
  const prefix = plan
  const map: Record<string, string> = {
    '1Y': `${prefix}Return1y`,
    '3Y': `${prefix}Return3y`,
    '5Y': `${prefix}Return5y`,
  }
  return map[tf] || `${prefix}Return1y`
}

// Color interpolation: deep red → yellow → deep green
function getHeatColor(value: number, min: number, max: number): string {
  if (min === max) return 'hsl(60, 70%, 85%)' // neutral yellow for uniform values

  // Normalize to 0-1
  const norm = Math.max(0, Math.min(1, (value - min) / (max - min)))

  // Map: 0 → deep red (hue 0), 0.5 → yellow (hue 50), 1 → deep green (hue 140)
  let hue: number
  if (norm <= 0.5) {
    hue = norm * 2 * 50 // 0 → 50 (red to yellow)
  } else {
    hue = 50 + (norm - 0.5) * 2 * 90 // 50 → 140 (yellow to green)
  }

  const saturation = 65 + Math.abs(norm - 0.5) * 30 // higher saturation at extremes
  const lightness = 85 - Math.abs(norm - 0.5) * 30 // darker at extremes

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

function getTextColor(value: number, min: number, max: number): string {
  if (min === max) return 'text-foreground'
  const norm = (value - min) / (max - min)
  // Darker text for darker backgrounds
  return norm < 0.2 || norm > 0.8 ? 'text-white' : 'text-foreground'
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FundHeatmap() {
  const { funds, fetchFunds } = useFundStore()

  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (funds.length === 0) {
      fetchFunds()
    }
  }, [])

  // Compute heatmap client-side from fund store data
  const displayData = useMemo<HeatmapRow[]>(() => {
    if (funds.length === 0) return []

    const filtered = categoryFilter === 'All'
      ? funds
      : funds.filter((f) => f.category === categoryFilter)

    // Group funds by subCategory
    const groups: Record<string, typeof funds> = {}
    for (const fund of filtered) {
      const key = fund.subCategory || 'Other'
      if (!groups[key]) groups[key] = []
      groups[key].push(fund)
    }

    const rows: HeatmapRow[] = []

    // Use ordered sub-categories for consistent display
    const orderedKeys = SUB_CATEGORY_ORDER
      .filter((sc) => categoryFilter === 'All' || sc.category === categoryFilter)
      .map((sc) => sc.name)
      .filter((name) => groups[name])

    // Add any remaining sub-categories not in our order
    const allKeys = new Set([...orderedKeys, ...Object.keys(groups)])
    for (const key of allKeys) {
      if (!groups[key]) continue
      const fundGroup = groups[key]
      const mainCategory = SUB_CATEGORY_ORDER.find((sc) => sc.name === key)?.category || 'Other'

      const cells: Record<string, HeatmapCell> = {}

      for (const tf of TIMEFRAMES) {
        const field = getReturnField(tf, 'direct')
        const values = fundGroup
          .map((f) => (f as unknown as Record<string, unknown>)[field] as number | null)
          .filter((v): v is number => v !== null && v !== undefined)

        const expenseDiffs = fundGroup.map((f) => f.regularExpenseRatio - f.directExpenseRatio)

        if (values.length > 0) {
          const avg = values.reduce((s, v) => s + v, 0) / values.length
          cells[tf] = {
            subCategory: key,
            timeframe: tf,
            avgReturn: Math.round(avg * 100) / 100,
            fundCount: values.length,
            minReturn: Math.min(...values),
            maxReturn: Math.max(...values),
            avgExpenseDiff: expenseDiffs.length > 0
              ? Math.round((expenseDiffs.reduce((s, v) => s + v, 0) / expenseDiffs.length) * 100) / 100
              : 0,
          }
        }
      }

      if (Object.keys(cells).length > 0) {
        rows.push({
          subCategory: key,
          category: mainCategory,
          fundCount: fundGroup.length,
          cells,
        })
      }
    }

    return rows
  }, [funds, categoryFilter])

  // Global min/max for consistent coloring
  const globalMinMax = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    for (const row of displayData) {
      for (const tf of TIMEFRAMES) {
        const cell = row.cells[tf]
        if (cell) {
          min = Math.min(min, cell.avgReturn)
          max = Math.max(max, cell.avgReturn)
        }
      }
    }
    if (min === Infinity) { min = -20; max = 30 }
    return { min, max }
  }, [displayData])

  // Legend values
  const legendSteps = 7
  const legendValues = useMemo(() => {
    const { min, max } = globalMinMax
    return Array.from({ length: legendSteps }, (_, i) => {
      const val = min + (max - min) * (i / (legendSteps - 1))
      return { value: val, color: getHeatColor(val, min, max) }
    })
  }, [globalMinMax])

  return (
    <div className="space-y-6">
      {/* Header + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-emerald-500" />
            Fund Performance Heatmap
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Average returns across fund categories and timeframes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px] text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              <SelectItem value="Equity">Equity</SelectItem>
              <SelectItem value="Debt">Debt</SelectItem>
              <SelectItem value="Hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="ml-3 text-sm text-muted-foreground">Loading heatmap data…</span>
        </div>
      )}

      {/* Heatmap Grid */}
      {!loading && displayData.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-muted-foreground py-2 px-3 min-w-[140px]">
                        Sub-Category
                      </th>
                      {TIMEFRAMES.map((tf) => (
                        <th key={tf} className="text-center text-xs font-medium text-muted-foreground py-2 px-3 min-w-[100px]">
                          {tf} Return
                        </th>
                      ))}
                      <th className="text-center text-xs font-medium text-muted-foreground py-2 px-3 min-w-[100px]">
                        Expense Diff (bps)
                      </th>
                      <th className="text-center text-xs font-medium text-muted-foreground py-2 px-3 min-w-[60px]">
                        Funds
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.map((row, rowIdx) => (
                      <motion.tr
                        key={row.subCategory}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: rowIdx * 0.03 }}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  row.category === 'Equity' ? '#10b981'
                                  : row.category === 'Debt' ? '#14b8a6'
                                  : '#8b5cf6',
                              }}
                            />
                            <span className="text-sm font-medium text-foreground">{row.subCategory}</span>
                          </div>
                        </td>
                        {TIMEFRAMES.map((tf) => {
                          const cell = row.cells[tf]
                          if (!cell) {
                            return (
                              <td key={tf} className="py-2.5 px-3 text-center text-xs text-muted-foreground">
                                —
                              </td>
                            )
                          }
                          const bgColor = getHeatColor(cell.avgReturn, globalMinMax.min, globalMinMax.max)
                          const txtColor = getTextColor(cell.avgReturn, globalMinMax.min, globalMinMax.max)

                          return (
                            <td key={tf} className="py-2.5 px-1.5">
                              <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="rounded-lg px-3 py-2 text-center cursor-default transition-transform hover:scale-105"
                                      style={{ backgroundColor: bgColor }}
                                    >
                                      <span className={`text-sm font-bold ${txtColor}`}>
                                        {cell.avgReturn >= 0 ? '+' : ''}{cell.avgReturn.toFixed(1)}%
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    <div className="space-y-1">
                                      <p className="font-semibold">{row.subCategory} · {tf}</p>
                                      <p>Avg Return: <span className="font-medium">{cell.avgReturn >= 0 ? '+' : ''}{cell.avgReturn.toFixed(2)}%</span></p>
                                      <p>Range: {cell.minReturn.toFixed(1)}% to {cell.maxReturn.toFixed(1)}%</p>
                                      <p>Funds: {cell.fundCount}</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                          )
                        })}
                        {/* Expense diff column */}
                        <td className="py-2.5 px-3 text-center">
                          {(() => {
                            const firstCell = row.cells[TIMEFRAMES[0]]
                            const diff = firstCell?.avgExpenseDiff ?? 0
                            const diffBps = Math.round(diff * 100)
                            return (
                              <span className={`text-sm font-medium ${diffBps > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                {diffBps > 0 ? '+' : ''}{diffBps} bps
                              </span>
                            )
                          })()}
                        </td>
                        {/* Fund count */}
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant="secondary" className="text-[10px] px-1.5">
                            {row.fundCount}
                          </Badge>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Color Legend */}
              <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Color Scale:</span>
                </div>
                <div className="flex items-center gap-1">
                  {legendValues.map((step, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div
                        className="h-4 w-8 rounded-sm"
                        style={{ backgroundColor: step.color }}
                      />
                      <span className="text-[9px] text-muted-foreground mt-0.5">
                        {step.value >= 0 ? '+' : ''}{step.value.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground ml-2">
                  ({globalMinMax.min.toFixed(0)}% to {globalMinMax.max.toFixed(0)}%)
                </span>
              </div>

              {/* Savings potential note */}
              <div className="mt-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900 p-3">
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  💡 <strong>Expense Diff</strong> shows the average savings (in basis points) when switching from Regular to Direct plans.
                  Higher values mean more potential savings for that category.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty state */}
      {!loading && displayData.length === 0 && funds.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Grid3X3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground">
              No heatmap data available for the selected category.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setCategoryFilter('All')}>
              Show All Categories
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Funds not loaded yet */}
      {!loading && funds.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-3 text-sm text-muted-foreground">Loading fund data…</span>
        </div>
      )}
    </div>
  )
}
