'use client';

import { useState } from 'react';
import { IndianRupee, TrendingDown, Target, List, ArrowDownRight, ArrowUpRight, Calculator, ExternalLink, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'];

interface Props {
  result: any;
}

export default function TaxDashboard({ result }: Props) {
  const [activeTab, setActiveTab] = useState('summary');

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Top Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-slate-900 border-emerald-500/20 shadow-xl shadow-emerald-500/5">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-emerald-500/10 p-2 rounded-lg">
              <Calculator className="w-6 h-6 text-emerald-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Liability</span>
          </div>
          <div className="text-4xl font-black text-slate-100">₹{result.total_tax.toLocaleString()}</div>
          <p className="text-slate-500 text-sm mt-2">Estimated for FY {result.financial_year}</p>
        </div>

        <div className="card bg-slate-900 border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-blue-500/10 p-2 rounded-lg">
              <Target className="w-6 h-6 text-blue-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Exemption Used</span>
          </div>
          <div className="text-4xl font-black text-slate-100">₹{result.ltcg_exempt.toLocaleString()}</div>
          <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-1000" 
              style={{ width: `${(result.ltcg_exempt / 125000) * 100}%` }}
            ></div>
          </div>
          <p className="text-slate-500 text-xs mt-2">₹{result.ltcg_optimization.exemption_remaining.toLocaleString()} tax-free LTCG left</p>
        </div>

        <div className="card bg-slate-900 border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-orange-500/10 p-2 rounded-lg">
              <TrendingDown className="w-6 h-6 text-orange-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Savings Potential</span>
          </div>
          <div className="text-4xl font-black text-orange-400">
            ₹{(result.harvesting_opportunities.reduce((acc: number, curr: any) => acc + curr.potential_tax_savings, 0)).toLocaleString()}
          </div>
          <p className="text-slate-500 text-sm mt-2">Via Tax-Loss Harvesting</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Detailed Breakdown & Optimization */}
        <div className="lg:col-span-8 space-y-8">
          <div className="card p-0 overflow-hidden">
            <div className="flex border-b border-slate-800 bg-slate-900/50">
              <button 
                onClick={() => setActiveTab('summary')}
                className={`px-8 py-5 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'summary' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                Tax Summary
              </button>
              <button 
                onClick={() => setActiveTab('details')}
                className={`px-8 py-5 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'details' ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                Transaction Gains
              </button>
            </div>

            <div className="p-8">
              {activeTab === 'summary' ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="h-[250px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'STCG Tax', value: result.stcg_tax },
                              { name: 'LTCG Tax', value: result.ltcg_tax },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={8}
                            dataKey="value"
                          >
                            <Cell fill="#f59e0b" />
                            <Cell fill="#3b82f6" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-tighter">Total Tax</span>
                        <span className="text-2xl font-black">₹{result.total_tax.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 border border-slate-700">
                        <div className="flex items-center gap-4">
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          <div>
                            <div className="text-sm font-bold">STCG (Short Term)</div>
                            <div className="text-xs text-slate-500">Taxed at 20.0%</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">₹{result.stcg_tax.toLocaleString()}</div>
                          <div className="text-xs text-slate-500">on ₹{result.total_stcg.toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 border border-slate-700">
                        <div className="flex items-center gap-4">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <div>
                            <div className="text-sm font-bold">LTCG (Long Term)</div>
                            <div className="text-xs text-slate-500">Taxed at 12.5%</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">₹{result.ltcg_tax.toLocaleString()}</div>
                          <div className="text-xs text-slate-500">on ₹{result.ltcg_taxable.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                    <h4 className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      LTCG Optimization Strategy
                    </h4>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {result.ltcg_optimization.suggested_action}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800">
                        <th className="pb-4 text-xs font-bold uppercase tracking-wider">Scheme / Dates</th>
                        <th className="pb-4 text-xs font-bold uppercase tracking-wider">Type</th>
                        <th className="pb-4 text-xs font-bold uppercase tracking-wider text-right">Units</th>
                        <th className="pb-4 text-xs font-bold uppercase tracking-wider text-right">Gain/Loss</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {result.gain_entries.map((entry: any, i: number) => (
                        <tr key={i} className="group hover:bg-slate-800/20 transition-colors">
                          <td className="py-4">
                            <div className="font-bold text-slate-200 text-sm">{entry.scheme_name}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {new Date(entry.purchase_date).toLocaleDateString()} → {new Date(entry.redemption_date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${entry.gain_type === 'LTCG' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                              {entry.gain_type}
                            </span>
                          </td>
                          <td className="py-4 text-right font-mono text-sm text-slate-300">{entry.units.toFixed(3)}</td>
                          <td className={`py-4 text-right font-mono font-bold ${entry.gain_amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {entry.gain_amount >= 0 ? '+' : ''}₹{entry.gain_amount.toLocaleString()}
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

        {/* Right Column - Savings & Tools */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card bg-orange-500/5 border-orange-500/20">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-orange-400">
              <TrendingDown className="w-5 h-5" />
              Tax Harvesting
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              The following funds have unrealized losses. Redeeming them now can offset your capital gains and reduce your tax bill.
            </p>
            
            <div className="space-y-4">
              {result.harvesting_opportunities.map((opp: any, i: number) => (
                <div key={i} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-sm font-bold mb-1 truncate">{opp.scheme_name}</div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-xs text-slate-500">Unrealized Loss</div>
                      <div className="text-red-400 font-mono font-bold">₹{opp.unrealized_loss.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Tax Savings</div>
                      <div className="text-emerald-400 font-mono font-bold">₹{opp.potential_tax_savings.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
              {result.harvesting_opportunities.length === 0 && (
                <div className="text-center py-8">
                  <div className="bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="text-emerald-500 w-6 h-6" />
                  </div>
                  <p className="text-slate-500 text-xs">No harvesting opportunities found currently.</p>
                </div>
              )}
            </div>
          </div>

          <div className="card border-slate-800 bg-slate-900/50">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Tax Rules Reference</h3>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="bg-emerald-500/10 p-1.5 h-fit rounded">
                  <IndianRupee className="w-3 h-3 text-emerald-500" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-300">Equity STCG</div>
                  <div className="text-[10px] text-slate-500">20% tax if sold within 12 months</div>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="bg-blue-500/10 p-1.5 h-fit rounded">
                  <IndianRupee className="w-3 h-3 text-blue-500" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-300">Equity LTCG</div>
                  <div className="text-[10px] text-slate-500">12.5% tax after ₹1.25L exemption (12+ months)</div>
                </div>
              </li>
            </ul>
            <a 
              href="https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1" 
              target="_blank"
              className="mt-6 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-emerald-500 transition-colors"
            >
              Read Official Tax Laws
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
