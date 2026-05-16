'use client';

import { useState } from 'react';
import { Shield, FileUp, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { uploadTaxStatement } from '@/lib/api-client';
import TaxDashboard from '@/components/tax/TaxDashboard';

export default function TaxMitraPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setLoadingStep('Uploading and reading PDF...');
    setError(null);

    try {
      // Simulate steps for better UX
      setTimeout(() => setLoadingStep('Parsing transactions...'), 1500);
      setTimeout(() => setLoadingStep('Applying FIFO tax rules...'), 3000);
      
      const data = await uploadTaxStatement(file);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to process the statement. Please ensure it is a valid CAMS CAS PDF.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mb-6" />
        <h2 className="text-2xl font-bold mb-2">Tax Mitra is Thinking</h2>
        <p className="text-slate-400 animate-pulse">{loadingStep}</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8">
        <header className="max-w-7xl mx-auto flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-500" />
            <span className="text-xl font-bold tracking-tight">Tax Mitra <span className="text-slate-500 font-normal">| Capital Gains</span></span>
          </div>
          <button 
            onClick={() => {setResult(null); setFile(null);}}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-100 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            New Upload
          </button>
        </header>

        <TaxDashboard result={result} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8">
      <header className="max-w-4xl mx-auto flex items-center justify-between mb-12">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-emerald-500" />
          <span className="text-2xl font-bold tracking-tight">PortfolioX</span>
        </Link>
        <Link href="/" className="text-slate-400 hover:text-slate-100 font-semibold">Home</Link>
      </header>

      <main className="max-w-4xl mx-auto animate-fade-in">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
            Phase 2: Tax Mitra
          </div>
          <h1 className="text-5xl font-black mb-6 tracking-tight">Indian Capital Gains <span className="text-emerald-500 text-glow">Calculator</span></h1>
          <p className="text-slate-400 text-xl max-w-2xl mx-auto leading-relaxed">
            Upload your CAMS Consolidated Account Statement to calculate exact STCG/LTCG liability with post-2024 budget rules.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className={`card border-2 border-dashed transition-all p-12 text-center ${file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'}`}>
            <input 
              type="file" 
              id="cams-upload" 
              className="hidden" 
              accept=".pdf" 
              onChange={handleFileChange}
            />
            <label htmlFor="cams-upload" className="cursor-pointer block">
              <div className="bg-slate-800 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <FileUp className={`w-10 h-10 ${file ? 'text-emerald-500' : 'text-slate-400'}`} />
              </div>
              
              {file ? (
                <div>
                  <h3 className="text-xl font-bold mb-1">{file.name}</h3>
                  <p className="text-slate-500 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready to process</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-bold mb-2">Drop your CAMS PDF here</h3>
                  <p className="text-slate-500">or click to browse your files</p>
                </div>
              )}
            </label>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="mt-8 flex flex-col items-center gap-6">
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="btn-primary w-full py-5 text-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Calculate Tax Liability'}
            </button>
            
            <div className="flex items-center gap-6 text-slate-500 text-sm">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                <span>End-to-end Encrypted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Zero Data Retention</span>
              </div>
            </div>
          </div>

          <div className="mt-16 bg-slate-900/30 rounded-3xl p-8 border border-slate-800">
            <h3 className="text-lg font-bold mb-4">How to get your CAMS statement?</h3>
            <ol className="space-y-4 text-slate-400 text-sm list-decimal list-inside">
              <li>Visit <a href="https://www.camsonline.com/InvestorServices/COL_ISAccountStatement.aspx" target="_blank" className="text-emerald-400 hover:underline">CAMS Online Mailback Service</a>.</li>
              <li>Select <b>"Consolidated Account Statement - CAMS+Karvy+FT+SBFS"</b>.</li>
              <li>Enter your registered Email ID and choose a Period (e.g., Financial Year).</li>
              <li>Select "Detailed" format and enter a password.</li>
              <li>Upload the received PDF here (ensure you remove the password or provide it if asked).</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}
