'use client';

import { OverlapPair } from '@/lib/types';

interface Props {
  matrix: OverlapPair[];
}

export default function OverlapMatrix({ matrix }: Props) {
  if (!matrix || matrix.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="py-4 px-4 text-slate-400 font-bold uppercase text-xs">Fund Pair</th>
            <th className="py-4 px-4 text-slate-400 font-bold uppercase text-xs text-center">Common Stocks</th>
            <th className="py-4 px-4 text-slate-400 font-bold uppercase text-xs text-right">Overlap %</th>
          </tr>
        </thead>
        <tbody>
          {matrix.map((pair, idx) => (
            <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
              <td className="py-4 px-4">
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-slate-200">{pair.fund_a_name}</span>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-tighter">vs</span>
                  <span className="font-bold text-sm text-slate-200">{pair.fund_b_name}</span>
                </div>
              </td>
              <td className="py-4 px-4 text-center">
                <span className="bg-slate-700 px-2 py-1 rounded text-xs font-mono">{pair.common_stock_count}</span>
              </td>
              <td className="py-4 px-4 text-right">
                <span className={`text-lg font-black ${
                  pair.overlap_score > 30 ? 'text-red-500' : 
                  pair.overlap_score > 15 ? 'text-yellow-500' : 'text-emerald-500'
                }`}>
                  {pair.overlap_score}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
