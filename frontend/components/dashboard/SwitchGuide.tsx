'use client'

import { useFundStore } from '@/lib/store'
import { formatCurrency } from '@/lib/helpers'
import {
  ArrowRightLeft, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Clock,
  DollarSign, Info, Lightbulb, Monitor, Shield, Sparkles,
  TrendingUp, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from '@/components/ui/dialog'
import { useMemo, useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

const PLATFORMS = [
  {
    name: 'MFUtility',
    url: 'https://www.mfuindia.com',
    pros: ['Official platform', 'All AMCs', 'No additional cost', 'Direct plans only'],
    cons: ['Complex interface', 'Registration takes time', 'No advisory'],
    bestFor: 'Experienced investors who want the official route',
    icon: '🏛️',
  },
  {
    name: 'Coin (Zerodha)',
    url: 'https://coin.zerodha.com',
    pros: ['Clean interface', 'Integrated with Zerodha', 'Free for Zerodha users', 'Good reporting'],
    cons: ['Need Zerodha demat', '₹50/mf/month platform fee (waived for >₹25K)', 'Demat mode only'],
    bestFor: 'Existing Zerodha users',
    icon: '🪙',
  },
  {
    name: 'Groww',
    url: 'https://groww.in',
    pros: ['Very simple UI', 'No platform fee', 'Quick onboarding', 'Both SIP & lumpsum'],
    cons: ['Limited research tools', 'Customer support can be slow'],
    bestFor: 'Beginners who want simplicity',
    icon: '🌱',
  },
  {
    name: 'Kuvera',
    url: 'https://kuvera.in',
    pros: ['Free direct plans', 'Goal-based investing', 'Family account', 'Smart switch feature'],
    cons: ['UI can be confusing', 'Fewer fund options vs others', 'Slow customer service'],
    bestFor: 'Goal-oriented investors with families',
    icon: '🎯',
  },
  {
    name: 'Paytm Money',
    url: 'https://paytmmoney.com',
    pros: ['No commission', 'Easy for Paytm users', 'Free direct plans', 'Good SIP management'],
    cons: ['Limited research', 'Paytm ecosystem dependency', 'Fewer features'],
    bestFor: 'Paytm users who want convenience',
    icon: '💳',
  },
]

const STEP_TITLES = [
  'Understand the Switch',
  'Calculate Your Savings',
  'Check Exit Load & Tax',
  'Choose Your Platform',
  'Execute the Switch',
]

export default function SwitchGuide() {
  const { holdings } = useFundStore()
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [checklist, setChecklist] = useState<Set<string>>(new Set())

  const regularHoldings = useMemo(() => {
    return holdings.filter(h => h.planType === 'regular')
  }, [holdings])

  const totalRegularValue = useMemo(() => {
    return regularHoldings.reduce((s, h) => s + h.currentAmount, 0)
  }, [regularHoldings])

  const estimatedAnnualSaving = useMemo(() => {
    return regularHoldings.reduce((s, h) => {
      const diff = (h?.fund?.regularExpenseRatio ?? 0) - (h?.fund?.directExpenseRatio ?? 0)
      return s + (h?.currentAmount ?? 0) * (diff / 100)
    }, 0)
  }, [regularHoldings])

  const estimatedFiveYearSaving = useMemo(() => {
    if (estimatedAnnualSaving <= 0) return 0
    const annualReturn = 0.10 // Assume 10% growth
    let saving = 0
    for (let y = 1; y <= 5; y++) {
      saving += estimatedAnnualSaving * Math.pow(1 + annualReturn, y)
    }
    return saving
  }, [estimatedAnnualSaving])

  function parseExitLoad(exitLoadStr: string): { pct: number; thresholdDays: number; rule: string } {
    if (!exitLoadStr || exitLoadStr.toLowerCase() === 'nil' || exitLoadStr.trim() === '') {
      return { pct: 0, thresholdDays: 0, rule: 'Nil' }
    }
    const withinMatch = exitLoadStr.match(/([\d.]+)%\s*(?:for\s+redemption\s+|if\s+redeemed\s+)?within\s+(\d+)\s*(year|month|day)s?/i)
    if (withinMatch) {
      const pct = parseFloat(withinMatch[1])
      const num = parseInt(withinMatch[2])
      const unit = withinMatch[3].toLowerCase()
      let thresholdDays = num
      if (unit === 'year') thresholdDays = num * 365
      else if (unit === 'month') thresholdDays = num * 30
      return { pct, thresholdDays, rule: `${pct}% within ${num} ${unit}${num > 1 ? 's' : ''}` }
    }
    return { pct: 0, thresholdDays: 0, rule: exitLoadStr }
  }

  const toggleChecklist = (item: string) => {
    setChecklist(prev => {
      const next = new Set(prev)
      if (next.has(item)) next.delete(item)
      else next.add(item)
      return next
    })
  }

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEP_TITLES.length - 1))
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0))

  const handleSwitched = useCallback(() => {
    toast.success('🎉 Great decision! Your holdings have been marked as Direct.')
    setOpen(false)
    setCurrentStep(0)
    setChecklist(new Set())
  }, [])

  const progressPct = ((currentStep + 1) / STEP_TITLES.length) * 100

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  }

  const [direction, setDirection] = useState(0)

  const goToStep = (step: number) => {
    setDirection(step > currentStep ? 1 : -1)
    setCurrentStep(step)
  }

  const goNext = () => {
    setDirection(1)
    nextStep()
  }

  const goPrev = () => {
    setDirection(-1)
    prevStep()
  }

  const checklistItems = [
    'Redeem all Regular plan units',
    'Wait for settlement (T+2 for equity, T+1 for debt)',
    'Funds credited to bank account',
    'Open Direct plan on chosen platform',
    'Invest the full redeemed amount in Direct plan',
    'Set up SIP if you had one in Regular',
    'Update your portfolio tracker',
    'Save transaction confirmations for tax records',
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          <ArrowRightLeft className="h-4 w-4" />
          Switch to Direct - Step by Step Guide
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              Switch to Direct Plan Guide
            </DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>

          {/* Progress indicator */}
          <div className="mt-3 space-y-2">
            <Progress value={progressPct} className="h-2" />
            <div className="flex justify-between">
              {STEP_TITLES.map((title, i) => (
                <button
                  key={i}
                  onClick={() => goToStep(i)}
                  className={`flex flex-col items-center gap-1 transition-all ${
                    i === currentStep
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : i < currentStep
                      ? 'text-emerald-600/60 dark:text-emerald-400/60'
                      : 'text-muted-foreground/40'
                  }`}
                >
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                    i === currentStep
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : i < currentStep
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-600'
                      : 'border-muted-foreground/30 text-muted-foreground/40'
                  }`}>
                    {i < currentStep ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className="text-[9px] hidden sm:block max-w-[80px] text-center leading-tight">{title}</span>
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Step content */}
        <div className="px-6 py-4 min-h-[400px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {/* Step 1: Understand the Switch */}
              {currentStep === 0 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">What is Direct vs Regular?</h3>
                      <p className="text-sm text-muted-foreground">Same fund, same stocks, lower cost</p>
                    </div>
                  </div>

                  <Card className="border-emerald-200 dark:border-emerald-800">
                    <CardContent className="p-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                            <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">Direct Plan</span>
                          </div>
                          <ul className="text-xs text-emerald-800 dark:text-emerald-300 space-y-1.5">
                            <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" /> Buy directly from AMC</li>
                            <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" /> No distributor commission</li>
                            <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" /> Lower expense ratio (0.5-1% less)</li>
                            <li className="flex items-start gap-1.5"><CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" /> Higher returns over time</li>
                          </ul>
                        </div>
                        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-4 w-4 text-red-600" />
                            <span className="font-bold text-sm text-red-700 dark:text-red-400">Regular Plan</span>
                          </div>
                          <ul className="text-xs text-red-800 dark:text-red-300 space-y-1.5">
                            <li className="flex items-start gap-1.5"><X className="h-3 w-3 mt-0.5 shrink-0" /> Bought through distributor</li>
                            <li className="flex items-start gap-1.5"><X className="h-3 w-3 mt-0.5 shrink-0" /> Commission paid from your returns</li>
                            <li className="flex items-start gap-1.5"><X className="h-3 w-3 mt-0.5 shrink-0" /> Higher expense ratio</li>
                            <li className="flex items-start gap-1.5"><X className="h-3 w-3 mt-0.5 shrink-0" /> Lower returns over time</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                        <div className="text-sm text-amber-800 dark:text-amber-300 space-y-2">
                          <p className="font-medium">Key Insight</p>
                          <p>Direct and Regular plans hold the <strong>exact same portfolio</strong> of stocks/bonds. The only difference is the expense ratio. That 0.5-1% annual saving compounds dramatically — over 20 years, you could have 15-20% more wealth.</p>
                          <p>Think of it as getting the same product at a lower price. There&apos;s no downside to Direct plans — only upside.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5 font-medium text-foreground"><Info className="h-3.5 w-3.5" /> Important</p>
                    <p className="mt-1">Switching means redeeming Regular plan units and buying Direct plan units of the same fund. There may be exit loads and tax implications — we&apos;ll cover those in Step 3.</p>
                  </div>
                </div>
              )}

              {/* Step 2: Calculate Your Savings */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Your Potential Savings</h3>
                      <p className="text-sm text-muted-foreground">How much more you could earn with Direct</p>
                    </div>
                  </div>

                  {regularHoldings.length > 0 ? (
                    <div className="space-y-4">
                      {/* Savings overview */}
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Card className="border-emerald-200 dark:border-emerald-800">
                          <CardContent className="p-4 text-center">
                            <p className="text-xs text-muted-foreground">Regular Holdings</p>
                            <p className="text-2xl font-bold text-foreground">{regularHoldings.length}</p>
                            <p className="text-xs text-muted-foreground mt-1">Total: {formatCurrency(totalRegularValue)}</p>
                          </CardContent>
                        </Card>
                        <Card className="border-emerald-200 dark:border-emerald-800">
                          <CardContent className="p-4 text-center">
                            <p className="text-xs text-muted-foreground">Annual Saving</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(estimatedAnnualSaving)}</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">per year</p>
                          </CardContent>
                        </Card>
                        <Card className="border-emerald-200 dark:border-emerald-800">
                          <CardContent className="p-4 text-center">
                            <p className="text-xs text-muted-foreground">5-Year Saving</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(estimatedFiveYearSaving)}</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">compounded</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Per-fund breakdown */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm text-card-foreground">Per-Fund Savings</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {regularHoldings.map((h) => {
                              const diff = (h?.fund?.regularExpenseRatio ?? 0) - (h?.fund?.directExpenseRatio ?? 0)
                              const annualSave = (h?.currentAmount ?? 0) * (diff / 100)
                              return (
                                <div key={h.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium text-foreground truncate block">{h?.fund?.schemeName || 'Unknown Fund'}</span>
                                    <span className="text-muted-foreground">
                                      ER: {h?.fund?.regularExpenseRatio}% → {h?.fund?.directExpenseRatio}% (save {diff.toFixed(2)}%)
                                    </span>
                                  </div>
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400 ml-2 shrink-0">
                                    {formatCurrency(annualSave)}/yr
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="p-8 text-center">
                        <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No Regular plan holdings in your portfolio.</p>
                        <p className="text-xs text-muted-foreground mt-1">Add holdings in the Portfolio tab to see savings.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Step 3: Check Exit Load & Tax */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Check Exit Load & Tax Impact</h3>
                      <p className="text-sm text-muted-foreground">Understand the one-time cost of switching</p>
                    </div>
                  </div>

                  <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
                    <CardContent className="p-4 space-y-3">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">When you switch, two costs apply:</p>
                      <div className="space-y-3">
                        <div className="rounded-lg bg-background p-3">
                          <p className="text-sm font-medium text-foreground flex items-center gap-2">
                            <ArrowRightLeft className="h-4 w-4 text-amber-600" />
                            Exit Load
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            A fee charged by the AMC if you redeem before a minimum holding period. Typically 1% if redeemed within 1 year. If your holding is older, exit load is usually Nil.
                          </p>
                        </div>
                        <div className="rounded-lg bg-background p-3">
                          <p className="text-sm font-medium text-foreground flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-600" />
                            Capital Gains Tax
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Redeeming triggers capital gains tax. Equity STCG: 20% (held &lt;12 months), Equity LTCG: 12.5% (held &gt;12 months, ₹1.25L exemption). Debt: taxed at slab rate (~30%).
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick cost estimate per holding */}
                  {regularHoldings.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm text-card-foreground">Quick Cost Estimate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {regularHoldings.map((h) => {
                            if (!h?.fund) return null
                            const { pct, thresholdDays, rule } = parseExitLoad(h.fund.exitLoad)
                            const gain = (h.currentAmount ?? 0) - (h.investedAmount ?? 0)
                            const cat = h.fund.category === 'Debt' ? 'debt' : 'equity'
                            const holdingDays = h.purchaseDate
                              ? Math.floor((Date.now() - new Date(h.purchaseDate).getTime()) / (1000 * 60 * 60 * 24))
                              : 365
                            const appliesExitLoad = holdingDays < thresholdDays
                            const isLTCG = cat === 'equity' ? holdingDays >= 365 : holdingDays >= 1095
                            const taxRate = cat === 'debt' ? 0.30 : (isLTCG ? 0.125 : 0.20)
                            const estTax = Math.max(0, gain * taxRate)

                            return (
                              <div key={h.id} className="rounded-lg border p-3 text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-none">{h.fund.schemeName}</span>
                                  <Badge variant="outline" className="text-[9px] px-1.5 shrink-0">
                                    {h.fund.category}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                                  <span>Exit Load: <span className={!appliesExitLoad ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                                    {rule} {!appliesExitLoad ? '✓ Passed' : '⚠ Applies'}
                                  </span></span>
                                  <span>Gain: <span className={gain >= 0 ? 'text-emerald-600' : 'text-red-600'}>{formatCurrency(gain)}</span></span>
                                  <span>Tax Type: <span className="font-medium">{isLTCG ? 'LTCG' : 'STCG'}</span></span>
                                  <span>Est. Tax: <span className="text-amber-600 font-medium">{formatCurrency(estTax)}</span></span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5 font-medium text-foreground"><Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Pro Tip</p>
                    <p className="mt-1">Use the Exit Load Calculator tab for detailed per-holding cost analysis, including break-even calculations.</p>
                  </div>
                </div>
              )}

              {/* Step 4: Choose Your Platform */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                      <Monitor className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Choose Your Platform</h3>
                      <p className="text-sm text-muted-foreground">Where to buy Direct plan mutual funds</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {PLATFORMS.map((platform) => (
                      <Card key={platform.name} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{platform.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm text-foreground">{platform.name}</h4>
                                <Badge variant="outline" className="text-[9px] px-1.5 shrink-0">Direct Plans</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">Best for: {platform.bestFor}</p>
                              <div className="grid gap-2 mt-2 sm:grid-cols-2">
                                <div>
                                  <p className="text-[10px] font-medium text-emerald-600 mb-1">Pros</p>
                                  {platform.pros.map((pro, i) => (
                                    <p key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" /> {pro}
                                    </p>
                                  ))}
                                </div>
                                <div>
                                  <p className="text-[10px] font-medium text-red-500 mb-1">Cons</p>
                                  {platform.cons.map((con, i) => (
                                    <p key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                                      <X className="h-2.5 w-2.5 text-red-500 shrink-0" /> {con}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5 font-medium text-foreground"><Info className="h-3.5 w-3.5" /> Note</p>
                    <p className="mt-1">You can also buy Direct plans directly from each AMC&apos;s website. This avoids platform fees but requires managing multiple logins.</p>
                  </div>
                </div>
              )}

              {/* Step 5: Execute the Switch */}
              {currentStep === 4 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Execute the Switch</h3>
                      <p className="text-sm text-muted-foreground">Follow these steps to complete your switch</p>
                    </div>
                  </div>

                  {/* Checklist */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-card-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Switch Checklist
                        <Badge variant="outline" className="text-[10px] ml-auto">
                          {checklist.size}/{checklistItems.length} done
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {checklistItems.map((item, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-3 rounded-lg p-2.5 transition-all ${
                              checklist.has(item)
                                ? 'bg-emerald-50 dark:bg-emerald-950/20'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <Checkbox
                              checked={checklist.has(item)}
                              onCheckedChange={() => toggleChecklist(item)}
                              className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            />
                            <span className={`text-sm ${
                              checklist.has(item)
                                ? 'text-emerald-700 dark:text-emerald-400 line-through'
                                : 'text-foreground'
                            }`}>
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Important reminders */}
                  <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Important Reminders
                      </p>
                      <ul className="mt-2 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                        <li>• Don&apos;t redeem and re-invest on the same day — wait for settlement</li>
                        <li>• Keep records of redemption and purchase for tax purposes</li>
                        <li>• If you have a SIP, cancel the Regular SIP and start a new Direct SIP</li>
                        <li>• STP/SWP also needs to be set up fresh in Direct plan</li>
                        <li>• Consider spreading redemptions across financial years to optimize tax</li>
                        <li>• Market timing doesn&apos;t matter much — the expense ratio saving is guaranteed</li>
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Final CTA */}
                  {checklist.size >= checklistItems.length && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                      <Card className="border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
                        <CardContent className="p-6 text-center space-y-3">
                          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                          <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">All Steps Completed!</h3>
                          <p className="text-sm text-emerald-700 dark:text-emerald-400">
                            You&apos;re now saving {formatCurrency(estimatedAnnualSaving)}/year with Direct plans.
                          </p>
                          <Button
                            onClick={handleSwitched}
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Sparkles className="h-4 w-4" />
                            I&apos;ve Switched!
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation buttons */}
        <div className="sticky bottom-0 bg-background border-t px-6 py-3 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <span className="text-xs text-muted-foreground">
            Step {currentStep + 1} of {STEP_TITLES.length}
          </span>
          {currentStep < STEP_TITLES.length - 1 ? (
            <Button
              onClick={goNext}
              className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSwitched}
              className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Sparkles className="h-4 w-4" />
              I&apos;ve Switched!
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
