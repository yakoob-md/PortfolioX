'use client'

import { useFundStore, type GoalData } from '@/lib/store'
import { formatCurrency, formatPercent, getCategoryColor } from '@/lib/helpers'
import { Target, Plus, Trash2, GraduationCap, Home, Heart, Shield, Plane, Sparkles, TrendingUp, Info, RefreshCw, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const GOAL_TYPES = [
  { value: 'retirement' as const, label: 'Retirement', icon: Shield, color: '#10b981' },
  { value: 'education' as const, label: "Children's Education", icon: GraduationCap, color: '#14b8a6' },
  { value: 'house' as const, label: 'Buy a House', icon: Home, color: '#f59e0b' },
  { value: 'emergency' as const, label: 'Emergency Fund', icon: Shield, color: '#6366f1' },
  { value: 'wedding' as const, label: 'Wedding', icon: Heart, color: '#ec4899' },
  { value: 'custom' as const, label: 'Custom Goal', icon: Target, color: '#8b5cf6' },
]

const RISK_ALLOCATIONS = {
  conservative: { equity: 30, debt: 50, hybrid: 20 },
  moderate: { equity: 55, debt: 25, hybrid: 20 },
  aggressive: { equity: 75, debt: 10, hybrid: 15 },
}

// Hardcoded fallback expected returns
const DEFAULT_EXPECTED_RETURNS = { equity: 12, debt: 7, hybrid: 9 }

const PIE_COLORS = ['#10b981', '#14b8a6', '#8b5cf6']

function ProgressRing({ progress, size = 80, strokeWidth = 6, color = '#10b981' }: { progress: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  )
}

export default function GoalPlanner() {
  const { goals, goalsLoading, fetchGoals, addGoal, removeGoal, funds, fetchFunds } = useFundStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [goalType, setGoalType] = useState<GoalData['type']>('retirement')
  const [goalName, setGoalName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [years, setYears] = useState('10')
  const [currentSavings, setCurrentSavings] = useState('')
  const [riskProfile, setRiskProfile] = useState<GoalData['riskProfile']>('moderate')
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    fetchGoals()
    if (funds.length === 0) fetchFunds()
  }, [])

  function resetForm() {
    setGoalType('retirement')
    setGoalName('')
    setTargetAmount('')
    setYears('10')
    setCurrentSavings('')
    setRiskProfile('moderate')
  }

  const handleAddGoal = useCallback(async () => {
    if (!targetAmount || !years) return
    const name = goalName || GOAL_TYPES.find((g) => g.value === goalType)?.label || 'My Goal'
    await addGoal({
      name,
      type: goalType,
      targetAmount: parseFloat(targetAmount),
      years: parseInt(years),
      currentSavings: parseFloat(currentSavings) || 0,
      riskProfile,
    })
    setDialogOpen(false)
    resetForm()
    toast.success(`Goal "${name}" created`)
  }, [goalName, goalType, targetAmount, years, currentSavings, riskProfile, addGoal])

  const handleRefreshNav = async () => {
    setRefreshing(true)
    try {
      await fetch('/api/funds/nav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      await fetchFunds()
      setLastUpdated(new Date().toLocaleString('en-IN'))
    } catch {
      // Silently handle refresh errors
    } finally {
      setRefreshing(false)
    }
  }

  // Compute actual category average returns from the funds in the store
  const actualCategoryReturns = useMemo(() => {
    const categories = ['Equity', 'ELSS', 'Index', 'Debt', 'Hybrid'] as const
    const result: Record<string, { avg3y: number | null; avg1y: number | null; count: number }> = {}

    for (const cat of categories) {
      const catFunds = funds.filter(f => f.category === cat)
      if (catFunds.length === 0) {
        result[cat] = { avg3y: null, avg1y: null, count: 0 }
        continue
      }

      const funds3y = catFunds.filter(f => f.directReturn3y != null)
      const funds1y = catFunds.filter(f => f.directReturn1y != null)

      const avg3y = funds3y.length > 0
        ? funds3y.reduce((sum, f) => sum + (f.directReturn3y ?? 0), 0) / funds3y.length
        : null
      const avg1y = funds1y.length > 0
        ? funds1y.reduce((sum, f) => sum + (f.directReturn1y ?? 0), 0) / funds1y.length
        : null

      result[cat] = { avg3y, avg1y, count: catFunds.length }
    }

    return result
  }, [funds])

  // Compute effective expected returns using actual data where available
  const expectedReturns = useMemo(() => {
    // Map categories to equity/debt/hybrid buckets
    const equityCats = ['Equity', 'ELSS', 'Index']
    const debtCats = ['Debt']
    const hybridCats = ['Hybrid']

    const getAvgForBucket = (cats: string[]): number => {
      const returns = cats
        .map(c => actualCategoryReturns[c]?.avg3y)
        .filter((r): r is number => r != null)
      if (returns.length === 0) return 0 // will fall back to default
      return returns.reduce((a, b) => a + b, 0) / returns.length
    }

    const equityAvg = getAvgForBucket(equityCats)
    const debtAvg = getAvgForBucket(debtCats)
    const hybridAvg = getAvgForBucket(hybridCats)

    return {
      equity: equityAvg > 0 ? equityAvg : DEFAULT_EXPECTED_RETURNS.equity,
      debt: debtAvg > 0 ? debtAvg : DEFAULT_EXPECTED_RETURNS.debt,
      hybrid: hybridAvg > 0 ? hybridAvg : DEFAULT_EXPECTED_RETURNS.hybrid,
      usingActual: equityAvg > 0 || debtAvg > 0 || hybridAvg > 0,
    }
  }, [actualCategoryReturns])

  // Client-side goal calculations (used as fallback / enhancement)
  const enrichedGoals = useMemo(() => {
    return goals.map((goal) => {
      const allocation = RISK_ALLOCATIONS[goal.riskProfile]
      const weightedReturn =
        (allocation.equity * expectedReturns.equity +
          allocation.debt * expectedReturns.debt +
          allocation.hybrid * expectedReturns.hybrid) / 100

      const months = goal.years * 12
      const futureValueCurrent = goal.currentSavings * Math.pow(1 + weightedReturn / 100, goal.years)
      const remainingTarget = Math.max(0, goal.targetAmount - futureValueCurrent)
      const monthlyRate = weightedReturn / 100 / 12
      const monthlySip = monthlyRate > 0
        ? (remainingTarget * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1)
        : remainingTarget / months

      const progress = Math.min(100, (goal.currentSavings / goal.targetAmount) * 100)

      // Recommend matching funds
      const recommendedFunds = funds
        .filter((f) => {
          if (allocation.equity > 50 && (f.category === 'Equity' || f.category === 'ELSS')) return true
          if (allocation.debt > 30 && f.category === 'Debt') return true
          if (allocation.hybrid > 10 && f.category === 'Hybrid') return true
          return false
        })
        .slice(0, 3)

      return {
        ...goal,
        allocation,
        monthlySip: Math.round(monthlySip),
        weightedReturn,
        progress,
        recommendedFunds,
      }
    })
  }, [goals, funds, expectedReturns])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-600" />
            Goal-based Investing
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Plan your financial goals with smart SIP calculations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshNav}
            disabled={refreshing}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh NAV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-4 w-4" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create a New Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Goal type selector */}
                <div className="space-y-2">
                  <Label>Goal Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {GOAL_TYPES.map((gt) => (
                      <button
                        key={gt.value}
                        onClick={() => { setGoalType(gt.value); setGoalName(gt.label) }}
                        className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all text-xs ${
                          goalType === gt.value
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                            : 'border-border hover:border-emerald-300 dark:hover:border-emerald-800'
                        }`}
                      >
                        <gt.icon className="h-5 w-5" style={{ color: gt.color }} />
                        <span className="font-medium">{gt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Goal Name</Label>
                  <Input value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="e.g. My Retirement Fund" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Amount (₹)</Label>
                    <Input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="5000000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Time Horizon (years)</Label>
                    <Select value={years} onValueChange={setYears}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[3, 5, 7, 10, 15, 20, 25, 30].map(y => (
                          <SelectItem key={y} value={String(y)}>{y} years</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Current Savings (₹)</Label>
                  <Input type="number" value={currentSavings} onChange={(e) => setCurrentSavings(e.target.value)} placeholder="200000" />
                </div>

                <div className="space-y-2">
                  <Label>Risk Profile</Label>
                  <Select value={riskProfile} onValueChange={(v) => setRiskProfile(v as GoalData['riskProfile'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative (30% Equity)</SelectItem>
                      <SelectItem value="moderate">Moderate (55% Equity)</SelectItem>
                      <SelectItem value="aggressive">Aggressive (75% Equity)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleAddGoal} disabled={!targetAmount || !years} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Create Goal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Returns source info */}
      <div className="flex flex-wrap items-center gap-2">
        {expectedReturns.usingActual && (
          <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-700 dark:text-emerald-400">
            Returns based on actual fund data: Equity {expectedReturns.equity.toFixed(1)}%, Debt {expectedReturns.debt.toFixed(1)}%, Hybrid {expectedReturns.hybrid.toFixed(1)}%
          </Badge>
        )}
        {!expectedReturns.usingActual && (
          <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700 dark:text-amber-400">
            Using default estimates: Equity {DEFAULT_EXPECTED_RETURNS.equity}%, Debt {DEFAULT_EXPECTED_RETURNS.debt}%, Hybrid {DEFAULT_EXPECTED_RETURNS.hybrid}%
          </Badge>
        )}
        {lastUpdated && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            NAV refreshed: {lastUpdated}
          </span>
        )}
      </div>

      {/* Goals list */}
      {goalsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : enrichedGoals.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No goals yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Create your first financial goal — retirement, education, house, or anything you&apos;re saving for.
              </p>
              <Button onClick={() => setDialogOpen(true)} className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-4 w-4" />
                Create Your First Goal
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid gap-4 sm:grid-cols-2">
            {enrichedGoals.map((goal) => {
              const goalTypeConfig = GOAL_TYPES.find((g) => g.value === goal.type) || GOAL_TYPES[5]
              const allocationData = [
                { name: 'Equity', value: goal.allocation.equity },
                { name: 'Debt', value: goal.allocation.debt },
                { name: 'Hybrid', value: goal.allocation.hybrid },
              ]

              return (
                <motion.div
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg p-2" style={{ backgroundColor: `${goalTypeConfig.color}20` }}>
                            <goalTypeConfig.icon className="h-5 w-5" style={{ color: goalTypeConfig.color }} />
                          </div>
                          <div>
                            <CardTitle className="text-base text-card-foreground">{goal.name}</CardTitle>
                            <CardDescription className="text-xs">{goal.years} years · {goal.riskProfile} risk</CardDescription>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { removeGoal(goal.id); toast.success('Goal removed') }}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Progress ring + target */}
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <ProgressRing progress={goal.progress} size={72} strokeWidth={5} color={goalTypeConfig.color} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-foreground">{goal.progress.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Current Savings</p>
                          <p className="text-sm font-bold text-foreground">{formatCurrency(goal.currentSavings)}</p>
                          <p className="text-xs text-muted-foreground mt-1">Target: <strong className="text-foreground">{formatCurrency(goal.targetAmount)}</strong></p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <Progress value={goal.progress} className="h-2" />

                      {/* Monthly SIP needed */}
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50 p-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-emerald-600" />
                          <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Monthly SIP Required</span>
                        </div>
                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                          {formatCurrency(goal.monthlySip)}
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                          at ~{goal.weightedReturn.toFixed(1)}% expected return for {goal.years} years
                          {expectedReturns.usingActual && <span> (based on actual fund data)</span>}
                        </p>
                      </div>

                      {/* Asset allocation pie chart */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Suggested Allocation</p>
                        <div className="flex items-center gap-4">
                          <div className="h-24 w-24 shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={allocationData}
                                  cx="50%" cy="50%"
                                  innerRadius={18} outerRadius={35}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  {allocationData.map((_, i) => (
                                    <Cell key={i} fill={PIE_COLORS[i]} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(value: number) => [`${value}%`, '']}
                                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px', color: 'var(--card-foreground)' }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            {allocationData.map((d, i) => (
                              <div key={d.name} className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                                <span className="text-muted-foreground">{d.name}:</span>
                                <span className="font-medium text-foreground">{d.value}%</span>
                                {expectedReturns.usingActual && (
                                  <span className="text-[9px] text-muted-foreground">
                                    (~{d.name === 'Equity' ? expectedReturns.equity.toFixed(1) : d.name === 'Debt' ? expectedReturns.debt.toFixed(1) : expectedReturns.hybrid.toFixed(1)}%)
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Recommended funds */}
                      {goal.recommendedFunds.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-emerald-600" />
                            Recommended Funds
                          </p>
                          <div className="space-y-1.5">
                            {goal.recommendedFunds.map((f) => (
                              <div key={f.id} className="flex items-center justify-between text-xs rounded-md bg-muted/50 px-2 py-1.5">
                                <span className="truncate max-w-[140px] font-medium text-foreground">{f.schemeName}</span>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className={`text-[9px] px-1.5 ${getCategoryColor(f.category)}`}>
                                    {f.category}
                                  </Badge>
                                  <span className="text-muted-foreground">{f.directExpenseRatio}% ER</span>
                                  {/* Show actual returns */}
                                  {f.directReturn3y != null && (
                                    <Badge className="text-[9px] px-1 py-0 bg-emerald-600 text-white">
                                      3Y: {f.directReturn3y.toFixed(1)}%
                                    </Badge>
                                  )}
                                  {f.directReturn1y != null && (
                                    <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                      1Y: {f.directReturn1y.toFixed(1)}%
                                    </Badge>
                                  )}
                                  {/* Live badge for funds with actual data */}
                                  {f.directReturn3y != null && (
                                    <span className="text-[8px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </AnimatePresence>
      )}

      {/* SIP Calculation Info */}
      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="text-sm text-emerald-800 dark:text-emerald-300 space-y-2">
            <p><strong>How SIP calculations work:</strong></p>
            <p>
              We use the future value of an annuity formula: <code className="bg-emerald-100 dark:bg-emerald-900/50 px-1 rounded text-xs">SIP = (Remaining × r) / ((1+r)^n - 1)</code> where r is the monthly expected return rate based on your risk profile&apos;s asset allocation.
            </p>
            <p>
              {expectedReturns.usingActual ? (
                <>
                  <strong>Returns based on actual fund data:</strong> Equity {expectedReturns.equity.toFixed(1)}%, Debt {expectedReturns.debt.toFixed(1)}%, Hybrid {expectedReturns.hybrid.toFixed(1)}%. 
                  These are computed as average 3Y returns from funds in each category. Actual returns may vary. All calculations assume monthly compounding.
                </>
              ) : (
                <>
                  Expected returns used: Equity {DEFAULT_EXPECTED_RETURNS.equity}%, Debt {DEFAULT_EXPECTED_RETURNS.debt}%, Hybrid {DEFAULT_EXPECTED_RETURNS.hybrid}%. Actual returns may vary. All calculations assume monthly compounding.
                </>
              )}
            </p>
            {lastUpdated && (
              <p className="text-emerald-700 dark:text-emerald-400 text-xs mt-2">
                📊 NAV data as of {lastUpdated}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
