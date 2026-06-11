import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Plus } from 'lucide-react';

interface ManagementSearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenFilters: () => void;
  onOpenAdd: () => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
  placeholder?: string;
  accentColor?: 'amber' | 'blue' | 'emerald' | 'rose' | 'indigo';
  theme?: 'dark' | 'light';
  extraActions?: React.ReactNode;
}

export const ManagementSearchBar: React.FC<ManagementSearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  onOpenFilters,
  onOpenAdd,
  onClearFilters,
  activeFiltersCount,
  placeholder = "BUSCAR...",
  accentColor = 'amber',
  theme = 'dark',
  extraActions
}) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  // Sincronizar localQuery con searchQuery cuando cambie externamente
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // Debounce interno
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== searchQuery) {
        setSearchQuery(localQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, searchQuery, setSearchQuery]);

  const colorClasses = {
    amber: {
      border: 'border-amber-500/50',
      bg: 'bg-amber-500',
      hover: 'hover:bg-amber-400',
      text: 'text-amber-500',
      badge: 'bg-black text-white'
    },
    blue: {
      border: 'border-blue-500/50',
      bg: 'bg-blue-600',
      hover: 'hover:bg-blue-500',
      text: 'text-blue-500',
      badge: 'bg-white text-blue-600'
    },
    emerald: {
      border: 'border-emerald-500/50',
      bg: 'bg-emerald-600',
      hover: 'hover:bg-emerald-500',
      text: 'text-emerald-500',
      badge: 'bg-white text-emerald-600'
    },
    rose: {
      border: 'border-rose-500/50',
      bg: 'bg-rose-600',
      hover: 'hover:bg-rose-500',
      text: 'text-rose-500',
      badge: 'bg-white text-rose-600'
    },
    indigo: {
      border: 'border-indigo-500/50',
      bg: 'bg-indigo-600',
      hover: 'hover:bg-indigo-500',
      text: 'text-indigo-500',
      badge: 'bg-white text-indigo-600'
    }
  };

  const colors = colorClasses[accentColor];

  return (
    <div className="flex flex-col md:flex-row gap-3">
      <div className="relative flex-1 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            type="text"
            placeholder={placeholder}
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className={`w-full border rounded-2xl py-3 md:py-4 pl-10 md:pl-12 pr-24 md:pr-28 text-sm font-bold focus:outline-none transition-all shadow-2xl ${
              theme === 'dark' 
                ? `bg-black ${colors.border} text-white` 
                : `bg-white ${colors.border} text-slate-900 shadow-slate-200/50`
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
      
      <div className="flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar max-w-full shrink-0">
        <button
          onClick={onOpenAdd}
          className={`h-12 md:h-14 px-4 md:px-6 rounded-2xl flex items-center justify-center gap-2 md:gap-3 transition-all border shadow-lg group shrink-0 ${
            theme === 'dark' 
              ? `${colors.bg} border-white/10 text-slate-900 ${colors.hover}` 
              : `${colors.bg} border-white/10 text-white ${colors.hover} shadow-sm`
          }`}
        >
          <Plus className="w-5 h-5 shrink-0" />
          <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Nuevo</span>
        </button>

        <button
          onClick={onOpenFilters}
          className={`h-12 md:h-14 px-4 md:px-6 rounded-2xl flex items-center justify-center gap-2 md:gap-3 transition-all border shadow-lg group shrink-0 ${
            activeFiltersCount > 0
              ? `${colors.bg} border-white/10 text-white`
              : theme === 'dark' 
                ? 'bg-slate-900/50 border-white/10 text-white hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
          }`}
        >
          <Filter className={`w-5 h-5 shrink-0 ${activeFiltersCount > 0 ? 'text-white' : 'text-slate-400'}`} />
          <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Filtros</span>
          {activeFiltersCount > 0 && (
            <span className={`${colors.badge} text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0`}>
              {activeFiltersCount}
            </span>
          )}
        </button>

        <button
          onClick={onClearFilters}
          className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all group shrink-0 border ${
            theme === 'dark' 
              ? 'bg-slate-900/50 border-white/10 hover:bg-slate-800' 
              : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
          }`}
          title="Limpiar Filtros"
        >
          <X className="w-5 h-5 text-slate-400 group-hover:rotate-90 transition-transform" />
        </button>

        {extraActions}
      </div>
    </div>
  );
};
