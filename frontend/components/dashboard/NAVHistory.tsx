'use client'

import { useFundStore, type FundData } from '@/lib/store'
import { formatCurrency, formatPercent } from '@/lib/helpers'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Loader2, History, AlertTriangle, RefreshCw, Zap, Clock } from 'lucide-react'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface NavPoint {
  date: string
  directNav: number
  regularNav: number
  gap: number
}

type TimeRange = '1Y' | '3Y' | '5Y' | 'Max'

const TIME_RANGE_MONTHS: Record<TimeRange, number> = {
  '1Y': 12,
  '3Y': 36,
  '5Y': 60,
  'Max': 120,
}

// Minimal client-side fallback (simplified from original)
function getCategoryVolatility(category: string, subCategory: string): {
  annualVol: number; annualReturn: number
} {
  const cat = category.toLowerCase()
  const sub = subCategory.toLowerCase()
  if (cat === 'debt') return { annualVol: 0.05, annualReturn: 0.07 }
  if (cat === 'hybrid') return { annualVol: 0.10, annualReturn: 0.09 }
  if (sub.includes('small')) return { annualVol: 0.20, annualReturn: 0.14 }
  if (sub.includes('mid')) return { annualVol: 0.18, annualReturn: 0.13 }
  if (sub.includes('sector') || sub.includes('thematic')) return { annualVol: 0.22, annualReturn: 0.13 }
  if (sub.includes('elss')) return { annualVol: 0.16, annualReturn: 0.12 }
  if (sub.includes('index')) return { annualVol: 0.14, annualReturn: 0.11 }
  return { annualVol: 0.15, annualReturn: 0.12 }
}

function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function generateMockNavHistory(fund: FundData, months: number): NavPoint[] {
  const { annualVol, annualReturn } = getCategoryVolatility(fund.category, fund.subCategory)
  const monthlyVol = annualVol / Math.sqrt(12)
  const monthlyReturn = annualReturn / 12
  const rng = seededRandom(hashString(fund.id))

  const now = new Date()
  const dates: Date[] = []
  for (let i = 0; i < months; i++) {
    // Generate dates from past to present
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    dates.push(d)
  }

  // Monthly expense difference in decimal (e.g. 1% difference = 0.01 / 12)
  const monthlyExpenseDiff = Math.max(0, (fund.regularExpenseRatio - fund.directExpenseRatio)) / 100 / 12

  const navs: { direct: number; regular: number }[] = new Array(months)
  
  // Start from today's actual values and simulate backwards
  let currentDirect = fund.directNav
  let currentRegular = fund.regularNav
  
  navs[months - 1] = { direct: currentDirect, regular: currentRegular }

  for (let i = months - 2; i >= 0; i--) {
    // Generate a random monthly return for this step
    const randomShock = (rng() - 0.5) * 2 // -1 to 1
    const r = monthlyReturn + monthlyVol * randomShock
    
    // Backwards growth factors
    // If Forward is: NAV_new = NAV_old * (1 + r)
    // Then Backward is: NAV_old = NAV_new / (1 + r)
    const gDirect = 1 + r
    const gRegular = 1 + r - monthlyExpenseDiff
    
    // Ensure we don't divide by zero or negative growth (unlikely with 1 + r)
    currentDirect = currentDirect / Math.max(0.5, gDirect)
    currentRegular = currentRegular / Math.max(0.5, gRegular)
    
    navs[i] = { direct: currentDirect, regular: currentRegular }
  }

  return navs.map((n, i) => ({
    date: dates[i].toISOString().slice(0, 10),
    directNav: Math.round(n.direct * 100) / 100,
    regularNav: Math.round(n.regular * 100) / 100,
    gap: Math.round((n.direct - n.regular) * 100) / 100,
  }))
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string }>
  label?: string
  dataSource?: 'amfi' | 'simulated'
}

function CustomTooltip({ active, payload, label, dataSource }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const direct = payload.find(p => p.dataKey === 'directNav')
  const regular = payload.find(p => p.dataKey === 'regularNav')
  const gap = direct && regular ? (direct.value - regular.value).toFixed(2) : null

  return (
    <div className="rounded-lg border bg-card p-3 shadow-lg text-xs">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <p className="font-medium text-card-foreground">{label}</p>
        {dataSource && (
          <Badge
            variant="outline"
            className={`text-[9px] px-1.5 py-0 ${
              dataSource === 'amfi'
                ? 'border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400'
                : 'border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400'
            }`}
          >
            {dataSource === 'amfi' ? 'LIVE' : 'EST'}
          </Badge>
        )}
      </div>
      <div className="space-y-1">
        {direct && (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Direct:</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">₹{direct.value.toFixed(2)}</span>
          </div>
        )}
        {regular && (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            <span className="text-muted-foreground">Regular:</span>
            <span className="font-medium text-orange-600 dark:text-orange-400">₹{regular.value.toFixed(2)}</span>
          </div>
        )}
        {gap && (
          <div className="flex items-center gap-2 pt-1 border-t mt-1">
            <span className="text-muted-foreground">Gap:</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">₹{gap}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function NAVHistory() {
  const { funds, fundsLoading, fetchFunds } = useFundStore()
  const [selectedFundId, setSelectedFundId] = useState<string>('')
  const [timeRange, setTimeRange] = useState<TimeRange>('3Y')
  const [navData, setNavData] = useState<NavPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'amfi' | 'simulated'>('simulated')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [investmentAmount, setInvestmentAmount] = useState<number>(100000)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true
      fetchFunds()
    }
  }, [fetchFunds])

  const selectedFund = useMemo(
    () => funds.find(f => f.id === selectedFundId),
    [funds, selectedFundId]
  )

  const months = TIME_RANGE_MONTHS[timeRange]

  const fetchNavHistory = useCallback(async (fundId: string, mos: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/funds/nav-history?fundId=${fundId}&months=${mos}`)
      if (res.ok) {
        const data = await res.json()
        const source = data.source as 'amfi' | 'simulated'
        setDataSource(source)
        setLastUpdated(new Date().toISOString())
        const history = (data.navHistory || []).map((p: { date: string; directNav: number; regularNav: number }) => ({
          date: p.date,
          directNav: p.directNav,
          regularNav: p.regularNav,
          gap: Math.round((p.directNav - p.regularNav) * 100) / 100,
        }))
        setNavData(history)
      } else {
        // Client-side fallback
        const fund = funds.find(f => f.id === fundId)
        if (fund) {
          setDataSource('simulated')
          setNavData(generateMockNavHistory(fund, mos))
        } else {
          setError('Fund not found')
        }
      }
    } catch {
      // Client-side fallback
      const fund = funds.find(f => f.id === fundId)
      if (fund) {
        setDataSource('simulated')
        setNavData(generateMockNavHistory(fund, mos))
      } else {
        setError('Failed to load NAV history')
      }
    } finally {
      setLoading(false)
    }
  }, [funds])

  useEffect(() => {
    if (selectedFundId) {
      fetchNavHistory(selectedFundId, months)
    }
  }, [selectedFundId, months, fetchNavHistory])

  // Auto-select first fund if none selected
  useEffect(() => {
    if (!selectedFundId && funds.length > 0) {
      setSelectedFundId(funds[0].id)
    }
  }, [funds, selectedFundId])

  const handleRefreshNAV = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/funds/nav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`NAV refreshed: ${data.updated || 0} funds updated`)
        // Reload fund data
        await fetchFunds()
        // Re-fetch NAV history for the selected fund
        if (selectedFundId) {
          await fetchNavHistory(selectedFundId, months)
        }
      } else {
        toast.error('Failed to refresh NAV data')
      }
    } catch {
      toast.error('Failed to refresh NAV data')
    } finally {
      setRefreshing(false)
    }
  }, [selectedFundId, months, fetchFunds, fetchNavHistory])

  const chartData = useMemo(() => {
    return navData.map(p => {
      return {
        ...p,
        displayDirect: p.directNav,
        displayRegular: p.regularNav,
        dateLabel: new Date(p.date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      }
    })
  }, [navData])

  const metrics = useMemo(() => {
    if (navData.length === 0 || !selectedFund) return null
    const startDirect = navData[0].directNav
    const endDirect = navData[navData.length - 1].directNav
    const startRegular = navData[0].regularNav
    const endRegular = navData[navData.length - 1].regularNav
    const years = months / 12
    const directCagr = years > 0 ? (Math.pow(endDirect / startDirect, 1 / years) - 1) * 100 : 0
    const regularCagr = years > 0 ? (Math.pow(endRegular / startRegular, 1 / years) - 1) * 100 : 0
    const totalGap = endDirect - endRegular

    // Period high/low for direct NAV
    const directNavs = navData.map(p => p.directNav).filter(n => n > 0)
    const periodHigh = directNavs.length > 0 ? Math.max(...directNavs) : 0
    const periodLow = directNavs.length > 0 ? Math.min(...directNavs) : 0

    // 52-week high/low (last 12 months of data)
    const last12Months = navData.slice(-12)
    const last12Direct = last12Months.map(p => p.directNav).filter(n => n > 0)
    const week52High = last12Direct.length > 0 ? Math.max(...last12Direct) : 0
    const week52Low = last12Direct.length > 0 ? Math.min(...last12Direct) : 0

    return {
      startDirect,
      endDirect,
      directChange: endDirect - startDirect,
      directChangePct: ((endDirect - startDirect) / startDirect) * 100,
      directCagr,
      regularCagr,
      totalGap,
      years,
      periodHigh,
      periodLow,
      week52High,
      week52Low,
      investmentGrowth: (investmentAmount / startDirect) * endDirect,
      regularGrowth: (investmentAmount / startRegular) * endRegular,
      savingsAmount: ((investmentAmount / startDirect) * endDirect) - ((investmentAmount / startRegular) * endRegular)
    }
  }, [navData, selectedFund, months, investmentAmount])

  return (
    <div className="space-y-6">
      {/* Header with selectors */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <History className="h-5 w-5 text-emerald-600" />
              NAV History
              {dataSource === 'amfi' ? (
                <Badge className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-700">
                  <Zap className="h-3 w-3 mr-0.5" />
                  LIVE
                </Badge>
              ) : (
                <Badge variant="outline" className="ml-2 text-[10px] border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                  <Clock className="h-3 w-3 mr-0.5" />
                  Estimated
                </Badge>
              )}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshNAV}
              disabled={refreshing}
              className="gap-1.5 text-xs shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh NAV'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Fund selector */}
            <div className="flex-1 w-full">
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Selected Fund</label>
              <Select value={selectedFundId} onValueChange={setSelectedFundId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a fund..." />
                </SelectTrigger>
                <SelectContent>
                  {funds.slice(0, 50).map(fund => (
                    <SelectItem key={fund.id} value={fund.id}>
                      <span className="truncate max-w-[300px] block">{fund.schemeName}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Amount */}
            <div className="w-full sm:w-40">
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Investment (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">₹</span>
                <input
                  type="number"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                  className="w-full h-10 pl-7 pr-3 rounded-md border border-input bg-background text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                  step="10000"
                />
              </div>
            </div>

            {/* View Mode removed as requested */}

            {/* Time range selector */}
            <div className="w-full sm:w-auto">
              <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Period</label>
              <div className="flex gap-1 h-10">
                {(['1Y', '3Y', '5Y', 'Max'] as TimeRange[]).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 text-xs rounded-md border transition-all ${timeRange === range ? 'bg-emerald-600 border-emerald-600 text-white font-bold' : 'bg-background border-input text-muted-foreground hover:bg-muted'}`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {fundsLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading funds...
              </div>
            )}
            {lastUpdated && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last updated: {new Date(lastUpdated).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      {selectedFund && (
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedFundId + timeRange}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardContent className="p-4 sm:p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-80">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mb-2" />
                    <p className="text-sm">{error}</p>
                  </div>
                ) : chartData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="directGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="regularGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} className="stroke-border" />
                          <XAxis
                            dataKey="dateLabel"
                            tick={{ fontSize: 10 }}
                            interval={Math.max(1, Math.floor(chartData.length / 8))}
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            domain={['auto', 'auto']}
                            tickFormatter={(v: number) => `₹${v.toFixed(0)}`}
                          />
                          <Tooltip content={<CustomTooltip dataSource={dataSource} />} />
                          <Area
                            type="monotone"
                            dataKey="displayRegular"
                            stroke="#f97316"
                            strokeWidth={2}
                            fill="url(#regularGradient)"
                            name="Regular NAV"
                          />
                          <Area
                            type="monotone"
                            dataKey="displayDirect"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="url(#directGradient)"
                            name="Direct NAV"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-6 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span className="text-muted-foreground">Direct NAV</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                        <span className="text-muted-foreground">Regular NAV</span>
                      </div>
                      {dataSource === 'amfi' && (
                        <div className="flex items-center gap-1.5">
                          <Zap className="h-3 w-3 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">AMFI Live Data</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-80 text-muted-foreground text-sm">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Key Metrics Row */}
      {metrics && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Start NAV (Direct)</p>
                <p className="text-xl font-bold text-foreground">₹{metrics.startDirect.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">{timeRange} ago</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Current NAV (Direct)</p>
                <p className="text-xl font-bold text-foreground">₹{metrics.endDirect.toFixed(2)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {metrics.directChange >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-600" />
                  )}
                  <span className={`text-xs font-medium ${metrics.directChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {metrics.directChangePct >= 0 ? '+' : ''}{metrics.directChangePct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-1">
                    ({metrics.directChange >= 0 ? '+' : ''}₹{metrics.directChange.toFixed(2)})
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Absolute Change</p>
                <p className={`text-xl font-bold ${metrics.directChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {metrics.directChange >= 0 ? '+' : ''}₹{metrics.directChange.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Per unit gain</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">CAGR</p>
                <p className={`text-xl font-bold ${metrics.directCagr >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatPercent(metrics.directCagr)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Direct vs Regular: {formatPercent(metrics.regularCagr)}
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Detailed Stats - only shown when real data is available */}
      {metrics && !loading && dataSource === 'amfi' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3 text-emerald-500" />
                  Period High NAV
                </p>
                <p className="text-lg font-bold text-foreground">₹{metrics.periodHigh.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Highest in selected period</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3 text-red-500" />
                  Period Low NAV
                </p>
                <p className="text-lg font-bold text-foreground">₹{metrics.periodLow.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Lowest in selected period</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  52-Week High
                </p>
                <p className="text-lg font-bold text-foreground">₹{metrics.week52High.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Last 12 months</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  52-Week Low
                </p>
                <p className="text-lg font-bold text-foreground">₹{metrics.week52Low.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Last 12 months</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {/* NAV Change Stats for real data */}
      {metrics && !loading && dataSource === 'amfi' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-emerald-500" />
                <p className="text-sm font-semibold text-foreground">Live NAV Change Details</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">NAV Change (Absolute)</span>
                  <span className={`font-bold ${metrics.directChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {metrics.directChange >= 0 ? '+' : ''}₹{metrics.directChange.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">NAV Change (%)</span>
                  <span className={`font-bold ${metrics.directChangePct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {metrics.directChangePct >= 0 ? '+' : ''}{metrics.directChangePct.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Distance from 52W High</span>
                  <span className={`font-bold ${metrics.week52High > 0 ? (((metrics.endDirect - metrics.week52High) / metrics.week52High) * 100 < 0 ? 'text-red-600' : 'text-emerald-600') : 'text-muted-foreground'}`}>
                    {metrics.week52High > 0
                      ? `${(((metrics.endDirect - metrics.week52High) / metrics.week52High) * 100).toFixed(1)}%`
                      : '—'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Divergence Callout */}
      {metrics && !loading && metrics.totalGap !== 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-teal-950/30">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 p-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    Direct Plan Advantage
                  </p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                    Over {metrics.years.toFixed(0)} year{metrics.years !== 1 ? 's' : ''}, a <span className="font-bold">{formatCurrency(investmentAmount)}</span> investment would have grown to{' '}
                    <span className="font-bold">{formatCurrency(metrics.investmentGrowth)}</span> in the Direct plan vs{' '}
                    <span className="font-bold">{formatCurrency(metrics.regularGrowth)}</span> in the Regular plan.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    That&apos;s an extra <span className="font-semibold text-emerald-700 dark:text-emerald-400">{formatCurrency(metrics.savingsAmount)}</span> in your pocket, 
                    simply by choosing the Direct plan.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty state */}
      {!selectedFundId && !fundsLoading && funds.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <History className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Select a fund to view NAV history</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Choose any fund from the dropdown above</p>
          </CardContent>
        </Card>
      )}

      {funds.length === 0 && !fundsLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingDown className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No funds available</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Browse funds in the Explore tab first</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
