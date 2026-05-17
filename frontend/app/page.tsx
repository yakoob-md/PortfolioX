'use client'

import { useState, useMemo } from 'react'
import { useFundStore } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import Navbar from '@/components/Navbar'
import AICopilot from '@/components/dashboard/AICopilot'
import Launcher from '@/components/landing/Launcher'
import Footer from '@/components/dashboard/Footer'
import { ErrorBoundary } from '@/components/dashboard/ErrorBoundary'
import { useReducedMotion } from '@/lib/useReducedMotion'

// ============ LAZY-LOADED FEATURE MODULES ============
// Discover
const ExploreFunds = dynamic(() => import('@/components/dashboard/ExploreFunds'), { ssr: false })
const MarketDashboard = dynamic(() => import('@/components/dashboard/MarketDashboard'), { ssr: false })
const FundHeatmap = dynamic(() => import('@/components/dashboard/FundHeatmap'), { ssr: false })
const NAVHistory = dynamic(() => import('@/components/dashboard/NAVHistory'), { ssr: false })
const FundScreener = dynamic(() => import('@/components/dashboard/FundScreener'), { ssr: false })
const FundRankings = dynamic(() => import('@/components/dashboard/FundRankings'), { ssr: false })
const AMCAnalysis = dynamic(() => import('@/components/dashboard/AMCAnalysis'), { ssr: false })
const RollingReturns = dynamic(() => import('@/components/dashboard/RollingReturns'), { ssr: false })
const CategoryPerformance = dynamic(() => import('@/components/dashboard/CategoryPerformance'), { ssr: false })

// Analyze
const PortfolioAnalyze = dynamic(() => import('@/components/dashboard/PortfolioBuilder'), { ssr: false })
const CompareView = dynamic(() => import('@/components/dashboard/CompareView'), { ssr: false })
const FundOverlap = dynamic(() => import('@/components/dashboard/FundOverlap'), { ssr: false })
const SectorExposure = dynamic(() => import('@/components/dashboard/SectorExposure'), { ssr: false })
const DiversificationScore = dynamic(() => import('@/components/dashboard/DiversificationScore'), { ssr: false })
const MonteCarloSim = dynamic(() => import('@/components/dashboard/MonteCarloSim'), { ssr: false })

// Plan
const SavingsCalculator = dynamic(() => import('@/components/dashboard/SavingsCalculator'), { ssr: false })
const SIPPlanner = dynamic(() => import('@/components/dashboard/SIPPlanner'), { ssr: false })
const GoalPlanner = dynamic(() => import('@/components/dashboard/GoalPlanner'), { ssr: false })
const RiskProfiler = dynamic(() => import('@/components/dashboard/RiskProfiler'), { ssr: false })
const FDvsMF = dynamic(() => import('@/components/dashboard/FDvsMF'), { ssr: false })
const InflationCalculator = dynamic(() => import('@/components/dashboard/InflationCalculator'), { ssr: false })

// Optimize
const TaxMitra = dynamic(() => import('@/components/tax/TaxMitraFull'), { ssr: false })
const ExitLoadCalc = dynamic(() => import('@/components/dashboard/ExitLoadCalc'), { ssr: false })
const RebalancingView = dynamic(() => import('@/components/dashboard/RebalancingView'), { ssr: false })
const StressTest = dynamic(() => import('@/components/dashboard/StressTest'), { ssr: false })
const CommissionDisclosure = dynamic(() => import('@/components/dashboard/CommissionDisclosure'), { ssr: false })
const ELSSTaxSaver = dynamic(() => import('@/components/dashboard/ELSSTaxSaver'), { ssr: false })
const EmergencyFund = dynamic(() => import('@/components/dashboard/EmergencyFund'), { ssr: false })

// Tools
const XIRRCalculator = dynamic(() => import('@/components/dashboard/XIRRCalculator'), { ssr: false })
const Watchlist = dynamic(() => import('@/components/dashboard/Watchlist'), { ssr: false })
const PortfolioExport = dynamic(() => import('@/components/dashboard/PortfolioExport'), { ssr: false })
const LumpsumCalculator = dynamic(() => import('@/components/dashboard/LumpsumCalculator'), { ssr: false })
const SWPCalculator = dynamic(() => import('@/components/dashboard/SWPCalculator'), { ssr: false })
const STPCalculator = dynamic(() => import('@/components/dashboard/STPCalculator'), { ssr: false })

const tabAnimation = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as [number,number,number,number] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

export default function Home() {
  const { activeTab } = useFundStore()
  const [showLauncher, setShowLauncher] = useState(true)
  const reducedMotion = useReducedMotion()

  const transitionProps = reducedMotion
    ? { duration: 0 }
    : { duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] as [number, number, number, number] }

  const dashboardTransitionProps = reducedMotion
    ? { duration: 0 }
    : { duration: 0.8, ease: "easeOut" as const }

  const tabAnimProps = reducedMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : tabAnimation

  const renderContent = useMemo(() => (
    <ErrorBoundary>
      <>
        {/* -- INSIGHTS --------------------------- */}
        {activeTab === 'explore'        && <ExploreFunds />}
        {activeTab === 'market'         && <MarketDashboard />}
        {activeTab === 'heatmap'        && <FundHeatmap />}
        {activeTab === 'nav'            && <NAVHistory />}
        {activeTab === 'screener'       && <FundScreener />}
        {activeTab === 'rankings'       && <FundRankings />}
        {activeTab === 'amc'            && <AMCAnalysis />}
        {activeTab === 'rollingreturns' && <RollingReturns />}
        {activeTab === 'categoryperf'   && <CategoryPerformance />}

        {/* -- MANAGEMENT ------------------------- */}
        {activeTab === 'portfolio'      && <PortfolioAnalyze />}
        {activeTab === 'compare'        && <CompareView />}
        {activeTab === 'overlap'        && <FundOverlap />}
        {activeTab === 'sector'         && <SectorExposure />}
        {activeTab === 'diversification'&& <DiversificationScore />}
        {activeTab === 'montecarlo'     && <MonteCarloSim />}

        {/* -- STRATEGY --------------------------- */}
        {activeTab === 'savings'        && <SavingsCalculator />}
        {activeTab === 'sip'            && <SIPPlanner />}
        {activeTab === 'goals'          && <GoalPlanner />}
        {activeTab === 'risk'           && <RiskProfiler />}
        {activeTab === 'fdvsmf'         && <FDvsMF />}
        {activeTab === 'inflation'      && <InflationCalculator />}

        {/* -- OPTIMIZATION ----------------------- */}
        {activeTab === 'tax'            && <TaxMitra />}
        {activeTab === 'exitload'       && <ExitLoadCalc />}
        {activeTab === 'rebalance'      && <RebalancingView />}
        {activeTab === 'stress'         && <StressTest />}
        {activeTab === 'commission'     && <CommissionDisclosure />}
        {activeTab === 'elsstax'        && <ELSSTaxSaver />}
        {activeTab === 'emergency'      && <EmergencyFund />}

        {/* -- TOOLKIT ---------------------------- */}
        {activeTab === 'xirr'           && <XIRRCalculator />}
        {activeTab === 'watchlist'      && <Watchlist />}
        {activeTab === 'export'         && <PortfolioExport />}
        {activeTab === 'lumpsum'        && <LumpsumCalculator />}
        {activeTab === 'swp'            && <SWPCalculator />}
        {activeTab === 'stp'            && <STPCalculator />}
      </>
    </ErrorBoundary>
  ), [activeTab])

  return (
    <AnimatePresence mode="wait">
      {showLauncher ? (
        <motion.div
          key="launcher"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={transitionProps}
          className="w-full relative"
        >
          <Launcher onLaunch={() => setShowLauncher(false)} />
        </motion.div>
      ) : (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={dashboardTransitionProps}
          className="min-h-screen flex flex-col bg-background text-foreground"
        >
          <Navbar />
          
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={tabAnimProps.initial}
                animate={tabAnimProps.animate}
                exit={tabAnimProps.exit}
                variants={!reducedMotion ? tabAnimation : undefined}
              >
                {renderContent}
              </motion.div>
            </AnimatePresence>
          </main>

          <AICopilot />
          <Footer />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
