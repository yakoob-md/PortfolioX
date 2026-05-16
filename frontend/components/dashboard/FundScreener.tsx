'use client'

import { useFundStore } from '@/lib/store'
import { formatCurrency, formatPercent, formatSharpe, formatAUM, getCategoryColor, getRiskColor } from '@/lib/helpers'
import { Filter, Search, Play, X, ChevronDown, BarChart3, TrendingUp, Shield, Loader2, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ScreenerFund {
  id: string
  schemeName: string
  category: string
  subCategory: string
  fundHouse: string
  riskometer: string
  aumCrore: number
  directExpenseRatio: number
  regularExpenseRatio: number
  directReturn1y: number | null
  directReturn3y: number | null
  directSharpe1y: number | null
}

interface ScreenerResult {
  funds: ScreenerFund[]
  total: number
  appliedFilters: Record<string, unknown>
}

const CATEGORIES = ['Equity', 'Debt', 'Hybrid', 'Index', 'ELSS']
const RISK_LEVELS = ['Low', 'Low to Moderate', 'Moderate', 'Moderately High', 'High', 'Very High']
const SORT_OPTIONS = [
  { value: 'aum', label: 'AUM (High to Low)' },
  { value: 'return1y', label: '1Y Return (High to Low)' },
  { value: 'return3y', label: '3Y Return (High to Low)' },
  { value: 'sharpe', label: 'Sharpe Ratio (High to Low)' },
  { value: 'expenseRatio', label: 'Expense Ratio (Low to High)' },
]

export default function FundScreener() {
  const { funds, fetchFunds } = useFundStore()

  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSubCategory, setSelectedSubCategory] = useState('')
  const [aumRange, setAumRange] = useState<[number, number]>([0, 50000])
  const [minReturn1y, setMinReturn1y] = useState('')
  const [maxExpenseRatio, setMaxExpenseRatio] = useState('')
  const [selectedRiskometers, setSelectedRiskometers] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('aum')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScreenerResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (funds.length === 0) fetchFunds()
  }, [])

  const subCategories = useMemo(() => {
    const subs = new Set<string>()
    funds.forEach(f => {
      if (!selectedCategories.length || selectedCategories.includes(f.category)) {
        if (f.subCategory) subs.add(f.subCategory)
      }
    })
    return Array.from(subs).sort()
  }, [funds, selectedCategories])

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const toggleRiskometer = (risk: string) => {
    setSelectedRiskometers(prev =>
      prev.includes(risk) ? prev.filter(r => r !== risk) : [...prev, risk]
    )
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (selectedCategories.length > 0) count++
    if (selectedSubCategory) count++
    if (aumRange[0] > 0 || aumRange[1] < 50000) count++
    if (minReturn1y) count++
    if (maxExpenseRatio) count++
    if (selectedRiskometers.length > 0) count++
    return count
  }, [selectedCategories, selectedSubCategory, aumRange, minReturn1y, maxExpenseRatio, selectedRiskometers])

  const clearAllFilters = () => {
    setSelectedCategories([])
    setSelectedSubCategory('')
    setAumRange([0, 50000])
    setMinReturn1y('')
    setMaxExpenseRatio('')
    setSelectedRiskometers([])
    setSortBy('aum')
    setResult(null)
    setError('')
  }

  const handleScreen = async () => {
    setLoading(true)
    setError('')
    try {
      const body: Record<string, unknown> = { sortBy }
      if (selectedCategories.length > 0) body.categories = selectedCategories
      if (selectedSubCategory) body.subCategories = [selectedSubCategory]
      if (aumRange[0] > 0) body.minAum = aumRange[0]
      if (aumRange[1] < 50000) body.maxAum = aumRange[1]
      if (minReturn1y) body.minReturn1y = parseFloat(minReturn1y)
      if (maxExpenseRatio) body.maxExpenseRatio = parseFloat(maxExpenseRatio)
      if (selectedRiskometers.length > 0) body.riskometer = selectedRiskometers
      body.limit = 50
      body.order = 'desc'

      const res = await fetch('/api/funds/screener', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Failed to screen funds')
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Failed to screen funds. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <SlidersHorizontal className="h-5 w-5 text-emerald-600" />
            Fund Screener
            {activeFilterCount > 0 && (
              <Badge className="bg-emerald-600 text-white ml-2">{activeFilterCount} filters</Badge>
            )}
          </CardTitle>
          <CardDescription>Filter and discover funds matching your investment criteria</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Category Multi-Select */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    selectedCategories.includes(cat)
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:border-emerald-300 dark:hover:border-emerald-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-Category & Sort Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sub-Category</Label>
              <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All sub-categories" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="__all__">All sub-categories</SelectItem>
                  {subCategories.map(sub => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={handleScreen}
                disabled={loading}
                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Screen Funds
              </Button>
              <Button variant="outline" onClick={clearAllFilters} className="gap-1.5">
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          </div>

          {/* AUM Range Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AUM Range (₹ Cr)</Label>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {formatAUM(aumRange[0])} — {formatAUM(aumRange[1])}
              </span>
            </div>
            <Slider
              value={aumRange}
              onValueChange={(v) => setAumRange(v as [number, number])}
              min={0}
              max={50000}
              step={500}
              className="py-2"
            />
          </div>

          {/* Return & ER filters */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Min 1Y Return (%)</Label>
              <Input
                type="number"
                step="1"
                value={minReturn1y}
                onChange={(e) => setMinReturn1y(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Max Expense Ratio (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={maxExpenseRatio}
                onChange={(e) => setMaxExpenseRatio(e.target.value)}
                placeholder="e.g. 1.0"
              />
            </div>
          </div>

          {/* Riskometer Multi-Select */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Level</Label>
            <div className="flex flex-wrap gap-2">
              {RISK_LEVELS.map(risk => (
                <button
                  key={risk}
                  onClick={() => toggleRiskometer(risk)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    selectedRiskometers.includes(risk)
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:border-emerald-300 dark:hover:border-emerald-700'
                  }`}
                >
                  {risk}
                </button>
              ))}
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

      {/* Loading State */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Result Summary */}
          <div className="flex flex-wrap items-center gap-3">
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-foreground">
                  {result.total} fund{result.total !== 1 ? 's' : ''} found
                </span>
              </CardContent>
            </Card>
            {/* Applied Filter Badges */}
            {selectedCategories.map(cat => (
              <Badge key={cat} variant="outline" className="text-xs gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700">
                {cat}
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleCategory(cat)} />
              </Badge>
            ))}
            {selectedSubCategory && selectedSubCategory !== '__all__' && (
              <Badge variant="outline" className="text-xs gap-1 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                {selectedSubCategory}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedSubCategory('')} />
              </Badge>
            )}
            {minReturn1y && (
              <Badge variant="outline" className="text-xs gap-1 text-teal-700 dark:text-teal-400 border-teal-300 dark:border-teal-700">
                Min 1Y: {minReturn1y}%
                <X className="h-3 w-3 cursor-pointer" onClick={() => setMinReturn1y('')} />
              </Badge>
            )}
            {maxExpenseRatio && (
              <Badge variant="outline" className="text-xs gap-1 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700">
                Max ER: {maxExpenseRatio}%
                <X className="h-3 w-3 cursor-pointer" onClick={() => setMaxExpenseRatio('')} />
              </Badge>
            )}
            {selectedRiskometers.map(risk => (
              <Badge key={risk} variant="outline" className="text-xs gap-1 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700">
                {risk}
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleRiskometer(risk)} />
              </Badge>
            ))}
          </div>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                <Filter className="h-4 w-4 text-emerald-600" />
                Screening Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.funds.length === 0 ? (
                <div className="py-12 text-center">
                  <SlidersHorizontal className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No funds match your criteria. Try adjusting your filters.</p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-background z-10">
                      <tr className="border-b">
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Scheme Name</th>
                        <th className="py-2.5 px-3 text-left font-medium text-muted-foreground">Category</th>
                        <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">AUM</th>
                        <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Direct ER</th>
                        <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Regular ER</th>
                        <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">1Y Return</th>
                        <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">3Y Return</th>
                        <th className="py-2.5 px-3 text-right font-medium text-muted-foreground">Sharpe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.funds.map((fund, idx) => (
                        <motion.tr
                          key={fund.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <div>
                              <p className="font-medium text-foreground line-clamp-1">{fund.schemeName}</p>
                              <p className="text-[10px] text-muted-foreground">{fund.fundHouse}</p>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ring-1 ring-inset ${getCategoryColor(fund.category)}`}>
                              {fund.subCategory || fund.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-foreground">{formatAUM(fund.aumCrore)}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">{fund.directExpenseRatio.toFixed(2)}%</td>
                          <td className="py-2.5 px-3 text-right text-red-600 dark:text-red-400">{fund.regularExpenseRatio.toFixed(2)}%</td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            <span className={fund.directReturn1y !== null && fund.directReturn1y >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                              {formatPercent(fund.directReturn1y)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            <span className={fund.directReturn3y !== null && fund.directReturn3y >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                              {formatPercent(fund.directReturn3y)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-foreground">{formatSharpe(fund.directSharpe1y)}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty State */}
      {!result && !loading && !error && (
        <Card>
          <CardContent className="py-16 text-center">
            <Filter className="h-16 w-16 text-emerald-200 dark:text-emerald-900 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Set your filters and click <strong>Screen Funds</strong> to discover matching funds.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
