'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowRightLeft, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { useFundStore } from '@/lib/store'
import { formatCurrency } from '@/lib/helpers'

export default function FundSwitchGuide() {
  const { funds, fetchFunds, holdings, fetchHoldings } = useFundStore()
  const [selectedFundId, setSelectedFundId] = useState('')
  const [investmentAmount, setInvestmentAmount] = useState(500000)
  const [holdingYears, setHoldingYears] = useState(3)
  const [searchQuery, setSearchQuery] = useState('')
  const [taxSlab, setTaxSlab] = useState('30')
  const [result, setResult] = useState<{
    fund: { schemeName: string; directIsin: string; regularIsin: string }
    regularPlan: { expenseRatio: number; nav: number; return1y: number | null }
    directPlan: { expenseRatio: number; nav: number; return1y: number | null }
    savings: { expenseDiffBps: number; annualSaving: number; cumulativeSaving10y: number }
    switchCost: { taxOnSwitch: number; exitLoadCost: number; totalSwitchCost: number; isLongTerm: boolean; taxType: string }
    recommendation: { switchRecommended: boolean; breakEvenMonths: number; verdict: string }
    steps: { step: number; title: string; detail: string; status: string }[]
  } | null>(null)

  useEffect(() => {
    fetchHoldings()
    fetchFunds()
  }, [])

  const handleFundSelect = (id: string) => {
    setSelectedFundId(id)
    // If it's a holding, pre-fill details
    const holding = holdings.find(h => h.fundId === id)
    if (holding) {
      setInvestmentAmount(Math.round(holding.currentAmount))
      if (holding.purchaseDate) {
        const years = (new Date().getTime() - new Date(holding.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
        setHoldingYears(parseFloat(years.toFixed(1)))
      }
    }
  }

  useEffect(() => {
    if (!selectedFundId) return
    fetch(`/api/funds/switch-guide?fundId=${selectedFundId}&amount=${investmentAmount}&holdingYears=${holdingYears}&slabRate=${taxSlab}`)
      .then(r => r.json())
      .then(d => setResult(d))
      .catch(() => setResult(null))
  }, [selectedFundId, investmentAmount, holdingYears, taxSlab])

  const availableFunds = searchQuery 
    ? funds.filter(f => f.schemeName.toLowerCase().includes(searchQuery.toLowerCase()))
    : funds.slice(0, 50)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
          <ArrowRightLeft className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Fund Switch Guide</h2>
          <p className="text-sm text-muted-foreground">Regular → Direct switch with cost-benefit analysis</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Search & Select Fund</label>
              <div className="space-y-2">
                <Input 
                  placeholder="Type to search funds..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs"
                />
                <Select value={selectedFundId} onValueChange={handleFundSelect}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select fund..." />
                  </SelectTrigger>
                  <SelectContent>
                    {holdings.length > 0 && !searchQuery && (
                      <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground bg-muted/50 rounded-sm mb-1 uppercase tracking-wider">Your Holdings</div>
                    )}
                    {holdings
                      .filter(h => h.fund?.schemeName.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(h => (
                      <SelectItem key={h.fundId} value={h.fundId}>
                        💼 {h.fund?.schemeName}
                      </SelectItem>
                    ))}
                    {!searchQuery && (
                      <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground bg-muted/50 rounded-sm my-1 uppercase tracking-wider">All Funds</div>
                    )}
                    {availableFunds.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.schemeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Investment Amount (₹)</label>
              <Input type="number" value={investmentAmount} onChange={e => setInvestmentAmount(Number(e.target.value))} className="h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Approx. Holding Period (Yrs)</label>
              <Input type="number" value={holdingYears} onChange={e => setHoldingYears(Number(e.target.value))} min={0.1} step={0.1} className="h-10" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Your Tax Slab (%)</label>
              <Select value={taxSlab} onValueChange={setTaxSlab}>
                <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0% (Nil)</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                  <SelectItem value="30">30%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {result && result.regularPlan && result.directPlan && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-red-600 mb-2">🔴 REGULAR PLAN</p>
                <p className="text-lg font-bold">Expense Ratio: {result.regularPlan.expenseRatio}%</p>
                <p className="text-sm text-muted-foreground">NAV: ₹{result.regularPlan.nav} · 1Y: {result.regularPlan.return1y?.toFixed(2) || '—'}%</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10">
              <CardContent className="pt-6">
                <p className="text-xs font-medium text-emerald-600 mb-2">🟢 DIRECT PLAN</p>
                <p className="text-lg font-bold">Expense Ratio: {result.directPlan.expenseRatio}%</p>
                <p className="text-sm text-muted-foreground">NAV: ₹{result.directPlan.nav} · 1Y: {result.directPlan.return1y?.toFixed(2) || '—'}%</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/20"><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Annual Savings</p><p className="text-xl font-bold text-emerald-600">{formatCurrency(result.savings.annualSaving)}</p><p className="text-xs text-muted-foreground">{result.savings.expenseDiffBps} bps cheaper</p></CardContent></Card>
            <Card className="bg-red-50/50 dark:bg-red-950/20"><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Switch Cost</p><p className="text-xl font-bold text-red-600">{formatCurrency(result.switchCost.totalSwitchCost)}</p><p className="text-xs text-muted-foreground">Tax: {formatCurrency(result.switchCost.taxOnSwitch)} + Exit Load: {formatCurrency(result.switchCost.exitLoadCost)}</p></CardContent></Card>
            <Card className={result.recommendation.switchRecommended ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'bg-amber-50/50 dark:bg-amber-950/20'}>
              <CardContent className="pt-6 text-center">
                {result.recommendation.switchRecommended ? <CheckCircle className="mx-auto h-6 w-6 text-emerald-600" /> : <AlertTriangle className="mx-auto h-6 w-6 text-amber-600" />}
                <p className="text-xs text-muted-foreground mt-1">Break-even: {result.recommendation.breakEvenMonths} months</p>
                <Badge variant={result.recommendation.switchRecommended ? 'default' : 'destructive'} className="mt-1">{result.recommendation.switchRecommended ? '✓ Switch Recommended' : '✕ Stay for Now'}</Badge>
              </CardContent>
            </Card>
          </div>

          <Card className={result.recommendation.switchRecommended ? 'border-emerald-200 dark:border-emerald-800' : 'border-amber-200 dark:border-amber-800'}>
            <CardContent className="pt-6"><p className="font-bold">{result.recommendation.verdict}</p></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Step-by-Step Switch Process</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.steps.map((s) => (
                  <div key={s.step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${s.status === 'ok' ? 'bg-emerald-500/20 text-emerald-600' : s.status === 'warning' ? 'bg-amber-500/20 text-amber-600' : 'bg-teal-500/20 text-teal-600'}`}>{s.step}</div>
                    <div><p className="font-medium text-sm">{s.title}</p><p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
