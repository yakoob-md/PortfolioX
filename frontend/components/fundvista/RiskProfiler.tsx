'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import {
  Shield, ShieldAlert, ShieldCheck, ChevronRight, ChevronLeft, RotateCcw,
  Clock, TrendingDown, Wallet, BookOpen, Target, Landmark, User, Sparkles,
  ArrowRight, CheckCircle2, AlertTriangle, Info, Lightbulb,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useFundStore } from '@/lib/store'

// ─── Types ────────────────────────────────────────────────────────────
interface Question {
  id: number
  text: string
  icon: React.ElementType
  options: { label: string; score: number; emoji: string }[]
}

interface RiskResult {
  profile: 'conservative' | 'moderate' | 'aggressive'
  score: number
  maxScore: number
  allocation: { equity: number; debt: number; hybrid: number }
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: React.ElementType
  tips: string[]
  fundCategories: string[]
}

// ─── Questions ────────────────────────────────────────────────────────
const QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'What is your investment time horizon?',
    icon: Clock,
    options: [
      { label: 'Less than 1 year', score: 1, emoji: '⚡' },
      { label: '1–3 years', score: 2, emoji: '📅' },
      { label: '3–5 years', score: 3, emoji: '📆' },
      { label: '5–10 years', score: 4, emoji: '🗓️' },
      { label: 'More than 10 years', score: 5, emoji: '🚀' },
    ],
  },
  {
    id: 2,
    text: 'How would you react if your portfolio dropped 20% in a month?',
    icon: TrendingDown,
    options: [
      { label: 'Sell everything immediately', score: 1, emoji: '😱' },
      { label: 'Sell some holdings to limit losses', score: 2, emoji: '😰' },
      { label: 'Hold and wait for recovery', score: 3, emoji: '🤔' },
      { label: 'Consider buying the dip slightly', score: 4, emoji: '😎' },
      { label: 'Buy more — it\u2019s a great opportunity', score: 5, emoji: '🤑' },
    ],
  },
  {
    id: 3,
    text: 'How stable is your primary income source?',
    icon: Wallet,
    options: [
      { label: 'Very unstable / irregular', score: 1, emoji: '📉' },
      { label: 'Somewhat unstable', score: 2, emoji: '〰️' },
      { label: 'Fairly stable', score: 3, emoji: '📊' },
      { label: 'Very stable', score: 4, emoji: '📈' },
      { label: 'Multiple stable income sources', score: 5, emoji: '💰' },
    ],
  },
  {
    id: 4,
    text: 'What is your investment experience level?',
    icon: BookOpen,
    options: [
      { label: 'Complete beginner', score: 1, emoji: '🌱' },
      { label: 'Some exposure to mutual funds', score: 2, emoji: '🌿' },
      { label: 'Regular investor for a few years', score: 3, emoji: '🌳' },
      { label: 'Experienced with diverse assets', score: 4, emoji: '🏞️' },
      { label: 'Expert / professional investor', score: 5, emoji: '🏆' },
    ],
  },
  {
    id: 5,
    text: 'How flexible are your financial goals?',
    icon: Target,
    options: [
      { label: 'Must achieve exactly as planned', score: 1, emoji: '🎯' },
      { label: 'Mostly fixed, slight room to adjust', score: 2, emoji: '📌' },
      { label: 'Somewhat flexible', score: 3, emoji: '📎' },
      { label: 'Flexible, can adjust timelines', score: 4, emoji: '🧲' },
      { label: 'Very flexible, open to all outcomes', score: 5, emoji: '🌈' },
    ],
  },
  {
    id: 6,
    text: 'Do you have an emergency fund covering 6+ months?',
    icon: Landmark,
    options: [
      { label: 'No emergency fund at all', score: 1, emoji: '🚫' },
      { label: 'Less than 3 months', score: 2, emoji: '🩹' },
      { label: '3–6 months of expenses', score: 3, emoji: '🛡️' },
      { label: '6–12 months of expenses', score: 4, emoji: '✅' },
      { label: 'Yes, 12+ months covered', score: 5, emoji: '🏦' },
    ],
  },
  {
    id: 7,
    text: 'What is your current age group?',
    icon: User,
    options: [
      { label: '60+ years', score: 1, emoji: '👴' },
      { label: '50–59 years', score: 2, emoji: '🧓' },
      { label: '40–49 years', score: 3, emoji: '🧑' },
      { label: '26–39 years', score: 4, emoji: '🧑‍💼' },
      { label: '18–25 years', score: 5, emoji: '🧑‍🎓' },
    ],
  },
]

// ─── Profile configs ──────────────────────────────────────────────────
const PROFILE_CONFIGS: Record<string, Omit<RiskResult, 'score' | 'maxScore'>> = {
  conservative: {
    profile: 'conservative',
    label: 'Conservative',
    color: 'text-teal-700 dark:text-teal-300',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    borderColor: 'border-teal-200 dark:border-teal-800',
    icon: Shield,
    allocation: { equity: 30, debt: 50, hybrid: 20 },
    tips: [
      'Prioritize capital preservation over growth — consider debt funds and FDs for the bulk of your portfolio.',
      'Allocate 30% to equity index funds for inflation beating, but choose large-cap oriented funds.',
      'Build a 12-month emergency fund before investing aggressively.',
      'Consider RBI Savings Bonds and Senior Citizens Savings Scheme for guaranteed returns.',
      'Review your portfolio quarterly and rebalance when equity allocation exceeds 35%.',
    ],
    fundCategories: ['Debt Funds', 'Liquid Funds', 'Large Cap Equity', 'Balanced Hybrid'],
  },
  moderate: {
    profile: 'moderate',
    label: 'Moderate',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    icon: ShieldCheck,
    allocation: { equity: 55, debt: 25, hybrid: 20 },
    tips: [
      'Your balanced approach is great for long-term wealth creation with manageable risk.',
      'Diversify equity across large-cap, mid-cap, and flexi-cap funds for optimal risk-adjusted returns.',
      'Use SIP mode to average out market volatility — stay consistent regardless of market noise.',
      'Maintain a 6-month emergency fund and adequate insurance coverage.',
      'Rebalance annually to maintain your target 55/25/20 allocation.',
    ],
    fundCategories: ['Flexi Cap Equity', 'Large & Mid Cap', 'Corporate Bond Funds', 'Hybrid Funds', 'ELSS Tax Savers'],
  },
  aggressive: {
    profile: 'aggressive',
    label: 'Aggressive',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    icon: ShieldAlert,
    allocation: { equity: 75, debt: 10, hybrid: 15 },
    tips: [
      'Your high risk tolerance enables maximum growth potential — stay disciplined with your strategy.',
      'Consider allocating equity portion across mid-cap, small-cap, and sectoral funds for higher returns.',
      'Avoid timing the market — consistent SIPs in volatile markets generate the best long-term results.',
      'Keep a 6-month emergency fund despite your aggressive stance — it prevents forced selling in downturns.',
      'Review holdings semi-annually, but avoid panic selling during short-term corrections of 10-15%.',
    ],
    fundCategories: ['Mid Cap Funds', 'Small Cap Funds', 'Sectoral/Thematic', 'Flexi Cap', 'International Equity'],
  },
}

const PIE_COLORS = ['#10b981', '#14b8a6', '#8b5cf6']
const PIE_NAMES = ['Equity', 'Debt', 'Hybrid']

// ─── Helpers ──────────────────────────────────────────────────────────
function computeRiskProfile(answers: number[]): RiskResult {
  const totalScore = answers.reduce((a, b) => a + b, 0)
  const maxScore = QUESTIONS.length * 5
  let profile: 'conservative' | 'moderate' | 'aggressive'

  if (totalScore < 14) {
    profile = 'conservative'
  } else if (totalScore <= 21) {
    profile = 'moderate'
  } else {
    profile = 'aggressive'
  }

  const config = PROFILE_CONFIGS[profile]
  return { ...config, score: totalScore, maxScore } as RiskResult
}

// ─── Sub-components ───────────────────────────────────────────────────

function ScoreGauge({ score, maxScore, profile }: { score: number; maxScore: number; profile: string }) {
  const pct = (score / maxScore) * 100
  const size = 180
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  const colorMap: Record<string, string> = {
    conservative: '#14b8a6',
    moderate: '#10b981',
    aggressive: '#f97316',
  }
  const color = colorMap[profile] || '#10b981'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl font-bold text-foreground"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-muted-foreground">out of {maxScore}</span>
      </div>
    </div>
  )
}

function AllocationPieChart({ allocation }: { allocation: { equity: number; debt: number; hybrid: number } }) {
  const data = [
    { name: 'Equity', value: allocation.equity },
    { name: 'Debt', value: allocation.debt },
    { name: 'Hybrid', value: allocation.hybrid },
  ]

  return (
    <div className="flex items-center gap-6">
      <div className="h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={68}
              dataKey="value"
              stroke="none"
              animationBegin={300}
              animationDuration={1200}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${value}%`, '']}
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--card-foreground)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-3">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-3">
            <span
              className="h-3.5 w-3.5 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-background"
              style={{ backgroundColor: PIE_COLORS[i] }}
            />
            <div>
              <p className="text-sm font-medium text-foreground">{d.name}</p>
              <p className="text-xs text-muted-foreground">{d.value}% allocation</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────
export default function RiskProfiler() {
  const { funds, fetchFunds } = useFundStore()
  const [currentStep, setCurrentStep] = useState(0) // 0..6 = questions, 7 = results
  const [answers, setAnswers] = useState<(number | null)[]>(Array(7).fill(null))
  const [result, setResult] = useState<RiskResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward

  useEffect(() => {
    if (funds.length === 0) fetchFunds()
  }, [funds.length, fetchFunds])

  const handleSelect = useCallback((questionIndex: number, score: number) => {
    setAnswers((prev) => {
      const next = [...prev]
      next[questionIndex] = score
      return next
    })
  }, [])

  const submitProfile = useCallback(async () => {
    const filledAnswers = answers.filter((a): a is number => a !== null)
    if (filledAnswers.length < QUESTIONS.length) {
      // Not all answered, compute client-side with what we have
      const r = computeRiskProfile(filledAnswers.length === QUESTIONS.length ? filledAnswers : filledAnswers.concat(Array(QUESTIONS.length - filledAnswers.length).fill(3)))
      setResult(r)
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/risk/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: filledAnswers }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const config = PROFILE_CONFIGS[data.profile] || PROFILE_CONFIGS.moderate
      setResult({
        ...config,
        score: data.score || filledAnswers.reduce((a, b) => a + b, 0),
        maxScore: QUESTIONS.length * 5,
      } as RiskResult)
    } catch {
      // Fallback client-side
      const r = computeRiskProfile(filledAnswers)
      setResult(r)
    } finally {
      setIsLoading(false)
    }
  }, [answers])

  const goNext = useCallback(() => {
    if (currentStep < QUESTIONS.length - 1) {
      setDirection(1)
      setCurrentStep((s) => s + 1)
    } else {
      // Submit
      setDirection(1)
      setCurrentStep(QUESTIONS.length)
      submitProfile()
    }
  }, [currentStep, answers, submitProfile])

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1)
      setCurrentStep((s) => s - 1)
    }
  }, [currentStep])

  const retakeQuiz = useCallback(() => {
    setDirection(-1)
    setCurrentStep(0)
    setAnswers(Array(7).fill(null))
    setResult(null)
  }, [])

  const currentAnswer = answers[currentStep]
  const progressPct = ((currentStep + (currentAnswer !== null ? 1 : 0)) / QUESTIONS.length) * 100

  // Recommended funds from the store
  const recommendedFunds = useMemo(() => {
    if (!result) return []
    const alloc = result.allocation
    return funds
      .filter((f) => {
        if (alloc.equity > 50 && (f.category === 'Equity' || f.category === 'ELSS')) return true
        if (alloc.debt > 30 && f.category === 'Debt') return true
        if (alloc.hybrid > 10 && f.category === 'Hybrid') return true
        return false
      })
      .slice(0, 6)
  }, [result, funds])

  // ─── Render: Results ──────────────────────────────────────────────
  if (currentStep === QUESTIONS.length && result) {
    const ProfileIcon = result.icon
    return (
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-lg font-semibold text-foreground flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            Your Risk Profile
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Based on your answers, here&apos;s your personalized assessment</p>
        </motion.div>

        {/* Main result card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className={`overflow-hidden ${result.borderColor} border-2`}>
            <div className={`${result.bgColor} p-6 sm:p-8`}>
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
                {/* Score gauge */}
                <ScoreGauge score={result.score} maxScore={result.maxScore} profile={result.profile} />

                {/* Profile badge & description */}
                <div className="flex-1 text-center sm:text-left space-y-4">
                  <div className="flex items-center justify-center sm:justify-start gap-3">
                    <div className={`rounded-xl p-2.5 ${result.bgColor} ring-1 ${result.borderColor}`}>
                      <ProfileIcon className={`h-7 w-7 ${result.color}`} />
                    </div>
                    <div>
                      <Badge
                        className={`text-sm px-3 py-1 ${result.bgColor} ${result.color} ${result.borderColor} ring-1`}
                      >
                        {result.label} Investor
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {result.profile === 'conservative' &&
                      'You prefer stability and capital preservation. Your portfolio should focus on debt and low-risk instruments with modest equity exposure for inflation protection.'}
                    {result.profile === 'moderate' &&
                      'You seek a balance between growth and stability. A diversified mix of equity and debt suits your risk appetite, enabling steady wealth creation.'}
                    {result.profile === 'aggressive' &&
                      'You\u2019re comfortable with high volatility for maximum growth potential. A equity-heavy portfolio aligned with your long-term horizon can deliver superior returns.'}
                  </p>
                  <Button
                    onClick={retakeQuiz}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retake Quiz
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Allocation chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-600" />
                  Suggested Asset Allocation
                </h3>
                <AllocationPieChart allocation={result.allocation} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Fund categories */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  Recommended Fund Categories
                </h3>
                <div className="space-y-3">
                  {result.fundCategories.map((cat, i) => (
                    <motion.div
                      key={cat}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{cat}</span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Personalized tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Personalized Tips for You
              </h3>
              <div className="space-y-3">
                {result.tips.map((tip, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.08 }}
                    className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 p-3"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-900 dark:text-amber-200">{tip}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recommended funds from database */}
        {recommendedFunds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Card>
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Info className="h-4 w-4 text-emerald-600" />
                  Top Matching Funds
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {recommendedFunds.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{f.schemeName}</p>
                        <p className="text-xs text-muted-foreground">{f.fundHouse}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] px-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20">
                          {f.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{f.directExpenseRatio}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    )
  }

  // ─── Render: Loading ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-10 w-10 rounded-full border-4 border-emerald-200 border-t-emerald-600"
        />
        <p className="text-sm text-muted-foreground">Analyzing your risk profile...</p>
      </div>
    )
  }

  // ─── Render: Questionnaire ────────────────────────────────────────
  const question = QUESTIONS[currentStep]
  const QuestionIcon = question.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground flex items-center justify-center gap-2">
          <Shield className="h-5 w-5 text-emerald-600" />
          Risk Profile Assessment
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Answer 7 questions to discover your ideal investment strategy</p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Question {currentStep + 1} of {QUESTIONS.length}</span>
          <span>{Math.round(progressPct)}% complete</span>
        </div>
        <Progress value={progressPct} className="h-2" />
        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {QUESTIONS.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > currentStep ? 1 : -1)
                setCurrentStep(i)
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? 'w-6 bg-emerald-500'
                  : answers[i] !== null
                    ? 'w-2 bg-emerald-400'
                    : 'w-2 bg-muted-foreground/20'
              }`}
              aria-label={`Go to question ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Question card with animation */}
      <div className="relative overflow-hidden min-h-[420px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ opacity: 0, x: direction * 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -80 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Card>
              <CardContent className="p-6 sm:p-8">
                {/* Question text */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                    <QuestionIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{question.text}</h3>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {question.options.map((option) => {
                    const isSelected = currentAnswer === option.score
                    return (
                      <motion.button
                        key={option.score}
                        onClick={() => handleSelect(currentStep, option.score)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-md shadow-emerald-500/10'
                            : 'border-border hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-muted/50'
                        }`}
                      >
                        <span className="text-lg shrink-0">{option.emoji}</span>
                        <span
                          className={`text-sm font-medium ${
                            isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'
                          }`}
                        >
                          {option.label}
                        </span>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto shrink-0"
                          >
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          </motion.div>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        {currentStep < QUESTIONS.length - 1 ? (
          <Button
            onClick={goNext}
            disabled={currentAnswer === null}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={goNext}
            disabled={currentAnswer === null}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            View Results
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Auto-advance hint */}
      {currentAnswer !== null && currentStep < QUESTIONS.length - 1 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-muted-foreground"
        >
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Enter</kbd> or click Next to continue
        </motion.p>
      )}
    </div>
  )
}
