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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.length >= 2) {
        setLoading(true);
        try {
          const res = await searchFunds(query);
          setResults(res);
          setShowDropdown(true);
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

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Indian mutual funds (e.g. Parag Parikh, HDFC...)"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5 animate-spin" />
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto overflow-x-hidden">
          {results.map((fund) => (
            <button
              key={fund.scheme_code}
              onClick={() => {
                onSelect(fund);
                setQuery('');
                setShowDropdown(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-0 flex items-center justify-between group"
            >
              <div className="flex-1 pr-4">
                <div className="font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                  {fund.scheme_name}
                </div>
                <div className="text-xs text-slate-400 flex gap-2 mt-1">
                  <span>{fund.amc_name}</span>
                  <span>•</span>
                  <span className={fund.plan_type === 'Direct' ? 'text-emerald-500' : 'text-orange-500'}>
                    {fund.plan_type}
                  </span>
                  <span>•</span>
                  <span>NAV: ₹{fund.nav}</span>
                </div>
              </div>
              <Plus className="w-5 h-5 text-slate-600 group-hover:text-emerald-500 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
