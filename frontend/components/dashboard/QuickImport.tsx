'use client'

import { useFundStore, type FundData } from '@/lib/store'
import { formatCurrency } from '@/lib/helpers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  FileUp,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  PackagePlus,
  Trash2,
} from 'lucide-react'
import { useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

type MatchConfidence = 'exact' | 'partial' | 'none'

interface MatchedFund {
  inputLine: string
  fund: FundData | null
  confidence: MatchConfidence
  selected: boolean
  planType: 'direct' | 'regular'
  investedAmount: number
  currentAmount: number
}

// ── Fuzzy Matching Utilities ──────────────────────────────────────────

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(str: string): string[] {
  return normalize(str).split(' ').filter(Boolean)
}

/**
 * Simple token-based similarity score.
 * Computes the fraction of query tokens that appear in the target string.
 * Returns 0–1 where 1 means all query tokens found.
 */
function tokenSimilarity(query: string, target: string): number {
  const qTokens = tokenize(query)
  const tNorm = normalize(target)
  if (qTokens.length === 0) return 0

  let matched = 0
  for (const token of qTokens) {
    if (tNorm.includes(token)) matched++
  }
  return matched / qTokens.length
}

/**
 * Levenshtein distance (capped at maxDist for perf).
 */
function levenshtein(a: string, b: string, maxDist = 5): number {
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1
  const la = a.length
  const lb = b.length
  const dp: number[][] = Array.from({ length: la + 1 }, () => Array(lb + 1).fill(0))
  for (let i = 0; i <= la; i++) dp[i][0] = i
  for (let j = 0; j <= lb; j++) dp[0][j] = j
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }
  return dp[la][lb]
}

/**
 * Combined fuzzy score for matching a query against a fund name.
 * Returns 0–1.
 */
function fuzzyScore(query: string, fundName: string): number {
  const q = normalize(query)
  const f = normalize(fundName)

  // Exact match
  if (q === f) return 1.0

  // Token overlap
  const tokenScore = tokenSimilarity(query, fundName)

  // Normalized edit distance on the full strings
  const maxLen = Math.max(q.length, f.length, 1)
  const editDist = levenshtein(q, f, 10)
  const editScore = Math.max(0, 1 - editDist / maxLen)

  // Weight: token overlap matters more for partial queries
  return 0.6 * tokenScore + 0.4 * editScore
}

function matchFund(inputLine: string, funds: FundData[]): { fund: FundData | null; confidence: MatchConfidence } {
  const trimmed = inputLine.trim()
  if (!trimmed) return { fund: null, confidence: 'none' }

  // 1. Try exact ISIN match (directIsin or regularIsin)
  const isinUpper = trimmed.toUpperCase()
  const isinFund = funds.find(
    f => f.directIsin?.toUpperCase() === isinUpper || f.regularIsin?.toUpperCase() === isinUpper
  )
  if (isinFund) return { fund: isinFund, confidence: 'exact' }

  // 2. Try exact scheme name match (case-insensitive)
  const normInput = normalize(trimmed)
  const exactFund = funds.find(f => normalize(f.schemeName) === normInput)
  if (exactFund) return { fund: exactFund, confidence: 'exact' }

  // 3. Fuzzy match - find best scoring fund
  let bestFund: FundData | null = null
  let bestScore = 0

  for (const fund of funds) {
    const score = fuzzyScore(trimmed, fund.schemeName)
    if (score > bestScore) {
      bestScore = score
      bestFund = fund
    }
  }

  if (bestScore >= 0.75) return { fund: bestFund, confidence: 'exact' }
  if (bestScore >= 0.45) return { fund: bestFund, confidence: 'partial' }
  return { fund: null, confidence: 'none' }
}

// ── Confidence Badge ──────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: MatchConfidence }) {
  switch (confidence) {
    case 'exact':
      return (
        <Badge className="gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-800 text-[10px] px-1.5">
          <CheckCircle2 className="h-3 w-3" />
          Exact Match
        </Badge>
      )
    case 'partial':
      return (
        <Badge className="gap-1 bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400 dark:border-amber-800 text-[10px] px-1.5">
          <AlertTriangle className="h-3 w-3" />
          Partial Match
        </Badge>
      )
    case 'none':
      return (
        <Badge className="gap-1 bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400 dark:border-red-800 text-[10px] px-1.5">
          <XCircle className="h-3 w-3" />
          No Match
        </Badge>
      )
  }
}

// ── Props ─────────────────────────────────────────────────────────────

interface QuickImportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ── Component ─────────────────────────────────────────────────────────

const DEFAULT_INVESTED = 50000

export default function QuickImport({ open, onOpenChange }: QuickImportProps) {
  const { funds, addHolding } = useFundStore()

  const [rawInput, setRawInput] = useState('')
  const [matchedFunds, setMatchedFunds] = useState<MatchedFund[]>([])
  const [hasMatched, setHasMatched] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [globalPlanType, setGlobalPlanType] = useState<'direct' | 'regular'>('regular')
  const [globalInvestedAmount, setGlobalInvestedAmount] = useState<string>(String(DEFAULT_INVESTED))

  // Reset state when dialog opens/closes
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setRawInput('')
      setMatchedFunds([])
      setHasMatched(false)
      setIsAdding(false)
    }
    onOpenChange(nextOpen)
  }, [onOpenChange])

  // Match all lines against fund database
  const handleMatch = useCallback(() => {
    const lines = rawInput
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)

    if (lines.length === 0) {
      toast.error('Please enter at least one fund name or ISIN')
      return
    }

    const invested = parseFloat(globalInvestedAmount) || DEFAULT_INVESTED
    const current = Math.round(invested * 1.15)

    const results: MatchedFund[] = lines.map(line => {
      const { fund, confidence } = matchFund(line, funds)
      return {
        inputLine: line,
        fund,
        confidence,
        selected: confidence !== 'none',
        planType: globalPlanType,
        investedAmount: invested,
        currentAmount: current,
      }
    })

    setMatchedFunds(results)
    setHasMatched(true)

    const exactCount = results.filter(r => r.confidence === 'exact').length
    const partialCount = results.filter(r => r.confidence === 'partial').length
    const noneCount = results.filter(r => r.confidence === 'none').length

    toast.success(
      `Matched ${exactCount} exact, ${partialCount} partial, ${noneCount} not found`
    )
  }, [rawInput, funds, globalPlanType, globalInvestedAmount])

  // Toggle individual selection
  const toggleSelection = useCallback((index: number) => {
    setMatchedFunds(prev =>
      prev.map((m, i) => (i === index ? { ...m, selected: !m.selected } : m))
    )
  }, [])

  // Update individual fund settings
  const updateFundSetting = useCallback(
    (index: number, field: 'planType' | 'investedAmount', value: string | number) => {
      setMatchedFunds(prev =>
        prev.map((m, i) => {
          if (i !== index) return m
          if (field === 'planType') return { ...m, planType: value as 'direct' | 'regular' }
          if (field === 'investedAmount') {
            const inv = typeof value === 'string' ? parseFloat(value) || 0 : value
            return { ...m, investedAmount: inv, currentAmount: Math.round(inv * 1.15) }
          }
          return m
        })
      )
    },
    []
  )

  // Remove a fund from the matched list
  const removeFund = useCallback((index: number) => {
    setMatchedFunds(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Select/deselect all matched (non-none) funds
  const toggleSelectAll = useCallback(() => {
    const allSelected = matchedFunds
      .filter(m => m.confidence !== 'none')
      .every(m => m.selected)
    setMatchedFunds(prev =>
      prev.map(m =>
        m.confidence !== 'none' ? { ...m, selected: !allSelected } : m
      )
    )
  }, [matchedFunds])

  // Bulk add selected funds to portfolio
  const handleBulkAdd = useCallback(async () => {
    const toAdd = matchedFunds.filter(m => m.selected && m.fund)
    if (toAdd.length === 0) {
      toast.error('No funds selected to add')
      return
    }

    setIsAdding(true)
    try {
      const store = useFundStore.getState()
      for (const item of toAdd) {
        if (!item.fund) continue
        const nav = item.planType === 'direct' ? item.fund.directNav : item.fund.regularNav
        await store.addHolding({
          fundId: item.fund.id,
          planType: item.planType,
          investedAmount: item.investedAmount,
          currentAmount: item.currentAmount,
          units: item.currentAmount / nav,
          purchaseDate: '2023-01-15',
        })
      }
      toast.success(`${toAdd.length} fund${toAdd.length > 1 ? 's' : ''} added to portfolio!`)
      handleOpenChange(false)
    } catch {
      toast.error('Failed to add some funds. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }, [matchedFunds, handleOpenChange])

  // Computed stats
  const stats = useMemo(() => {
    const matched = matchedFunds.filter(m => m.confidence !== 'none')
    const selected = matchedFunds.filter(m => m.selected && m.fund)
    const totalInvested = selected.reduce((s, m) => s + m.investedAmount, 0)
    return {
      exactCount: matchedFunds.filter(m => m.confidence === 'exact').length,
      partialCount: matchedFunds.filter(m => m.confidence === 'partial').length,
      noneCount: matchedFunds.filter(m => m.confidence === 'none').length,
      selectedCount: selected.length,
      totalInvested,
    }
  }, [matchedFunds])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Quick Import
          </DialogTitle>
          <DialogDescription>
            Paste fund names (one per line) or ISINs to bulk-add holdings to your portfolio.
            We&apos;ll match them against our database and you can confirm before adding.
          </DialogDescription>
        </DialogHeader>

        {!hasMatched ? (
          /* ── Step 1: Input Phase ──────────────────────────────── */
          <div className="space-y-4 flex-1 min-h-0">
            <div className="space-y-2">
              <Label>Fund Names or ISINs</Label>
              <Textarea
                placeholder={`SBI Bluechip Fund\nHDFC Mid-Cap Opportunities Fund\nINF200K01YY8\nAxis Long Term Equity Fund\nParag Parikh Flexi Cap Fund`}
                className="min-h-[160px] font-mono text-sm"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter one fund name or ISIN per line. Supports partial names and exact ISIN codes.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Plan Type</Label>
                <Select value={globalPlanType} onValueChange={(v) => setGlobalPlanType(v as 'direct' | 'regular')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular (with commission)</SelectItem>
                    <SelectItem value="direct">Direct (no commission)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Default: Regular — most investors discover they&apos;re in Regular plans</p>
              </div>
              <div className="space-y-2">
                <Label>Default Invested Amount (₹)</Label>
                <Input
                  type="number"
                  value={globalInvestedAmount}
                  onChange={(e) => setGlobalInvestedAmount(e.target.value)}
                  min={500}
                  step={10000}
                />
                <p className="text-[10px] text-muted-foreground">Current value auto-set to invested × 1.15</p>
              </div>
            </div>
          </div>
        ) : (
          /* ── Step 2: Review & Confirm Phase ───────────────────── */
          <div className="space-y-3 flex-1 min-h-0">
            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <Badge variant="outline" className="gap-1 border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> {stats.exactCount} Exact
              </Badge>
              <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" /> {stats.partialCount} Partial
              </Badge>
              <Badge variant="outline" className="gap-1 border-red-300 text-red-700 dark:border-red-800 dark:text-red-400">
                <XCircle className="h-3 w-3" /> {stats.noneCount} No Match
              </Badge>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-muted-foreground">
                {stats.selectedCount} selected · Total invested: {formatCurrency(stats.totalInvested)}
              </span>
            </div>

            {/* Select all toggle */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={
                    matchedFunds.filter(m => m.confidence !== 'none').length > 0 &&
                    matchedFunds.filter(m => m.confidence !== 'none').every(m => m.selected)
                  }
                  onCheckedChange={toggleSelectAll}
                />
                <Label htmlFor="select-all" className="text-xs cursor-pointer">
                  Select all matched
                </Label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs text-muted-foreground"
                onClick={() => {
                  setMatchedFunds([])
                  setHasMatched(false)
                }}
              >
                ← Edit Input
              </Button>
            </div>

            {/* Matched funds list */}
            <ScrollArea className="max-h-[340px] pr-1">
              <div className="space-y-2">
                {matchedFunds.map((item, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border p-3 transition-colors ${
                      item.confidence === 'none'
                        ? 'border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-950/10'
                        : item.selected
                        ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/10'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={() => toggleSelection(index)}
                        disabled={item.confidence === 'none'}
                        className="mt-0.5"
                      />

                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Input line */}
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground truncate">
                            &quot;{item.inputLine}&quot;
                          </p>
                          <ConfidenceBadge confidence={item.confidence} />
                        </div>

                        {/* Matched fund info */}
                        {item.fund && (
                          <div>
                            <p className="text-sm font-medium text-foreground truncate">
                              → {item.fund.schemeName}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {item.fund.fundHouse} · {item.fund.subCategory}
                            </p>
                          </div>
                        )}

                        {/* Per-fund settings (only for matched & selected) */}
                        {item.fund && item.selected && (
                          <div className="flex flex-wrap items-center gap-3 pt-1.5">
                            <div className="flex items-center gap-1.5">
                              <Label className="text-[10px] text-muted-foreground">Plan:</Label>
                              <Select
                                value={item.planType}
                                onValueChange={(v) => updateFundSetting(index, 'planType', v)}
                              >
                                <SelectTrigger className="h-7 w-[130px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="regular">Regular</SelectItem>
                                  <SelectItem value="direct">Direct</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Label className="text-[10px] text-muted-foreground">Invested ₹</Label>
                              <Input
                                type="number"
                                className="h-7 w-[100px] text-xs"
                                value={item.investedAmount}
                                onChange={(e) => updateFundSetting(index, 'investedAmount', e.target.value)}
                                min={500}
                                step={10000}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              Current: {formatCurrency(item.currentAmount)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Remove button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-red-600"
                        onClick={() => removeFund(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {!hasMatched ? (
            <>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleMatch}
                disabled={!rawInput.trim()}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Search className="h-4 w-4" />
                Match Funds
              </Button>
            </>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleBulkAdd}
                disabled={stats.selectedCount === 0 || isAdding}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PackagePlus className="h-4 w-4" />
                )}
                Add {stats.selectedCount} Fund{stats.selectedCount !== 1 ? 's' : ''}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
