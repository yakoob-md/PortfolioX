'use client'

import { useFundStore } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import Navbar from '@/components/Navbar'
import AICopilot from '@/components/fundvista/AICopilot'

// ============ LAZY-LOADED FEATURE MODULES ============
// Discover
const ExploreFunds = dynamic(() => import('@/components/fundvista/ExploreFunds'), { ssr: false })
const MarketDashboard = dynamic(() => import('@/components/fundvista/MarketDashboard'), { ssr: false })
const FundHeatmap = dynamic(() => import('@/components/fundvista/FundHeatmap'), { ssr: false })
const NAVHistory = dynamic(() => import('@/components/fundvista/NAVHistory'), { ssr: false })
const FundScreener = dynamic(() => import('@/components/fundvista/FundScreener'), { ssr: false })
const FundRankings = dynamic(() => import('@/components/fundvista/FundRankings'), { ssr: false })
const AMCAnalysis = dynamic(() => import('@/components/fundvista/AMCAnalysis'), { ssr: false })
const RollingReturns = dynamic(() => import('@/components/fundvista/RollingReturns'), { ssr: false })
const CategoryPerformance = dynamic(() => import('@/components/fundvista/CategoryPerformance'), { ssr: false })

// Analyze
const PortfolioAnalyze = dynamic(() => import('@/components/fundvista/PortfolioBuilder'), { ssr: false })
const CompareView = dynamic(() => import('@/components/fundvista/CompareView'), { ssr: false })
const FundOverlap = dynamic(() => import('@/components/fundvista/FundOverlap'), { ssr: false })
const SectorExposure = dynamic(() => import('@/components/fundvista/SectorExposure'), { ssr: false })
const DiversificationScore = dynamic(() => import('@/components/fundvista/DiversificationScore'), { ssr: false })
const MonteCarloSim = dynamic(() => import('@/components/fundvista/MonteCarloSim'), { ssr: false })

// Plan
const SavingsCalculator = dynamic(() => import('@/components/fundvista/SavingsCalculator'), { ssr: false })
const SIPPlanner = dynamic(() => import('@/components/fundvista/SIPPlanner'), { ssr: false })
const GoalPlanner = dynamic(() => import('@/components/fundvista/GoalPlanner'), { ssr: false })
const RiskProfiler = dynamic(() => import('@/components/fundvista/RiskProfiler'), { ssr: false })
const FDvsMF = dynamic(() => import('@/components/fundvista/FDvsMF'), { ssr: false })
const InflationCalculator = dynamic(() => import('@/components/fundvista/InflationCalculator'), { ssr: false })

// Optimize
const TaxMitra = dynamic(() => import('@/components/tax/TaxMitraFull'), { ssr: false })
const ExitLoadCalc = dynamic(() => import('@/components/fundvista/ExitLoadCalc'), { ssr: false })
const RebalancingView = dynamic(() => import('@/components/fundvista/RebalancingView'), { ssr: false })
const StressTest = dynamic(() => import('@/components/fundvista/StressTest'), { ssr: false })
const CommissionDisclosure = dynamic(() => import('@/components/fundvista/CommissionDisclosure'), { ssr: false })
const ELSSTaxSaver = dynamic(() => import('@/components/fundvista/ELSSTaxSaver'), { ssr: false })
const EmergencyFund = dynamic(() => import('@/components/fundvista/EmergencyFund'), { ssr: false })

// Tools
const XIRRCalculator = dynamic(() => import('@/components/fundvista/XIRRCalculator'), { ssr: false })
const Watchlist = dynamic(() => import('@/components/fundvista/Watchlist'), { ssr: false })
const PortfolioExport = dynamic(() => import('@/components/fundvista/PortfolioExport'), { ssr: false })

const tabAnimation = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as [number,number,number,number] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

export default function Home() {
  const { activeTab } = useFundStore()

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} {...tabAnimation}>

            {/* ── DISCOVER ─────────────────────────── */}
            {activeTab === 'explore'        && <ExploreFunds />}
            {activeTab === 'market'         && <MarketDashboard />}
            {activeTab === 'heatmap'        && <FundHeatmap />}
            {activeTab === 'nav'            && <NAVHistory />}
            {activeTab === 'screener'       && <FundScreener />}
            {activeTab === 'rankings'       && <FundRankings />}
            {activeTab === 'amc'            && <AMCAnalysis />}
            {activeTab === 'rollingreturns' && <RollingReturns />}
            {activeTab === 'categoryperf'   && <CategoryPerformance />}

            {/* ── ANALYZE ──────────────────────────── */}
            {activeTab === 'portfolio'      && <PortfolioAnalyze />}
            {activeTab === 'compare'        && <CompareView />}
            {activeTab === 'overlap'        && <FundOverlap />}
            {activeTab === 'sector'         && <SectorExposure />}
            {activeTab === 'diversification'&& <DiversificationScore />}
            {activeTab === 'montecarlo'     && <MonteCarloSim />}

            {/* ── PLAN ─────────────────────────────── */}
            {activeTab === 'savings'        && <SavingsCalculator />}
            {activeTab === 'sip'            && <SIPPlanner />}
            {activeTab === 'goals'          && <GoalPlanner />}
            {activeTab === 'risk'           && <RiskProfiler />}
            {activeTab === 'fdvsmf'         && <FDvsMF />}
            {activeTab === 'inflation'      && <InflationCalculator />}

            {/* ── OPTIMIZE ─────────────────────────── */}
            {activeTab === 'tax'            && <TaxMitra />}
            {activeTab === 'exitload'       && <ExitLoadCalc />}
            {activeTab === 'rebalance'      && <RebalancingView />}
            {activeTab === 'stress'         && <StressTest />}
            {activeTab === 'commission'     && <CommissionDisclosure />}
            {activeTab === 'elsstax'        && <ELSSTaxSaver />}
            {activeTab === 'emergency'      && <EmergencyFund />}

            {/* ── TOOLS ────────────────────────────── */}
            {activeTab === 'xirr'           && <XIRRCalculator />}
            {activeTab === 'watchlist'      && <Watchlist />}
            {activeTab === 'export'         && <PortfolioExport />}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating AI Co-Pilot — always visible */}
      <AICopilot />
    </div>
  )
}