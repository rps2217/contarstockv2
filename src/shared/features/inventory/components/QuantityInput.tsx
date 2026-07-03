/**
 * QuantityInput - Componente compartido para entrada de cantidad
 * 
 * Características:
 * - Input numérico con controles +/-
 * - Validación de rango
 * - Soporte para teclado numérico
 * 
 * Usado en: Expiry, Events, Reports, cualquier módulo que necesite cantidades
 */

import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
  className?: string;
}

export const QuantityInput: React.FC<QuantityInputProps> = ({
  value,
  onChange,
  min = 1,
  max = 99999,
  step = 1,
  label = 'Cantidad',
  disabled = false,
  theme = 'dark',
  className = '',
}) => {
  const isDark = (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray';
  const isHighContrast = theme === 'high-contrast';

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === '') {
      onChange(min);
      return;
    }
    
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue)) {
      const clampedValue = Math.min(max, Math.max(min, numValue));
      onChange(clampedValue);
    }
  };

  const buttonBaseClass = `p-2 rounded-xl transition-all active:scale-90 ${
    disabled 
      ? 'opacity-50 cursor-not-allowed' 
      : isDark 
        ? 'hover:bg-white/10 active:bg-white/20' 
        : 'hover:bg-slate-200 active:bg-slate-300'
  }`;

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className={`text-[10px] font-black uppercase tracking-widest ${
          isDark ? 'text-muted' : 'text-slate-500'
        }`}>
          {label}
        </label>
      )}

      <div className={`flex items-center gap-2 ${isHighContrast ? 'ring-2 ring-yellow-400/50 rounded-xl' : ''}`}>
        {/* Decrement Button */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className={`${buttonBaseClass} ${
            value <= min 
              ? 'text-slate-600' 
              : isDark 
                ? 'text-muted' 
                : 'text-slate-600'
          }`}
        >
          <Minus className="w-5 h-5" />
        </button>

        {/* Input */}
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          min={min}
          max={max}
          className={`
            flex-1 px-4 py-3 rounded-xl text-center
            font-black text-xl tabular-nums
            border-2 transition-all outline-none
            ${isDark 
              ? 'bg-black/40 border-white/10 text-white focus:border-blue-500' 
              : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${isHighContrast ? 'ring-2 ring-yellow-400/50' : ''}
            /* Hide spinner arrows */
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
          `}
        />

        {/* Increment Button */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          className={`${buttonBaseClass} ${
            value >= max 
              ? 'text-slate-600' 
              : isDark 
                ? 'text-muted' 
                : 'text-slate-600'
          }`}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Range indicator */}
      <p className={`text-[9px] text-center font-mono ${
        isDark ? 'text-slate-500' : 'text-muted'
      }`}>
        {min !== 1 && `Mín: ${min}`}
        {min !== 1 && max !== 99999 && ' • '}
        {max !== 99999 && `Máx: ${max}`}
      </p>
    </div>
  );
};
