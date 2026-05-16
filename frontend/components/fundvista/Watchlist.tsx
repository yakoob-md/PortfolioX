'use client'

import { useFundStore, type WatchlistItem } from '@/lib/store'
import { formatCurrency, formatPercent, expenseRatioDiff, getCategoryColor, getRiskColor } from '@/lib/helpers'
import { Bookmark, Trash2, Plus, GitCompareArrows, Briefcase, StickyNote, X, Check, Loader2, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

export default function Watchlist() {
  const {
    watchlist, watchlistLoading, fetchWatchlist, removeFromWatchlist, updateWatchlistNotes,
    watchlistNavs, fetchWatchlistNavs,
    toggleFundSelection, addHolding, setActiveTab, funds,
  } = useFundStore()

  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState('')
  const [addingToPortfolio, setAddingToPortfolio] = useState<string | null>(null)

  useEffect(() => {
    fetchWatchlist()
  }, [])

  useEffect(() => {
    if (watchlist.length > 0) {
      fetchWatchlistNavs()
    }
  }, [watchlist.length])

  const handleSaveNotes = useCallback(async (id: string) => {
    await updateWatchlistNotes(id, notesValue)
    setEditingNotes(null)
    toast.success('Notes updated')
  }, [notesValue, updateWatchlistNotes])

  const handleAddToPortfolio = useCallback(async (item: WatchlistItem) => {
    setAddingToPortfolio(item.fundId)
    try {
      const invested = item.fund.minInvestment * 10
      const gain = 1 + (Math.random() * 0.2 + 0.05)
      const current = Math.round(invested * gain)
      await addHolding({
        fundId: item.fundId,
        planType: 'direct',
        investedAmount: invested,
        currentAmount: current,
        units: current / item.fund.directNav,
        purchaseDate: new Date().toISOString().split('T')[0],
      })
      toast.success(`${item.fund.schemeName} added to portfolio`)
    } finally {
      setAddingToPortfolio(null)
    }
  }, [addHolding])

  const handleAddToCompare = useCallback((fundId: string) => {
    toggleFundSelection(fundId)
    toast.success('Added to comparison — go to Compare tab to view')
  }, [toggleFundSelection])

  if (watchlistLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    )
  }

  if (watchlist.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bookmark className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Your watchlist is empty</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Browse funds to add to your watchlist. Track expense ratios, NAVs, and savings opportunities.
            </p>
            <Button
              onClick={() => setActiveTab('explore')}
              className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Bookmark className="h-4 w-4" />
              Browse Funds
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Watchlist ({watchlist.length})
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fetchWatchlistNavs()}
          className="gap-2"
        >
          <Radio className="h-3.5 w-3.5" />
          Refresh NAVs
        </Button>
      </div>

      <AnimatePresence mode="popLayout">
        <div className="space-y-3">
          {watchlist.map((item, index) => {
            const fund = item.fund
            const expDiff = expenseRatioDiff(fund.directExpenseRatio, fund.regularExpenseRatio)
            const liveNav = watchlistNavs[item.fundId]
            const isEditing = editingNotes === item.id

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -200 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                <Card className="transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Fund name + badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm text-card-foreground truncate">
                            {fund.schemeName}
                          </h3>
                          <Badge variant="outline" className={`text-[10px] px-1.5 ${getCategoryColor(fund.category)}`}>
                            {fund.subCategory}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] px-1.5 ${getRiskColor(fund.riskometer)}`}>
                            {fund.riskometer}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{fund.fundHouse}</p>

                        {/* Direct vs Regular ER */}
                        <div className="mt-2 grid grid-cols-2 gap-2 max-w-xs">
                          <div className="rounded-lg bg-emerald-100/50 px-2.5 py-1.5 dark:bg-emerald-950/20">
                            <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">DIRECT</p>
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{fund.directExpenseRatio}%</p>
                          </div>
                          <div className="rounded-lg bg-red-100/50 px-2.5 py-1.5 dark:bg-red-950/20">
                            <p className="text-[10px] font-medium text-red-700 dark:text-red-400">REGULAR</p>
                            <p className="text-sm font-bold text-red-700 dark:text-red-400">{fund.regularExpenseRatio}%</p>
                          </div>
                        </div>

                        {/* Savings callout + NAV */}
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <span className="rounded-md bg-amber-100/50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                            Save {expDiff} bps/yr in Direct
                          </span>
                          <span className="text-xs text-muted-foreground">
                            NAV: ₹{fund.directNav.toFixed(2)}
                          </span>
                          {liveNav && (
                            <Badge className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                              <Radio className="h-2.5 w-2.5 animate-pulse" />
                              Live: ₹{parseFloat(liveNav.nav).toFixed(2)}
                            </Badge>
                          )}
                        </div>

                        {/* Notes */}
                        {isEditing ? (
                          <div className="mt-2 flex items-end gap-2">
                            <Textarea
                              value={notesValue}
                              onChange={(e) => setNotesValue(e.target.value)}
                              placeholder="Add your notes about this fund..."
                              className="text-xs min-h-[60px]"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setEditingNotes(null)} className="h-8 w-8 p-0">
                                <X className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" onClick={() => handleSaveNotes(item.id)} className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="mt-2 cursor-pointer group"
                            onClick={() => { setEditingNotes(item.id); setNotesValue(item.notes || '') }}
                          >
                            {item.notes ? (
                              <p className="text-xs text-muted-foreground italic bg-muted/50 rounded px-2 py-1 group-hover:bg-muted transition-colors">
                                📝 {item.notes}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                                + Add notes
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddToPortfolio(item)}
                          disabled={addingToPortfolio === item.fundId}
                          className="gap-1 text-xs h-7"
                        >
                          {addingToPortfolio === item.fundId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Briefcase className="h-3 w-3" />
                          )}
                          Portfolio
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddToCompare(item.fundId)}
                          className="gap-1 text-xs h-7"
                        >
                          <GitCompareArrows className="h-3 w-3" />
                          Compare
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditingNotes(item.id); setNotesValue(item.notes || '') }}
                          className="gap-1 text-xs h-7"
                        >
                          <StickyNote className="h-3 w-3" />
                          Notes
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { removeFromWatchlist(item.id); toast.success('Removed from watchlist') }}
                          className="gap-1 text-xs h-7 text-muted-foreground hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </AnimatePresence>
    </div>
  )
}
