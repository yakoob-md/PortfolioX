'use client'

import { useFundStore } from '@/lib/store'
import { formatCurrency, formatPercent } from '@/lib/helpers'
import { Calculator, TrendingUp, Info, Play, DollarSign, RefreshCw, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEffect, useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar,
} from 'recharts'

// Category-based expected returns (defaults)
const CATEGORY_RETURNS: Record<string, number> = { Equity: 12, ELSS: 12, Index: 11, Hybrid: 9, Debt: 7 }

export default function SavingsCalculator() {
  const { 
    funds, 
    fetchFunds, 
    savingsResult, 
    savingsLoading, 
    calculateSavings,
    savingsMode,
    setSavingsMode,
    monthlySip,
    setMonthlySip
  } = useFundStore()

  const [selectedFundId, setSelectedFundId] = useState('')
  const [investedAmount, setInvestedAmount] = useState('500000')
  const [years, setYears] = useState('20')
  const [customDirect, setCustomDirect] = useState('')
  const [customRegular, setCustomRegular] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    if (funds.length === 0) fetchFunds()
  }, [])

  // Resolve effective fund ID: use selected if set, otherwise first fund
  const effectiveFundId = selectedFundId || (funds.length > 0 ? funds[0].id : '')

  const selectedFund = useMemo(() => {
    if (effectiveFundId === 'custom') return null
    return funds.find(f => f.id === effectiveFundId) || null
  }, [funds, effectiveFundId])

  // Determine effective expected return: use actual 3y return if available, else category default
  const effectiveExpectedReturn = useMemo(() => {
    if (!selectedFund) return null
    if (selectedFund.directReturn3y != null) return selectedFund.directReturn3y
    return CATEGORY_RETURNS[selectedFund.category] || 10
  }, [selectedFund])

  const usingActualReturn = selectedFund != null && selectedFund.directReturn3y != null

  const handleRefreshNav = async () => {
    setRefreshing(true)
    try {
      await fetch('/api/funds/nav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      await fetchFunds()
      setLastUpdated(new Date().toLocaleString('en-IN'))
    } catch {
      // Silently handle refresh errors
    } finally {
      setRefreshing(false)
    }
  }

  const handleCalculate = () => {
    const params: Record<string, unknown> = {
      investedAmount: parseFloat(investedAmount) || 500000,
      years: parseInt(years) || 20,
      mode: savingsMode,
      monthlySip: parseFloat(investedAmount) || 10000, // Use the same input field for simplicity
    }
    if (effectiveFundId && effectiveFundId !== 'custom') params.fundId = effectiveFundId
    if (customDirect) params.directExpenseRatio = parseFloat(customDirect)
    if (customRegular) params.regularExpenseRatio = parseFloat(customRegular)
    // Pass actual expected return if available
    if (effectiveExpectedReturn != null && effectiveFundId !== 'custom') {
      params.expectedReturn = effectiveExpectedReturn
    }
    calculateSavings(params as Parameters<typeof calculateSavings>[0])
  }

  // Auto-calculate once when component mounts with funds
  useEffect(() => {
    if (effectiveFundId && effectiveFundId !== 'custom' && !savingsResult) {
      const params: Record<string, unknown> = {
        investedAmount: parseFloat(investedAmount) || 500000,
        years: parseInt(years) || 20,
        mode: savingsMode,
        monthlySip: parseFloat(investedAmount) || 10000,
      }
      if (effectiveFundId) params.fundId = effectiveFundId
      if (effectiveExpectedReturn != null) params.expectedReturn = effectiveExpectedReturn
      calculateSavings(params as Parameters<typeof calculateSavings>[0])
    }
  }, [effectiveFundId, calculateSavings, investedAmount, years, savingsResult, effectiveExpectedReturn, savingsMode])

  const chartData = useMemo(() => {
    if (!savingsResult) return []
    return savingsResult.yearlyBreakdown.map(b => ({
      year: b.year,
      'Direct Plan': Math.round(b.directValue),
      'Regular Plan': Math.round(b.regularValue),
      'Your Savings': Math.round(b.savings),
    }))
  }, [savingsResult])

  const savingsBarData = useMemo(() => {
    if (!savingsResult) return []
    return savingsResult.yearlyBreakdown
      .filter(b => [1, 3, 5, 10, 15, 20, 25, 30].includes(b.year) || b.year === savingsResult.yearlyBreakdown.length)
      .map(b => ({
        year: `Year ${b.year}`,
        savings: Math.round(b.cumulativeSavings),
      }))
  }, [savingsResult])

  return (
    <div className="space-y-6">
      {/* Calculator Inputs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Calculator className="h-5 w-5 text-emerald-600" />
              Lifetime Savings Calculator
            </CardTitle>
            <div className="flex items-center gap-2">
              <Tabs value={savingsMode} onValueChange={(v) => setSavingsMode(v as 'lumpsum' | 'sip')} className="w-[180px]">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="lumpsum">Lumpsum</TabsTrigger>
                  <TabsTrigger value="sip">SIP</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshNav}
                disabled={refreshing}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh NAV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Fund (optional)</Label>
              <Select value={selectedFundId || undefined} onValueChange={(v) => { setSelectedFundId(v); setCustomDirect(''); setCustomRegular('') }}>
                <SelectTrigger>
                  <SelectValue placeholder={funds.length > 0 ? funds[0].schemeName : 'Pick a fund or use custom'} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="custom">Custom expense ratios</SelectItem>
                  {funds.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      <span className="text-xs">{f.schemeName}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{savingsMode === 'lumpsum' ? 'Investment Amount (₹)' : 'Monthly SIP Amount (₹)'}</Label>
              <Input
                type="number"
                value={investedAmount}
                onChange={(e) => setInvestedAmount(e.target.value)}
                placeholder="500000"
              />
            </div>
            <div className="space-y-2">
              <Label>Investment Horizon (years)</Label>
              <Select value={years} onValueChange={setYears}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 25, 30].map(y => (
                    <SelectItem key={y} value={String(y)}>{y} years</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleCalculate} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={savingsLoading}>
                <Play className="h-4 w-4" />
                Calculate
              </Button>
            </div>
          </div>

          {/* Custom expense ratio inputs */}
          {effectiveFundId === 'custom' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Direct Plan Expense Ratio (%)</Label>
                <Input type="number" step="0.01" value={customDirect} onChange={(e) => setCustomDirect(e.target.value)} placeholder="0.75" />
              </div>
              <div className="space-y-2">
                <Label>Regular Plan Expense Ratio (%)</Label>
                <Input type="number" step="0.01" value={customRegular} onChange={(e) => setCustomRegular(e.target.value)} placeholder="1.75" />
              </div>
            </div>
          )}

          {/* Show selected fund info with real-time data */}
          {selectedFund && effectiveFundId !== 'custom' && (
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-foreground space-y-2">
              <div className="flex items-center justify-between">
                <p><strong>{selectedFund.schemeName}</strong> ({selectedFund.fundHouse})</p>
                <Badge variant="outline" className="text-[9px]">{selectedFund.category}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground text-[10px]">Direct ER:</span>
                  <p className="font-medium">{selectedFund.directExpenseRatio}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Regular ER:</span>
                  <p className="font-medium">{selectedFund.regularExpenseRatio}%</p>
                </div>
              </div>
              <p>
                ER Difference: <strong className="text-emerald-600 dark:text-emerald-400">{(selectedFund.regularExpenseRatio - selectedFund.directExpenseRatio).toFixed(2)}%</strong>
              </p>
              {/* Actual returns section */}
              <Separator className="my-2" />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-muted-foreground">1Y Return:</span>
                  <p className="font-medium">{formatPercent(selectedFund.directReturn1y)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">3Y Return:</span>
                  <p className="font-medium">{formatPercent(selectedFund.directReturn3y)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">5Y Return:</span>
                  <p className="font-medium">{formatPercent(selectedFund.directReturn5y)}</p>
                </div>
              </div>
              <Badge variant={usingActualReturn ? 'default' : 'secondary'} className={`text-[10px] mt-1 ${usingActualReturn ? 'bg-emerald-600 text-white' : ''}`}>
                {usingActualReturn
                  ? `Using actual 3Y return: ${selectedFund.directReturn3y?.toFixed(1)}%`
                  : `Using category estimate: ${CATEGORY_RETURNS[selectedFund.category] || 10}%`
                }
              </Badge>
            </div>
          )}

          {/* Last Updated timestamp */}
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              NAV data last refreshed: {lastUpdated}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {savingsLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : savingsResult ? (
        <>
          {/* Key metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Direct Plan Value</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(savingsResult.directValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">After {years} years</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Regular Plan Value</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(savingsResult.regularValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">After {years} years</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Savings</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{formatCurrency(savingsResult.savings)}</p>
                <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">{savingsResult.savingsPct.toFixed(1)}% more wealth</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Extra Cost per Year</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(Math.round(savingsResult.savings / parseInt(years)))}</p>
                <p className="text-xs text-muted-foreground mt-1">What Regular plan costs you</p>
              </CardContent>
            </Card>
          </div>

          {/* Growth chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-card-foreground">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Wealth Growth: Direct vs Regular
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="directGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="regularGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} className="stroke-border" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${(v / 100000).toFixed(0)}L`} />
                    <Tooltip
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      labelFormatter={(label: number) => `Year ${label}`}
                      contentStyle={{ 
                        backgroundColor: 'var(--card)', 
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--card-foreground)'
                      }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="Direct Plan" stroke="#10b981" fill="url(#directGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Regular Plan" stroke="#ef4444" fill="url(#regularGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cumulative savings bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Cumulative Savings from Switching to Direct</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={savingsBarData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} className="stroke-border" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${(v / 100000).toFixed(0)}L`} />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Savings']}
                      contentStyle={{ 
                        backgroundColor: 'var(--card)', 
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--card-foreground)'
                      }}
                    />
                    <Bar dataKey="savings" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Yearly breakdown table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Year-by-Year Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="py-2 px-3 text-left font-medium text-muted-foreground">Year</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Direct Value</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Regular Value</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Yearly Saving</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Cumulative Saving</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savingsResult.yearlyBreakdown.map((row) => (
                      <tr key={row.year} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-3 font-medium text-foreground">{row.year}</td>
                        <td className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-400">{formatCurrency(row.directValue)}</td>
                        <td className="py-2 px-3 text-right text-red-700 dark:text-red-400">{formatCurrency(row.regularValue)}</td>
                        <td className="py-2 px-3 text-right text-foreground">{formatCurrency(row.savings)}</td>
                        <td className="py-2 px-3 text-right font-medium text-amber-700 dark:text-amber-400">{formatCurrency(row.cumulativeSavings)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Plain language explanation */}
          <div className="rounded-xl bg-emerald-50 p-5 dark:bg-emerald-950/20">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-sm text-emerald-800 dark:text-emerald-300 space-y-2">
                <p>
                  <strong>What this means in plain English:</strong>
                </p>
                <p>
                  If you invest <strong>{formatCurrency(parseFloat(investedAmount))}</strong> in a mutual fund and hold it for <strong>{years} years</strong>,
                  choosing the Direct plan instead of the Regular plan would give you <strong>{formatCurrency(savingsResult.savings)}</strong> more wealth.
                </p>
                <p>
                  That&apos;s like getting <strong>{savingsResult.savingsPct.toFixed(1)}% extra returns</strong> for doing absolutely nothing different — 
                  same fund, same stocks, same risk. The only change is cutting out the middleman (distributor) who takes a commission from your Regular plan.
                </p>
                <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                  💡 Think of it this way: Every ₹1 lakh you invest through a Regular plan loses approximately ₹{Math.round(savingsResult.savings / (parseFloat(investedAmount) / 100000) / parseInt(years) * 100) / 100} per year to distributor commissions. Over {years} years, that compounds massively.
                </p>
                {selectedFund && (
                  <p className="text-emerald-700 dark:text-emerald-400 text-xs mt-2">
                    📊 Calculation uses {usingActualReturn ? `actual 3Y return (${selectedFund.directReturn3y?.toFixed(1)}%)` : `category estimate (${CATEGORY_RETURNS[selectedFund.category] || 10}%)`}
                    {lastUpdated && ` · Refreshed: ${lastUpdated}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
