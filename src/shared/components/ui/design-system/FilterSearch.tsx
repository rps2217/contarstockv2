/**
 * FilterSearch - Barra de búsqueda y filtros unificada
 *
 * Diseño minimalista, solo lo esencial.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSearchProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  filters?: FilterOption[];
  selectedFilter?: string;
  onFilterChange?: (value: string) => void;
  isDark?: boolean;
  showFilters?: boolean;
  onToggleFilters?: () => void;
}

export const FilterSearch: React.FC<FilterSearchProps> = ({
  placeholder = 'Buscar...',
  value,
  onChange,
  filters = [],
  selectedFilter,
  onFilterChange,
  isDark = true,
  showFilters = false,
  onToggleFilters,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  return (
    <div className="space-y-2">
      <div
        className={`
        flex items-center gap-2 px-3 py-2.5 rounded-xl border
        transition-all duration-150
        ${isFocused ? 'ring-2' : ''}
        ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 focus-within:ring-neutral-700'
            : 'bg-white border-neutral-200 focus-within:ring-neutral-300'
        }
      `}
      >
        {/* Search Icon */}
        <Search
          className={`w-4 h-4 shrink-0 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}
        />

        {/* Input */}
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`
            flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500
            ${isDark ? 'text-neutral-100' : 'text-neutral-900'}
          `}
        />

        {/* Clear Button */}
        {value && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={handleClear}
            className={`
              p-1 rounded-md
              ${isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'}
            `}
          >
            <X className={`w-3.5 h-3.5 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`} />
          </motion.button>
        )}

        {/* Filter Toggle */}
        {filters.length > 0 && onToggleFilters && (
          <button
            onClick={onToggleFilters}
            className={`
              p-1.5 rounded-md flex items-center gap-1
              ${
                showFilters
                  ? isDark
                    ? 'bg-neutral-800 text-neutral-200'
                    : 'bg-neutral-100 text-neutral-800'
                  : isDark
                    ? 'hover:bg-neutral-800 text-neutral-500'
                    : 'hover:bg-neutral-100 text-neutral-400'
              }
            `}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <AnimatePresence>
        {showFilters && filters.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 py-2">
              {filters.map(filter => (
                <button
                  key={filter.value}
                  onClick={() => onFilterChange?.(filter.value)}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-medium
                    transition-all duration-150 border
                    ${
                      selectedFilter === filter.value
                        ? isDark
                          ? 'bg-neutral-700 text-white border-neutral-600'
                          : 'bg-neutral-800 text-white border-neutral-700'
                        : isDark
                          ? 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                    }
                  `}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FilterSearch;
