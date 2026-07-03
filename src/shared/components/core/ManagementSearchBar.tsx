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
  accentColor?: 'amber' | 'blue' | 'emerald' | 'rose' | 'indigo' | 'gray';
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
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
  accentColor = 'gray',
  theme = 'dark',
  extraActions
}) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [isFocused, setIsFocused] = useState(false);
  const isDark = (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray';

  // Synchronize local search text with global state
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // Debounced search trigger for high performance
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
      border: 'border-amber-500/10 focus-within:border-amber-500/40 focus-within:ring-amber-500/5',
      text: 'text-amber-500',
      badge: 'bg-amber-500 text-black',
      glow: 'shadow-[0_0_25px_rgba(245,158,11,0.06)]',
      fabBg: 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/25 focus:ring-amber-400/50',
      iconColor: 'text-amber-500 hover:bg-amber-500/10',
      shimmer: 'from-amber-400/20 to-amber-500/30'
    },
    blue: {
      border: 'border-blue-500/10 focus-within:border-blue-500/40 focus-within:ring-blue-500/5',
      text: 'text-blue-500',
      badge: 'bg-blue-500 text-white',
      glow: 'shadow-[0_0_25px_rgba(59,130,246,0.06)]',
      fabBg: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 focus:ring-blue-400/50',
      iconColor: 'text-blue-500 hover:bg-blue-500/10',
      shimmer: 'from-blue-400/20 to-blue-500/30'
    },
    emerald: {
      border: 'border-emerald-500/10 focus-within:border-emerald-500/40 focus-within:ring-emerald-500/5',
      text: 'text-emerald-500',
      badge: 'bg-emerald-500 text-black',
      glow: 'shadow-[0_0_25px_rgba(16,185,129,0.06)]',
      fabBg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 focus:ring-emerald-400/50',
      iconColor: 'text-emerald-500 hover:bg-emerald-500/10',
      shimmer: 'from-emerald-400/20 to-emerald-500/30'
    },
    rose: {
      border: 'border-rose-500/10 focus-within:border-rose-500/40 focus-within:ring-rose-500/5',
      text: 'text-rose-500',
      badge: 'bg-rose-500 text-white',
      glow: 'shadow-[0_0_25px_rgba(244,63,94,0.06)]',
      fabBg: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/25 focus:ring-rose-400/50',
      iconColor: 'text-rose-500 hover:bg-rose-500/10',
      shimmer: 'from-rose-400/20 to-rose-500/30'
    },
    indigo: {
      border: 'border-indigo-500/15 focus-within:border-indigo-500/40 focus-within:ring-indigo-500/5',
      text: 'text-indigo-500',
      badge: 'bg-indigo-500 text-white',
      glow: 'shadow-[0_0_25px_rgba(99,102,241,0.06)]',
      fabBg: 'bg-indigo-650 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 focus:ring-indigo-400/50',
      iconColor: 'text-indigo-500 hover:bg-indigo-500/10',
      shimmer: 'from-indigo-400/20 to-indigo-500/30'
    },
    gray: {
      border: 'border-neutral-500/10 focus-within:border-neutral-500/40 focus-within:ring-neutral-500/5',
      text: 'text-neutral-500',
      badge: 'bg-neutral-500 text-white',
      glow: 'shadow-[0_0_25px_rgba(0,0,0,0.06)]',
      fabBg: 'bg-neutral-600 hover:bg-neutral-500 text-white shadow-lg shadow-black/25 focus:ring-neutral-400/50',
      iconColor: 'text-neutral-500 hover:bg-neutral-500/10',
      shimmer: 'from-neutral-400/20 to-neutral-500/30'
    }
  };

  const colors = colorClasses[accentColor] || colorClasses.gray;

  return (
    <>
      {/* Master Search Bar - Elegant, compact, highly integrated */}
      <div className="w-full max-w-7xl mx-auto px-1">
        <div 
          className={`flex items-center rounded-2xl border transition-all duration-300 px-3 pl-4 gap-2 ${
            isFocused ? `${colors.glow} ring-4 ring-slate-400/5 dark:ring-white/5` : ''
          } ${
            isDark 
              ? 'bg-black/30 border-white/5' 
              : 'bg-stone-50/70 border-slate-200/80 shadow-sm'
          } ${colors.border}`}
        >
          {/* Quiet Search Icon */}
          <Search className={`w-4 h-4 transition-colors duration-300 shrink-0 ${
            isFocused ? colors.text : 'text-muted dark:text-slate-500'
          }`} />
          
          <input 
            type="text"
            placeholder={placeholder}
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`w-full py-3 md:py-3.5 text-xs font-black tracking-wide bg-transparent outline-none transition-all placeholder-slate-400 dark:placeholder-slate-600 uppercase ${
              isDark ? 'text-white' : 'text-slate-800'
            }`}
          />
          
          {/* Actions panel right inside the search box */}
          <div className="flex items-center gap-1.5 shrink-0 pl-2">
            {/* Clear querying search text */}
            <AnimatePresence>
              {localQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => {
                    setLocalQuery('');
                    setSearchQuery('');
                  }}
                  className={`p-1.5 rounded-lg text-muted transition-colors ${
                    isDark ? 'hover:bg-white/5 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
                  }`}
                  title="Borrar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Vertical Divider line */}
            <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-0.5 shrink-0" />

            {/* Integrated filter button */}
            <button
              onClick={onOpenFilters}
              className={`p-2 rounded-xl transition-all relative shrink-0 flex items-center justify-center ${
                activeFiltersCount > 0
                  ? isDark
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 shadow-sm'
                  : isDark
                    ? 'text-muted hover:bg-white/5 hover:text-white border border-transparent'
                    : 'text-slate-600 hover:bg-slate-200 border border-transparent'
              }`}
              title="Filtrar datos"
            >
              <Filter className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black leading-none bg-amber-500 text-black shadow-sm shrink-0">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Fast reset filters pill/cross icon */}
            <AnimatePresence>
              {activeFiltersCount > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8, width: 0 }}
                  animate={{ opacity: 1, scale: 1, width: 'auto' }}
                  exit={{ opacity: 0, scale: 0.8, width: 0 }}
                  onClick={onClearFilters}
                  className={`p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all shrink-0 border border-transparent hover:border-rose-500/10`}
                  title="Limpiar filtros activos"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Any context-specific actions (e.g. Export, CSV) rendered discreetly layout-wise */}
            {extraActions && (
              <>
                <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-0.5 shrink-0" />
                <div className="flex items-center gap-1">
                  {extraActions}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* High-Fidelity Floating Action Button (FAB) for adding new records */}
      {/* Absolute centerpiece of the AppSheet-inspired sleek modern ergonomics */}
      <AnimatePresence>
        {onOpenAdd && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 15 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 pointer-events-auto"
          >
            <motion.button
              whileHover={{ scale: 1.08, translateY: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenAdd}
              className={`group flex items-center gap-2 h-14 px-5 rounded-full font-black text-xs uppercase tracking-widest cursor-pointer shadow-xl transition-all duration-300 ring-4 ring-transparent ${colors.fabBg}`}
              title="Agregar nuevo registro"
            >
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
                <Plus className="w-4 h-4 shrink-0 stroke-[3]" />
              </div>
              <span className="pr-1 tracking-wider">Nuevo</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
