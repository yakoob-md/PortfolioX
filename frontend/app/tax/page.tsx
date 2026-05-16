'use client';

import { useState } from 'react';
import { Shield, FileUp, Loader2, AlertCircle, CheckCircle2, ArrowLeft, Plus, Trash2, Calculator } from 'lucide-react';
import Link from 'next/link';
import { uploadTaxStatement, calculateTaxManual } from '@/lib/api-client';
import TaxDashboard from '@/components/tax/TaxDashboard';

export default function TaxMitraPage() {
  const [mode, setMode] = useState<'selection' | 'upload' | 'manual'>('selection');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual Input State
  const [manualFolios, setManualFolios] = useState<any[]>([
    {
      scheme_name: '',
      folio_number: 'MANUAL-01',
      current_units: 0,
      transactions: [{ date: '', transaction_type: 'purchase', units: 0, nav: 0, amount: 0 }]
    }
  ]);

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

  const handleManualCalculate = async () => {
    // Basic validation
    if (manualFolios.some(f => !f.scheme_name || f.transactions.some((t: any) => !t.date || t.units === 0))) {
      setError('Please fill in all transaction details.');
      return;
    }

    setLoading(true);
    setLoadingStep('Calculating manual tax liability...');
    setError(null);

    try {
      const data = await calculateTaxManual(manualFolios.map(f => ({
        ...f,
        current_units: f.transactions.reduce((acc: number, t: any) => acc + (t.transaction_type === 'purchase' ? t.units : -t.units), 0)
      })));
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to calculate tax. Please check your transaction entries.');
    } finally {
      setLoading(false);
    }
  };

  const addManualFolio = () => {
    setManualFolios([...manualFolios, {
      scheme_name: '',
      folio_number: `MANUAL-0${manualFolios.length + 1}`,
      current_units: 0,
      transactions: [{ date: '', transaction_type: 'purchase', units: 0, nav: 0, amount: 0 }]
    }]);
  };

  const addManualTransaction = (folioIndex: number) => {
    const newFolios = [...manualFolios];
    newFolios[folioIndex].transactions.push({ date: '', transaction_type: 'purchase', units: 0, nav: 0, amount: 0 });
    setManualFolios(newFolios);
  };

  const updateManualTransaction = (fIndex: number, tIndex: number, field: string, value: any) => {
    const newFolios = [...manualFolios];
    newFolios[fIndex].transactions[tIndex][field] = value;
    
    // Auto-calculate amount if units and nav are present
    if (field === 'units' || field === 'nav') {
      const tx = newFolios[fIndex].transactions[tIndex];
      if (tx.units && tx.nav) {
        tx.amount = tx.units * tx.nav;
      }
    }
    
    setManualFolios(newFolios);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mb-6" />
        <h2 className="text-2xl font-bold mb-2">Tax Mitra is Thinking</h2>
        <p className="text-slate-400 animate-pulse">{loadingStep || 'Processing...'}</p>
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
            onClick={() => {setResult(null); setFile(null); setMode('selection'); setError(null);}}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-100 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            New Calculation
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
            Calculate your exact STCG/LTCG liability with post-2024 budget rules using PDF upload or manual entries.
          </p>
        </div>

        {mode === 'selection' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto mt-12">
            <button 
              onClick={() => setMode('upload')}
              className="card p-8 border-slate-800 hover:border-emerald-500/50 bg-slate-900/50 hover:bg-emerald-500/5 transition-all text-center group"
            >
              <div className="bg-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <FileUp className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Upload CAMS PDF</h3>
              <p className="text-slate-500 text-sm">Fast and automatic. Your PDF is processed locally and never stored.</p>
            </button>

            <button 
              onClick={() => setMode('manual')}
              className="card p-8 border-slate-800 hover:border-emerald-500/50 bg-slate-900/50 hover:bg-emerald-500/5 transition-all text-center group"
            >
              <div className="bg-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Plus className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Manual Entry</h3>
              <p className="text-slate-500 text-sm">Enter transactions manually. Best for a few specific entries.</p>
            </button>
          </div>
        )}

        {mode === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <button onClick={() => setMode('selection')} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
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

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="btn-primary w-full py-5 text-xl mt-8"
            >
              Calculate Tax Liability
            </button>
          </div>
        )}

        {mode === 'manual' && (
          <div className="max-w-4xl mx-auto">
            <button onClick={() => setMode('selection')} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            
            <div className="space-y-8">
              {manualFolios.map((folio, fIndex) => (
                <div key={fIndex} className="card bg-slate-900/50 border-slate-800 p-8 animate-fade-in">
                  <div className="flex justify-between items-center mb-6">
                    <input 
                      type="text" 
                      placeholder="Fund Name (e.g., HDFC Flexi Cap)"
                      className="bg-transparent text-2xl font-bold border-b border-slate-700 focus:border-emerald-500 outline-none w-2/3 pb-2 transition-all"
                      value={folio.scheme_name}
                      onChange={(e) => {
                        const newFolios = [...manualFolios];
                        newFolios[fIndex].scheme_name = e.target.value;
                        setManualFolios(newFolios);
                      }}
                    />
                    <button 
                      onClick={() => setManualFolios(manualFolios.filter((_, i) => i !== fIndex))}
                      className="text-slate-600 hover:text-red-400 transition-colors p-2"
                      title="Remove Fund"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {folio.transactions.map((tx: any, tIndex: number) => (
                      <div key={tIndex} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-slate-800/30 p-4 rounded-xl border border-slate-800">
                        <div className="col-span-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Date</label>
                          <input 
                            type="date" 
                            className="bg-slate-900 border border-slate-700 rounded p-2 w-full text-xs text-slate-200" 
                            value={tx.date}
                            onChange={(e) => updateManualTransaction(fIndex, tIndex, 'date', e.target.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Type</label>
                          <select 
                            className="bg-slate-900 border border-slate-700 rounded p-2 w-full text-xs text-slate-200"
                            value={tx.transaction_type}
                            onChange={(e) => updateManualTransaction(fIndex, tIndex, 'transaction_type', e.target.value)}
                          >
                            <option value="purchase">Purchase</option>
                            <option value="redemption">Redemption</option>
                          </select>
                        </div>
                        <div className="col-span-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Units</label>
                          <input 
                            type="number" 
                            placeholder="0.000" 
                            className="bg-slate-900 border border-slate-700 rounded p-2 w-full text-xs text-slate-200" 
                            value={tx.units || ''}
                            onChange={(e) => updateManualTransaction(fIndex, tIndex, 'units', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">NAV</label>
                          <input 
                            type="number" 
                            placeholder="0.00" 
                            className="bg-slate-900 border border-slate-700 rounded p-2 w-full text-xs text-slate-200" 
                            value={tx.nav || ''}
                            onChange={(e) => updateManualTransaction(fIndex, tIndex, 'nav', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="flex justify-end">
                          <button 
                            onClick={() => {
                              const newFolios = [...manualFolios];
                              newFolios[fIndex].transactions = newFolios[fIndex].transactions.filter((_: any, i: number) => i !== tIndex);
                              setManualFolios(newFolios);
                            }}
                            className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => addManualTransaction(fIndex)}
                      className="w-full py-3 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 text-xs font-bold hover:border-slate-700 hover:text-slate-300 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3 h-3" /> Add Transaction
                    </button>
                  </div>
                </div>
              ))}

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 text-red-200 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <button 
                  onClick={addManualFolio}
                  className="w-full py-4 border-2 border-dashed border-emerald-500/20 rounded-2xl text-emerald-500/50 font-bold hover:border-emerald-500/50 hover:text-emerald-500 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Add Another Fund
                </button>

                <button 
                  onClick={handleManualCalculate}
                  className="btn-primary w-full py-5 text-xl flex items-center justify-center gap-4 shadow-xl shadow-emerald-500/10"
                >
                  <Calculator className="w-6 h-6" /> Calculate Tax Liability
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
