'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shield, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
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
      <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full border-2 border-[#1e293b] flex items-center justify-center mb-6">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Loading Shared Report</h2>
        <p className="text-slate-500 text-sm">Fetching portfolio analysis...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Report Not Found</h2>
        <p className="text-slate-400 text-sm mb-8 max-w-xs">{error}</p>
        <Link href="/analyze" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2 px-6 rounded-lg transition-all">
          <ExternalLink className="w-4 h-4" /> Create New Analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-200">
      <header className="sticky top-0 z-50 border-b border-[#1e293b] bg-[#0a0f1e]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-100">Portfolio<span className="text-emerald-400">X</span></span>
            <span className="hidden sm:inline text-slate-600 mx-2">|</span>
            <span className="hidden sm:inline text-sm text-slate-500 font-medium">Shared Report</span>
          </div>
          <Link href="/analyze" className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
            <ExternalLink className="w-4 h-4" /> Analyze Yours
          </Link>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-2">
        <div className="section-label">Report Generated: {new Date(result.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
      </div>
      <div className="p-4 md:p-8 pt-4">
        <AnalysisDashboard result={result} isReadOnly={true} />
      </div>
    </div>
  );
}