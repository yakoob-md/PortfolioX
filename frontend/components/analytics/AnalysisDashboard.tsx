'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Shield, CheckCircle2, Share2, Info, AlertTriangle } from 'lucide-react';
import HealthScoreGauge from './HealthScoreGauge';
import OverlapMatrix from './OverlapMatrix';
import { AnalysisResult } from '@/lib/types';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

interface Props {
  result: AnalysisResult;
  isReadOnly?: boolean;
}

export default function AnalysisDashboard({ result, isReadOnly = false }: Props) {
  const [activeTab, setActiveTab] = useState('overlap');
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/report/${result.session_id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Health & Flags */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card text-center">
            <HealthScoreGauge score={result.health_score} />
            <div className="mt-6 text-slate-400 text-sm italic leading-relaxed">
              "{result.health_explanation}"
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Red Flags
            </h3>
            <div className="space-y-3">
              {result.red_flags.map((flag, i) => (
                <div key={i} className="flex gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-200">
                  <span>{flag}</span>
                </div>
              ))}
              {result.red_flags.length === 0 && (
                <div className="flex gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-200">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Your portfolio looks healthy! No major red flags found.</span>
                </div>
              )}
            </div>
          </div>

          {!isReadOnly && (
            <button 
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-4 rounded-xl font-bold transition-all border border-slate-700"
            >
              {copied ? <CheckCircle2 className="text-emerald-500" /> : <Share2 className="text-slate-400" />}
              {copied ? 'Link Copied!' : 'Share This Report'}
            </button>
          )}
        </div>

        {/* Right Column: Detailed Tabs */}
        <div className="lg:col-span-8">
          <div className="card p-0 overflow-hidden">
            <div className="flex border-b border-slate-700 bg-slate-900/50">
              <TabButton active={activeTab === 'overlap'} onClick={() => setActiveTab('overlap')} label="Overlap" />
              <TabButton active={activeTab === 'sectors'} onClick={() => setActiveTab('sectors')} label="Sectors" />
              <TabButton active={activeTab === 'costs'} onClick={() => setActiveTab('costs')} label="Costs" />
              <TabButton active={activeTab === 'stocks'} onClick={() => setActiveTab('stocks')} label="Top Stocks" />
            </div>

            <div className="p-6">
              {activeTab === 'overlap' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                    <Info className="w-4 h-4" />
                    Pairwise overlap shows how much two funds mirror each other. Over 30% is high.
                  </div>
                  <OverlapMatrix matrix={result.overlap_matrix} />
                </div>
              )}

              {activeTab === 'sectors' && (
                <div className="grid md:grid-cols-2 gap-8 h-[400px]">
                  <div className="flex flex-col">
                    <h4 className="text-sm font-bold text-slate-500 uppercase mb-4">Sector Exposure</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(result.sector_exposure).map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {Object.entries(result.sector_exposure).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-sm font-bold text-slate-500 uppercase mb-4">Market Cap Breakdown</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Object.entries(result.marketcap_breakdown).map(([name, value]) => ({ name, value }))}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {activeTab === 'costs' && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                      <div className="text-xs font-bold text-slate-500 uppercase mb-1">Weighted Expense Ratio</div>
                      <div className="text-2xl font-mono text-emerald-400">{result.expense_audit.total_weighted_expense_ratio}%</div>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                      <div className="text-xs font-bold text-slate-500 uppercase mb-1">Potential Savings</div>
                      <div className="text-2xl font-mono text-emerald-400">₹{result.expense_audit.potential_savings_yearly.toLocaleString()}/yr</div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-700">
                          <th className="py-3">Fund Name</th>
                          <th className="py-3">Plan</th>
                          <th className="py-3 text-right">Expense %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.funds.map((f, i) => (
                          <tr key={i} className="border-b border-slate-800">
                            <td className="py-3 font-medium">{f.scheme_name}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                f.plan_type === 'Direct' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'
                              }`}>
                                {f.plan_type}
                              </span>
                            </td>
                            <td className="py-3 text-right font-mono">{f.expense_ratio || '--'}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'stocks' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="py-4 px-2 text-slate-400 font-bold uppercase text-xs">Stock Name</th>
                        <th className="py-4 px-2 text-slate-400 font-bold uppercase text-xs">Sector</th>
                        <th className="py-4 px-2 text-slate-400 font-bold uppercase text-xs text-center">Funds</th>
                        <th className="py-4 px-2 text-slate-400 font-bold uppercase text-xs text-right">Total %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.top_stock_concentrations.map((stock, i) => (
                        <tr key={i} className="border-b border-slate-800">
                          <td className="py-4 px-2 text-sm font-bold text-slate-200">{stock.stock_name}</td>
                          <td className="py-4 px-2 text-xs text-slate-500">{stock.sector}</td>
                          <td className="py-4 px-2 text-center text-xs font-mono">{stock.fund_count}</td>
                          <td className="py-4 px-2 text-right">
                            <span className={`font-mono ${stock.exposure > 5 ? 'text-orange-400' : 'text-emerald-400'}`}>
                              {stock.exposure}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-4 font-bold text-sm uppercase tracking-wider transition-all border-b-2 ${
        active ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'
      }`}
    >
      {label}
    </button>
  );
}
