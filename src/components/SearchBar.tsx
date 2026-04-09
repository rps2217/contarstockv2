
import React, { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  theme?: 'dark' | 'light';
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = "Buscar...", 
  className = "",
  theme = 'dark'
}) => {
  const [localValue, setLocalValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Determine if we should show loading state (only if typing)
    if (localValue) setIsSearching(true);

    const handler = setTimeout(() => {
      onSearch(localValue);
      setIsSearching(false);
    }, 300); // 300ms debounce

    return () => clearTimeout(handler);
  }, [localValue, onSearch]);

  const handleClear = () => {
    setLocalValue('');
    onSearch('');
    setIsSearching(false);
  };

  return (
    <div className={`relative group ${className}`}>
      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
        theme === 'dark' ? 'text-slate-500 group-focus-within:text-brand-info' : 'text-slate-400 group-focus-within:text-blue-500'
      }`} />
      
      <input 
        className={`w-full pl-10 pr-10 py-2.5 border rounded-xl outline-none text-sm transition-all shadow-sm ${
          theme === 'dark' 
            ? 'bg-brand-surface border-white/10 text-white placeholder:text-slate-500 focus:border-brand-info focus:ring-4 focus:ring-brand-info/10' 
            : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
        }`}
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
      />

      {/* Right Actions: Loader or Clear Button */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
        {isSearching ? (
          <Loader2 className={`w-4 h-4 animate-spin ${theme === 'dark' ? 'text-brand-info' : 'text-blue-500'}`} />
        ) : localValue ? (
          <button 
            onClick={handleClear}
            className={`rounded-full p-0.5 transition-colors ${
              theme === 'dark' ? 'text-slate-500 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

// Forced GitHub sync
