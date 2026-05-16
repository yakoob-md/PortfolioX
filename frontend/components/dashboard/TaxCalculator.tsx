'use client'

import { useFundStore, type HoldingData } from '@/lib/store'
import { formatCurrency, formatPercent } from '@/lib/helpers'
import { Calculator, TrendingUp, AlertTriangle, Info, Plus, Trash2, IndianRupee, PiggyBank, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'

interface TaxHolding {
  id: string
  name: string
  investedAmount: number
  currentValue: number
  purchaseDate: string
  category: 'equity' | 'debt' | 'hybrid'
}

interface TaxResult {
  name: string
  category: 'equity' | 'debt' | 'hybrid'
  investedAmount: number
  currentValue: number
  gain: number
  holdingPeriodDays: number
  gainType: 'STCG' | 'LTCG'
  taxRate: number
  taxAmount: number
  netGain: number
}

const FY_RULES = {
  equity: { stcgRate: 0.20, ltcgRate: 0.125, ltcgExemption: 125000, stThreshold: 365 },
  debt: { stcgRate: 0, ltcgRate: 0, ltcgExemption: 0, stThreshold: 1095, slabRate: 0.30 },
  hybrid: { stcgRate: 0.20, ltcgRate: 0.125, ltcgExemption: 125000, stThreshold: 365 },
}

const CATEGORY_COLORS = {
  equity: '#10b981',
  debt: '#14b8a6',
  hybrid: '#8b5cf6',
}

export default function TaxCalculator() {
  const { holdings, fetchHoldings, funds } = useFundStore()

  const [taxHoldings, setTaxHoldings] = useState<TaxHolding[]>([])
  const [taxResults, setTaxResults] = useState<TaxResult[]>([])
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'equity' | 'debt' | 'hybrid'>('all')
  const [calculated, setCalculated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const [taxSlab, setTaxSlab] = useState('30')
  const [alreadyRealizedLTCG, setAlreadyRealizedLTCG] = useState('0')

  // Custom holding form
  const [customName, setCustomName] = useState('')
  const [customInvested, setCustomInvested] = useState('')
  const [customCurrent, setCustomCurrent] = useState('')
  const [customDate, setCustomDate] = useState('2023-01-15')
  const [customCategory, setCustomCategory] = useState<'equity' | 'debt' | 'hybrid'>('equity')

  useEffect(() => {
    fetchHoldings()
  }, [])

  // Map portfolio holdings to tax holdings
  useEffect(() => {
    if (holdings.length > 0 && taxHoldings.length === 0 && !customMode) {
      const mapped: TaxHolding[] = holdings.map((h) => ({
        id: h.id,
        name: h.fund?.schemeName || 'Unknown Fund',
        investedAmount: h.investedAmount,
        currentValue: h.currentAmount,
        purchaseDate: h.purchaseDate || '2023-01-15',
        category: mapCategory(h.fund.category),
      }))
      setTaxHoldings(mapped)
    }
  }, [holdings])

  function mapCategory(cat: string): 'equity' | 'debt' | 'hybrid' {
    const c = cat.toLowerCase()
    if (c.includes('debt') || c.includes('liquid')) return 'debt'
    if (c.includes('hybrid') || c.includes('balanced')) return 'hybrid'
    return 'equity'
  }

  const calculateTax = useCallback(async () => {
    if (taxHoldings.length === 0) {
      toast.error('Add holdings to calculate tax')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/tax/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          holdings: taxHoldings,
          slabRate: parseFloat(taxSlab) / 100,
          realizedLTCG: parseFloat(alreadyRealizedLTCG) || 0
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setTaxResults(data.holdings || [])
        setCalculated(true)
      } else {
        // Fallback: calculate client-side
        const results = calculateTaxClientSide(taxHoldings)
        setTaxResults(results)
        setCalculated(true)
      }
    } catch {
      // Fallback: calculate client-side
      const results = calculateTaxClientSide(taxHoldings)
      setTaxResults(results)
      setCalculated(true)
    } finally {
      setLoading(false)
    }
  }, [taxHoldings])

  function calculateTaxClientSide(items: TaxHolding[]): TaxResult[] {
    const now = new Date()
    let remainingExemption = Math.max(0, 125000 - (parseFloat(alreadyRealizedLTCG) || 0))
    const slabRate = parseFloat(taxSlab) / 100

    // Sort to apply exemption to largest gains first
    const sortedItems = [...items].sort((a, b) => (b.currentValue - b.investedAmount) - (a.currentValue - a.investedAmount))

    return sortedItems.map((item) => {
      const purchaseDate = new Date(item.purchaseDate)
      const holdingDays = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24))
      const gain = item.currentValue - item.investedAmount
      const rules = FY_RULES[item.category]

      let gainType: 'STCG' | 'LTCG'
      let taxRate: number
      let taxAmount: number

      if (item.category === 'debt') {
        gainType = holdingDays < rules.stThreshold ? 'STCG' : 'LTCG'
        taxRate = slabRate
        taxAmount = Math.max(0, gain * taxRate)
      } else {
        // Equity / Hybrid
        const isLongTerm = holdingDays >= rules.stThreshold
        if (isLongTerm) {
          gainType = 'LTCG'
          taxRate = rules.ltcgRate
          const usedExemption = Math.min(Math.max(0, gain), remainingExemption)
          remainingExemption -= usedExemption
          const taxableGain = Math.max(0, gain - usedExemption)
          taxAmount = taxableGain * taxRate
        } else {
          gainType = 'STCG'
          taxRate = rules.stcgRate
          taxAmount = Math.max(0, gain * taxRate)
        }
      }

      return {
        name: item.name,
        category: item.category,
        investedAmount: item.investedAmount,
        currentValue: item.currentValue,
        gain,
        holdingPeriodDays: holdingDays,
        gainType,
        taxRate,
        taxAmount,
        netGain: gain - taxAmount,
      }
    })
  }

  const addCustomHolding = () => {
    if (!customName || !customInvested || !customCurrent) return
    setTaxHoldings((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: customName,
        investedAmount: parseFloat(customInvested),
        currentValue: parseFloat(customCurrent),
        purchaseDate: customDate,
        category: customCategory,
      },
    ])
    setCustomName('')
    setCustomInvested('')
    setCustomCurrent('')
    setCalculated(false)
    toast.success('Holding added')
  }

  const removeHolding = (id: string) => {
    setTaxHoldings((prev) => prev.filter((h) => h.id !== id))
    setCalculated(false)
  }

  const filteredResults = useMemo(() => {
    if (categoryFilter === 'all') return taxResults
    return taxResults.filter((r) => r.category === categoryFilter)
  }, [taxResults, categoryFilter])

  const summary = useMemo(() => {
    const totalTax = taxResults.reduce((s, r) => s + r.taxAmount, 0)
    const totalGain = taxResults.reduce((s, r) => s + r.gain, 0)
    const totalNetGain = taxResults.reduce((s, r) => s + r.netGain, 0)
    const effectiveRate = totalGain > 0 ? (totalTax / totalGain) * 100 : 0
    return { totalTax, totalGain, totalNetGain, effectiveRate }
  }, [taxResults])

  const chartData = useMemo(() => {
    return filteredResults.map((r) => {
      const n = r?.name || 'Unknown Fund'
      return {
        name: n.length > 20 ? n.slice(0, 20) + '…' : n,
        'Tax': Math.round(r?.taxAmount || 0),
        'Net Gain': Math.round(r?.netGain || 0),
        category: r?.category,
      }
    })
  }, [filteredResults])

  const tips = useMemo(() => {
    const tipsList: string[] = []
    const hasEquityLtcg = taxResults.some((r) => r.category === 'equity' && r.gainType === 'LTCG' && r.gain > 0)
    const hasStcgLoss = taxResults.some((r) => r.gain < 0 && r.gainType === 'STCG')
    const hasEquityFunds = taxResults.some((r) => r.category === 'equity')
    const totalTaxAmt = summary.totalTax

    if (hasEquityLtcg) {
      tipsList.push('💰 Harvest LTCG annually: Book profits up to ₹1.25 lakh per year to utilize the exemption, then reinvest in the same or similar fund.')
    }
    if (hasStcgLoss) {
      tipsList.push('📉 Offset STCG with losses: Sell loss-making holdings to offset short-term gains, then repurchase after 30 days if you still want exposure.')
    }
    if (hasEquityFunds && totalTaxAmt > 0) {
      tipsList.push('🏦 Consider ELSS funds: Invest up to ₹1.5 lakh under Section 80C for tax deduction while building equity wealth with 3-year lock-in.')
    }
    if (totalTaxAmt > 50000) {
      tipsList.push('⏰ Stagger redemptions: Spread gains across financial years (April–March) to maximize the ₹1.25L LTCG exemption each year.')
    }
    tipsList.push('🔄 Switch to Direct plans: Lower expense ratios mean higher returns, which compounds even after paying the same tax rate.')
    if (taxResults.some((r) => r.category === 'debt')) {
      tipsList.push('📊 Post-April 2023, debt fund gains are taxed at your slab rate regardless of holding period. Consider shifting to equity-oriented hybrid funds for better tax efficiency.')
    }
    return tipsList
  }, [taxResults, summary])

  return (
    <div className="space-y-6">
      {/* Header + Category Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <Calculator className="h-5 w-5 text-emerald-600" />
            Capital Gains Tax Calculator
            <Badge variant="outline" className="ml-2 text-[10px]">FY 2024-25</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-sm">Category Filter:</Label>
              <div className="flex gap-1">
                {(['all', 'equity', 'debt', 'hybrid'] as const).map((cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={categoryFilter === cat ? 'default' : 'outline'}
                    onClick={() => setCategoryFilter(cat)}
                    className={`text-xs ${categoryFilter === cat ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Your Tax Slab (%):</Label>
              <Select value={taxSlab} onValueChange={setTaxSlab}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0% (Nil)</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="15">15%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                  <SelectItem value="30">30%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Already Booked LTCG (₹):</Label>
              <Input
                type="number"
                value={alreadyRealizedLTCG}
                onChange={(e) => setAlreadyRealizedLTCG(e.target.value)}
                placeholder="0"
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-muted-foreground leading-tight">Gains already realized in this FY (to calculate exemption)</p>
            </div>
          </div>

          {/* Current holdings from portfolio */}
          {taxHoldings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Holdings being analyzed ({taxHoldings.length})</p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {taxHoldings.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground truncate block">{h.name}</span>
                      <span className="text-muted-foreground">
                        Invested: {formatCurrency(h.investedAmount)} · Current: {formatCurrency(h.currentValue)} · {h.category}
                      </span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeHolding(h.id)} className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600 shrink-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add custom holding */}
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add custom holding
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div className="space-y-1 lg:col-span-2">
                <Label className="text-[11px]">Fund Name</Label>
                <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. HDFC Flexi Cap" className="text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Invested (₹)</Label>
                <Input type="number" value={customInvested} onChange={(e) => setCustomInvested(e.target.value)} placeholder="100000" className="text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Current Value (₹)</Label>
                <Input type="number" value={customCurrent} onChange={(e) => setCustomCurrent(e.target.value)} placeholder="135000" className="text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Purchase Date</Label>
                <Input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Category</Label>
                <Select value={customCategory} onValueChange={(v) => setCustomCategory(v as 'equity' | 'debt' | 'hybrid')}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="debt">Debt</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button size="sm" onClick={addCustomHolding} disabled={!customName || !customInvested || !customCurrent} className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-3 w-3" />
              Add Holding
            </Button>
          </div>

          {/* Calculate button */}
          <Button onClick={calculateTax} disabled={loading || taxHoldings.length === 0} className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            Calculate Tax Liability
          </Button>

          {/* Tax rules reference */}
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">FY 2024-25 Tax Rules (Budget July 2024):</p>
            <p>• Equity/Equity-Oriented: STCG @ 20% · LTCG (&gt;1yr) @ 12.5% (above ₹1.25L limit)</p>
            <p>• Debt/Debt-Oriented: All gains taxed at your income tax slab ({taxSlab}%)</p>
            <p>• LTCG Limit: Combined ₹1.25L exemption per financial year across all equity assets</p>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {calculated && taxResults.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-red-200 dark:border-red-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Tax Liability</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(summary.totalTax)}</p>
                <p className="text-xs text-muted-foreground mt-1">Capital gains tax owed</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Net Gain After Tax</p>
                <p className={`text-2xl font-bold ${summary.totalNetGain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.totalNetGain)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">What you keep</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Effective Tax Rate</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{summary.effectiveRate.toFixed(1)}%</p>
                <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">On total gains</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Capital Gain</p>
                <p className={`text-2xl font-bold ${summary.totalGain >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                  {formatCurrency(summary.totalGain)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Before tax</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-holding breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Per-Holding Tax Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="py-2 px-2 text-left font-medium text-muted-foreground">Fund</th>
                      <th className="py-2 px-2 text-center font-medium text-muted-foreground">Type</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Gain</th>
                      <th className="py-2 px-2 text-center font-medium text-muted-foreground">STCG/LTCG</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Tax Rate</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Tax</th>
                      <th className="py-2 px-2 text-right font-medium text-muted-foreground">Net Gain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((r, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[r.category] }} />
                            <span className="font-medium text-foreground truncate max-w-[120px] sm:max-w-none">{r.name}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Badge variant="outline" className="text-[9px] px-1.5" style={{ color: CATEGORY_COLORS[r.category], borderColor: CATEGORY_COLORS[r.category] }}>
                            {r.category}
                          </Badge>
                        </td>
                        <td className={`py-2 px-2 text-right font-medium ${r.gain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {r.gain >= 0 ? '+' : ''}{formatCurrency(r.gain)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Badge variant="outline" className={`text-[9px] px-1.5 ${r.gainType === 'LTCG' ? 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400' : 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400'}`}>
                            {r.gainType}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-right text-muted-foreground">{(r.taxRate * 100).toFixed(1)}%</td>
                        <td className="py-2 px-2 text-right font-medium text-red-600 dark:text-red-400">{formatCurrency(r.taxAmount)}</td>
                        <td className={`py-2 px-2 text-right font-medium ${r.netGain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(r.netGain)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Stacked bar chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-card-foreground">Tax vs Net Gain per Holding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}K`} />
                      <Tooltip
                        formatter={(value: number, name: string) => [formatCurrency(value), name]}
                        contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--card-foreground)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                      <Bar dataKey="Net Gain" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Tax" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tax-saving tips */}
          <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/10">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <PiggyBank className="h-4 w-4" />
                Tax-Saving Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tips.map((tip, i) => (
                  <p key={i} className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                    {tip}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
