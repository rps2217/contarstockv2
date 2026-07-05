/**
 * Select - Componente de selección con label y validación
 */

import React, { memo, useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  helper?: string;
  disabled?: boolean;
  className?: string;
  containerClassName?: string;
}

export const Select = memo(({
  options,
  value,
  onChange,
  label,
  placeholder = 'Seleccionar...',
  error,
  helper,
  disabled = false,
  className = '',
  containerClassName = '',
}: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          const option = options[focusedIndex];
          if (!option.disabled) {
            onChange?.(option.value);
            setIsOpen(false);
          }
        } else {
          setIsOpen(!isOpen);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => {
            const next = prev + 1;
            return next >= options.length ? 0 : next;
          });
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => {
            const next = prev - 1;
            return next < 0 ? options.length - 1 : next;
          });
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleOptionClick = (option: SelectOption) => {
    if (option.disabled) return;
    onChange?.(option.value);
    setIsOpen(false);
  };

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
          {label}
        </label>
      )}

      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`
            w-full flex items-center justify-between
            bg-brand-surface/40 border rounded-2xl px-5 py-4
            text-sm font-bold text-left
            transition-all disabled:opacity-50
            focus:outline-none focus:ring-2 focus:ring-brand-info
            ${error
              ? 'border-rose-500 bg-rose-500/5'
              : 'border-white/5 focus:border-brand-info focus:bg-brand-surface/60'
            }
            ${className}
          `}
        >
          <span className={selectedOption ? 'text-white' : 'text-slate-500'}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <ul
            ref={listRef}
            role="listbox"
            className="
              absolute z-50 w-full mt-2 py-2
              bg-brand-surface border border-white/10 rounded-2xl
              shadow-2xl max-h-60 overflow-y-auto
              animate-in fade-in slide-in-from-top-2 duration-200
            "
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled}
                onClick={() => handleOptionClick(option)}
                className={`
                  flex items-center justify-between px-4 py-3
                  text-sm font-medium cursor-pointer
                  transition-colors
                  ${option.disabled
                    ? 'text-slate-600 cursor-not-allowed'
                    : index === focusedIndex
                      ? 'bg-brand-info/20 text-brand-info'
                      : 'text-white hover:bg-white/5'
                  }
                  ${option.value === value ? 'text-brand-info' : ''}
                `}
              >
                <span className="flex items-center gap-2">
                  {option.icon}
                  {option.label}
                </span>
                {option.value === value && (
                  <Check className="w-4 h-4 text-brand-info" />
                )}
              </li>
            ))}

            {options.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-500 text-center">
                Sin opciones disponibles
              </li>
            )}
          </ul>
        )}
      </div>

      {error && (
        <span className="text-[10px] font-bold text-rose-500 ml-1 animate-pulse">
          {error}
        </span>
      )}

      {helper && !error && (
        <span className="text-[10px] text-slate-500 ml-1">
          {helper}
        </span>
      )}
    </div>
  );
});

Select.displayName = 'Select';

// Native Select - Versión usando <select> nativo
interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
  options: SelectOption[];
  containerClassName?: string;
}

export const NativeSelect = memo(({
  label,
  error,
  helper,
  options,
  containerClassName = '',
  className = '',
  ...props
}: NativeSelectProps) => {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
          {label}
        </label>
      )}
      <select
        className={`
          w-full bg-brand-surface/40 border border-white/5 rounded-2xl px-5 py-4
          text-sm font-bold
          focus:outline-none focus:border-brand-info focus:ring-2 focus:ring-brand-info/20
          transition-all disabled:opacity-50
          appearance-none cursor-pointer
          bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')]
          bg-[length:1.5rem_1.5rem] bg-[right_1rem_center] bg-no-repeat
          pr-12
          ${error ? 'border-rose-500 bg-rose-500/5' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map(option => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-[10px] font-bold text-rose-500 ml-1 animate-pulse">
          {error}
        </span>
      )}
      {helper && !error && (
        <span className="text-[10px] text-slate-500 ml-1">
          {helper}
        </span>
      )}
    </div>
  );
});

NativeSelect.displayName = 'NativeSelect';