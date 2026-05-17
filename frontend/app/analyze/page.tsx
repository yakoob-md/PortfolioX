'use client';

import { useState } from 'react';
import { Shield, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import FundSearchInput from '@/components/fund-input/FundSearchInput';
import PortfolioBuilder from '@/components/fund-input/PortfolioBuilder';
import PortfolioImport from '@/components/fund-input/PortfolioImport';
import AnalysisDashboard from '@/components/analytics/AnalysisDashboard';
import { analyzePortfolio } from '@/lib/api-client';
import { AnalysisResult, FundSearchResult, Holding } from '@/lib/types';

export default function AnalyzePage() {
  const [selectedFunds, setSelectedFunds] = useState<(FundSearchResult & { units: number; custom_holdings?: Holding[] })[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAddFund = (fund: FundSearchResult) => {
    if (selectedFunds.find(f => f.scheme_code === fund.scheme_code)) return;
    setSelectedFunds([...selectedFunds, { ...fund, units: 0 }]);
  };

  const handleImport = (holdings: Holding[]) => {
    const code = `CUSTOM_${Date.now()}`;
    const newFund = {
      scheme_code: code,
      scheme_name: 'Imported Portfolio',
      amc_name: 'User Defined',
      units: 1,
      nav: 0,
      custom_holdings: holdings
    };
    setSelectedFunds([...selectedFunds, newFund]);
  };

  const handleUpdateUnits = (code: string, units: number) => {
    setSelectedFunds(selectedFunds.map(f => f.scheme_code === code ? { ...f, units } : f));
  };

  const handleRemove = (code: string) => {
    setSelectedFunds(selectedFunds.filter(f => f.scheme_code !== code));
  };

  const handleAnalyze = async () => {
    if (selectedFunds.length < 2) return;
    setLoading(true);
    try {
      const data = await analyzePortfolio(selectedFunds.map(f => ({
        scheme_code: f.scheme_code,
        scheme_name: f.scheme_name,
        units: f.units,
        custom_holdings: f.custom_holdings
      })));
      setResult(data);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed. Make sure you entered units for all funds.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-2 border-border flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <div className="absolute -inset-4 rounded-full border border-primary/10 animate-ping" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mt-8 mb-2">Analyzing Your Portfolio</h2>
        <p className="text-muted-foreground text-sm max-w-xs">Computing overlap matrices, sector exposure, and health scores...</p>
        <div className="mt-6 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-primary/40 animate-pulse-subtle" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">Portfolio<span className="text-primary">X</span></span>
              <span className="hidden sm:inline text-muted-foreground mx-2">|</span>
              <span className="hidden sm:inline text-sm text-muted-foreground font-medium">Analysis Report</span>
            </div>
            <button onClick={() => setResult(null)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Input
            </button>
          </div>
        </header>
        <div className="p-4 md:p-8">
          <AnalysisDashboard result={result} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">Portfolio<span className="text-primary">X</span></span>
          </div>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors">Home</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 animate-fade-in">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-[0.15em]">Portfolio Builder</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-3">Build Your Portfolio</h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-xl">Add at least 2 funds you hold and specify units to discover hidden overlaps, sector concentration, and cost leakages.</p>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="section-label mb-3">Add Fund</div>
            <FundSearchInput onSelect={handleAddFund} />
            <PortfolioImport onImport={handleImport} />
          </div>
          <PortfolioBuilder funds={selectedFunds} onUpdateUnits={handleUpdateUnits} onRemove={handleRemove} />
          <div className="pt-6 flex flex-col items-center gap-3">
            <button
              onClick={handleAnalyze}
              disabled={selectedFunds.length < 2 || selectedFunds.some(f => f.units <= 0)}
              className="inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:cursor-not-allowed text-primary-foreground text-lg font-bold py-4 px-10 rounded-xl transition-all duration-200 shadow-xl hover:shadow-primary/20 min-w-[280px]"
            >
              <Sparkles className="w-5 h-5" />
              Analyze My Portfolio
            </button>
            {selectedFunds.length === 1 && (
              <p className="text-amber-500/80 text-sm animate-pulse-subtle">Add at least 2 funds to see overlap analysis</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
