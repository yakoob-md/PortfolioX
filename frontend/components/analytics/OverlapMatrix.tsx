'use client';

import { OverlapPair } from '@/lib/types';

interface Props {
  matrix: OverlapPair[];
}

function getOverlapColor(score: number): string {
  if (score > 30) return 'text-red-600 dark:text-red-400';
  if (score > 15) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

function getOverlapBg(score: number): string {
  if (score > 30) return 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
  if (score > 15) return 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
  return 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20';
}

function getOverlapBar(score: number): string {
  if (score > 30) return 'bg-red-500';
  if (score > 15) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export default function OverlapMatrix({ matrix }: Props) {
  if (!matrix || matrix.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="py-3 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fund Pair</th>
            <th className="py-3 px-3 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Common Stocks</th>
            <th className="py-3 px-3 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Overlap</th>
            <th className="py-3 px-3 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-32">Distribution</th>
          </tr>
        </thead>
        <tbody>
          {matrix.map((pair, idx) => (
            <tr key={idx} className="border-b border-border hover:bg-muted/30 transition-colors">
              <td className="py-3.5 px-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground leading-tight line-clamp-1">{pair.fund_a_name}</span>
                  <span className="text-[10px] text-muted-foreground/50 font-semibold uppercase tracking-wider">vs</span>
                  <span className="text-sm font-medium text-foreground leading-tight line-clamp-1">{pair.fund_b_name}</span>
                </div>
              </td>
              <td className="py-3.5 px-3 text-center">
                <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-md bg-muted border border-border text-xs data-value text-foreground px-2">
                  {pair.common_stock_count}
                </span>
              </td>
              <td className="py-3.5 px-3 text-right">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md border text-sm font-bold data-value ${getOverlapBg(pair.overlap_score)} ${getOverlapColor(pair.overlap_score)}`}>
                  {pair.overlap_score}%
                </span>
              </td>
              <td className="py-3.5 px-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${getOverlapBar(pair.overlap_score)}`} style={{ width: `${Math.min(pair.overlap_score, 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground/50 w-8 text-right">
                    {pair.overlap_score > 30 ? 'High' : pair.overlap_score > 15 ? 'Med' : 'Low'}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
