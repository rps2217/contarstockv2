import React, { useState } from 'react';
import { Search, Filter, X, Plus } from 'lucide-react';

interface ExpirySearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenFilters: () => void;
  onOpenAdd: () => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
  theme?: 'dark' | 'light';
}

export const ExpirySearchBar: React.FC<ExpirySearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  onOpenFilters,
  onOpenAdd,
  onClearFilters,
  activeFiltersCount,
  theme = 'dark'
}) => {
  const [localQuery, setLocalQuery] = React.useState(searchQuery);

  // Sincronizar localQuery con searchQuery cuando cambie externamente (ej: al limpiar filtros)
  React.useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // Debounce interno para no estresar la App mientras se escribe
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== searchQuery) {
        setSearchQuery(localQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, searchQuery, setSearchQuery]);

  return (
    <div className="flex flex-col md:flex-row gap-3">
      <div className="relative flex-1 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            type="text"
            placeholder="BUSCAR SKU, NOMBRE O PROVEEDOR..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className={`w-full border rounded-2xl py-4 pl-12 pr-28 text-sm font-bold focus:outline-none transition-all shadow-2xl ${
              theme === 'dark' ? 'bg-brand-dark border-brand-warning/50 text-white' : 'bg-white border-amber-500/50 text-slate-900 shadow-slate-200/50'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all ${
                theme === 'dark' 
                  ? 'bg-white/10 hover:bg-white/20 text-slate-300' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={() => onOpenAdd()}
          className={`flex-1 md:flex-none px-6 py-4 md:py-0 rounded-2xl flex items-center justify-center gap-3 transition-all border shadow-lg group ${
            theme === 'dark' 
              ? 'bg-amber-500 border-amber-400 text-black hover:bg-amber-400' 
              : 'bg-amber-500 border-amber-400 text-black hover:bg-amber-400 shadow-sm'
          }`}
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-widest">Nuevo</span>
        </button>

        <button
          onClick={onOpenFilters}
          className={`flex-1 md:flex-none px-6 py-4 md:py-0 rounded-2xl flex items-center justify-center gap-3 transition-all border shadow-lg group ${
            activeFiltersCount > 0
              ? 'bg-brand-warning border-brand-warning text-black'
              : theme === 'dark' 
                ? 'bg-brand-surface border-white/10 text-white hover:bg-brand-surface/80'
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
          className={`px-4 py-4 md:py-0 rounded-2xl flex items-center justify-center transition-all group shrink-0 border ${
            theme === 'dark' 
              ? 'bg-brand-surface border-white/10 hover:bg-brand-surface/80' 
              : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
          }`}
          title="Limpiar Filtros"
        >
          <X className="w-5 h-5 text-slate-400 group-hover:rotate-90 transition-transform" />
        </button>
      </div>
    </div>
  );
};

// Forced GitHub sync
