'use client'

import { useFundStore } from '@/lib/store'
import { formatCurrency, formatPercent, formatSharpe, formatAUM, getCategoryColor } from '@/lib/helpers'
import { Trophy, Medal, TrendingUp, BarChart3, Loader2, Crown, Award } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'

interface RankingFund {
  rank: number
  fundId: string
  schemeName: string
  fundHouse: string
  directReturn: { return1y: number | null; return3y: number | null; return5y: number | null }
  regularReturn: { return1y: number | null; return3y: number | null; return5y: number | null }
  directSharpe: number | null
  regularSharpe: number | null
  directER: number
  regularER: number
  aum: number
}

const CATEGORIES = ['', 'Equity', 'Debt', 'Hybrid', 'Index', 'ELSS']
const SUB_CATEGORIES: Record<string, string[]> = {
  '': [],
  Equity: ['Large Cap', 'Mid Cap', 'Small Cap', 'Multi Cap', 'Flexi Cap', 'Large & Mid Cap', 'Focused', 'Value', 'Dividend Yield', 'Sectoral/Thematic'],
  Debt: ['Liquid', 'Short Duration', 'Medium Duration', 'Corporate Bond', 'Banking & PSU', 'Gilt', 'Dynamic Bond', 'Overnight'],
  Hybrid: ['Aggressive Hybrid', 'Conservative Hybrid', 'Balanced Advantage', 'Multi Asset'],
  Index: ['Nifty 50', 'Nifty Next 50', 'Nifty Midcap 150', 'Sensex', 'Nifty 500'],
  ELSS: ['ELSS'],
}
const SORT_METRICS = [
  { value: 'return1y', label: '1Y Return' },
  { value: 'return3y', label: '3Y Return' },
  { value: 'return5y', label: '5Y Return' },
  { value: 'sharpe', label: 'Sharpe Ratio' },
  { value: 'expenseRatio', label: 'Expense Ratio' },
  { value: 'aum', label: 'AUM' },
]

function getMedalIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
  if (rank === 3) return <Award className="h-5 w-5 text-amber-700" />
  return null
}

function getMedalBg(rank: number) {
  if (rank === 1) return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
  if (rank === 2) return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
  if (rank === 3) return 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
  return ''
}

export default function FundRankings() {
  const { funds, fetchFunds } = useFundStore()

  const [category, setCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [sortBy, setSortBy] = useState('return1y')
  const [loading, setLoading] = useState(false)
  const [rankings, setRankings] = useState<RankingFund[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (funds.length === 0) fetchFunds()
  }, [])

  const availableSubCategories = useMemo(() => {
    return SUB_CATEGORIES[category] || []
  }, [category])

  const handleFetchRankings = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (subCategory) params.set('subCategory', subCategory)
      params.set('sortBy', sortBy)
      params.set('limit', '10')

      const res = await fetch(`/api/funds/rankings?${params}`)
      if (!res.ok) throw new Error('Failed to fetch rankings')
      const data = await res.json()
      setRankings(data.rankings || [])
    } catch {
      setError('Failed to fetch fund rankings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch on mount
  useEffect(() => {
    handleFetchRankings()
  }, [])

  const topReturn = useMemo(() => {
    if (rankings.length === 0) return 1
    const topFund = rankings[0]
    const retVal = sortBy === 'return1y' ? topFund.directReturn.return1y
      : sortBy === 'return3y' ? topFund.directReturn.return3y
      : sortBy === 'return5y' ? topFund.directReturn.return5y
      : sortBy === 'sharpe' ? topFund.directSharpe
      : sortBy === 'aum' ? topFund.aum
      : topFund.directER
    return Math.abs(retVal || 1)
  }, [rankings, sortBy])

  const getReturnValue = (fund: RankingFund): number | null => {
    switch (sortBy) {
      case 'return1y': return fund.directReturn.return1y
      case 'return3y': return fund.directReturn.return3y
      case 'return5y': return fund.directReturn.return5y
      case 'sharpe': return fund.directSharpe
      case 'aum': return fund.aum
      case 'expenseRatio': return fund.directER
      default: return fund.directReturn.return1y
    }
  }

  return (
    <div className="space-y-6">
      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <Trophy className="h-5 w-5 text-emerald-600" />
            Fund Rankings
          </CardTitle>
          <CardDescription>Category-wise fund rankings based on performance metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setSubCategory('') }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Categories</SelectItem>
                  {CATEGORIES.filter(c => c).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Sub-Category</Label>
              <Select value={subCategory} onValueChange={setSubCategory} disabled={availableSubCategories.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={availableSubCategories.length > 0 ? 'Select sub-category' : 'Select category first'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Sub-Categories</SelectItem>
                  {availableSubCategories.map(sub => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_METRICS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleFetchRankings}
                disabled={loading}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                Get Rankings
              </Button>
            </div>
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
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      )}

      {/* Rankings */}
      {!loading && rankings.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Top 3 Podium */}
          <div className="grid gap-4 sm:grid-cols-3">
            {rankings.slice(0, 3).map((fund, idx) => {
              const retValue = getReturnValue(fund)
              const barWidth = retValue ? Math.min((Math.abs(retValue) / topReturn) * 100, 100) : 0
              return (
                <motion.div
                  key={fund.fundId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className={`border-2 ${getMedalBg(fund.rank)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getMedalIcon(fund.rank)}
                        <Badge className={`text-[10px] font-bold ${fund.rank === 1 ? 'bg-yellow-500 text-white' : fund.rank === 2 ? 'bg-gray-400 text-white' : 'bg-amber-700 text-white'}`}>
                          #{fund.rank}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm text-foreground line-clamp-2 leading-tight">{fund.schemeName}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{fund.fundHouse}</p>
                      <div className="mt-3 space-y-2">
                        {/* Performance Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{SORT_METRICS.find(m => m.value === sortBy)?.label}</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {sortBy === 'aum' ? formatAUM(retValue || 0) : sortBy === 'expenseRatio' ? `${(retValue || 0).toFixed(2)}%` : formatPercent(retValue)}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{ duration: 0.6, delay: idx * 0.1 }}
                              className="h-full rounded-full bg-emerald-500"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>ER: {fund.directER.toFixed(2)}%</span>
                          <span>AUM: {formatAUM(fund.aum)}</span>
                          <span>Sharpe: {formatSharpe(fund.directSharpe)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {/* Full Rankings Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                Top 10 Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2.5 px-2 text-center font-medium text-muted-foreground w-10">Rank</th>
                      <th className="py-2.5 px-2 text-left font-medium text-muted-foreground">Fund Name</th>
                      <th className="py-2.5 px-2 text-right font-medium text-muted-foreground">1Y Return</th>
                      <th className="py-2.5 px-2 text-right font-medium text-muted-foreground">3Y Return</th>
                      <th className="py-2.5 px-2 text-right font-medium text-muted-foreground">5Y Return</th>
                      <th className="py-2.5 px-2 text-right font-medium text-muted-foreground">Sharpe</th>
                      <th className="py-2.5 px-2 text-right font-medium text-muted-foreground">ER</th>
                      <th className="py-2.5 px-2 text-right font-medium text-muted-foreground">AUM</th>
                      <th className="py-2.5 px-2 text-left font-medium text-muted-foreground min-w-[100px]">Relative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((fund) => {
                      const retValue = getReturnValue(fund)
                      const barWidth = retValue ? Math.min((Math.abs(retValue) / topReturn) * 100, 100) : 0
                      return (
                        <motion.tr
                          key={fund.fundId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: fund.rank * 0.03 }}
                          className={`border-b last:border-0 hover:bg-muted/50 transition-colors ${fund.rank <= 3 ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}
                        >
                          <td className="py-2.5 px-2 text-center">
                            <div className="flex items-center justify-center">
                              {fund.rank <= 3 ? getMedalIcon(fund.rank) : (
                                <span className="text-xs font-bold text-muted-foreground">{fund.rank}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <p className="font-medium text-foreground line-clamp-1">{fund.schemeName}</p>
                            <p className="text-[10px] text-muted-foreground">{fund.fundHouse}</p>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <span className={fund.directReturn.return1y !== null && fund.directReturn.return1y >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                              {formatPercent(fund.directReturn.return1y)}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <span className={fund.directReturn.return3y !== null && fund.directReturn.return3y >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                              {formatPercent(fund.directReturn.return3y)}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <span className={fund.directReturn.return5y !== null && fund.directReturn.return5y >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                              {formatPercent(fund.directReturn.return5y)}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-medium text-foreground">{formatSharpe(fund.directSharpe)}</td>
                          <td className="py-2.5 px-2 text-right text-foreground">{fund.directER.toFixed(2)}%</td>
                          <td className="py-2.5 px-2 text-right text-foreground">{formatAUM(fund.aum)}</td>
                          <td className="py-2.5 px-2">
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${barWidth}%` }}
                                transition={{ duration: 0.5, delay: fund.rank * 0.03 }}
                                className={`h-full rounded-full ${fund.rank <= 3 ? 'bg-emerald-500' : 'bg-emerald-400/60'}`}
                              />
                            </div>
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
      )}

      {/* Empty State */}
      {!loading && rankings.length === 0 && !error && (
        <Card>
          <CardContent className="py-16 text-center">
            <Trophy className="h-16 w-16 text-emerald-200 dark:text-emerald-900 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Select your criteria and click <strong>Get Rankings</strong> to see top-performing funds.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <label className={className}>{children}</label>
}
