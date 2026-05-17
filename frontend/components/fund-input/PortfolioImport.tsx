'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { importPortfolioCSV } from '@/lib/api-client';

interface Props {
  onImport: (holdings: any[]) => void;
}

export default function PortfolioImport({ onImport }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const data = await importPortfolioCSV(file);
      onImport(data.holdings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to parse CSV file');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mt-4">
      <input
        type="file"
        accept=".csv"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="group flex items-center justify-between p-4 bg-muted/30 border border-dashed border-border hover:border-primary/40 rounded-xl cursor-pointer transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            {loading ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary" />}
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Bulk Import from CSV</div>
            <div className="text-[10px] text-muted-foreground font-medium">Format: stock_name, holding_percentage, sector, market_cap</div>
          </div>
        </div>
        
        {success && <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
        {error && <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
      </div>
      
      {error && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 px-2">
          <X className="w-3 h-3" /> {error}
        </div>
      )}
    </div>
  );
}
