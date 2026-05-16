'use client'

import { useFundStore } from '@/lib/store'
import {
  AlertTriangle, ShieldAlert, Eye, TrendingDown, RefreshCcw, AlertCircle,
  Bell, Loader2, Inbox, ChevronRight, XCircle, Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Alert {
  type: 'HIGH_EXPENSE' | 'CONCENTRATION_RISK' | 'OVERLAP_WARNING' | 'POOR_PERFORMANCE' | 'REBALANCE_NEEDED'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  fundId?: string
  action: string
}

const ALERT_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  HIGH_EXPENSE: { icon: AlertCircle, color: 'text-amber-600 dark:text-amber-400', label: 'High Expense' },
  CONCENTRATION_RISK: { icon: ShieldAlert, color: 'text-red-600 dark:text-red-400', label: 'Concentration Risk' },
  OVERLAP_WARNING: { icon: Eye, color: 'text-orange-600 dark:text-orange-400', label: 'Overlap Warning' },
  POOR_PERFORMANCE: { icon: TrendingDown, color: 'text-red-600 dark:text-red-400', label: 'Poor Performance' },
  REBALANCE_NEEDED: { icon: RefreshCcw, color: 'text-blue-600 dark:text-blue-400', label: 'Rebalance Needed' },
}

const SEVERITY_CONFIG: Record<string, { bg: string; border: string; text: string; badge: string; icon: string }> = {
  high: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-900',
    text: 'text-red-700 dark:text-red-400',
    badge: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
    icon: 'text-red-500',
  },
  medium: {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-900',
    text: 'text-amber-700 dark:text-amber-400',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    icon: 'text-amber-500',
  },
  low: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-900',
    text: 'text-blue-700 dark:text-blue-400',
    badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    icon: 'text-blue-500',
  },
}

export default function PortfolioAlerts() {
  const { sessionId, holdings, fetchHoldings } = useFundStore()

  const [loading, setLoading] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [error, setError] = useState('')
  const [hasRunAnalysis, setHasRunAnalysis] = useState(false)

  useEffect(() => {
    if (holdings.length === 0) fetchHoldings()
  }, [])

  const handleRunAnalysis = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/portfolio/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      if (!res.ok) throw new Error('Analysis failed')
      const data = await res.json()
      setAlerts(data.alerts || [])
      setHasRunAnalysis(true)
    } catch {
      setError('Failed to run portfolio analysis. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const alertCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0, total: alerts.length }
    alerts.forEach(a => { counts[a.severity]++ })
    return counts
  }, [alerts])

  const groupedAlerts = useMemo(() => {
    const groups: Record<string, Alert[]> = {}
    alerts.forEach(alert => {
      if (!groups[alert.type]) groups[alert.type] = []
      groups[alert.type].push(alert)
    })
    return groups
  }, [alerts])

  const hasHoldings = holdings.length > 0

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <Bell className="h-5 w-5 text-emerald-600" />
            Portfolio Alerts
            {alertCounts.total > 0 && (
              <Badge className="bg-emerald-600 text-white ml-2">{alertCounts.total}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Identify issues in your portfolio — high expenses, concentration risk, overlap, underperformance, and rebalancing needs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleRunAnalysis}
              disabled={loading || !hasHoldings}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Run Analysis
            </Button>
            {hasHoldings && (
              <span className="text-xs text-muted-foreground">
                {holdings.length} holding{holdings.length !== 1 ? 's' : ''} in portfolio
              </span>
            )}
          </div>

          {/* Severity Count Badges */}
          {hasRunAnalysis && alertCounts.total > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {alertCounts.high > 0 && (
                <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20 gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {alertCounts.high} High
                </Badge>
              )}
              {alertCounts.medium > 0 && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {alertCounts.medium} Medium
                </Badge>
              )}
              {alertCounts.low > 0 && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  {alertCounts.low} Low
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      )}

      {/* No Holdings - Empty State */}
      {!hasHoldings && !loading && (
        <Card>
          <CardContent className="py-16 text-center">
            <Inbox className="h-16 w-16 text-emerald-200 dark:text-emerald-900 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm font-medium">No holdings in your portfolio</p>
            <p className="text-muted-foreground text-xs mt-2">
              Add holdings to your portfolio first, then run the analysis to identify potential issues.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Navigate to the <strong>Portfolio</strong> tab to add your mutual fund holdings.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Alerts */}
      {hasRunAnalysis && alerts.length === 0 && hasHoldings && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-emerald-200 dark:border-emerald-900">
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-emerald-700 dark:text-emerald-400 font-medium">All Clear!</p>
              <p className="text-muted-foreground text-xs mt-2">
                No issues detected in your portfolio. Your portfolio looks healthy.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Alerts List */}
      {alerts.length > 0 && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Grouped by Type */}
          {Object.entries(groupedAlerts).map(([type, typeAlerts]) => {
            const config = ALERT_TYPE_CONFIG[type]
            const TypeIcon = config?.icon || AlertTriangle
            return (
              <div key={type} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <TypeIcon className={`h-4 w-4 ${config?.color || 'text-muted-foreground'}`} />
                  <span className="text-sm font-medium text-foreground">{config?.label || type}</span>
                  <Badge variant="outline" className="text-[10px]">{typeAlerts.length}</Badge>
                </div>

                <div className="space-y-3">
                  {typeAlerts.map((alert, idx) => {
                    const severity = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low
                    return (
                      <motion.div
                        key={`${type}-${idx}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card className={`border ${severity.border} ${severity.bg}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {/* Severity Icon */}
                              <div className={`mt-0.5 shrink-0 ${severity.icon}`}>
                                {alert.severity === 'high' && <XCircle className="h-5 w-5" />}
                                {alert.severity === 'medium' && <AlertTriangle className="h-5 w-5" />}
                                {alert.severity === 'low' && <Info className="h-5 w-5" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                {/* Title & Badge */}
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-medium text-sm text-foreground leading-tight">{alert.title}</p>
                                  <Badge variant="outline" className={`text-[10px] shrink-0 ${severity.badge}`}>
                                    {alert.severity}
                                  </Badge>
                                </div>

                                {/* Description */}
                                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                                  {alert.description}
                                </p>

                                {/* Suggested Action */}
                                <div className="mt-3 rounded-lg bg-background/50 p-2.5 border border-border/50">
                                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <ChevronRight className="h-3 w-3 text-emerald-600 shrink-0" />
                                    <span><strong className="text-foreground">Action:</strong> {alert.action}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Disclaimer */}
          <div className="rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                These alerts are based on the current state of your portfolio. They are suggestions only and should not be considered financial advice.
                Always consider exit loads, tax implications, and your personal financial situation before making changes.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
