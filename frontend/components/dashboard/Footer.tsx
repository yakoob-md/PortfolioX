'use client'

import { Heart, TrendingUp, Shield, BarChart3, Calculator, LayoutGrid } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Built with</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500" />
            <span>for Indian retail investors</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> 71+ Funds</span>
            <span className="flex items-center gap-1"><LayoutGrid className="h-3 w-3" /> 46 Features</span>
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Risk Analysis</span>
            <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Stress Testing</span>
            <span className="flex items-center gap-1"><Calculator className="h-3 w-3" /> Tax & SIP</span>
          </div>
        </div>
        <div className="mt-3 flex flex-col items-center gap-1 sm:flex-row sm:justify-between">
          <span className="text-xs text-muted-foreground/60">
            Data sourced from AMFI, NSE & fund house factsheets
          </span>
          <span className="text-xs text-muted-foreground/60">
            Not SEBI-registered advice · Educational tool only
          </span>
        </div>
      </div>
    </footer>
  )
}
