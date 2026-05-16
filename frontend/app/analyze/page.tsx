'use client';

import { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import Link from 'next/link';
import FundSearchInput from '@/components/fund-input/FundSearchInput';
import PortfolioBuilder from '@/components/fund-input/PortfolioBuilder';
import AnalysisDashboard from '@/components/analytics/AnalysisDashboard';
import { analyzePortfolio } from '@/lib/api-client';
import { AnalysisResult, FundSearchResult } from '@/lib/types';

export default function AnalyzePage() {
  const [selectedFunds, setSelectedFunds] = useState<(FundSearchResult & { units: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAddFund = (fund: FundSearchResult) => {
    if (selectedFunds.find(f => f.scheme_code === fund.scheme_code)) return;
    setSelectedFunds([...selectedFunds, { ...fund, units: 0 }]);
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
        units: f.units
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mb-6" />
        <h2 className="text-2xl font-bold mb-2">Analyzing Your Portfolio</h2>
        <p className="text-slate-400">Computing overlap and health scores...</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8">
        <header className="max-w-7xl mx-auto flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-500" />
            <span className="text-xl font-bold tracking-tight">PortfolioX <span className="text-slate-500 font-normal">| Analysis</span></span>
          </div>
          <button 
            onClick={() => setResult(null)}
            className="text-slate-400 hover:text-slate-100 font-semibold"
          >
            ← Back to Input
          </button>
        </header>

        <AnalysisDashboard result={result} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8">
      <header className="max-w-4xl mx-auto flex items-center justify-between mb-12">
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-emerald-500" />
          <span className="text-2xl font-bold tracking-tight">PortfolioX</span>
        </div>
        <Link href="/" className="text-slate-400 hover:text-slate-100 font-semibold">Home</Link>
      </header>

      <main className="max-w-4xl mx-auto animate-fade-in">
        <div className="mb-12">
          <h1 className="text-4xl font-black mb-4 tracking-tight">Build Your Portfolio</h1>
          <p className="text-slate-400 text-lg leading-relaxed">Add at least 2 funds you hold and specify units to discover hidden overlaps and costs.</p>
        </div>

        <div className="space-y-8">
          <div className="card bg-slate-900/80 border-slate-700/50">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Add Fund</h2>
            <FundSearchInput onSelect={handleAddFund} />
          </div>

          <PortfolioBuilder 
            funds={selectedFunds} 
            onUpdateUnits={handleUpdateUnits}
            onRemove={handleRemove}
          />

          <div className="pt-8 flex justify-center">
            <button
              onClick={handleAnalyze}
              disabled={selectedFunds.length < 2 || selectedFunds.some(f => f.units <= 0)}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xl font-bold py-5 px-16 rounded-2xl transition-all shadow-xl shadow-emerald-500/10"
            >
              Analyze My Portfolio
            </button>
          </div>
          
          {selectedFunds.length === 1 && (
            <p className="text-center text-orange-400 text-sm animate-pulse">Add at least 2 funds to see overlap analysis.</p>
          )}
        </div>
      </main>
    </div>
  );
}
