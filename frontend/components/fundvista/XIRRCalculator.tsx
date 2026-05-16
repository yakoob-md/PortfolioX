'use client'

import { useFundStore, type XIRRResult, type HoldingData } from '@/lib/store'
import { formatCurrency, formatPercent } from '@/lib/helpers'
import { TrendingUp, Info, BarChart3, Target, BookOpen, RefreshCw, Zap, Clock, ArrowRight, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine,
} from 'recharts'

// XIRR calculation using Newton-Raphson method
// Robust XIRR calculation using Bisection + Newton-Raphson
function calculateXIRR(cashFlows: { amount: number; date: Date }[]): number | null {
  if (cashFlows.length < 2) return null

  // Sort by date
  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime())
  const d0 = sorted[0].date

  // Convert to year fractions
  const years = sorted.map((cf) => (cf.date.getTime() - d0.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  const amounts = sorted.map(cf => cf.amount)

  const xnpv = (rate: number) => {
    let result = 0
    for (let i = 0; i < amounts.length; i++) {
      result += amounts[i] / Math.pow(1 + rate, years[i])
    }
    return result
  }

  const dxnpv = (rate: number) => {
    let result = 0
    for (let i = 0; i < amounts.length; i++) {
      result -= (years[i] * amounts[i]) / Math.pow(1 + rate, years[i] + 1)
    }
    return result
  }

  // Initial guess
  let rate = 0.1
  
  // Try Newton-Raphson first
  for (let i = 0; i < 50; i++) {
    const val = xnpv(rate)
    const deriv = dxnpv(rate)
    if (Math.abs(deriv) < 1e-12) break
    const nextRate = rate - val / deriv
    if (Math.abs(nextRate - rate) < 1e-8) return nextRate
    rate = nextRate
    if (rate > 100 || rate < -0.99) break // Diverged
  }

  // Fallback to Bisection
  let low = -0.9999
  let high = 100
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2
    const val = xnpv(mid)
    if (Math.abs(val) < 1e-7) return mid
    if (val > 0) low = mid
    else high = mid
  }

  return rate
}

interface LiveNavInfo {
  fundId: string
  directNav: number | null
  regularNav: number | null
  updated: string | null
}

interface ExtendedXIRRResult extends XIRRResult {
  liveXirr?: number | null
  liveXirrHoldings?: {
    fundId: string
    fundName: string
    xirr: number
    invested: number
    current: number
  }[]
  livePortfolioXirr?: number | null
  navSyncTimestamp?: string | null
}

export default function XIRRCalculator() {
  const { holdings, fetchHoldings, fetchFunds, funds } = useFundStore()

  const [xirrResult, setXirrResult] = useState<ExtendedXIRRResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [calculated, setCalculated] = useState(false)
  const [refreshingNAV, setRefreshingNAV] = useState(false)
  const [syncingFundId, setSyncingFundId] = useState<string | null>(null)
  const [liveNavs, setLiveNavs] = useState<Record<string, LiveNavInfo>>({})
  const [navSyncTimestamp, setNavSyncTimestamp] = useState<string | null>(null)

  useEffect(() => {
    fetchHoldings()
  }, [])

  // Calculate live currentAmount for a holding based on live NAV
  const getLiveCurrentAmount = useCallback((holding: HoldingData): number | null => {
    const liveInfo = liveNavs[holding.fundId]
    if (!liveInfo) return null

    const nav = holding.planType === 'direct' ? liveInfo.directNav : liveInfo.regularNav
    if (nav === null || nav <= 0) return null

    return holding.units * nav
  }, [liveNavs])

  const handleRefreshNAV = useCallback(async () => {
    setRefreshingNAV(true)
    try {
      const res = await fetch('/api/funds/nav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`NAV refreshed: ${data.updated || 0} funds updated`)
        // Reload fund data and holdings
        await Promise.all([fetchFunds(), fetchHoldings()])

        // Update live NAV tracking for all holdings
        const updatedNavs: Record<string, LiveNavInfo> = {}
        const now = new Date().toISOString()
        for (const holding of (holdings || [])) {
          const fund = funds?.find(f => f.id === holding.fundId) || holding.fund
          updatedNavs[holding.fundId] = {
            fundId: holding.fundId,
            directNav: fund?.directNav || null,
            regularNav: fund?.regularNav || null,
            updated: now,
          }
        }
        setLiveNavs(updatedNavs)
        setNavSyncTimestamp(now)

        // Re-fetch holdings to get updated values
        await fetchHoldings()
      } else {
        toast.error('Failed to refresh NAV data')
      }
    } catch {
      toast.error('Failed to refresh NAV data')
    } finally {
      setRefreshingNAV(false)
    }
  }, [fetchFunds, fetchHoldings, holdings, funds])

  const handleSyncFundNAV = useCallback(async (fundId: string) => {
    setSyncingFundId(fundId)
    try {
      // Find the fund to get its ISIN
      const holding = holdings?.find(h => h.fundId === fundId)
      if (!holding) return

      const isin = holding.planType === 'direct' ? holding.fund.directIsin : holding.fund.regularIsin
      if (!isin) {
        toast.error('No ISIN found for this fund')
        return
      }

      const res = await fetch(`/api/funds/nav?isin=${isin}`)
      if (res.ok) {
        const data = await res.json()
        if (data.result) {
          const nav = parseFloat(data.result.nav)
          const date = data.result.date
          if (!isNaN(nav)) {
            setLiveNavs(prev => ({
              ...prev,
              [fundId]: {
                fundId,
                directNav: holding.planType === 'direct' ? nav : (prev[fundId]?.directNav ?? null),
                regularNav: holding.planType === 'regular' ? nav : (prev[fundId]?.regularNav ?? null),
                updated: new Date().toISOString(),
              },
            }))
            setNavSyncTimestamp(new Date().toISOString())
            toast.success(`NAV synced: ₹${nav.toFixed(2)} as of ${date}`)
          }
        }
      } else {
        toast.error('Failed to sync NAV for this fund')
      }
    } catch {
      toast.error('Failed to sync NAV for this fund')
    } finally {
      setSyncingFundId(null)
    }
  }, [holdings])

  const calculatePortfolioXIRR = useCallback(async () => {
    if (holdings.length === 0) {
      toast.error('Add holdings to calculate XIRR')
      return
    }

    setLoading(true)
    try {
      // Calculate XIRR using stored values
      const res = await fetch('/api/portfolio/xirr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdings: holdings.map((h) => ({
            fundId: h.fundId,
            fundName: h.fund.schemeName,
            investedAmount: h.investedAmount,
            currentAmount: h.currentAmount,
            purchaseDate: h.purchaseDate,
          })),
        }),
      })

      let storedResult: XIRRResult
      if (res.ok) {
        const data = await res.json()
        storedResult = {
          portfolioXirr: data.xirr ?? data.portfolioXirr ?? 0,
          holdings: data.holdings || holdings.map((h) => {
            const purchaseDate = h.purchaseDate ? new Date(h.purchaseDate) : new Date('2023-01-15')
            const now = new Date()
            const cashFlows = [
              { amount: -h.investedAmount, date: purchaseDate },
              { amount: h.currentAmount, date: now },
            ]
            const xirr = calculateXIRR(cashFlows)
            return {
              fundId: h.fundId,
              fundName: h.fund.schemeName,
              xirr: xirr !== null ? Math.round(xirr * 10000) / 100 : 0,
              invested: h.investedAmount,
              current: h.currentAmount,
            }
          }),
          benchmarkXirr: 12.0,
          methodology: data.methodology || 'XIRR (Extended Internal Rate of Return) is calculated using the Newton-Raphson method. It finds the annualized rate of return that makes the net present value of all cash flows equal to zero.',
        }
      } else {
        storedResult = calculateClientSideXIRR(holdings)
      }

      // Calculate XIRR using live NAV values (if available)
      const hasLiveNav = holdings.some(h => liveNavs[h.fundId])
      let livePortfolioXirr: number | null = null
      let liveXirrHoldings: ExtendedXIRRResult['liveXirrHoldings'] = []

      if (hasLiveNav) {
        const holdingsWithLiveNav = holdings.filter(h => getLiveCurrentAmount(h) !== null)
        if (holdingsWithLiveNav.length > 0) {
          // Per-holding live XIRR
          liveXirrHoldings = holdingsWithLiveNav.map(h => {
            const liveAmount = getLiveCurrentAmount(h)!
            const purchaseDate = h.purchaseDate ? new Date(h.purchaseDate) : new Date('2023-01-15')
            const now = new Date()
            const cashFlows = [
              { amount: -h.investedAmount, date: purchaseDate },
              { amount: liveAmount, date: now },
            ]
            const xirr = calculateXIRR(cashFlows)
            return {
              fundId: h.fundId,
              fundName: h.fund.schemeName,
              xirr: xirr !== null ? Math.round(xirr * 10000) / 100 : 0,
              invested: h.investedAmount,
              current: liveAmount,
            }
          })

          // Portfolio-level live XIRR
          const allCashFlows: { amount: number; date: Date }[] = []
          const now = new Date()
          let totalLiveCurrent = 0
          for (const h of holdingsWithLiveNav) {
            const purchaseDate = h.purchaseDate ? new Date(h.purchaseDate) : new Date('2023-01-15')
            allCashFlows.push({ amount: -h.investedAmount, date: purchaseDate })
            totalLiveCurrent += getLiveCurrentAmount(h)!
          }
          // Also include holdings without live NAV using stored values
          for (const h of holdings.filter(h => getLiveCurrentAmount(h) === null)) {
            const purchaseDate = h.purchaseDate ? new Date(h.purchaseDate) : new Date('2023-01-15')
            allCashFlows.push({ amount: -h.investedAmount, date: purchaseDate })
            totalLiveCurrent += h.currentAmount
          }
          allCashFlows.push({ amount: totalLiveCurrent, date: now })
          const portfolioXirr = calculateXIRR(allCashFlows)
          livePortfolioXirr = portfolioXirr !== null ? Math.round(portfolioXirr * 10000) / 100 : null
        }
      }

      const extendedResult: ExtendedXIRRResult = {
        ...storedResult,
        liveXirrHoldings,
        livePortfolioXirr,
        navSyncTimestamp,
      }

      setXirrResult(extendedResult)
      setCalculated(true)
    } catch {
      const storedResult = calculateClientSideXIRR(holdings)
      setXirrResult(storedResult)
      setCalculated(true)
    } finally {
      setLoading(false)
    }
  }, [holdings, liveNavs, navSyncTimestamp, getLiveCurrentAmount])

  function calculateClientSideXIRR(currentHoldings: HoldingData[]): XIRRResult {
    const holdingXirrs: XIRRResult['holdings'] = []

    let totalInvested = 0
    let totalCurrent = 0

    for (const h of currentHoldings) {
      const purchaseDate = h.purchaseDate ? new Date(h.purchaseDate) : new Date('2023-01-15')
      const now = new Date()

      // Create cash flows: negative investment, positive current value
      const cashFlows = [
        { amount: -h.investedAmount, date: purchaseDate },
        { amount: h.currentAmount, date: now },
      ]

      const xirr = calculateXIRR(cashFlows)
      const annualizedReturn = xirr !== null ? xirr * 100 : 0

      holdingXirrs.push({
        fundId: h.fundId,
        fundName: h.fund.schemeName,
        xirr: Math.round(annualizedReturn * 100) / 100,
        invested: h.investedAmount,
        current: h.currentAmount,
      })

      totalInvested += h.investedAmount
      totalCurrent += h.currentAmount
    }

    // Portfolio-level XIRR
    const allCashFlows: { amount: number; date: Date }[] = []
    const now = new Date()
    for (const h of currentHoldings) {
      const purchaseDate = h.purchaseDate ? new Date(h.purchaseDate) : new Date('2023-01-15')
      allCashFlows.push({ amount: -h.investedAmount, date: purchaseDate })
    }
    allCashFlows.push({ amount: totalCurrent, date: now })

    const portfolioXirr = calculateXIRR(allCashFlows)
    const portfolioXirrPct = portfolioXirr !== null ? Math.round(portfolioXirr * 10000) / 100 : 0

    // Benchmark XIRR (Nifty 50 approximation: ~12% over long term)
    const benchmarkXirr = 12.0

    return {
      portfolioXirr: portfolioXirrPct,
      holdings: holdingXirrs,
      benchmarkXirr,
      methodology: 'XIRR (Extended Internal Rate of Return) is calculated using the Newton-Raphson method. It finds the annualized rate of return that makes the net present value of all cash flows equal to zero. This method accurately handles irregular cash flows from SIPs, additional purchases, and partial withdrawals.',
    }
  }

  const chartData = useMemo(() => {
    if (!xirrResult) return []
    return xirrResult.holdings.map((h) => ({
      name: h.fundName.length > 18 ? h.fundName.slice(0, 18) + '…' : h.fundName,
      'XIRR': h.xirr,
      'Live XIRR': xirrResult.liveXirrHoldings?.find(lh => lh.fundId === h.fundId)?.xirr ?? h.xirr,
      'Benchmark': xirrResult.benchmarkXirr,
    }))
  }, [xirrResult])

  const hasLiveNavData = Object.keys(liveNavs || {}).length > 0
  const holdingsCount = holdings?.length || 0

  if (holdingsCount === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No holdings to calculate XIRR</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Add fund holdings to your portfolio to see your annualized returns calculated with XIRR methodology.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            Portfolio XIRR Calculator
            {hasLiveNavData && (
              <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-700">
                <Zap className="h-3 w-3 mr-0.5" />
                LIVE NAV
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            XIRR measures your portfolio&apos;s true annualized return, accounting for the exact timing of each investment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Calculating for {holdings.length} holding{holdings.length !== 1 ? 's' : ''}
              </p>
              {navSyncTimestamp && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  NAV last synced: {new Date(navSyncTimestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefreshNAV}
                disabled={refreshingNAV}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshingNAV ? 'animate-spin' : ''}`} />
                {refreshingNAV ? 'Syncing...' : 'Refresh NAV'}
              </Button>
              <Button onClick={calculatePortfolioXIRR} disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                {loading ? 'Calculating...' : 'Calculate XIRR'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holdings with Live NAV indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-card-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-600" />
            Holdings NAV Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="py-2 px-3 text-left font-medium text-muted-foreground">Fund</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">Plan</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">Units</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">Stored NAV</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">Live NAV</th>
                  <th className="py-2 px-3 text-center font-medium text-muted-foreground">Status</th>
                  <th className="py-2 px-3 text-center font-medium text-muted-foreground">Sync</th>
                </tr>
              </thead>
              <tbody>
                {holdings?.map((h) => {
                  const liveInfo = liveNavs[h.fundId]
                  const liveNav = h.planType === 'direct' ? liveInfo?.directNav : liveInfo?.regularNav
                  const storedNav = h.currentAmount / h.units
                  const isLive = liveInfo?.updated !== undefined && liveNav !== null

                  return (
                    <tr key={h.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium text-foreground truncate max-w-[200px]">{h.fund.schemeName}</td>
                      <td className="py-2 px-3 text-right">
                        <Badge variant="outline" className={`text-[10px] ${h.planType === 'direct' ? 'border-emerald-300 text-emerald-600' : 'border-orange-300 text-orange-600'}`}>
                          {h.planType}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right text-foreground">{h.units.toFixed(3)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">₹{storedNav.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">
                        {isLive ? (
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            ₹{liveNav!.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {isLive ? (
                          <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-700">
                            <Zap className="h-2.5 w-2.5 mr-0.5" />
                            Live
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400">
                            <Clock className="h-2.5 w-2.5 mr-0.5" />
                            Stale
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSyncFundNAV(h.fundId)}
                          disabled={syncingFundId === h.fundId}
                          className="h-6 w-6 p-0"
                          title="Sync NAV for this fund"
                        >
                          <RefreshCw className={`h-3 w-3 ${syncingFundId === h.fundId ? 'animate-spin' : ''}`} />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {calculated && xirrResult && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Portfolio XIRR summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className={`border-2 ${xirrResult.portfolioXirr >= 0 ? 'border-emerald-200 dark:border-emerald-900' : 'border-red-200 dark:border-red-900'}`}>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Portfolio XIRR</p>
                <p className={`text-3xl font-bold ${xirrResult.portfolioXirr >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {xirrResult.portfolioXirr >= 0 ? '+' : ''}{xirrResult.portfolioXirr.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Based on stored values</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Benchmark (Nifty 50)</p>
                <p className="text-3xl font-bold text-amber-600">
                  +{xirrResult.benchmarkXirr.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Reference return</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Alpha vs Benchmark</p>
                <p className={`text-3xl font-bold ${(xirrResult.portfolioXirr - xirrResult.benchmarkXirr) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {(xirrResult.portfolioXirr - xirrResult.benchmarkXirr) >= 0 ? '+' : ''}
                  {(xirrResult.portfolioXirr - xirrResult.benchmarkXirr).toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(xirrResult.portfolioXirr - xirrResult.benchmarkXirr) >= 0 ? 'Outperforming' : 'Underperforming'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Live XIRR comparison (shown only when live NAV data is available) */}
          {xirrResult.livePortfolioXirr !== null && xirrResult.livePortfolioXirr !== undefined && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-teal-950/30">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="mt-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 p-2">
                      <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                        Live NAV XIRR Comparison
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Compare XIRR using stored values vs live NAV data
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="p-3 rounded-lg bg-white/60 dark:bg-black/20">
                      <p className="text-xs text-muted-foreground">Stored XIRR</p>
                      <p className={`text-2xl font-bold ${xirrResult.portfolioXirr >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {xirrResult.portfolioXirr >= 0 ? '+' : ''}{xirrResult.portfolioXirr.toFixed(2)}%
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Based on saved values</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/60 dark:bg-black/20">
                      <p className="text-xs text-muted-foreground">Live NAV XIRR</p>
                      <p className={`text-2xl font-bold ${xirrResult.livePortfolioXirr >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {xirrResult.livePortfolioXirr >= 0 ? '+' : ''}{xirrResult.livePortfolioXirr.toFixed(2)}%
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Based on live NAV</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/60 dark:bg-black/20">
                      <p className="text-xs text-muted-foreground">Difference</p>
                      {(() => {
                        const diff = xirrResult.livePortfolioXirr! - xirrResult.portfolioXirr
                        return (
                          <>
                            <p className={`text-2xl font-bold ${Math.abs(diff) < 0.5 ? 'text-muted-foreground' : diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {Math.abs(diff) < 0.5 ? 'Minimal difference' : diff > 0 ? 'Live NAV is higher' : 'Live NAV is lower'}
                            </p>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Per-holding breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                Per-Holding XIRR Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="py-2 px-3 text-left font-medium text-muted-foreground">Fund</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Holding</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Invested</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Current</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">XIRR</th>
                      {xirrResult.liveXirrHoldings && xirrResult.liveXirrHoldings.length > 0 && (
                        <th className="py-2 px-3 text-right font-medium text-muted-foreground">Live XIRR</th>
                      )}
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">vs Benchmark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xirrResult.holdings.map((h) => {
                      const diff = h.xirr - xirrResult.benchmarkXirr
                      const liveHolding = xirrResult.liveXirrHoldings?.find(lh => lh.fundId === h.fundId)
                      const liveDiff = liveHolding ? liveHolding.xirr - h.xirr : null

                      return (
                        <tr key={h.fundId} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2 px-3 font-medium text-foreground truncate max-w-[200px]">{h.fundName}</td>
                          <td className="py-2 px-3 text-right text-muted-foreground">
                            {(() => {
                              const holding = holdings.find(held => held.fundId === h.fundId)
                              if (!holding?.purchaseDate) return '—'
                              const days = Math.round((new Date().getTime() - new Date(holding.purchaseDate).getTime()) / (1000 * 60 * 60 * 24))
                              return days < 365 ? `${days}d` : `${(days / 365.25).toFixed(1)}y`
                            })()}
                          </td>
                          <td className="py-2 px-3 text-right text-muted-foreground">{formatCurrency(h.invested)}</td>
                          <td className="py-2 px-3 text-right">
                            <div>
                              <span className="text-foreground">{formatCurrency(h.current)}</span>
                            </div>
                          </td>
                          <td className={`py-2 px-3 text-right font-bold flex items-center justify-end gap-1 ${h.xirr >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {h.xirr > 100 && <AlertTriangle className="h-3 w-3 text-amber-500" title="Unrealistically high due to short holding period" />}
                            {h.xirr >= 0 ? '+' : ''}{h.xirr.toFixed(2)}%
                          </td>
                          {xirrResult.liveXirrHoldings && xirrResult.liveXirrHoldings.length > 0 && (
                            <td className="py-2 px-3 text-right">
                              {liveHolding ? (
                                <div>
                                  <span className={`font-bold ${liveHolding.xirr >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {liveHolding.xirr >= 0 ? '+' : ''}{liveHolding.xirr.toFixed(2)}%
                                  </span>
                                  {liveDiff !== null && Math.abs(liveDiff) >= 0.01 && (
                                    <div className={`text-[10px] ${liveDiff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                      {liveDiff >= 0 ? '↑' : '↓'} {Math.abs(liveDiff).toFixed(2)}%
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                          )}
                          <td className={`py-2 px-3 text-right font-medium ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* XIRR comparison chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-card-foreground">XIRR vs Benchmark Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                      <Tooltip
                        formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
                        contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--card-foreground)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                      <ReferenceLine y={0} stroke="var(--border)" />
                      <Bar dataKey="XIRR" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={index} fill={entry.XIRR >= 0 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                      {xirrResult.liveXirrHoldings && xirrResult.liveXirrHoldings.length > 0 && (
                        <Bar dataKey="Live XIRR" radius={[4, 4, 0, 0]} fill="#06b6d4" opacity={0.7} />
                      )}
                      <Bar dataKey="Benchmark" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.6} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Methodology explanation */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                XIRR Methodology
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <Target className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">What is XIRR?</p>
                    <p className="mt-1">
                      XIRR (Extended Internal Rate of Return) calculates the annualized return on investments made at different times. Unlike simple return percentage, it accounts for the exact timing of each cash flow, making it the most accurate measure for SIP-based investments.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">How it&apos;s calculated</p>
                    <p className="mt-1">{xirrResult.methodology}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">XIRR vs CAGR</p>
                    <p className="mt-1">
                      CAGR assumes a single investment made at one point in time. XIRR handles multiple investments at different times — which is how most people actually invest (SIPs, additional purchases, etc.). For a single lumpsum investment, XIRR and CAGR give the same result.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <Zap className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Live NAV XIRR</p>
                    <p className="mt-1">
                      When live NAV data is available (synced from AMFI), we calculate a separate XIRR using the latest NAV values. This gives you a more accurate picture of your current portfolio performance compared to the stored values that may be stale.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 p-3">
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>⚠️ Note:</strong> XIRR calculations assume purchase dates from your holdings data. If purchase dates are estimated, the XIRR may not be perfectly accurate. For the most precise results, ensure your holdings have correct purchase dates and sync NAV data before calculating.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
