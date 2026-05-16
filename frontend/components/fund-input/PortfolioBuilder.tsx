'use client';

import { Trash2 } from 'lucide-react';
import { FundSearchResult } from '@/lib/types';

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

  return (
    <div className="space-y-4 mt-8">
      <h3 className="text-lg font-bold text-slate-400 px-1 uppercase tracking-wider">Your Selection ({funds.length})</h3>
      <div className="space-y-3">
        {funds.map((fund) => (
          <div key={fund.scheme_code} className="card py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
            <div className="flex-1">
              <div className="font-bold text-lg leading-tight">{fund.scheme_name}</div>
              <div className="text-sm text-slate-500 mt-1 uppercase font-semibold tracking-wide">
                {fund.amc_name} | NAV: ₹{fund.nav}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1">Units Owned</label>
                <input
                  type="number"
                  value={fund.units || ''}
                  onChange={(e) => onUpdateUnits(fund.scheme_code, parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 w-32 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1">Current Value</label>
                <div className="bg-slate-900/50 border border-transparent px-3 py-2 w-32 font-mono text-emerald-400">
                  ₹{((fund.nav || 0) * (fund.units || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>

              <button 
                onClick={() => onRemove(fund.scheme_code)}
                className="mt-5 p-2 text-slate-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
