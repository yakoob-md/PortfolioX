'use client'

import { useFundStore, type FundData } from '@/lib/store'
import { formatCurrency, formatPercent, expenseRatioDiff } from '@/lib/helpers'
import { Plus, Trash2, TrendingUp, TrendingDown, ArrowRight, Sparkles, Loader2, FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import QuickImport from '@/components/dashboard/QuickImport'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import FundDetail from '@/components/dashboard/FundDetail'

export default function PortfolioBuilder() {
  const {
    holdings, holdingsLoading, funds, fetchHoldings, removeHolding, fetchFunds, fetchAnalysis, analysis, analysisLoading, setActiveTab,
    aiInsights, aiInsightsLoading, fetchAiInsight,
  } = useFundStore()

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [quickImportOpen, setQuickImportOpen] = useState(false)
  const [selectedFundId, setSelectedFundId] = useState('')
  const [planType, setPlanType] = useState<'direct' | 'regular'>('regular')
  const [investedAmount, setInvestedAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [detailFund, setDetailFund] = useState<FundData | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    fetchHoldings()
    fetchFunds()
  }, [])

  useEffect(() => {
    if (holdings.length > 0) {
      fetchAnalysis()
    }
  }, [holdings.length])

  // Fetch AI insights for regular holdings
  useEffect(() => {
    holdings?.forEach(h => {
      if (h.planType === 'regular' && !aiInsights?.[h.fundId] && !aiInsightsLoading?.[h.fundId]) {
        fetchAiInsight(h.fundId, {
          fundName: h.fund?.schemeName,
          directExpenseRatio: h.fund?.directExpenseRatio,
          regularExpenseRatio: h.fund?.regularExpenseRatio,
          directReturn1y: h.fund?.directReturn1y,
          regularReturn1y: h.fund?.regularReturn1y,
          category: h.fund?.category,
        })
      }
    })
  }, [holdings, aiInsights, aiInsightsLoading, fetchAiInsight])

  const handleAddHolding = useCallback(async () => {
    if (!selectedFundId || !investedAmount || !currentAmount) return
    const fund = funds?.find(f => f.id === selectedFundId)
    if (!fund) return

    const nav = planType === 'direct' ? fund.directNav : fund.regularNav
    const curAmt = parseFloat(currentAmount)

    await useFundStore.getState().addHolding({
      fundId: selectedFundId,
      planType,
      investedAmount: parseFloat(investedAmount),
      currentAmount: curAmt,
      units: curAmt / nav,
      purchaseDate: '2023-01-15',
    })

    setAddDialogOpen(false)
    setSelectedFundId('')
    setInvestedAmount('')
    setCurrentAmount('')
    toast.success(`${fund.schemeName} added to portfolio`)
  }, [selectedFundId, investedAmount, currentAmount, planType, funds])

  const handleViewRecommendations = useCallback(() => {
    setActiveTab('compare')
  }, [setActiveTab])

  const totalInvested = holdings?.reduce((s, h) => s + h.investedAmount, 0) || 0
  const totalCurrent = holdings?.reduce((s, h) => s + h.currentAmount, 0) || 0
  const totalGain = totalCurrent - totalInvested
  const regularHoldings = holdings?.filter(h => h.planType === 'regular') || []

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      {holdings.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Invested</p>
              <p className="text-2xl font-bold text-card-foreground">{formatCurrency(totalInvested)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Current Value</p>
              <p className="text-2xl font-bold text-card-foreground">{formatCurrency(totalCurrent)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Gain/Loss</p>
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${totalGain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}
                </p>
                {totalGain >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Regular Plans (can switch)</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{regularHoldings.length}</p>
              <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                {regularHoldings.length > 0 ? '💡 Switch to Direct to save' : '✅ All in Direct plans'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && holdings.length > 0 && (
        <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 dark:border-emerald-900 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900">
                <Sparkles className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-foreground">Portfolio Switch Savings</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  By switching your <strong>{regularHoldings.length} Regular plan{regularHoldings.length !== 1 ? 's' : ''}</strong> to Direct, you could save:
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Per Year</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(analysis.directSavings.annualSaving)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">5 Years</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(analysis.directSavings.fiveYearSaving)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">10 Years</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(analysis.directSavings.tenYearSaving)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lifetime (30yr)</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(analysis.directSavings.lifetimeSavingAtRetirement)}</p>
                  </div>
                </div>
                {analysis.recommendations.length > 0 && (
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" onClick={handleViewRecommendations} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                      View Recommendations <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Holdings List */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Your Holdings ({holdings.length})
        </h2>
        <div className="flex items-center gap-2">
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-4 w-4" />
                Add Holding
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add a Fund Holding</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Fund</Label>
                  <Select value={selectedFundId} onValueChange={setSelectedFundId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a fund..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {funds?.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          <span className="text-xs">{f.schemeName}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Plan Type</Label>
                  <Select value={planType} onValueChange={(v) => setPlanType(v as 'direct' | 'regular')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular (with commission)</SelectItem>
                      <SelectItem value="direct">Direct (no commission)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Invested Amount (₹)</Label>
                    <Input
                      type="number"
                      placeholder="100000"
                      value={investedAmount}
                      onChange={(e) => setInvestedAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Value (₹)</Label>
                    <Input
                      type="number"
                      placeholder="125000"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAddHolding} disabled={!selectedFundId || !investedAmount || !currentAmount} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Add Holding
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            onClick={() => setQuickImportOpen(true)}
          >
            <FileUp className="h-4 w-4" />
            Quick Import
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
            onClick={async () => {
              await useFundStore.getState().loadDemoPortfolio()
              toast.success('Demo portfolio loaded')
            }}
          >
            <Sparkles className="h-4 w-4" />
            Demo Data
          </Button>
        </div>
      </div>

      <QuickImport open={quickImportOpen} onOpenChange={setQuickImportOpen} />

      {holdingsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : holdings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No holdings yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Add your mutual fund holdings to see how much you could save by switching from Regular to Direct plans.
            </p>
            <Button onClick={() => setAddDialogOpen(true)} className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4" />
              Add Your First Holding
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {holdings.map((holding) => {
            const fund = holding.fund
            const gain = holding.currentAmount - holding.investedAmount
            const gainPct = (gain / holding.investedAmount) * 100
            const expDiff = expenseRatioDiff(fund.directExpenseRatio, fund.regularExpenseRatio)
            const annualExtra = (holding.currentAmount * expDiff) / 10000
            const insight = aiInsights[holding.fundId]
            const insightLoading = aiInsightsLoading[holding.fundId]
            
            return (
              <Card key={holding.id} className={`transition-all ${holding.planType === 'regular' ? 'border-amber-200 dark:border-amber-900' : 'border-emerald-200 dark:border-emerald-900'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate text-card-foreground cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" onClick={() => { setDetailFund(fund); setDetailOpen(true) }}>{fund.schemeName}</h3>
                        <Badge variant="outline" className={`text-[10px] px-1.5 shrink-0 ${holding.planType === 'direct' ? 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400' : 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400'}`}>
                          {holding.planType === 'direct' ? '✓ Direct' : '⚠ Regular'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{fund.fundHouse} · {fund.subCategory}</p>
                      
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-foreground">
                        <span>Invested: <strong>{formatCurrency(holding.investedAmount)}</strong></span>
                        <span>Current: <strong>{formatCurrency(holding.currentAmount)}</strong></span>
                        <span className={gain >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({gainPct.toFixed(1)}%)
                        </span>
                      </div>

                      {holding.planType === 'regular' && (
                        <div className="mt-2 rounded-md bg-amber-100/50 px-2.5 py-1.5 text-xs dark:bg-amber-950/20">
                          <span className="text-amber-800 dark:text-amber-300">
                            💡 Switching to Direct saves <strong>~{formatCurrency(annualExtra)}/yr</strong> ({expDiff} bps lower expense ratio)
                          </span>
                        </div>
                      )}

                      {/* AI Insight */}
                      {holding.planType === 'regular' && (insight || insightLoading) && (
                        <div className="mt-2 rounded-md bg-emerald-100/30 px-2.5 py-1.5 text-xs dark:bg-emerald-950/20">
                          {insightLoading ? (
                            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Generating AI insight...
                            </span>
                          ) : insight ? (
                            <span className="text-emerald-800 dark:text-emerald-300">
                              🤖 <strong>AI:</strong> {insight}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        removeHolding(holding.id)
                        toast.success('Holding removed')
                      }}
                      className="text-muted-foreground hover:text-red-600 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Fund Detail Drawer */}
      {detailFund && (
        <FundDetail
          fund={detailFund}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}

      {/* Quick add popular funds */}
      {holdings.length === 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Or quickly add popular funds to demo:</h3>
          <div className="flex flex-wrap gap-2">
            {funds?.slice(0, 8).map(fund => (
              <Button
                key={fund.id}
                size="sm"
                variant="outline"
                onClick={() => handleQuickAdd(fund)}
                className="text-xs gap-1"
              >
                <Plus className="h-3 w-3" />
                {fund.schemeName.length > 25 ? fund.schemeName.slice(0, 25) + '...' : fund.schemeName}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function handleQuickAdd(fund: FundData) {
  const store = useFundStore.getState()
  const invested = fund.minInvestment * 10
  const gain = 1 + (Math.random() * 0.3 + 0.05)
  const current = Math.round(invested * gain)
  
  store.addHolding({
    fundId: fund.id,
    planType: 'regular',
    investedAmount: invested,
    currentAmount: current,
    units: current / fund.regularNav,
    purchaseDate: '2022-06-15',
  })
  toast.success(`${fund.schemeName} added to portfolio`)
}

