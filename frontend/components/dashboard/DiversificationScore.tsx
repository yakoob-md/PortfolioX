'use client'

import { useFundStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ShieldCheck, Loader2, Briefcase, Building2, PieChart, BarChart3,
  Lightbulb, AlertTriangle,
} from 'lucide-react'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

interface BreakdownItem {
  metric: string
  score: number
  maxScore: number
  description: string
}

interface DiversificationResult {
  overallScore: number
  grade: string
  breakdown: BreakdownItem[]
  suggestions: string[]
}

// Client-side fallback computation
function computeDiversification(holdings: any[]): DiversificationResult {
  const suggestions: string[] = []

  function normalizeCategory(category: string): 'equity' | 'debt' | 'hybrid' {
    const cat = category.toLowerCase()
    if (cat === 'equity' || cat === 'elss' || cat === 'index') return 'equity'
    if (cat === 'debt') return 'debt'
    return 'hybrid'
  }

  function calculateHHI(weights: number[]): number {
    const total = weights.reduce((a, b) => a + b, 0)
    if (total === 0) return 1
    return weights.reduce((sum, w) => sum + (w / total) ** 2, 0)
  }

  function getGradeLocal(score: number): string {
    if (score >= 90) return 'A+'
    if (score >= 80) return 'A'
    if (score >= 65) return 'B'
    if (score >= 50) return 'C'
    if (score >= 35) return 'D'
    return 'F'
  }

  const totalPortfolio = holdings.reduce((sum, h) => sum + h.currentAmount, 0)

  // 1. Category Diversity (30 pts)
  const categoryMap: Record<string, number> = {}
  for (const holding of holdings) {
    const cat = normalizeCategory(holding.fund.category)
    categoryMap[cat] = (categoryMap[cat] || 0) + holding.currentAmount
  }
  const categoryCount = Object.keys(categoryMap).length
  const categoryWeights = Object.values(categoryMap)
  const categoryHHI = calculateHHI(categoryWeights)

  let categoryScore = Math.min(30, categoryCount * 10)
  const categoryEvenness = categoryHHI < 1 ? (1 - categoryHHI) * 10 : 0
  categoryScore = Math.round(categoryScore * (0.7 + 0.3 * Math.min(1, categoryEvenness / 5)))
  categoryScore = Math.min(30, Math.max(0, categoryScore))

  if (categoryCount < 3) {
    suggestions.push(`Consider adding ${categoryCount === 1 ? 'debt and hybrid' : 'hybrid'} funds to diversify across asset classes`)
  }
  if (categoryHHI > 0.6) {
    suggestions.push('Your portfolio is concentrated in one category. Spread investments across equity, debt, and hybrid')
  }

  // 2. Fund House Diversity (20 pts)
  const fundHouseMap: Record<string, number> = {}
  for (const holding of holdings) {
    const house = holding.fund.fundHouse
    fundHouseMap[house] = (fundHouseMap[house] || 0) + holding.currentAmount
  }
  const fundHouseCount = Object.keys(fundHouseMap).length
  const fundHouseWeights = Object.values(fundHouseMap)
  const fundHouseHHI = calculateHHI(fundHouseWeights)

  let fundHouseScore: number
  if (fundHouseCount >= 5) fundHouseScore = 20
  else if (fundHouseCount >= 3) fundHouseScore = 15
  else if (fundHouseCount >= 2) fundHouseScore = 10
  else fundHouseScore = 5
  fundHouseScore = Math.round(fundHouseScore * (0.6 + 0.4 * Math.min(1, (1 - fundHouseHHI) * 2)))
  fundHouseScore = Math.min(20, Math.max(0, fundHouseScore))

  if (fundHouseCount === 1) {
    suggestions.push('All your funds are from a single AMC. Diversify across multiple fund houses to reduce manager risk')
  } else if (fundHouseHHI > 0.5) {
    const topHouse = Object.entries(fundHouseMap).sort(([, a], [, b]) => b - a)[0]
    suggestions.push(`${topHouse[0]} dominates your portfolio. Consider spreading to other AMCs`)
  }

  // 3. Sector Diversity (25 pts)
  const sectorMap: Record<string, number> = {}
  for (const holding of holdings) {
    if (holding.fund.topHoldings) {
      try {
        const parsed = JSON.parse(holding.fund.topHoldings)
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.sector && item.weight) {
              const sectorWeight = (Number(item.weight) / 100) * holding.currentAmount
              sectorMap[String(item.sector)] = (sectorMap[String(item.sector)] || 0) + sectorWeight
            }
          }
        }
      } catch { /* skip */ }
    }
  }

  const sectorCount = Object.keys(sectorMap).length
  const sectorWeights = Object.values(sectorMap)
  const sectorHHI = sectorWeights.length > 0 ? calculateHHI(sectorWeights) : 1

  let sectorScore: number
  if (sectorCount >= 8) sectorScore = 25
  else if (sectorCount >= 5) sectorScore = 18
  else if (sectorCount >= 3) sectorScore = 12
  else if (sectorCount >= 1) sectorScore = 6
  else {
    // If no sector data, estimate based on category diversity
    sectorScore = Math.min(15, categoryCount * 5)
  }
  
  if (sectorCount > 1) {
    sectorScore = Math.round(sectorScore * (0.6 + 0.4 * Math.min(1, (1 - sectorHHI) * 2.5)))
  }
  sectorScore = Math.min(25, Math.max(0, sectorScore))

  if (sectorCount < 5 && sectorCount > 0) {
    suggestions.push('Your portfolio has limited sector exposure. Consider funds that cover more sectors like Healthcare, IT, and FMCG')
  }

  // 4. Market Cap Diversity (25 pts)
  const marketCapMap: Record<string, number> = { 'Large Cap': 0, 'Mid Cap': 0, 'Small Cap': 0, 'Other': 0 }
  for (const holding of holdings) {
    const sub = (holding.fund.subCategory || '').toLowerCase()
    const amount = holding.currentAmount
    if (sub.includes('large')) marketCapMap['Large Cap'] += amount
    else if (sub.includes('mid')) marketCapMap['Mid Cap'] += amount
    else if (sub.includes('small')) marketCapMap['Small Cap'] += amount
    else marketCapMap['Other'] += amount
  }

  const marketCapCategories = Object.entries(marketCapMap).filter(([, v]) => v > 0)
  const marketCapCount = marketCapCategories.length
  const marketCapWeights = marketCapCategories.map(([, v]) => v)
  const marketCapHHI = marketCapWeights.length > 0 ? calculateHHI(marketCapWeights) : 1

  let marketCapScore: number
  if (marketCapCount >= 3) marketCapScore = 25
  else if (marketCapCount >= 2) marketCapScore = 16
  else marketCapScore = 8
  if (marketCapCount > 1) {
    marketCapScore = Math.round(marketCapScore * (0.6 + 0.4 * Math.min(1, (1 - marketCapHHI) * 2.5)))
  }
  marketCapScore = Math.min(25, Math.max(0, marketCapScore))

  if (marketCapCount < 3) {
    suggestions.push('Add exposure to different market cap segments (large, mid, small cap) for better diversification')
  }
  if (marketCapMap['Large Cap'] > totalPortfolio * 0.7) {
    suggestions.push('Portfolio is heavily tilted toward large caps. Consider adding mid and small cap funds')
  }

  const overallScore = categoryScore + fundHouseScore + sectorScore + marketCapScore
  const grade = getGradeLocal(overallScore)

  if (overallScore < 50) {
    suggestions.push('Your portfolio needs significant diversification improvement. Focus on adding different asset classes and fund houses')
  }
  if (holdings.length < 3) {
    suggestions.push('Consider adding more funds to your portfolio for better diversification')
  }
  if (holdings.length > 15) {
    suggestions.push('Too many funds may lead to over-diversification and diminished returns. Consider consolidating')
  }

  const breakdown = [
    {
      metric: 'Category Diversity',
      score: categoryScore,
      maxScore: 30,
      description: `Spread across ${categoryCount} asset categor${categoryCount === 1 ? 'y' : 'ies'} (Equity, Debt, Hybrid)`,
    },
    {
      metric: 'Fund House Diversity',
      score: fundHouseScore,
      maxScore: 20,
      description: `Invested across ${fundHouseCount} fund house${fundHouseCount === 1 ? '' : 's'}`,
    },
    {
      metric: 'Sector Diversity',
      score: sectorScore,
      maxScore: 25,
      description: sectorCount > 0
        ? `Exposure to ${sectorCount} sector${sectorCount === 1 ? '' : 's'}`
        : 'Sector data not available, estimated score',
    },
    {
      metric: 'Market Cap Diversity',
      score: marketCapScore,
      maxScore: 25,
      description: `Invested across ${marketCapCount} market cap segment${marketCapCount === 1 ? '' : 's'}`,
    },
  ]

  return {
    overallScore,
    grade,
    breakdown,
    suggestions: suggestions.slice(0, 6),
  }
}

function getGradeColor(grade: string): { bg: string; text: string; ring: string } {
  switch (grade) {
    case 'A+': return { bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400', ring: 'ring-emerald-500/30' }
    case 'A': return { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', ring: 'ring-emerald-500/20' }
    case 'B': return { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', ring: 'ring-amber-500/20' }
    case 'C': return { bg: 'bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', ring: 'ring-orange-500/20' }
    default: return { bg: 'bg-red-500/10', text: 'text-red-700 dark:text-red-400', ring: 'ring-red-500/20' }
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981'
  if (score >= 65) return '#f59e0b'
  if (score >= 50) return '#f97316'
  return '#ef4444'
}

// Large animated SVG semicircular gauge
function LargeScoreGauge({ score, size = 240 }: { score: number; size?: number }) {
  const radius = (size - 30) / 2
  const cx = size / 2
  const cy = size / 2 + 10
  const gaugeColor = getScoreColor(score)
  
  // Use motion values for perfectly synchronized animation
  const animatedScore = useSpring(0, { bounce: 0, duration: 1500 })
  
  useEffect(() => {
    animatedScore.set(score)
  }, [score, animatedScore])

  // Transform score to path coordinates
  const pathLength = useTransform(animatedScore, [0, 100], [0, 1])
  
  // Calculate indicator position
  const angle = useTransform(animatedScore, (s) => (180 - (s / 100) * 180) * (Math.PI / 180))
  const sx = useTransform(angle, (a) => cx + radius * Math.cos(a))
  const sy = useTransform(angle, (a) => cy - radius * Math.sin(a))

  const x1 = cx - radius
  const y1 = cy

  return (
    <div className="relative flex items-center justify-center overflow-visible" style={{ width: size, height: size / 2 + 20 }}>
      <svg
        width={size}
        height={size / 2 + 20}
        viewBox={`0 0 ${size} ${size / 2 + 20}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <path
          d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="currentColor"
          className="text-muted/10 dark:text-muted/5"
          strokeWidth={16}
          strokeLinecap="round"
        />

        {/* Animated Score Arc */}
        <motion.path
          d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={gaugeColor}
          strokeWidth={16}
          strokeLinecap="round"
          style={{ pathLength }}
        />

        {/* Ticks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const tickAngle = (180 - (tick / 100) * 180) * (Math.PI / 180)
          const innerR = radius - 18
          const outerR = radius + 10
          return (
            <line
              key={tick}
              x1={cx + innerR * Math.cos(tickAngle)}
              y1={cy - innerR * Math.sin(tickAngle)}
              x2={cx + outerR * Math.cos(tickAngle)}
              y2={cy - outerR * Math.sin(tickAngle)}
              className="stroke-muted-foreground/30"
              strokeWidth={1.5}
            />
          )
        })}

        {/* Synchronized Indicator Circle */}
        <motion.circle
          cx={sx}
          cy={sy}
          r={10}
          fill="white"
          stroke={gaugeColor}
          strokeWidth={4}
          style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }}
        />
      </svg>
    </div>
  )
}

// Animated counter
function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const startValue = 0
    const endValue = value

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / (duration * 1000), 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(startValue + (endValue - startValue) * eased))
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  return <span>{displayValue}</span>
}

const METRIC_ICONS = {
  'Category Diversity': PieChart,
  'Fund House Diversity': Building2,
  'Sector Diversity': BarChart3,
  'Market Cap Diversity': BarChart3,
}

const METRIC_COLORS = {
  'Category Diversity': '#10b981',
  'Fund House Diversity': '#14b8a6',
  'Sector Diversity': '#f59e0b',
  'Market Cap Diversity': '#8b5cf6',
}

export default function DiversificationScore() {
  const { holdings, fetchHoldings, sessionId } = useFundStore()
  const [divData, setDivData] = useState<DiversificationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true
      fetchHoldings()
    }
  }, [fetchHoldings])

  const computeData = useCallback(async () => {
    if (holdings.length === 0) {
      setDivData(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/portfolio/diversification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (res.ok) {
        const data = await res.json()
        setDivData(data)
      } else {
        setDivData(computeDiversification(holdings))
      }
    } catch {
      setDivData(computeDiversification(holdings))
    } finally {
      setLoading(false)
    }
  }, [holdings, sessionId])

  useEffect(() => {
    computeData()
  }, [computeData])

  const gradeStyle = useMemo(() => {
    if (!divData) return { bg: 'bg-muted', text: 'text-muted-foreground', ring: 'ring-border' }
    return getGradeColor(divData.grade)
  }, [divData])

  if (loading && !divData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </CardContent>
      </Card>
    )
  }

  if (!divData || holdings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Briefcase className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No holdings yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Add funds to your portfolio to see diversification analysis</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Large Score Gauge + Grade */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-white/80 to-white/40 dark:from-white/5 dark:to-white/[0.02] backdrop-blur-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
          {/* Background Decorative Blurs */}
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
          
          <CardContent className="p-8 sm:p-10 flex flex-col items-center relative z-10">
            <div className="flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Diversification Analysis
              </span>
            </div>

            {/* Large Gauge */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-20 group-hover:opacity-30 transition-opacity" />
              <LargeScoreGauge score={divData.overallScore} size={280} />
              
              {/* Center score display */}
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-8">
                <motion.div 
                  className="text-6xl font-black tracking-tight text-foreground"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <AnimatedCounter value={divData.overallScore} duration={2} />
                </motion.div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest opacity-60">
                  Portfolio Score
                </p>
              </div>
            </div>

            {/* Grade Badge */}
            <motion.div 
              className="mt-8"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
            >
              <div className={`text-2xl font-black px-8 py-2.5 rounded-2xl shadow-lg ring-1 transition-all ${gradeStyle.bg} ${gradeStyle.text} ${gradeStyle.ring} hover:scale-105 duration-300`}>
                Grade: {divData.grade}
              </div>
            </motion.div>

            {/* Quick summary */}
            <p className="text-base text-muted-foreground mt-6 text-center max-w-lg leading-relaxed">
              {divData.overallScore >= 80
                ? 'Your portfolio is a masterclass in diversification. You have successfully minimized concentration risk across all major dimensions.'
                : divData.overallScore >= 65
                  ? 'Strong foundation! A few strategic adjustments to your sector or market cap exposure could move you into the top tier.'
                : divData.overallScore >= 50
                  ? 'Moderate balance. You are well-diversified in some areas, but exposed to risk in others. See our AI suggestions below.'
                : 'High concentration risk detected. Your capital is heavily dependent on a few sectors or fund houses. Immediate rebalancing advised.'}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Four Metric Breakdown Cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        {divData.breakdown.map((item, i) => {
          const Icon = METRIC_ICONS[item.metric as keyof typeof METRIC_ICONS] || BarChart3
          const color = METRIC_COLORS[item.metric as keyof typeof METRIC_COLORS] || '#10b981'
          const pct = Math.round((item.score / item.maxScore) * 100)

          return (
            <motion.div
              key={item.metric}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card className="h-full border-none bg-white/60 dark:bg-white/[0.03] backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300 group overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }} />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl p-2.5 transition-colors group-hover:bg-opacity-25" style={{ backgroundColor: `${color}15` }}>
                        <Icon className="h-5 w-5" style={{ color }} />
                      </div>
                      <span className="font-bold text-foreground group-hover:translate-x-1 transition-transform duration-300">{item.metric}</span>
                    </div>
                    <div className="flex items-baseline gap-1 bg-muted/30 px-3 py-1 rounded-full">
                      <span className="text-xl font-black" style={{ color }}>
                        <AnimatedCounter value={item.score} duration={1.5 + i * 0.2} />
                      </span>
                      <span className="text-xs font-medium text-muted-foreground opacity-60">/{item.maxScore}</span>
                    </div>
                  </div>

                  {/* Progress bar with Glow */}
                  <div className="relative h-3 w-full rounded-full bg-muted/40 overflow-hidden mb-4 p-[1px]">
                    <motion.div
                      className="absolute left-0 top-0 h-full rounded-full shadow-[0_0_12px_rgba(0,0,0,0.1)]"
                      style={{ 
                        backgroundColor: color,
                        boxShadow: `0 0 10px ${color}40`
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1], delay: 0.4 + i * 0.1 }}
                    />
                  </div>

                  {/* Description */}
                  <div className="flex items-start gap-2">
                    <div className="mt-1 h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Suggestions Section */}
      {divData.suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <Card className="border-none bg-gradient-to-br from-amber-500/5 to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/5 backdrop-blur-md shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-3 text-amber-800 dark:text-amber-400">
                <div className="p-2 bg-amber-500/20 rounded-xl">
                  <Lightbulb className="h-5 w-5" />
                </div>
                AI Diversification Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {divData.suggestions.map((suggestion, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="flex items-start gap-4 p-3 rounded-2xl bg-white/40 dark:bg-white/[0.02] border border-amber-500/10 hover:border-amber-500/30 transition-colors"
                  >
                    <div className="h-7 w-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/20">
                      <span className="text-xs font-black text-amber-700 dark:text-amber-400">{i + 1}</span>
                    </div>
                    <p className="text-sm font-medium text-amber-900/80 dark:text-amber-200/80 leading-snug">{suggestion}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Error state */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="border-red-500/20 bg-red-500/5 backdrop-blur-md">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
