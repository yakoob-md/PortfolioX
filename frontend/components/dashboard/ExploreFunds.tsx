'use client'

import { useFundStore, type FundData } from '@/lib/store'
import { formatCurrency, formatPercent, formatAUM, getRiskColor, getCategoryColor, expenseRatioDiff } from '@/lib/helpers'
import { Search, SlidersHorizontal, X, Plus, GitCompareArrows, Eye } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import FundDetail from '@/components/dashboard/FundDetail'

const categories = ['All', 'Equity', 'Debt', 'Hybrid']
const subCategories: Record<string, string[]> = {
  'All': ['All'],
  'Equity': ['All', 'Large Cap', 'Mid Cap', 'Small Cap', 'Flexi Cap', 'ELSS', 'Index Fund', 'Sectoral/Thematic'],
  'Debt': ['All', 'Corporate Bond', 'Gilt', 'Short Duration', 'Liquid'],
  'Hybrid': ['All', 'Balanced Advantage', 'Aggressive Hybrid'],
}
const sortOptions = [
  { value: 'aumCrore', label: 'AUM (Largest)' },
  { value: 'expenseDiff', label: 'Expense Saving' },
  { value: 'directReturn1y', label: '1Y Return (Direct)' },
  { value: 'directReturn3y', label: '3Y Return (Direct)' },
  { value: 'directReturn5y', label: '5Y Return (Direct)' },
]

export default function ExploreFunds() {
  const {
    funds, fundsLoading, fundsTotal, searchQuery, categoryFilter, subCategoryFilter, sortBy,
    setSearchQuery, setCategoryFilter, setSubCategoryFilter, setSortBy, fetchFunds,
    toggleFundSelection, selectedFundIds, setActiveTab, fetchComparisons,
    addHolding,
  } = useFundStore()

  const [addingFund, setAddingFund] = useState<string | null>(null)
  const [detailFund, setDetailFund] = useState<FundData | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  
  // Add to Portfolio Dialog State
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedFundForAdd, setSelectedFundForAdd] = useState<FundData | null>(null)
  const [planType, setPlanType] = useState<'direct' | 'regular'>('regular')
  const [investedAmount, setInvestedAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')

  useEffect(() => {
    fetchFunds()
  }, [searchQuery, categoryFilter, subCategoryFilter, sortBy])

  const handleAddToPortfolio = useCallback((fund: FundData) => {
    setSelectedFundForAdd(fund)
    setInvestedAmount((fund.minInvestment * 10).toString())
    setCurrentAmount((fund.minInvestment * 11).toString())
    setPlanType('regular') // Usually people coming from regular plans
    setAddDialogOpen(true)
  }, [])

  const confirmAddHolding = useCallback(async () => {
    if (!selectedFundForAdd || !investedAmount || !currentAmount) return
    
    setAddingFund(selectedFundForAdd.id)
    try {
      const invested = parseFloat(investedAmount)
      const current = parseFloat(currentAmount)
      const nav = planType === 'direct' ? selectedFundForAdd.directNav : selectedFundForAdd.regularNav

      await addHolding({
        fundId: selectedFundForAdd.id,
        planType: planType,
        investedAmount: invested,
        currentAmount: current,
        units: current / nav,
        purchaseDate: new Date().toISOString().split('T')[0],
      })
      
      setAddDialogOpen(false)
      toast.success(`${selectedFundForAdd.schemeName} added to portfolio`)
    } catch (err) {
      toast.error('Failed to add fund')
    } finally {
      setAddingFund(null)
    }
  }, [addHolding, selectedFundForAdd, investedAmount, currentAmount, planType])

  const handleCompare = useCallback(() => {
    fetchComparisons()
    setActiveTab('compare')
  }, [fetchComparisons, setActiveTab])

  return (
    <div id="explore-section" className="space-y-4 scroll-mt-24">
      {/* Search & Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by fund name, fund house, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter || 'All'} onValueChange={(v) => setCategoryFilter(v === 'All' ? '' : v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={subCategoryFilter || 'All'} onValueChange={(v) => setSubCategoryFilter(v === 'All' ? '' : v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sub-category" />
            </SelectTrigger>
            <SelectContent>
              {(subCategories[categoryFilter] || subCategories['All']).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results summary + compare action */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {fundsLoading ? 'Searching...' : `${fundsTotal} funds found`}
        </p>
        {selectedFundIds.length > 0 && (
          <Button size="sm" onClick={handleCompare} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <GitCompareArrows className="h-4 w-4" />
            Compare {selectedFundIds.length} fund{selectedFundIds.length > 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Fund cards */}
      {fundsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {funds?.map((fund) => {
            const expDiff = expenseRatioDiff(fund.directExpenseRatio, fund.regularExpenseRatio)
            const isSelected = selectedFundIds.includes(fund.id)
            return (
              <Card key={fund.id} className={`transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-emerald-500 shadow-md' : ''}`}>
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3
                        className="font-semibold text-sm leading-tight truncate text-card-foreground cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        title={fund.schemeName}
                        onClick={() => { setDetailFund(fund); setDetailOpen(true) }}
                      >{fund.schemeName}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{fund.fundHouse}</p>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline" className={`text-[10px] px-1.5 ${getCategoryColor(fund.category)}`}>
                        {fund.subCategory}
                      </Badge>
                    </div>
                  </div>

                  {/* Direct vs Regular mini comparison */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-2 border border-emerald-200/50 dark:border-emerald-500/20">
                      <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">DIRECT</p>
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{fund.directExpenseRatio}%</p>
                      <p className="text-[10px] text-muted-foreground">Expense Ratio</p>
                      <p className="text-xs font-medium mt-1 text-card-foreground">{formatPercent(fund.directReturn1y)} <span className="text-muted-foreground">1Y</span></p>
                    </div>
                    <div className="rounded-lg bg-red-50 dark:bg-red-500/10 p-2 border border-red-200/50 dark:border-red-500/20">
                      <p className="text-[10px] font-medium text-red-700 dark:text-red-400">REGULAR</p>
                      <p className="text-lg font-bold text-red-700 dark:text-red-400">{fund.regularExpenseRatio}%</p>
                      <p className="text-[10px] text-muted-foreground">Expense Ratio</p>
                      <p className="text-xs font-medium mt-1 text-card-foreground">{formatPercent(fund.regularReturn1y)} <span className="text-muted-foreground">1Y</span></p>
                    </div>
                  </div>

                  {/* Savings callout */}
                  <div className="rounded-md bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 text-center border border-amber-200/50 dark:border-amber-500/20">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      Save <strong>{expDiff} bps/year</strong> in Direct = <strong>~₹{Math.round(expDiff * 50)}/yr</strong> on ₹5L
                    </p>
                  </div>

                  {/* Additional info */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>AUM: {formatAUM(fund.aumCrore)}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 ${getRiskColor(fund.riskometer)}`}>
                      {fund.riskometer}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setDetailFund(fund); setDetailOpen(true) }}
                      className="gap-1 text-xs"
                    >
                      <Eye className="h-3 w-3" />
                      Details
                    </Button>
                    <Button
                      size="sm"
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => toggleFundSelection(fund.id)}
                      className="flex-1 gap-1 text-xs"
                    >
                      <GitCompareArrows className="h-3 w-3" />
                      {isSelected ? 'Selected' : 'Compare'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddToPortfolio(fund)}
                      className="flex-1 gap-1 text-xs"
                      disabled={addingFund === fund.id}
                    >
                      <Plus className="h-3 w-3" />
                      {addingFund === fund.id ? 'Adding...' : 'Add'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {(funds?.length === 0 || !funds) && !fundsLoading && (
        <div className="py-16 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium text-foreground">No funds found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
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

      {/* Add to Portfolio Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Portfolio</DialogTitle>
            <DialogDescription>
              Enter your investment details for <strong>{selectedFundForAdd?.schemeName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plan Type</Label>
              <Select value={planType} onValueChange={(v) => setPlanType(v as 'direct' | 'regular')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular (Commission included)</SelectItem>
                  <SelectItem value="direct">Direct (No commission)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invested Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 100000"
                  value={investedAmount}
                  onChange={(e) => setInvestedAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Current Value (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 115000"
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
            <Button 
              onClick={confirmAddHolding} 
              disabled={!investedAmount || !currentAmount || addingFund !== null} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {addingFund ? 'Adding...' : 'Add to Portfolio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

