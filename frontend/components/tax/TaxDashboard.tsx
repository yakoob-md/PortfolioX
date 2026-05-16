'use client';

import { useState } from 'react';
import { IndianRupee, TrendingDown, Target, Calculator, ExternalLink, CheckCircle2, ArrowRight, Info, PieChart as PieIcon, List as ListIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

const CHART_COLORS = ['#f59e0b', '#3b82f6'];

interface Props {
  result: any;
}

export default function TaxDashboard({ result }: Props) {
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Top Summary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard 
          label="Total Liability" 
          value={`₹${result.total_tax.toLocaleString()}`} 
          subtitle={`FY ${result.financial_year}`}
          icon={<Calculator className="w-4 h-4" />} 
          accent="emerald"
        />
        <SummaryCard 
          label="Exemption Used" 
          value={`₹${result.ltcg_exempt.toLocaleString()}`} 
          subtitle={`₹${result.ltcg_optimization.exemption_remaining.toLocaleString()} left`}
          progress={(result.ltcg_exempt / 125000) * 100}
          icon={<Target className="w-4 h-4" />} 
          accent="blue"
        />
        <SummaryCard 
          label="Savings Potential" 
          value={`₹${(result.harvesting_opportunities.reduce((acc: number, curr: any) => acc + curr.potential_tax_savings, 0)).toLocaleString()}`} 
          subtitle="Via Tax-Loss Harvesting"
          icon={<TrendingDown className="w-4 h-4" />} 
          accent="orange"
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Detailed Breakdown & Optimization */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="overflow-hidden border-[#1e293b]">
            <Tabs defaultValue="summary" className="w-full">
              <div className="border-b border-[#1e293b] px-6 pt-4">
                <TabsList className="bg-transparent border-0 p-0 h-auto gap-8">
                  <TabsTrigger value="summary" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-emerald-400 px-0 pb-4 text-xs font-bold uppercase tracking-widest">
                    <PieIcon className="w-3.5 h-3.5 mr-2" /> Tax Summary
                  </TabsTrigger>
                  <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-emerald-400 px-0 pb-4 text-xs font-bold uppercase tracking-widest">
                    <ListIcon className="w-3.5 h-3.5 mr-2" /> Transaction Gains
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="summary" className="p-8">
                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="h-[260px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'STCG Tax', value: result.stcg_tax },
                              { name: 'LTCG Tax', value: result.ltcg_tax },
                              { name: 'Debt Tax', value: result.debt_tax },
                            ].filter(d => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={75}
                            outerRadius={100}
                            paddingAngle={8}
                            dataKey="value"
                            nameKey="name"
                            stroke="none"
                          >
                            <Cell fill="#f59e0b" />
                            <Cell fill="#3b82f6" />
                            <Cell fill="#ef4444" />
                          </Pie>
                          <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.1em]">Total Tax</span>
                        <span className="text-3xl font-black text-slate-100 data-value">₹{result.total_tax.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <BreakdownCard 
                        label="STCG (Short Term)" 
                        tax={`₹${result.stcg_tax.toLocaleString()}`} 
                        amount={`on ₹${result.total_stcg.toLocaleString()}`} 
                        rate="20.0%" 
                        color="orange" 
                      />
                      <BreakdownCard 
                        label="LTCG (Long Term)" 
                        tax={`₹${result.ltcg_tax.toLocaleString()}`} 
                        amount={`on ₹${result.ltcg_taxable.toLocaleString()}`} 
                        rate="12.5%" 
                        color="blue" 
                      />
                      {result.debt_tax > 0 && (
                        <BreakdownCard 
                          label="Debt (Post-2023)" 
                          tax={`₹${result.debt_tax.toLocaleString()}`} 
                          amount={`on ₹${result.total_debt_gain.toLocaleString()}`} 
                          rate="Slab Rate" 
                          color="red" 
                        />
                      )}
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/10">
                    <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Target className="w-3.5 h-3.5" />
                      LTCG Optimization Strategy
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {result.ltcg_optimization.suggested_action}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-500 border-b border-[#1e293b] bg-[#0a0f1e]/30">
                        <th className="py-4 px-8 text-[10px] font-bold uppercase tracking-wider">Scheme / Dates</th>
                        <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider">Type</th>
                        <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider text-right">Units</th>
                        <th className="py-4 px-8 text-[10px] font-bold uppercase tracking-wider text-right">Gain/Loss</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b]">
                      {result.gain_entries.map((entry: any, i: number) => (
                        <tr key={i} className="group hover:bg-white/[0.015] transition-colors">
                          <td className="py-5 px-8">
                            <div className="font-semibold text-slate-200 text-sm line-clamp-1">{entry.scheme_name}</div>
                            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                              <span className="data-value">{new Date(entry.purchase_date).toLocaleDateString()}</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                              <span className="data-value">{new Date(entry.redemption_date).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="py-5 px-4">
                            <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${entry.gain_type === 'LTCG' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                              {entry.gain_type}
                            </span>
                          </td>
                          <td className="py-5 px-4 text-right font-mono text-xs text-slate-400 data-value">{entry.units.toFixed(3)}</td>
                          <td className={`py-5 px-8 text-right font-mono font-bold text-sm data-value ${entry.gain_amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {entry.gain_amount >= 0 ? '+' : ''}₹{entry.gain_amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Right Column - Savings & Tools */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-orange-500/[0.02] border-orange-500/10 p-6">
            <h3 className="text-xs font-bold text-orange-400 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Tax Harvesting
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              The following funds have unrealized losses. Redeeming them now can offset your capital gains and reduce your tax bill.
            </p>
            
            <div className="space-y-4">
              {result.harvesting_opportunities.map((opp: any, i: number) => (
                <div key={i} className="p-4 rounded-xl bg-[#0a0f1e] border border-[#1e293b] hover:border-orange-500/20 transition-colors group">
                  <div className="text-xs font-bold text-slate-300 mb-3 truncate group-hover:text-slate-100 transition-colors">{opp.scheme_name}</div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">Unrealized Loss</div>
                      <div className="text-red-400 font-bold text-sm data-value">₹{opp.unrealized_loss.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">Tax Savings</div>
                      <div className="text-emerald-400 font-bold text-sm data-value">₹{opp.potential_tax_savings.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
              {result.harvesting_opportunities.length === 0 && (
                <div className="text-center py-10 bg-[#0a0f1e]/50 rounded-xl border border-dashed border-[#1e293b]">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/[0.08] flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="text-emerald-400 w-5 h-5" />
                  </div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">No harvesting needed</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="border-[#1e293b] bg-transparent p-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">Tax Rules Reference</h3>
            <div className="space-y-5">
              <RuleItem label="Equity STCG" desc="20% tax if sold within 12 months" color="orange" />
              <RuleItem label="Equity LTCG" desc="12.5% tax after ₹1.25L exemption (12+ months)" color="blue" />
            </div>
            <a 
              href="https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1" 
              target="_blank"
              className="mt-8 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-emerald-500 transition-colors group"
            >
              Read Official Tax Laws
              <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, subtitle, progress, icon, accent }: any) {
  const accentColors: any = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };

  return (
    <Card className="p-6 border-[#1e293b] relative overflow-hidden group">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-700/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-500" />
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg border ${accentColors[accent]}`}>
          {icon}
        </div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-3xl font-black text-slate-100 data-value">{value}</div>
      {progress !== undefined && (
        <div className="w-full bg-[#0a0f1e] h-1.5 rounded-full mt-5 overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${accent === 'blue' ? 'bg-blue-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-3">{subtitle}</p>
    </Card>
  );
}

function BreakdownCard({ label, tax, amount, rate, color }: any) {
  const colors: any = {
    orange: 'bg-orange-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500',
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-[#0a0f1e] border border-[#1e293b] hover:border-slate-700 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`w-2 h-2 rounded-full ${colors[color]}`} />
        <div>
          <div className="text-xs font-bold text-slate-200">{label}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Taxed at {rate}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-slate-100 data-value">{tax}</div>
        <div className="text-[10px] text-slate-500 data-value">{amount}</div>
      </div>
    </div>
  );
}

function RuleItem({ label, desc, color }: any) {
  const colors: any = {
    orange: 'bg-orange-500/10 text-orange-400',
    blue: 'bg-blue-500/10 text-blue-400',
  };

  return (
    <div className="flex gap-4">
      <div className={`p-2 h-fit rounded-lg ${colors[color]}`}>
        <IndianRupee className="w-3.5 h-3.5" />
      </div>
      <div>
        <div className="text-xs font-bold text-slate-300">{label}</div>
        <div className="text-[10px] text-slate-500 leading-relaxed mt-0.5">{desc}</div>
      </div>
    </div>
  );
}
