'use client'

/**
 * TaxMitraFull — PortfolioX Tax Engine, styled with new design system.
 * Full FIFO LTCG/STCG calculator with PDF upload + manual entry.
 */

import { useState, useRef } from 'react'
import { Upload, Calculator, FileText, AlertCircle, CheckCircle2, Loader2, Plus, Trash2, IndianRupee } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

interface TaxResult {
  summary: {
    total_ltcg: number
    total_stcg: number
    total_ltcg_tax: number
    total_stcg_tax: number
    total_tax: number
    exemption_applied: number
  }
  folios: Array<{
    fund_name: string
    gains: Array<{
      units: number
      purchase_date: string
      sale_date: string
      purchase_nav: number
      sale_nav: number
      gain_type: string
      gain_amount: number
      tax_amount: number
    }>
  }>
  tips: string[]
}

interface ManualEntry {
  fund_name: string
  purchase_date: string
  sale_date: string
  units: number
  purchase_nav: number
  sale_nav: number
}

export default function TaxMitraFull() {
  const [mode, setMode] = useState<'upload' | 'manual'>('upload')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TaxResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([
    { fund_name: '', purchase_date: '', sale_date: '', units: 0, purchase_nav: 0, sale_nav: 0 }
  ])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_BASE}/tax/upload-cams`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error((await res.json()).detail || 'Upload failed')
      setResult(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/tax/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folios: manualEntries })
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Calculation failed')
      setResult(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Calculation failed')
    } finally {
      setLoading(false)
    }
  }

  const addEntry = () => setManualEntries([...manualEntries, { fund_name: '', purchase_date: '', sale_date: '', units: 0, purchase_nav: 0, sale_nav: 0 }])
  const removeEntry = (i: number) => setManualEntries(manualEntries.filter((_, idx) => idx !== i))
  const updateEntry = (i: number, field: keyof ManualEntry, val: string | number) => {
    const updated = [...manualEntries]
    updated[i] = { ...updated[i], [field]: val }
    setManualEntries(updated)
  }

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Tax Mitra</h1>
          <p className="text-sm text-muted-foreground">FIFO-based LTCG / STCG calculator · Budget 2024 compliant</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
        {(['upload', 'manual'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${mode === m ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {m === 'upload' ? '📤 CAMS Upload' : '✏️ Manual Entry'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {mode === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative border-2 border-dashed border-border hover:border-primary/40 rounded-2xl p-12 text-center cursor-pointer transition-all group bg-card/50"
            >
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/[0.02] rounded-2xl transition-all" />
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                {loading ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <Upload className="w-8 h-8 text-primary" />}
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Drop your CAMS Statement</h3>
              <p className="text-sm text-muted-foreground">PDF format · Supports all AMCs · Magic byte validated</p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-xs font-semibold text-primary">
                <FileText className="w-3 h-3" /> Click to browse
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'manual' && (
          <motion.div key="manual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {manualEntries.map((entry, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Transaction #{i + 1}</span>
                  {manualEntries.length > 1 && (
                    <button onClick={() => removeEntry(i)} className="text-destructive hover:text-destructive/80 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="col-span-2 md:col-span-3">
                    <label className="section-label mb-1 block">Fund Name</label>
                    <input value={entry.fund_name} onChange={e => updateEntry(i, 'fund_name', e.target.value)} placeholder="e.g. Parag Parikh Flexi Cap Fund"
                      className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                  </div>
                  {[
                    { label: 'Purchase Date', field: 'purchase_date', type: 'date' },
                    { label: 'Sale Date', field: 'sale_date', type: 'date' },
                    { label: 'Units', field: 'units', type: 'number' },
                    { label: 'Purchase NAV (₹)', field: 'purchase_nav', type: 'number' },
                    { label: 'Sale NAV (₹)', field: 'sale_nav', type: 'number' },
                  ].map(({ label, field, type }) => (
                    <div key={field}>
                      <label className="section-label mb-1 block">{label}</label>
                      <input type={type} value={entry[field as keyof ManualEntry]} onChange={e => updateEntry(i, field as keyof ManualEntry, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                        className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={addEntry} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border hover:border-primary/40 text-sm text-muted-foreground hover:text-primary transition-all">
                <Plus className="w-4 h-4" /> Add Transaction
              </button>
              <button onClick={handleManualSubmit} disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                Calculate Tax
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-cyan-400" /> Tax Summary
          </h2>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total LTCG', value: fmt(result.summary.total_ltcg), color: 'cyan' },
              { label: 'Total STCG', value: fmt(result.summary.total_stcg), color: 'amber' },
              { label: 'LTCG Tax (12.5%)', value: fmt(result.summary.total_ltcg_tax), color: 'primary' },
              { label: 'Total Tax Due', value: fmt(result.summary.total_tax), color: 'rose' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`bg-card border border-border rounded-xl p-4 card-hover`}>
                <div className="section-label mb-2">{label}</div>
                <div className={`text-2xl font-bold data-value ${color === 'cyan' ? 'text-cyan-400' : color === 'amber' ? 'text-amber-400' : color === 'rose' ? 'text-rose-400' : 'text-primary'}`}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Exemption Banner */}
          {result.summary.exemption_applied > 0 && (
            <div className="flex items-center gap-3 p-4 bg-cyan-500/5 border border-cyan-500/15 rounded-xl">
              <IndianRupee className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              <div>
                <span className="text-sm font-semibold text-cyan-400">₹1.25 Lakh Exemption Applied</span>
                <p className="text-xs text-muted-foreground mt-0.5">LTCG up to ₹1.25L/year is tax-free on equity funds</p>
              </div>
            </div>
          )}

          {/* Tips */}
          {result.tips && result.tips.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="section-label mb-3">💡 Tax Optimization Tips</h3>
              <ul className="space-y-2">
                {result.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-0.5">→</span> {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
