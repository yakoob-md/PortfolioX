'use client'

import { useFundStore, type HoldingData } from '@/lib/store'
import { formatCurrency } from '@/lib/helpers'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  PieChartIcon, Loader2, ChevronDown, ChevronUp, Briefcase, AlertTriangle,
} from 'lucide-react'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const EMERALD_PALETTE = [
  '#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0',
  '#047857', '#065f46', '#0d9488', '#14b8a6', '#2dd4bf',
  '#5eead4', '#99f6e4',
]

interface SectorData {
  name: string
  weight: number
  fundCount: number
  topFunds: string[]
}

interface SectorExposureResult {
  sectors: SectorData[]
  totalEquityExposure: number
  totalDebtExposure: number
  diversificationScore: number
  totalPortfolio: number
}

// Client-side fallback computation
function computeSectorExposure(holdings: HoldingData[]): SectorExposureResult {
  const CATEGORY_SECTORS: Record<string, { name: string; weight: number }[]> = {
    'Large Cap': [
      { name: 'Financial Services', weight: 28 },
      { name: 'IT', weight: 15 },
      { name: 'Energy', weight: 12 },
      { name: 'Consumer Goods', weight: 10 },
      { name: 'Healthcare', weight: 8 },
      { name: 'Automobile', weight: 7 },
      { name: 'Metals & Mining', weight: 5 },
      { name: 'FMCG', weight: 5 },
    ],
    'Mid Cap': [
      { name: 'Financial Services', weight: 20 },
      { name: 'Chemicals', weight: 14 },
      { name: 'Healthcare', weight: 12 },
      { name: 'IT', weight: 10 },
      { name: 'Consumer Goods', weight: 10 },
      { name: 'Construction', weight: 9 },
      { name: 'Automobile', weight: 8 },
    ],
    'Small Cap': [
      { name: 'Chemicals', weight: 18 },
      { name: 'Textiles', weight: 12 },
      { name: 'Healthcare', weight: 11 },
      { name: 'Construction', weight: 10 },
      { name: 'IT', weight: 9 },
      { name: 'Financial Services', weight: 8 },
      { name: 'Consumer Goods', weight: 8 },
    ],
    'Flexi Cap': [
      { name: 'Financial Services', weight: 25 },
      { name: 'IT', weight: 13 },
      { name: 'Healthcare', weight: 11 },
      { name: 'Consumer Goods', weight: 10 },
      { name: 'Energy', weight: 9 },
      { name: 'Automobile', weight: 7 },
      { name: 'Metals & Mining', weight: 6 },
    ],
    'ELSS': [
      { name: 'Financial Services', weight: 26 },
      { name: 'IT', weight: 14 },
      { name: 'Healthcare', weight: 11 },
      { name: 'Consumer Goods', weight: 10 },
      { name: 'Energy', weight: 9 },
      { name: 'Automobile', weight: 8 },
    ],
  }

  const DEFAULT_SECTORS = [
    { name: 'Financial Services', weight: 22 },
    { name: 'IT', weight: 13 },
    { name: 'Healthcare', weight: 10 },
    { name: 'Consumer Goods', weight: 9 },
    { name: 'Energy', weight: 8 },
    { name: 'Automobile', weight: 7 },
    { name: 'Metals & Mining', weight: 6 },
  ]

  const sectorMap: Record<string, { weight: number; fundNames: Set<string> }> = {}
  let totalWeight = 0

  for (const holding of holdings) {
    const amount = holding.currentAmount
    let sectors: { name: string; weight: number }[] = []

    if (holding.fund.topHolding) {
      try {
        const parsed = JSON.parse(holding.fund.topHolding)
        if (Array.isArray(parsed) && parsed.length > 0) {
          sectors = parsed
            .filter((h: Record<string, unknown>) => h.sector && h.weight)
            .map((h: Record<string, unknown>) => ({
              name: String(h.sector),
              weight: Number(h.weight),
            }))
        }
      } catch { /* ignore */ }
    }

    if (sectors.length === 0) {
      const key = holding.fund.subCategory || holding.fund.category
      sectors = CATEGORY_SECTORS[key] || DEFAULT_SECTORS
    }

    for (const sector of sectors) {
      const weightedAmount = (sector.weight / 100) * amount
      if (!sectorMap[sector.name]) {
        sectorMap[sector.name] = { weight: 0, fundNames: new Set() }
      }
      sectorMap[sector.name].weight += weightedAmount
      sectorMap[sector.name].fundNames.add(holding.fund.schemeName)
      totalWeight += weightedAmount
    }
  }

  const sectors = Object.entries(sectorMap)
    .map(([name, data]) => ({
      name,
      weight: totalWeight > 0 ? Math.round((data.weight / totalWeight) * 10000) / 100 : 0,
      fundCount: data.fundNames.size,
      topFunds: Array.from(data.fundNames).slice(0, 3),
    }))
    .sort((a, b) => b.weight - a.weight)

  let totalEquityExposure = 0
  let totalDebtExposure = 0

  for (const holding of holdings) {
    const cat = holding.fund.category.toLowerCase()
    if (cat === 'equity' || cat === 'elss' || cat === 'index') {
      totalEquityExposure += holding.currentAmount
    } else if (cat === 'debt') {
      totalDebtExposure += holding.currentAmount
    } else if (cat === 'hybrid') {
      totalEquityExposure += holding.currentAmount * 0.65
      totalDebtExposure += holding.currentAmount * 0.35
    }
  }

  const totalPortfolio = holdings.reduce((s, h) => s + h.currentAmount, 0)
  const numSectors = sectors.length
  let diversificationScore = 0
  if (numSectors > 0 && totalWeight > 0) {
    const hhi = sectors.reduce((sum, s) => sum + (s.weight / 100) ** 2, 0)
    const maxHHI = 1
    const minHHI = 1 / numSectors
    diversificationScore = Math.round(((maxHHI - hhi) / (maxHHI - minHHI)) * 100)
  }

  return {
    sectors,
    totalEquityExposure: Math.round(totalEquityExposure * 100) / 100,
    totalDebtExposure: Math.round(totalDebtExposure * 100) / 100,
    diversificationScore: Math.min(100, Math.max(0, diversificationScore)),
    totalPortfolio: Math.round(totalPortfolio * 100) / 100,
  }
}

function getGrade(score: number): string {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 65) return 'B'
  if (score >= 50) return 'C'
  if (score >= 35) return 'D'
  return 'F'
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A+': return 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-400'
    case 'A': return 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400'
    case 'B': return 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400'
    case 'C': return 'bg-orange-500/10 text-orange-700 ring-orange-500/20 dark:text-orange-400'
    default: return 'bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-400'
  }
}

// SVG Semicircular Gauge
function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2
  const cx = size / 2
  const cy = size / 2 + 4
  const startAngle = Math.PI
  const endAngle = 0
  const scoreAngle = startAngle - (score / 100) * Math.PI

  const x1 = cx + radius * Math.cos(startAngle)
  const y1 = cy - radius * Math.sin(startAngle)
  const x2 = cx + radius * Math.cos(endAngle)
  const y2 = cy - radius * Math.sin(endAngle)
  const sx = cx + radius * Math.cos(scoreAngle)
  const sy = cy - radius * Math.sin(scoreAngle)

  const gaugeColor = score >= 80 ? '#10b981' : score >= 65 ? '#f59e0b' : score >= 50 ? '#f97316' : '#ef4444'

  return (
    <svg width={size} height={size / 2 + 15} viewBox={`0 0 ${size} ${size / 2 + 15}`} className="overflow-visible">
      {/* Background arc */}
      <path
        d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
        fill="none"
        stroke="currentColor"
        className="text-muted/15"
        strokeWidth={10}
        strokeLinecap="round"
      />
      {/* Score arc */}
      <motion.path
        d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${sx} ${sy}`}
        fill="none"
        stroke={gaugeColor}
        strokeWidth={10}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      {/* Score knob (circle) */}
      <motion.circle
        cx={sx}
        cy={sy}
        r={6}
        fill="white"
        stroke={gaugeColor}
        strokeWidth={3}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.3 }}
        className="shadow-sm"
      />
      {/* Score text */}
      <text x={cx} y={cy - 10} textAnchor="middle" className="fill-foreground font-bold" style={{ fontSize: '1.75rem' }}>
        {score}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: '0.75rem', fontWeight: 500 }}>
        out of 100
      </text>
    </svg>
  )
}

function CustomPieTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { weight: number; fundCount: number; topFunds: string[] } }>
}) {
  if (!active || !payload || payload.length === 0) return null
  const data = payload[0]
  return (
    <div className="rounded-lg border bg-card p-3 shadow-lg text-xs">
      <p className="font-medium text-card-foreground mb-1">{data.name}</p>
      <p className="text-muted-foreground">Weight: {data.payload.weight.toFixed(1)}%</p>
      <p className="text-muted-foreground">Funds: {data.payload.fundCount}</p>
      {data.payload.topFunds.length > 0 && (
        <div className="mt-1 pt-1 border-t">
          <p className="text-muted-foreground">Top funds:</p>
          {data.payload.topFunds.map((f, i) => (
            <p key={i} className="text-foreground truncate max-w-[200px]">{f}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SectorExposure() {
  const { holdings, fetchHoldings, sessionId } = useFundStore()
  const [exposureData, setExposureData] = useState<SectorExposureResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedSector, setExpandedSector] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true
      fetchHoldings()
    }
  }, [fetchHoldings])

  const computeExposure = useCallback(async () => {
    if (holdings.length === 0) {
      setExposureData(null)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/portfolio/sector-exposure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (res.ok) {
        const data = await res.json()
        setExposureData(data)
      } else {
        setExposureData(computeSectorExposure(holdings))
      }
    } catch {
      setExposureData(computeSectorExposure(holdings))
    } finally {
      setLoading(false)
    }
  }, [holdings, sessionId])

  useEffect(() => {
    computeExposure()
  }, [computeExposure])

  const pieData = useMemo(() => {
    if (!exposureData) return []
    return exposureData.sectors.map((s, i) => ({
      name: s.name,
      value: s.weight,
      weight: s.weight,
      fundCount: s.fundCount,
      topFunds: s.topFunds,
      color: EMERALD_PALETTE[i % EMERALD_PALETTE.length],
    }))
  }, [exposureData])

  const grade = useMemo(() => {
    if (!exposureData) return 'F'
    return getGrade(exposureData.diversificationScore)
  }, [exposureData])

  if (loading && !exposureData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </CardContent>
      </Card>
    )
  }

  if (!exposureData || holdings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Briefcase className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No holdings yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Add funds to your portfolio to see sector exposure</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <PieChartIcon className="h-5 w-5 text-emerald-600" />
            Sector Exposure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            How your portfolio is allocated across market sectors
          </p>
        </CardContent>
      </Card>

      {/* Main content: Donut + Score Gauge */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Donut Chart */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col items-center">
              <div className="relative h-64 w-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(exposureData.totalPortfolio)}</p>
                </div>
              </div>
              {/* Sector legend below chart */}
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {pieData.slice(0, 6).map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground">{s.name}</span>
                  </div>
                ))}
                {pieData.length > 6 && (
                  <span className="text-xs text-muted-foreground">+{pieData.length - 6} more</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diversification Score + Grade */}
        <Card>
          <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center">
            <p className="text-sm font-medium text-muted-foreground mb-2">Diversification Score</p>
            <ScoreGauge score={exposureData.diversificationScore} size={160} />
            <div className="mt-3 flex items-center gap-2">
              <Badge className={`text-sm font-bold ring-1 ${getGradeColor(grade)}`}>
                Grade: {grade}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6 w-full">
              <div className="text-center p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20">
                <p className="text-xs text-muted-foreground">Equity</p>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(exposureData.totalEquityExposure)}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-teal-50/50 dark:bg-teal-950/20">
                <p className="text-xs text-muted-foreground">Debt</p>
                <p className="text-sm font-semibold text-teal-700 dark:text-teal-400">
                  {formatCurrency(exposureData.totalDebtExposure)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sector List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-card-foreground">Sector Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {exposureData.sectors.map((sector, i) => (
              <motion.div
                key={sector.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div
                  className="rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setExpandedSector(expandedSector === sector.name ? null : sector.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: EMERALD_PALETTE[i % EMERALD_PALETTE.length] }}
                      />
                      <span className="text-sm font-medium text-foreground truncate">{sector.name}</span>
                      <Badge variant="outline" className="text-[9px] shrink-0">
                        {sector.fundCount} fund{sector.fundCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <div className="w-24">
                        <Progress value={sector.weight} className="h-2" />
                      </div>
                      <span className="text-sm font-semibold text-foreground w-14 text-right">
                        {sector.weight.toFixed(1)}%
                      </span>
                      {expandedSector === sector.name ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded: Top funds */}
                  <AnimatePresence>
                    {expandedSector === sector.name && sector.topFunds.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 pt-2 border-t space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Top Funds in this sector:</p>
                          {sector.topFunds.map((fund, fi) => (
                            <p key={fi} className="text-xs text-foreground pl-2">
                              <span className="text-muted-foreground mr-1">{fi + 1}.</span>
                              {fund}
                            </p>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
