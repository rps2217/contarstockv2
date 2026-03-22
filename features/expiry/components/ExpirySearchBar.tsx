
import React from 'react';
import { Search, Filter, X } from 'lucide-react';

interface ExpirySearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenFilters: () => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
  theme?: 'dark' | 'light';
}

export const ExpirySearchBar: React.FC<ExpirySearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  onOpenFilters,
  onClearFilters,
  activeFiltersCount,
  theme = 'dark'
}) => {
  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input 
          type="text"
          placeholder="BUSCAR POR NOMBRE, SKU O LOTE..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full border rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none transition-all shadow-2xl ${
            theme === 'dark' ? 'bg-black border-amber-500/50 text-white' : 'bg-white border-amber-500/50 text-slate-900 shadow-slate-200/50'
          }`}
        />
      </div>
      
      <button
        onClick={onOpenFilters}
        className={`px-6 rounded-2xl flex items-center gap-3 transition-all border shadow-lg group ${
          activeFiltersCount > 0
            ? 'bg-amber-500 border-amber-400 text-black'
            : theme === 'dark' 
              ? 'bg-slate-800 border-white/10 text-white hover:bg-slate-700'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
        }`}
      >
        <Filter className={`w-5 h-5 ${activeFiltersCount > 0 ? 'text-black' : 'text-slate-400'}`} />
        <span className="text-xs font-black uppercase tracking-widest">Filtros</span>
        {activeFiltersCount > 0 && (
          <span className="bg-black text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
            {activeFiltersCount}
          </span>
        )}
      </button>

      <button
        onClick={onClearFilters}
        className={`px-4 rounded-2xl flex items-center justify-center transition-all group shrink-0 border ${
          theme === 'dark' 
            ? 'bg-slate-800 border-white/10 hover:bg-slate-700' 
            : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
        }`}
        title="Limpiar Filtros"
      >
        <X className="w-5 h-5 text-slate-400 group-hover:rotate-90 transition-transform" />
      </button>
    </div>
  );
};
