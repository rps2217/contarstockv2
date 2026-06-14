import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [isFocused, setIsFocused] = useState(false);
  const isDark = theme === 'dark';

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
    }, 250);
    return () => clearTimeout(timer);
  }, [localQuery, searchQuery, setSearchQuery]);

  const colorClasses = {
    amber: {
      border: 'border-amber-500/20 focus-within:border-amber-500 focus-within:ring-amber-500/10',
      text: 'text-amber-500',
      badge: 'bg-amber-500 text-black',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.08)]',
      btnBg: 'bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/10',
      iconColor: 'text-amber-500'
    },
    blue: {
      border: 'border-blue-500/20 focus-within:border-blue-500 focus-within:ring-blue-500/10',
      text: 'text-blue-500',
      badge: 'bg-blue-500 text-white',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.08)]',
      btnBg: 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20',
      iconColor: 'text-blue-500'
    },
    emerald: {
      border: 'border-emerald-500/20 focus-within:border-emerald-500 focus-within:ring-emerald-500/10',
      text: 'text-emerald-500',
      badge: 'bg-emerald-500 text-black',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.08)]',
      btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20',
      iconColor: 'text-emerald-500'
    },
    rose: {
      border: 'border-rose-500/20 focus-within:border-rose-500 focus-within:ring-rose-500/10',
      text: 'text-rose-500',
      badge: 'bg-rose-500 text-white',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.08)]',
      btnBg: 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-500/20',
      iconColor: 'text-rose-500'
    },
    indigo: {
      border: 'border-indigo-500/25 focus-within:border-indigo-500 focus-within:ring-indigo-500/10',
      text: 'text-indigo-500',
      badge: 'bg-indigo-500 text-white',
      glow: 'shadow-[0_0_20px_rgba(99,102,241,0.08)]',
      btnBg: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20',
      iconColor: 'text-indigo-500'
    }
  };

  const colors = colorClasses[accentColor];

  return (
    <div className="flex flex-col md:flex-row gap-3 w-full max-w-7xl mx-auto">
      {/* El Buscador Principal */}
      <div className="relative flex-1 flex items-center min-w-0">
        <div 
          className={`relative flex-1 flex items-center rounded-2xl border transition-all duration-300 ${
            isFocused ? `${colors.glow} ring-2 ring-opacity-20` : ''
          } ${
            isDark 
              ? `bg-black/40 border-white/5` 
              : `bg-white border-slate-200/80 shadow-sm`
          } ${colors.border}`}
        >
          {/* Lupa Animada con Color de Contexto */}
          <Search className={`absolute left-4 w-5 h-5 transition-colors duration-300 ${
            isFocused ? colors.iconColor : 'text-slate-400'
          }`} />
          
          <input 
            type="text"
            placeholder={placeholder}
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`w-full py-3.5 md:py-4 pl-12 pr-28 text-sm font-bold bg-transparent outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 ${
              isDark ? 'text-white' : 'text-slate-800'
            }`}
          />
          
          {/* Botón Borrar Limpio en la Extrema Derecha del Input */}
          <AnimatePresence>
            {localQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => {
                  setLocalQuery('');
                  setSearchQuery('');
                }}
                className={`absolute right-3 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all ${
                  isDark 
                    ? 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                }`}
              >
                <X className="w-3 h-3" />
                <span>Borrar</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Botones de Acciones Secundarias Agrupados */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full shrink-0">
        
        {/* Crear Nuevo */}
        <button
          onClick={onOpenAdd}
          className={`h-[48px] md:h-[54px] px-5 md:px-6 rounded-2xl flex items-center justify-center gap-2 transition-all font-black text-xs uppercase tracking-widest shrink-0 ${colors.btnBg}`}
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Nuevo</span>
        </button>

        {/* Filtrar desplegable */}
        <button
          onClick={onOpenFilters}
          className={`h-[48px] md:h-[54px] px-5 md:px-6 rounded-2xl flex items-center justify-center gap-2.5 transition-all font-black text-xs uppercase tracking-widest shrink-0 border ${
            activeFiltersCount > 0
              ? isDark 
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-md shadow-amber-500/5' 
                : 'bg-amber-100 border-amber-300 text-amber-800 shadow-sm'
              : isDark 
                ? 'bg-slate-900 border-white/5 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-55 shadow-sm'
          }`}
        >
          <Filter className={`w-4 h-4 shrink-0 ${activeFiltersCount > 0 ? (isDark ? 'text-amber-500' : 'text-amber-800') : 'text-slate-400'}`} />
          <span>Filtros</span>
          {activeFiltersCount > 0 && (
            <span className={`text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 ${
              isDark ? 'bg-amber-500 text-black' : 'bg-amber-100 text-amber-800'
            }`}>
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Eliminar Filtros Activos de manera rápida */}
        <AnimatePresence>
          {activeFiltersCount > 0 && (
            <motion.button
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              onClick={onClearFilters}
              className={`h-[48px] md:h-[54px] px-3.5 rounded-2xl flex items-center justify-center transition-all shrink-0 border ${
                isDark 
                  ? 'bg-slate-900 border-white/5 hover:bg-slate-800/80' 
                  : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
              }`}
              title="Limpiar todos los filtros"
            >
              <X className="w-4.5 h-4.5 text-rose-500 hover:rotate-90 transition-transform" />
            </motion.button>
          )}
        </AnimatePresence>

        {extraActions}
      </div>
    </div>
  );
};
