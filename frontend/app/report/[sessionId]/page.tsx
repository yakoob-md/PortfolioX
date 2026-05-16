'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shield, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import AnalysisDashboard from '@/components/analytics/AnalysisDashboard';
import { getReport } from '@/lib/api-client';
import { AnalysisResult } from '@/lib/types';

export default function ReportPage() {
  const { sessionId } = useParams();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!sessionId) return;
      try {
        const data = await getReport(sessionId as string);
        setResult(data);
      } catch (err) {
        console.error('Failed to fetch report:', err);
        setError('Report not found or has expired.');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold">Loading Shared Report</h2>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Error</h2>
        <p className="text-slate-400 mb-8">{error}</p>
        <Link href="/analyze" className="btn-primary">
          Create New Analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8">
      <header className="max-w-7xl mx-auto flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-500" />
          <span className="text-xl font-bold tracking-tight">PortfolioX <span className="text-slate-500 font-normal">| Shared Report</span></span>
        </div>
        <Link href="/analyze" className="text-emerald-500 hover:text-emerald-400 font-bold">
          Analyze Yours →
        </Link>
      </header>

      <div className="max-w-7xl mx-auto mb-6 flex items-center justify-between">
        <div className="text-slate-500 text-sm font-bold uppercase tracking-widest">
          Report Generated: {new Date(result.created_at).toLocaleDateString()}
        </div>
      </div>

      <AnalysisDashboard result={result} isReadOnly={true} />
    </div>
  );
}
