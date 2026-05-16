'use client'

import { useFundStore, type HoldingData } from '@/lib/store'
import { formatCurrency } from '@/lib/helpers'
import { Download, Upload, Link, Copy, FileJson, FileSpreadsheet, Check, AlertTriangle, Eye, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface PreviewHolding {
  fundName: string
  fundHouse: string
  planType: string
  investedAmount: number
  currentAmount: number
  units: number
  purchaseDate: string
}

export default function PortfolioExport() {
  const { holdings, fetchHoldings, addHolding, sessionId } = useFundStore()

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewHolding[]>([])
  const [importJson, setImportJson] = useState('')
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchHoldings()
  }, [])

  // Export as JSON
  const exportJson = useCallback(() => {
    if (holdings.length === 0) {
      toast.error('No holdings to export')
      return
    }

    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      sessionId,
      holdings: holdings.map((h) => ({
        fundId: h.fundId,
        fundName: h.fund.schemeName,
        fundHouse: h.fund.fundHouse,
        category: h.fund.category,
        subCategory: h.fund.subCategory,
        planType: h.planType,
        investedAmount: h.investedAmount,
        currentAmount: h.currentAmount,
        units: h.units,
        purchaseDate: h.purchaseDate,
        directExpenseRatio: h.fund.directExpenseRatio,
        regularExpenseRatio: h.fund.regularExpenseRatio,
        directNav: h.fund.directNav,
        regularNav: h.fund.regularNav,
      })),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fundvista-portfolio-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Portfolio exported as JSON')
  }, [holdings, sessionId])

  // Export as CSV
  const exportCsv = useCallback(() => {
    if (holdings.length === 0) {
      toast.error('No holdings to export')
      return
    }

    const headers = [
      'Fund Name', 'Fund House', 'Category', 'Sub-Category', 'Plan Type',
      'Invested Amount', 'Current Value', 'Units', 'Purchase Date',
      'Direct ER (%)', 'Regular ER (%)', 'Direct NAV', 'Regular NAV',
    ]
    const rows = holdings.map((h) => [
      `"${h.fund.schemeName}"`,
      `"${h.fund.fundHouse}"`,
      h.fund.category,
      h.fund.subCategory,
      h.planType,
      h.investedAmount,
      h.currentAmount,
      h.units.toFixed(4),
      h.purchaseDate || '',
      h.fund.directExpenseRatio,
      h.fund.regularExpenseRatio,
      h.fund.directNav,
      h.fund.regularNav,
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fundvista-portfolio-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Portfolio exported as CSV')
  }, [holdings])

  // Share via copyable link
  const shareLink = useCallback(() => {
    if (holdings.length === 0) {
      toast.error('No holdings to share')
      return
    }

    try {
      const data = holdings.map((h) => ({
        f: h.fundId,
        p: h.planType,
        i: h.investedAmount,
        c: h.currentAmount,
        u: Math.round(h.units * 100) / 100,
        d: h.purchaseDate,
      }))
      const encoded = btoa(JSON.stringify({ h: data, v: 1 }))
      const link = `${window.location.origin}?portfolio=${encoded}`

      navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Shareable link copied to clipboard')
    } catch {
      toast.error('Failed to create share link')
    }
  }, [holdings])

  // Parse and preview import data
  const parseAndPreview = useCallback((jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr)
      const items: PreviewHolding[] = []

      // Support both direct array and wrapped format
      const rawHoldings = Array.isArray(data) ? data : (data.holdings || [])

      for (const h of rawHoldings) {
        items.push({
          fundName: h.fundName || h.schemeName || 'Unknown Fund',
          fundHouse: h.fundHouse || '',
          planType: h.planType || 'regular',
          investedAmount: parseFloat(h.investedAmount) || 0,
          currentAmount: parseFloat(h.currentAmount) || 0,
          units: parseFloat(h.units) || 0,
          purchaseDate: h.purchaseDate || new Date().toISOString().split('T')[0],
        })
      }

      if (items.length === 0) {
        toast.error('No valid holdings found in import data')
        return
      }

      setPreviewData(items)
      setPreviewOpen(true)
    } catch {
      toast.error('Invalid JSON format')
    }
  }, [])

  // Import from JSON file
  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        setImportJson(content)
        parseAndPreview(content)
      } catch {
        toast.error('Failed to read file')
      }
    }
    reader.readAsText(file)
  }, [parseAndPreview])

  // Confirm import
  const confirmImport = useCallback(async () => {
    // For preview data, we can only add custom holdings since fund IDs may not match
    for (const item of previewData) {
      try {
        await fetch('/api/holdings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            fundId: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            planType: item.planType,
            investedAmount: item.investedAmount,
            currentAmount: item.currentAmount,
            units: item.units,
            purchaseDate: item.purchaseDate,
            customFundName: item.fundName,
            customFundHouse: item.fundHouse,
          }),
        })
      } catch {
        // Continue importing others even if one fails
      }
    }

    await fetchHoldings()
    setPreviewOpen(false)
    setImportJson('')
    toast.success(`Imported ${previewData.length} holdings`)
  }, [previewData, sessionId, fetchHoldings])

  // Handle URL portfolio parameter
  const urlProcessed = useRef(false)
  useEffect(() => {
    if (urlProcessed.current) return
    urlProcessed.current = true
    const params = new URLSearchParams(window.location.search)
    const portfolioParam = params.get('portfolio')
    if (portfolioParam) {
      // Use microtask to avoid setting state synchronously in effect
      queueMicrotask(() => {
        try {
          const decoded = JSON.parse(atob(portfolioParam))
          if (decoded.h && Array.isArray(decoded.h)) {
            const items: PreviewHolding[] = decoded.h.map((h: Record<string, unknown>) => ({
              fundName: 'Imported Fund',
              fundHouse: '',
              planType: h.p || 'regular',
              investedAmount: h.i || 0,
              currentAmount: h.c || 0,
              units: h.u || 0,
              purchaseDate: h.d || '',
            }))
            setPreviewData(items)
            setPreviewOpen(true)
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname)
          }
        } catch {
          // Invalid portfolio parameter, ignore
        }
      })
    }
  }, [])

  const totalInvested = holdings.reduce((s, h) => s + h.investedAmount, 0)
  const totalCurrent = holdings.reduce((s, h) => s + h.currentAmount, 0)

  return (
    <div className="space-y-6">
      {/* Portfolio summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <FileJson className="h-5 w-5 text-emerald-600" />
            Export & Import Portfolio
          </CardTitle>
          <CardDescription>
            Download your portfolio data, import from a file, or share with a link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {holdings.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Holdings</p>
                <p className="text-lg font-bold text-foreground">{holdings.length}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Total Invested</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalInvested)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Current Value</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalCurrent)}</p>
              </div>
            </div>
          )}

          {/* Export buttons */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Export</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={exportJson} disabled={holdings.length === 0} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <FileJson className="h-4 w-4" />
                Export as JSON
              </Button>
              <Button onClick={exportCsv} disabled={holdings.length === 0} variant="outline" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Export as CSV
              </Button>
              <Button onClick={shareLink} disabled={holdings.length === 0} variant="outline" className="gap-2">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Share via Link'}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Import section */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Import</p>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import from JSON File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </div>

              <div className="rounded-lg border border-dashed p-4 space-y-2">
                <p className="text-xs text-muted-foreground">Or paste JSON directly:</p>
                <textarea
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  placeholder='{"holdings": [{"fundName": "...", "planType": "direct", "investedAmount": 100000, ...}]}'
                  className="w-full h-24 rounded-md border bg-background px-3 py-2 text-xs font-mono resize-y"
                />
                <Button
                  size="sm"
                  onClick={() => { if (importJson.trim()) parseAndPreview(importJson) }}
                  disabled={!importJson.trim()}
                  className="gap-1 text-xs"
                >
                  <Eye className="h-3 w-3" />
                  Preview & Import
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import format reference */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Import Format Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted/50 rounded-lg p-4 overflow-x-auto text-muted-foreground">
{`{
  "holdings": [
    {
      "fundName": "HDFC Flexi Cap Fund",
      "fundHouse": "HDFC AMC",
      "planType": "direct",
      "investedAmount": 100000,
      "currentAmount": 135000,
      "units": 450.25,
      "purchaseDate": "2022-06-15"
    }
  ]
}`}
          </pre>
          <p className="text-xs text-muted-foreground mt-2">
            Required fields: <code className="bg-muted px-1 rounded">fundName</code>, <code className="bg-muted px-1 rounded">investedAmount</code>, <code className="bg-muted px-1 rounded">currentAmount</code>
          </p>
        </CardContent>
      </Card>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-emerald-600" />
              Import Preview
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {previewData.length > 0 && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    Found {previewData.length} holding{previewData.length !== 1 ? 's' : ''} to import
                  </p>
                </div>
                <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                  Review the holdings below before confirming import.
                </p>
              </div>
            )}
            {previewData.map((h, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{h.fundName}</p>
                  <p className="text-muted-foreground">
                    {h.planType} · {formatCurrency(h.investedAmount)} → {formatCurrency(h.currentAmount)}
                  </p>
                </div>
                <Badge variant="outline" className="text-[9px] ml-2 shrink-0">
                  {h.planType}
                </Badge>
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button onClick={confirmImport} size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Upload className="h-3.5 w-3.5" />
              Import {previewData.length} Holding{previewData.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
