/**
 * SearchInput - Campo de búsqueda reutilizable
 */

import React, { memo } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../tokens';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isDark?: boolean;
  onClear?: () => void;
  className?: string;
  autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = memo(({
  value,
  onChange,
  placeholder = 'Buscar...',
  isDark = true,
  onClear,
  className,
  autoFocus,
}) => {
  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div className={cn('relative', className)}>
      <Search
        className={cn(
          'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none',
          isDark ? 'text-neutral-500' : 'text-neutral-400'
        )}
      />
      
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          'w-full h-10 pl-10 pr-10 rounded-lg text-sm',
          'border transition-colors',
          'placeholder:text-neutral-500',
          'focus:outline-none focus:ring-2 focus:ring-neutral-500/50',
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-500'
            : 'bg-neutral-100 border-neutral-200 text-neutral-900 placeholder:text-neutral-400',
          value ? 'pr-10' : ''
        )}
      />
      
      {value && (
        <button
          onClick={handleClear}
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded',
            isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-400 hover:text-neutral-600'
          )}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';
