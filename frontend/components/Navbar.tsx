'use client'

import { useFundStore } from '@/lib/store'
import { TABS, GROUPS } from '@/lib/constants'
import { Shield, ChevronDown, Sparkles, Sun, Moon } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Navbar() {
  const { activeTab, setActiveTab } = useFundStore()
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(true)

  const grouped = GROUPS.map(group => ({
    group,
    tabs: TABS.filter(t => t.group === group)
  }))

  const activeTabConfig = TABS.find(t => t.id === activeTab)
  const activeGroup = activeTabConfig?.group

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-background animate-pulse" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-foreground">
              Portfolio<span className="text-primary">X</span>
            </span>
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">India&apos;s MF Intelligence</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {grouped.map(({ group, tabs }) => (
            <div key={group} className="relative"
              onMouseEnter={() => setOpenGroup(group)}
              onMouseLeave={() => setOpenGroup(null)}
            >
              <button className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeGroup === group
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}>
                {group}
                <ChevronDown className={`w-3 h-3 transition-transform ${openGroup === group ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {openGroup === group && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1 w-52 bg-card border border-border rounded-xl shadow-2xl shadow-black/40 p-2 z-50"
                  >
                    {tabs.map(tab => {
                      const Icon = tab.icon
                      return (
                        <button
                          key={tab.id}
                          onClick={() => { setActiveTab(tab.id as Parameters<typeof setActiveTab>[0]); setOpenGroup(null) }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                            activeTab === tab.id
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {tab.label}
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Active tab pill */}
          {activeTabConfig && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 border border-primary/15 rounded-full">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs font-semibold text-primary">{activeTabConfig.label}</span>
            </div>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg flex items-center justify-center border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="lg:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto scrollbar-none">
        {GROUPS.map(group => (
          <button
            key={group}
            onClick={() => {
              const firstTab = TABS.find(t => t.group === group)
              if (firstTab) setActiveTab(firstTab.id as Parameters<typeof setActiveTab>[0])
            }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeGroup === group
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground border border-transparent hover:border-border'
            }`}
          >
            {group}
          </button>
        ))}
      </div>
    </header>
  )
}
