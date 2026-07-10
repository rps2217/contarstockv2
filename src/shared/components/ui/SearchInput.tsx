/**
 * SearchInput - Campo de búsqueda estandarizado
 * 
 * Input con icono de búsqueda a la izquierda.
 * Estilo consistente en todas las páginas.
 */

import React, { memo } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  /** Valor actual del input */
  value: string;
  /** Callback al cambiar el valor */
  onChange: (value: string) => void;
  /** Placeholder del input */
  placeholder?: string;
  /** Tamaño del icono */
  iconSize?: 'sm' | 'md';
  /** Si está deshabilitado */
  disabled?: boolean;
  /** Clases CSS adicionales */
  className?: string;
  /** Callback al limpiar */
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = memo(({
  value,
  onChange,
  placeholder = 'Buscar...',
  iconSize = 'md',
  disabled = false,
  className,
  onClear,
}) => {
  const iconSizeClass = iconSize === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div className="relative">
      {/* Search Icon */}
      <Search className={cn(
        'absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none',
        iconSizeClass
      )} />

      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full bg-surface border border-subtle rounded-xl',
          'pl-10 pr-10 py-3 text-sm',
          'focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
          'transition-all duration-200',
          'placeholder:text-muted',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      />

      {/* Clear Button */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-elevated transition-colors"
        >
          <X className={cn('text-muted', iconSizeClass)} />
        </button>
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput;
