'use client';

import { Trash2 } from 'lucide-react';
import { FundSearchResult } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface SelectedFund extends FundSearchResult {
  units: number;
}

interface Props {
  funds: SelectedFund[];
  onUpdateUnits: (code: string, units: number) => void;
  onRemove: (code: string) => void;
}

export default function PortfolioBuilder({ funds, onUpdateUnits, onRemove }: Props) {
  if (funds.length === 0) return null;
  const totalValue = funds.reduce((sum, f) => sum + (f.nav || 0) * (f.units || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="section-label">Your Selection ({funds.length})</div>
        {totalValue > 0 && (
          <div className="text-sm text-slate-400">Total Value: <span className="font-semibold text-emerald-400 data-value">{formatCurrency(totalValue)}</span></div>
        )}
      </div>
      <div className="space-y-3">
        {funds.map((fund, index) => (
          <div key={fund.scheme_code} className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 hover:border-[#253044] transition-all duration-200 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-100 leading-tight truncate">{fund.scheme_name}</div>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                  <span className="uppercase font-semibold tracking-wide">{fund.amc_name}</span>
                  <span className="text-slate-700">•</span>
                  <span className={fund.plan_type === 'Direct' ? 'badge-direct' : 'badge-regular'}>{fund.plan_type}</span>
                  <span className="text-slate-700">•</span>
                  <span className="data-value">NAV: ₹{fund.nav}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-1">Units</label>
                  <input type="number" value={fund.units || ''} onChange={(e) => onUpdateUnits(fund.scheme_code, parseFloat(e.target.value) || 0)} placeholder="0.00"
                    className="bg-[#0a0f1e] border border-[#1e293b] rounded-lg px-3 py-2 w-28 text-sm data-value text-slate-200 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all" />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-1">Value</label>
                  <div className="bg-[#0a0f1e] border border-transparent px-3 py-2 w-32 text-sm data-value text-emerald-400 rounded-lg">
                    {formatCurrency((fund.nav || 0) * (fund.units || 0))}
                  </div>
                </div>
                <button onClick={() => onRemove(fund.scheme_code)} className="mt-5 p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-200" aria-label="Remove fund">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
