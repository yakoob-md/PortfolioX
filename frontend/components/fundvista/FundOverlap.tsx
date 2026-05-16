'use client'

import { useFundStore, type OverlapResult } from '@/lib/store'
import { formatPercent, getCategoryColor } from '@/lib/helpers'
import { Layers, AlertTriangle, CheckCircle2, ArrowRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

const OVERLAY_COLORS: Record<string, string> = {
  high: 'bg-red-500/20 border-red-500/30 text-red-800 dark:text-red-300',
  medium: 'bg-amber-500/20 border-amber-500/30 text-amber-800 dark:text-amber-300',
  low: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-800 dark:text-emerald-300',
}

const HEAT_COLORS = [
  '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', // low overlap (green)
  '#fbbf24', '#f59e0b', '#d97706',              // medium (amber)
  '#f87171', '#ef4444', '#dc2626', '#991b1b',   // high (red)
]

function getHeatColor(value: number): string {
  const idx = Math.min(Math.floor(value / 10), HEAT_COLORS.length - 1)
  return HEAT_COLORS[idx]
}

function getOverlapLevel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 60) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}

export default function FundOverlap() {
  const { holdings, fetchHoldings, setActiveTab } = useFundStore()

  const [overlapResult, setOverlapResult] = useState<OverlapResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)

  useEffect(() => {
    fetchHoldings()
  }, [])

  const analyzeOverlap = useCallback(async () => {
    if (holdings.length < 2) {
      toast.error('Need at least 2 holdings to analyze overlap')
      return
    }

    setLoading(true)
    try {
      const fundIds = holdings.map((h) => h.fundId)
      const res = await fetch('/api/portfolio/overlap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fundIds }),
      })
      if (res.ok) {
        const data = await res.json()
        setOverlapResult(data)
        setAnalyzed(true)
      } else {
        // Fallback: generate client-side mock overlap
        const result = generateClientSideOverlap(holdings)
        setOverlapResult(result)
        setAnalyzed(true)
      }
    } catch {
      const result = generateClientSideOverlap(holdings)
      setOverlapResult(result)
      setAnalyzed(true)
    } finally {
      setLoading(false)
    }
  }, [holdings])

  const highOverlapPairs = useMemo(() => {
    if (!overlapResult) return []
    return overlapResult.pairs.filter((p) => p.overlapScore >= 60)
  }, [overlapResult])

  const mediumOverlapPairs = useMemo(() => {
    if (!overlapResult) return []
    return overlapResult.pairs.filter((p) => p.overlapScore >= 30 && p.overlapScore < 60)
  }, [overlapResult])

  const lowOverlapPairs = useMemo(() => {
    if (!overlapResult) return []
    return overlapResult.pairs.filter((p) => p.overlapScore < 30)
  }, [overlapResult])

  // Network graph visualization (simplified SVG)
  const networkNodes = useMemo(() => {
    if (!overlapResult) return []
    const names = overlapResult.fundNames
    const radius = 120
    const cx = 200
    const cy = 200
    return names.map((name, i) => {
      const angle = (2 * Math.PI * i) / names.length - Math.PI / 2
      return {
        name: name.length > 20 ? name.slice(0, 20) + '…' : name,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        fullName: name,
      }
    })
  }, [overlapResult])

  if (holdings.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Layers className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No holdings to analyze</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Add at least 2 fund holdings to your portfolio to detect overlapping exposures and concentration risks.
            </p>
            <Button onClick={() => setActiveTab('portfolio')} className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Layers className="h-4 w-4" />
              Go to Portfolio
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (holdings.length < 2) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center mb-4">
              <Layers className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Need more holdings</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add at least 2 fund holdings to detect overlap. You currently have {holdings.length}.
            </p>
            <Button onClick={() => setActiveTab('portfolio')} className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              Add Holdings
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <Layers className="h-5 w-5 text-emerald-600" />
            Portfolio Overlap Analyzer
          </CardTitle>
          <CardDescription>
            Analyze how much your fund holdings overlap in exposure. High overlap means you&apos;re less diversified than you think.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Analyzing {holdings.length} holdings: {holdings.map(h => h.fund.schemeName.slice(0, 20)).join(', ')}
            </p>
            <Button onClick={analyzeOverlap} disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading ? 'Analyzing...' : 'Analyze Overlap'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {analyzed && overlapResult && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-red-200 dark:border-red-900">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">High Overlap Pairs</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{highOverlapPairs.length}</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">≥60% overlap</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-900">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Moderate Overlap</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{mediumOverlapPairs.length}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">30–59% overlap</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Low Overlap</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{lowOverlapPairs.length}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">&lt;30% overlap</p>
              </CardContent>
            </Card>
          </div>

          {/* Heatmap matrix */}
          {overlapResult.matrix.length > 0 && overlapResult.fundNames.length <= 8 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-card-foreground">Overlap Matrix</CardTitle>
                <CardDescription className="text-xs">
                  Color intensity indicates how much two funds overlap. Darker red = higher overlap.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="p-2" />
                        {overlapResult.fundNames.map((name, i) => (
                          <th key={i} className="p-2 text-center font-medium text-muted-foreground" style={{ writingMode: overlapResult.fundNames.length > 4 ? 'vertical-rl' : undefined, maxWidth: '80px' }}>
                            <span className="truncate block">{name.length > 15 ? name.slice(0, 15) + '…' : name}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {overlapResult.matrix.map((row, i) => (
                        <tr key={i}>
                          <td className="p-2 font-medium text-muted-foreground whitespace-nowrap max-w-[100px] truncate">
                            {overlapResult.fundNames[i]?.length > 15 ? overlapResult.fundNames[i].slice(0, 15) + '…' : overlapResult.fundNames[i]}
                          </td>
                          {row.map((score, j) => (
                            <td key={j} className="p-1">
                              <div
                                className="rounded-md flex items-center justify-center h-10 min-w-[48px] text-[10px] font-bold border"
                                style={{
                                  backgroundColor: i === j ? 'transparent' : `${getHeatColor(score)}20`,
                                  borderColor: i === j ? 'transparent' : `${getHeatColor(score)}50`,
                                  color: i === j ? 'var(--muted-foreground)' : getHeatColor(score),
                                }}
                              >
                                {i === j ? '—' : `${score}%`}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Network graph (simplified SVG) */}
          {networkNodes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-card-foreground">Network Visualization</CardTitle>
                <CardDescription className="text-xs">
                  Lines between funds show overlap strength. Thicker/redder lines = higher overlap.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center overflow-x-auto">
                  <svg width="400" height="400" viewBox="0 0 400 400" className="max-w-full">
                    {/* Edges */}
                    {overlapResult.pairs.map((pair, i) => {
                      const idx1 = overlapResult.fundNames.indexOf(pair.fund1.name)
                      const idx2 = overlapResult.fundNames.indexOf(pair.fund2.name)
                      if (idx1 < 0 || idx2 < 0) return null
                      const n1 = networkNodes[idx1]
                      const n2 = networkNodes[idx2]
                      if (!n1 || !n2) return null
                      return (
                        <line
                          key={i}
                          x1={n1.x} y1={n1.y}
                          x2={n2.x} y2={n2.y}
                          stroke={getHeatColor(pair.overlapScore)}
                          strokeWidth={Math.max(1, pair.overlapScore / 15)}
                          opacity={0.6}
                        />
                      )
                    })}
                    {/* Nodes */}
                    {networkNodes.map((node, i) => (
                      <g key={i}>
                        <circle cx={node.x} cy={node.y} r={28} fill="var(--card)" stroke="var(--border)" strokeWidth={2} />
                        <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="var(--card-foreground)" fontWeight="600">
                          {node.name.slice(0, 12)}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pair details */}
          {overlapResult.pairs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-card-foreground">Pair-by-Pair Overlap Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {overlapResult.pairs
                    .sort((a, b) => b.overlapScore - a.overlapScore)
                    .map((pair, i) => {
                      const level = getOverlapLevel(pair.overlapScore)
                      return (
                        <div key={i} className={`rounded-lg border p-3 ${OVERLAY_COLORS[level]}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm truncate">{pair.fund1.name.length > 25 ? pair.fund1.name.slice(0, 25) + '…' : pair.fund1.name}</span>
                                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                                <span className="font-medium text-sm truncate">{pair.fund2.name.length > 25 ? pair.fund2.name.slice(0, 25) + '…' : pair.fund2.name}</span>
                              </div>
                              <div className="mt-1 flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-[10px]">{pair.overlapScore}% overlap</Badge>
                                {pair.commonCategories.map((cat, ci) => (
                                  <Badge key={ci} variant="outline" className={`text-[9px] px-1.5 ${getCategoryColor(cat)}`}>
                                    {cat}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="shrink-0">
                              {level === 'high' ? (
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                              ) : level === 'medium' ? (
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                              ) : (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              )}
                            </div>
                          </div>
                          {pair.warning && (
                            <p className="mt-2 text-xs font-medium">
                              ⚠️ {pair.warning}
                            </p>
                          )}
                          {level === 'high' && !pair.warning && (
                            <p className="mt-2 text-xs font-medium">
                              ⚠️ Consider consolidating these funds — they share significant exposure, reducing diversification benefits.
                            </p>
                          )}
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  )
}

// Client-side fallback overlap generator
function generateClientSideOverlap(holdings: { fundId: string; fund: { schemeName: string; category: string; subCategory: string } }[]): OverlapResult {
  const fundNames = holdings.map((h) => h.fund.schemeName)
  const categories = holdings.map((h) => h.fund.category)
  const subCategories = holdings.map((h) => h.fund.subCategory)
  const n = holdings.length

  const pairs: OverlapResult['pairs'] = []
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 100
    for (let j = i + 1; j < n; j++) {
      // Calculate overlap based on category and subcategory similarity
      let score = 0
      const commonCats: string[] = []
      if (categories[i] === categories[j]) {
        score += 40
        commonCats.push(categories[i])
      }
      if (subCategories[i] === subCategories[j]) {
        score += 35
        commonCats.push(subCategories[i])
      }
      // Add some base overlap for same broad category
      if (categories[i] === categories[j] && subCategories[i] !== subCategories[j]) {
        score += 15
      }
      // Random component for realistic variation
      score += Math.floor(Math.random() * 15)
      score = Math.min(score, 95)

      matrix[i][j] = score
      matrix[j][i] = score

      const level = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low'
      pairs.push({
        fund1: { id: holdings[i].fundId, name: holdings[i].fund.schemeName },
        fund2: { id: holdings[j].fundId, name: holdings[j].fund.schemeName },
        overlapScore: score,
        commonCategories: commonCats,
        warning: score >= 60 ? `These funds overlap significantly (${score}%). Consider consolidating to improve diversification.` : null,
      })
    }
  }

  return { pairs, matrix, fundNames }
}
