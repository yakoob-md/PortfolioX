'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { CheckCircle2, Share2, AlertTriangle, IndianRupee, Layers, BarChart3, TrendingUp, Copy, Check, Info } from 'lucide-react';
import HealthScoreGauge from '@/components/analytics/HealthScoreGauge';
import OverlapMatrix from './OverlapMatrix';
import { AnalysisResult } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency, formatPercent } from '@/lib/utils';

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];

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
      {/* Summary Stats Row */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Portfolio Value" value={formatCurrency(result.total_value)} icon={<IndianRupee className="w-4 h-4" />} accent="emerald" />
        <SummaryCard label="Funds Analyzed" value={String(result.funds.length)} icon={<Layers className="w-4 h-4" />} accent="teal" />
        <SummaryCard label="Weighted Expense" value={formatPercent(result.expense_audit.total_weighted_expense_ratio)} icon={<TrendingUp className="w-4 h-4" />} accent="amber" />
        <SummaryCard label="Potential Savings" value={formatCurrency(result.expense_audit.potential_savings_yearly)} subtitle="/year" icon={<BarChart3 className="w-4 h-4" />} accent="emerald" />
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="section-label mb-4">Portfolio Health</div>
            <HealthScoreGauge score={result.health_score} />
            <div className="mt-5 text-sm text-muted-foreground italic leading-relaxed text-center px-2">&ldquo;{result.health_explanation}&rdquo;</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="section-label mb-4 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Red Flags
            </h3>
            <div className="space-y-2.5">
              {result.red_flags.map((flag, i) => (
                <div key={i} className="flex gap-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/15 rounded-lg text-xs text-red-700 dark:text-red-300 leading-relaxed">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{flag}</span>
                </div>
              ))}
              {result.red_flags.length === 0 && (
                <div className="flex gap-3 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/15 rounded-lg text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                  <span>Your portfolio looks healthy! No major red flags found.</span>
                </div>
              )}
            </div>
          </div>

          {!isReadOnly && result.session_id && (
            <button onClick={handleCopyLink} className="w-full flex items-center justify-center gap-2.5 bg-card hover:bg-muted py-3.5 rounded-xl font-semibold text-sm transition-all border border-border hover:border-primary/30 text-foreground">
              {copied ? <><Check className="w-4 h-4 text-emerald-500" /><span className="text-emerald-500">Link Copied!</span></> : <><Copy className="w-4 h-4 text-muted-foreground" />Share This Report</>}
            </button>
          )}
        </div>

        {/* Right Column: Tabs */}
        <div className="lg:col-span-8">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b border-border px-4 pt-3">
                <TabsList className="w-full justify-start bg-transparent border-0 p-0 h-auto gap-0">
                  <TabsTrigger value="overlap" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary">
                    <Layers className="w-3.5 h-3.5 mr-1.5" />Overlap
                  </TabsTrigger>
                  <TabsTrigger value="sectors" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary">
                    <BarChart3 className="w-3.5 h-3.5 mr-1.5" />Sectors
                  </TabsTrigger>
                  <TabsTrigger value="costs" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary">
                    <IndianRupee className="w-3.5 h-3.5 mr-1.5" />Costs
                  </TabsTrigger>
                  <TabsTrigger value="stocks" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary">
                    <TrendingUp className="w-3.5 h-3.5 mr-1.5" />Top Stocks
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overlap" className="p-6">
                <div className="space-y-5">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 border border-border">
                    <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span>Pairwise overlap shows how much two funds mirror each other. <strong className="text-foreground">Over 30% is high</strong> — consider consolidating.</span>
                  </div>
                  <OverlapMatrix matrix={result.overlap_matrix} />
                </div>
              </TabsContent>

              <TabsContent value="sectors" className="p-6">
                <div className="grid md:grid-cols-2 gap-6 h-[400px]">
                  <div className="flex flex-col">
                    <div className="section-label mb-4">Sector Exposure</div>
                    <ResponsiveContainer key={`pie-${activeTab}`} width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={Object.entries(result.sector_exposure).map(([name, value]) => ({ name, value }))} 
                          cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3} 
                          dataKey="value" nameKey="name" stroke="none"
                        >
                          {Object.entries(result.sector_exposure).map((_, index) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--color-card-foreground)' }} itemStyle={{ color: 'var(--color-muted-foreground)' }} labelStyle={{ color: 'var(--color-foreground)', fontWeight: 600 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col">
                    <div className="section-label mb-4">Market Cap Breakdown</div>
                    <ResponsiveContainer key={`bar-${activeTab}`} width="100%" height="100%">
                      <BarChart data={Object.entries(result.marketcap_breakdown).map(([name, value]) => ({ name, value }))} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--color-card-foreground)' }} itemStyle={{ color: 'var(--color-muted-foreground)' }} labelStyle={{ color: 'var(--color-foreground)', fontWeight: 600 }} />
                        <Bar dataKey="value" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="costs" className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/30 p-4 rounded-lg border border-border">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Weighted Expense Ratio</div>
                      <div className="text-2xl data-value text-emerald-600 dark:text-emerald-400 font-bold">{result.expense_audit.total_weighted_expense_ratio}%</div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${Math.min((result.expense_audit.total_weighted_expense_ratio / result.expense_audit.benchmark_expense_ratio) * 100, 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground data-value">vs {result.expense_audit.benchmark_expense_ratio}% avg</span>
                      </div>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-lg border border-border">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Potential Savings</div>
                      <div className="text-2xl data-value text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatCurrency(result.expense_audit.potential_savings_yearly)}<span className="text-sm text-muted-foreground font-normal">/yr</span>
                      </div>
                      <div className="mt-2 text-[10px] text-muted-foreground">Switch Regular → Direct plans</div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fund Name</th>
                          <th className="py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Plan</th>
                          <th className="py-3 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Expense %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.funds.map((f, i) => (
                          <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="py-3 pr-4"><span className="text-sm font-medium text-foreground line-clamp-1">{f.scheme_name}</span></td>
                            <td className="py-3">
                              <span className={f.plan_type === 'Direct' ? 'badge-direct' : 'badge-regular'}>{f.plan_type}</span>
                            </td>
                            <td className="py-3 text-right data-value text-foreground">{(f.expense_ratio || 0).toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="stocks" className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-3 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stock Name</th>
                        <th className="py-3 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sector</th>
                        <th className="py-3 px-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Funds</th>
                        <th className="py-3 px-2 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Exposure</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.top_stock_concentrations.map((stock, i) => (
                        <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-2 text-sm font-semibold text-foreground">{stock.stock_name}</td>
                          <td className="py-3 px-2 text-xs text-muted-foreground">{stock.sector}</td>
                          <td className="py-3 px-2 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-muted border border-border text-xs data-value text-foreground">{stock.fund_count}</span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className={`data-value font-semibold ${stock.exposure > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{stock.exposure}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, subtitle, icon, accent }: { label: string; value: string; subtitle?: string; icon: React.ReactNode; accent: 'emerald' | 'teal' | 'amber' }) {
  const accentMap = {
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    teal: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
  };
  const iconColor = { emerald: 'text-emerald-600 dark:text-emerald-400', teal: 'text-teal-600 dark:text-teal-400', amber: 'text-amber-600 dark:text-amber-400' };

  return (
    <div className="relative overflow-hidden bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-all duration-300 group">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/40 transition-all duration-500" />
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${accentMap[accent]}`}>
          <span className={iconColor[accent]}>{icon}</span>
        </div>
      </div>
      <div className="text-xl font-bold data-value text-foreground">
        {value}{subtitle && <span className="text-xs text-muted-foreground font-normal">{subtitle}</span>}
      </div>
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] mt-1">{label}</div>
    </div>
  );
}
