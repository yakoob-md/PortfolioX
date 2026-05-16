'use client'

import { useFundStore } from '@/lib/store'
import { Search, Briefcase, GitCompareArrows, Calculator, TrendingUp } from 'lucide-react'

const tabs = [
  { id: 'explore' as const, label: 'Explore Funds', icon: Search, desc: 'Search & browse funds' },
  { id: 'portfolio' as const, label: 'My Portfolio', icon: Briefcase, desc: 'Add & manage holdings' },
  { id: 'compare' as const, label: 'Compare', icon: GitCompareArrows, desc: 'Side-by-side analysis' },
  { id: 'savings' as const, label: 'Savings Calc', icon: Calculator, desc: 'Lifetime cost savings' },
]

export default function TabNav() {
  const { activeTab, setActiveTab, holdings, selectedFundIds } = useFundStore()

  return (
    <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex gap-1 overflow-x-auto py-2" aria-label="Main navigation">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            const badge = tab.id === 'portfolio' && holdings.length > 0 
              ? holdings.length 
              : tab.id === 'compare' && selectedFundIds.length > 0 
              ? selectedFundIds.length 
              : 0
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {badge > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
