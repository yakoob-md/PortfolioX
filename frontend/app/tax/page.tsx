'use client';

import { useState } from 'react';
import { Shield, FileUp, Loader2, AlertCircle, ArrowLeft, Plus, Trash2, Calculator, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { uploadTaxStatement, calculateTaxManual } from '@/lib/api-client';
import TaxDashboard from '@/components/tax/TaxDashboard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function TaxMitraPage() {
  const [mode, setMode] = useState<'selection' | 'upload' | 'manual'>('selection');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-2 border-border flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <div className="absolute -inset-4 rounded-full border border-primary/10 animate-ping" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mt-8 mb-2">Tax Mitra is Thinking</h2>
        <p className="text-muted-foreground text-sm max-w-xs">{loadingStep || 'Processing your statement...'}</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">Tax<span className="text-primary">Mitra</span></span>
              <span className="hidden sm:inline text-muted-foreground mx-2">|</span>
              <span className="hidden sm:inline text-sm text-muted-foreground font-medium">Capital Gains Analysis</span>
            </div>
            <button 
              onClick={() => {setResult(null); setFile(null); setMode('selection'); setError(null);}}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> New Calculation
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8">
          <TaxDashboard result={result} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">Portfolio<span className="text-primary">X</span></span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors">Home</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 animate-fade-in">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/[0.08] border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-4">
            Phase 2: Tax Mitra
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-foreground tracking-tight mb-4">Indian Capital Gains</h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
            Automated STCG/LTCG calculation with post-2024 budget rules. Process your CAMS statements with complete privacy.
          </p>
        </div>

        {mode === 'selection' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mt-8">
            <button 
              onClick={() => setMode('upload')}
              className="group bg-card border border-border rounded-2xl p-8 text-center hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-xl bg-primary/[0.08] border border-primary/15 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/15 transition-colors">
                <FileUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Upload CAMS PDF</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Fast and automatic. Your PDF is processed in memory and never stored.</p>
            </button>

            <button 
              onClick={() => setMode('manual')}
              className="group bg-card border border-border rounded-2xl p-8 text-center hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-xl bg-primary/[0.08] border border-primary/15 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/15 transition-colors">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Manual Entry</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Enter transactions manually. Best for calculating specific redemption scenarios.</p>
            </button>
          </div>
        )}

        {mode === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <button onClick={() => setMode('selection')} className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Selection
            </button>
            <Card className={`border-2 border-dashed transition-all p-12 text-center ${file ? 'border-primary/40 bg-primary/[0.02]' : 'border-border hover:border-muted-foreground'}`}>
              <input type="file" id="cams-upload" className="hidden" accept=".pdf" onChange={handleFileChange} />
              <label htmlFor="cams-upload" className="cursor-pointer block">
                <div className="w-20 h-20 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <FileUp className={`w-10 h-10 ${file ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                {file ? (
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">{file.name}</h3>
                    <p className="text-muted-foreground text-sm data-value">{(file.size / 1024 / 1024).toFixed(2)} MB &bull; Ready</p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Drop your CAMS PDF here</h3>
                    <p className="text-muted-foreground text-sm">or click to browse your local files</p>
                  </div>
                )}
              </label>
            </Card>

            {error && (
              <div className="mt-6 p-4 bg-destructive/[0.08] border border-destructive/20 rounded-xl flex gap-3 text-destructive text-xs leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <Button onClick={handleUpload} disabled={!file || loading} size="xl" className="w-full mt-8">
              Calculate Tax Liability
            </Button>
          </div>
        )}

        {mode === 'manual' && (
          <div className="max-w-4xl mx-auto">
            <button onClick={() => setMode('selection')} className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Selection
            </button>
            
            <div className="space-y-6">
              {manualFolios.map((folio, fIndex) => (
                <Card key={fIndex} className="p-6 md:p-8 animate-fade-in">
                  <div className="flex justify-between items-center mb-8">
                    <input 
                      type="text" 
                      placeholder="Fund Name (e.g., HDFC Flexi Cap)"
                      className="bg-transparent text-xl md:text-2xl font-bold border-b border-border focus:border-primary/50 outline-none w-3/4 pb-2 transition-all text-foreground placeholder:text-muted-foreground"
                      value={folio.scheme_name}
                      onChange={(e) => {
                        const newFolios = [...manualFolios];
                        newFolios[fIndex].scheme_name = e.target.value;
                        setManualFolios(newFolios);
                      }}
                    />
                    <button onClick={() => setManualFolios(manualFolios.filter((_, i) => i !== fIndex))} className="text-muted-foreground hover:text-destructive p-2 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {folio.transactions.map((tx: any, tIndex: number) => (
                      <div key={tIndex} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-muted/30 p-4 rounded-xl border border-border">
                        <div>
                          <label className="section-label block mb-1.5 px-1">Date</label>
                          <input type="date" className="bg-card border border-border rounded-lg p-2.5 w-full text-xs text-foreground" value={tx.date} onChange={(e) => {
                            const newFolios = [...manualFolios];
                            newFolios[fIndex].transactions[tIndex].date = e.target.value;
                            setManualFolios(newFolios);
                          }} />
                        </div>
                        <div>
                          <label className="section-label block mb-1.5 px-1">Type</label>
                          <select className="bg-card border border-border rounded-lg p-2.5 w-full text-xs text-foreground" value={tx.transaction_type} onChange={(e) => {
                            const newFolios = [...manualFolios];
                            newFolios[fIndex].transactions[tIndex].transaction_type = e.target.value;
                            setManualFolios(newFolios);
                          }}>
                            <option value="purchase">Purchase</option>
                            <option value="redemption">Redemption</option>
                          </select>
                        </div>
                        <div>
                          <label className="section-label block mb-1.5 px-1">Units</label>
                          <input type="number" placeholder="0.000" className="bg-card border border-border rounded-lg p-2.5 w-full text-xs text-foreground data-value" value={tx.units || ''} onChange={(e) => {
                            const newFolios = [...manualFolios];
                            newFolios[fIndex].transactions[tIndex].units = parseFloat(e.target.value);
                            setManualFolios(newFolios);
                          }} />
                        </div>
                        <div>
                          <label className="section-label block mb-1.5 px-1">NAV</label>
                          <input type="number" placeholder="0.00" className="bg-card border border-border rounded-lg p-2.5 w-full text-xs text-foreground data-value" value={tx.nav || ''} onChange={(e) => {
                            const newFolios = [...manualFolios];
                            newFolios[fIndex].transactions[tIndex].nav = parseFloat(e.target.value);
                            setManualFolios(newFolios);
                          }} />
                        </div>
                        <div className="flex justify-end">
                          <button onClick={() => {
                            const newFolios = [...manualFolios];
                            newFolios[fIndex].transactions = newFolios[fIndex].transactions.filter((_: any, i: number) => i !== tIndex);
                            setManualFolios(newFolios);
                          }} className="p-2 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const newFolios = [...manualFolios];
                        newFolios[fIndex].transactions.push({ date: '', transaction_type: 'purchase', units: 0, nav: 0, amount: 0 });
                        setManualFolios(newFolios);
                      }}
                      className="w-full py-3 border border-dashed border-border rounded-xl text-muted-foreground text-[10px] font-bold uppercase tracking-wider hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Transaction
                    </button>
                  </div>
                </Card>
              ))}

              <div className="flex flex-col gap-4 mt-8">
                <button 
                  onClick={() => setManualFolios([...manualFolios, { scheme_name: '', folio_number: `MANUAL-0${manualFolios.length + 1}`, current_units: 0, transactions: [{ date: '', transaction_type: 'purchase', units: 0, nav: 0, amount: 0 }] }])}
                  className="w-full py-4 border-2 border-dashed border-primary/10 rounded-2xl text-primary/40 font-bold hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Add Another Fund
                </button>

                <Button onClick={handleManualCalculate} size="xl" className="w-full flex items-center justify-center gap-3">
                  <Calculator className="w-6 h-6" /> Calculate Tax Liability
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
