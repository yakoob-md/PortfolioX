'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Plus } from 'lucide-react';
import { searchFunds } from '@/lib/api-client';
import { FundSearchResult } from '@/lib/types';

interface Props {
  onSelect: (fund: FundSearchResult) => void;
}

export default function FundSearchInput({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FundSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.length >= 2) {
        setLoading(true);
        try {
          const res = await searchFunds(query);
          setResults(res);
          setShowDropdown(true);
          setSelectedIndex(-1);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((prev) => Math.max(prev - 1, -1)); }
    else if (e.key === 'Enter' && selectedIndex >= 0) { e.preventDefault(); const fund = results[selectedIndex]; onSelect(fund); setQuery(''); setShowDropdown(false); }
    else if (e.key === 'Escape') { setShowDropdown(false); }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <input
          ref={inputRef} type="text" value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search mutual funds (e.g. Parag Parikh, HDFC...)"
          className="w-full bg-card border border-border rounded-lg py-3.5 pl-11 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200"
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
        />
        {loading ? (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-primary w-4 h-4 animate-spin" />
        ) : query.length > 0 ? (
          <button onClick={() => { setQuery(''); setResults([]); setShowDropdown(false); inputRef.current?.focus(); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">✕</button>
        ) : null}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-2xl max-h-80 overflow-y-auto">
          {results.map((fund, idx) => (
            <button key={fund.scheme_code}
              onClick={() => { onSelect(fund); setQuery(''); setShowDropdown(false); }}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full text-left px-4 py-3 transition-colors border-b border-border last:border-0 flex items-center justify-between group ${idx === selectedIndex ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
            >
              <div className="flex-1 pr-4 min-w-0">
                <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{fund.scheme_name}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1 flex-wrap">
                  <span>{fund.amc_name}</span><span className="text-muted-foreground/50">•</span>
                  <span className={fund.plan_type === 'Direct' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>{fund.plan_type}</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span className="data-value">₹{fund.nav}</span>
                </div>
              </div>
              <Plus className={`w-4 h-4 flex-shrink-0 transition-colors ${idx === selectedIndex ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
            </button>
          ))}
        </div>
      )}

      {showDropdown && results.length === 0 && !loading && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-2xl p-6 text-center">
          <p className="text-sm text-muted-foreground">No funds found for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
