'use client'

import { useFundStore } from '@/lib/store'
import { TABS as tabs, GROUPS as groups } from '@/lib/constants'
import { Compass, TrendingUp, Sun, Moon, ChevronDown } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'

export default function Navbar() {
  const { activeTab, setActiveTab, holdings, selectedFundIds, watchlist, goals } = useFundStore()
  const { theme, setTheme } = useTheme()
  const [showMoreTabs, setShowMoreTabs] = useState(false)

  const getBadge = (tabId: string) => {
    if (tabId === 'portfolio' && holdings.length > 0) return holdings.length
    if (tabId === 'compare' && selectedFundIds.length > 0) return selectedFundIds.length
    if (tabId === 'watchlist' && watchlist.length > 0) return watchlist.length
    if (tabId === 'goals' && goals.length > 0) return goals.length
    return 0
  }

  const activeGroup = useMemo(() => {
    const tab = tabs.find(t => t.id === activeTab)
    return tab?.group || 'Discover'
  }, [activeTab])

  return (
    <header className="sticky top-0 z-50 w-full px-6 py-4">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex items-center justify-between gap-4">
          
          {/* Logo Section */}
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setActiveTab('explore')}
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 shadow-lg shadow-emerald-600/20 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-5 w-5 text-white" />
              <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-tight text-foreground leading-none">FundVista</h1>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 mt-1">Co-Pilot</span>
            </div>
          </div>

          {/* Main Navigation Pill */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl px-2 py-1.5 rounded-full border border-white/40 dark:border-slate-800/40 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            
            {/* Explore (Primary Active) */}
            <button
              onClick={() => setActiveTab('explore')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all duration-500 ease-out ${
                activeTab === 'explore'
                  ? 'bg-emerald-600 text-white shadow-[0_4px_16px_rgba(16,185,129,0.4)] scale-[1.02]'
                  : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
              }`}
            >
              <Compass className={`h-4 w-4 ${activeTab === 'explore' ? 'animate-pulse' : ''}`} />
              EXPLORE
            </button>

            <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-2 opacity-50" />

            {/* Group Dropdowns */}
            {groups.map((group) => {
              const groupTabs = tabs.filter(t => t.group === group && t.id !== 'explore')
              const isGroupActive = activeGroup === group && activeTab !== 'explore'
              
              return (
                <DropdownMenu key={group}>
                  <DropdownMenuTrigger asChild>
                    <button className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all duration-300 outline-none group ${
                      isGroupActive 
                        ? 'text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20' 
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                    }`}>
                      {group}
                      <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${isGroupActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-100 group-hover:translate-y-0.5'}`} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="center" 
                    sideOffset={12}
                    className="w-64 rounded-[1.5rem] border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 z-[100] animate-in fade-in zoom-in-95 duration-200"
                  >
                    <DropdownMenuGroup className="space-y-1">
                      {groupTabs.map((tab) => {
                        const isActive = activeTab === tab.id
                        const badge = getBadge(tab.id)
                        const Icon = tab.icon
                        return (
                          <DropdownMenuItem 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold cursor-pointer transition-all outline-none focus:bg-emerald-50/50 dark:focus:bg-emerald-950/20 group/item ${
                              isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400 hover:translate-x-1'
                            }`}
                          >
                            <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-slate-100 dark:bg-slate-800 group-hover/item:bg-emerald-100 dark:group-hover/item:bg-emerald-900/30'}`}>
                              <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 group-hover/item:text-emerald-600 dark:group-hover/item:text-emerald-400'}`} />
                            </div>
                            <span>{tab.label}</span>
                            {badge > 0 && (
                              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white shadow-lg shadow-emerald-600/20">
                                {badge}
                              </span>
                            )}
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            })}
          </nav>

          {/* Right Side Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm hover:scale-105 active:scale-95 transition-all"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-teal-400" />
            </Button>
            
          </div>

        </div>

        {/* Mobile Navigation */}
        <div className="mt-4 flex lg:hidden items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {['explore', 'market', 'portfolio', 'compare', 'goals'].map((id) => {
            const tab = tabs.find(t => t.id === id)!
            const isActive = activeTab === id
            const Icon = tab.icon
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all ${
                  isActive 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                    : 'bg-white/80 dark:bg-slate-900/80 text-slate-500 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
