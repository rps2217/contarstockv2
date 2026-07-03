/**
 * FormField - Componente reutilizable para campos de formulario
 * 
 * Proporciona:
 * - Label con icono opcional
 * - Input/Textarea/Select
 * - Estados: default, error, success, disabled
 * - Variantes: text, number, textarea, select, select-options
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export type ThemeType = 'dark' | 'light' | 'high-contrast';

export interface FormFieldProps {
  /** Label del campo */
  label: string;
  /** Placeholder */
  placeholder?: string;
  /** Valor actual */
  value: string | number;
  /** Cambio de valor */
  onChange: (value: string) => void;
  /** Tipo de input */
  type?: 'text' | 'number' | 'email' | 'tel' | 'password' | 'textarea';
  /** Variante visual */
  variant?: 'default' | 'filled' | 'outline';
  /** Tema */
  theme?: ThemeType;
  /** Icono (nombre de Lucide) */
  icon?: React.ReactNode;
  /** Mostrar loading */
  loading?: boolean;
  /** Texto de error */
  error?: string;
  /** Deshabilitado */
  disabled?: boolean;
  /** Requerido */
  required?: boolean;
  /** Auto-mayúsculas */
  uppercase?: boolean;
  /** Clases adicionales */
  className?: string;
  /** Para number: min */
  min?: number;
  /** Para number: max */
  max?: number;
  /** Para select: opciones */
  options?: Array<{ value: string; label: string }>;
  /** Para textarea: filas */
  rows?: number;
  /** onBlur callback */
  onBlur?: () => void;
  /** autoFocus */
  autoFocus?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  placeholder = '',
  value,
  onChange,
  type = 'text',
  variant = 'default',
  theme = 'dark',
  icon,
  loading = false,
  error,
  disabled = false,
  required = false,
  uppercase = false,
  className = '',
  min,
  max,
  options,
  rows = 4,
  onBlur,
  autoFocus,
}) => {
  const isDark = (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray';

  // Clases base
  const baseInputClass = `
    w-full px-4 py-3 rounded-xl text-xs font-bold transition-all outline-none
    ${icon ? 'pl-11' : ''}
    ${loading ? 'pr-10' : ''}
    ${error ? 'border-rose-500 focus:border-rose-500' : ''}
  `;

  // Clases según variante
  const variantClass = {
    default: isDark
      ? 'bg-surface border border-white/10 text-white focus:border-blue-500'
      : 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-blue-600',
    filled: isDark
      ? 'bg-black/40 border border-white/5 text-white focus:border-blue-500'
      : 'bg-slate-100 border border-slate-200 text-slate-800 focus:border-blue-600',
    outline: isDark
      ? 'bg-transparent border-2 border-white/10 text-white focus:border-blue-500'
      : 'bg-transparent border-2 border-slate-300 text-slate-800 focus:border-blue-600',
  };

  // Renderizar input o textarea
  const renderInput = () => {
    // Si hay opciones, renderizar como select
    if (options) {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          autoFocus={autoFocus}
          onBlur={onBlur}
          className={`${baseInputClass} ${variantClass[variant]} appearance-none cursor-pointer ${className}`}
        >
          <option value="">{placeholder || 'Seleccionar...'}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    // Si es textarea
    if (type === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || loading}
          rows={rows}
          autoFocus={autoFocus}
          onBlur={onBlur}
          className={`${baseInputClass} ${variantClass[variant]} ${isDark ? 'placeholder:text-slate-600' : 'placeholder:text-muted'} resize-none ${className}`}
        />
      );
    }

    return (
      <input
        type={type as 'text' | 'number' | 'email' | 'tel' | 'password'}
        value={value}
        onChange={(e) => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
        placeholder={placeholder}
        disabled={disabled || loading}
        min={min}
        max={max}
        autoFocus={autoFocus}
        onBlur={onBlur}
        className={`${baseInputClass} ${variantClass[variant]} ${isDark ? 'placeholder:text-slate-600' : 'placeholder:text-muted'} ${className}`}
      />
    );
  };

  return (
    <div className="space-y-2">
      {/* Label */}
      <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wider ${
        isDark ? 'text-muted' : 'text-slate-500'
      }`}>
        {icon && <span className="text-blue-400">{icon}</span>}
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>

      {/* Input wrapper */}
      <div className="relative">
        {renderInput()}

        {/* Icon overlay */}
        {icon && !loading && (
          <div className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${
            isDark ? 'text-slate-500' : 'text-muted'
          }`}>
            {icon}
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-[10px] text-rose-400 font-bold">{error}</p>
      )}
    </div>
  );
};

// =============================================================================
// COMPONENTES ESPECIALIZADOS
// =============================================================================

/** Campo SKU con búsqueda visual */
export const SKUInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  productName?: string | null;
  isSearching?: boolean;
  theme?: 'dark' | 'light';
  placeholder?: string;
  onAdd?: () => void;
  showAddButton?: boolean;
}> = ({ value, onChange, productName, isSearching, theme = 'dark', placeholder = 'Ingresa SKU o barcode...', onAdd, showAddButton }) => {
  const isDark = (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray';

  return (
    <div className="space-y-2">
      <FormField
        label="SKU / Código de Barras"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        icon={<span className="text-sm">📦</span>}
        loading={isSearching}
        theme={theme}
        uppercase
      />
      
      {productName && (
        <div className={`flex items-center gap-2 p-3 rounded-xl ${
          isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'
        }`}>
          <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>✓</span>
          <span className={`text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
            {productName}
          </span>
        </div>
      )}
      
      {value.length >= 3 && !productName && !isSearching && (
        <div className={`p-3 rounded-xl ${
          isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
        }`}>
          <span className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
            Producto no encontrado en base de datos
          </span>
        </div>
      )}

      {showAddButton && value && (
        <button
          type="button"
          onClick={onAdd}
          className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            isDark 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          + Agregar Producto
        </button>
      )}
    </div>
  );
};

/** Campo de cantidad numérica */
export const QuantityInput: React.FC<{
  value: number;
  onChange: (value: number) => void;
  theme?: 'dark' | 'light';
  min?: number;
  max?: number;
  label?: string;
}> = ({ value, onChange, theme = 'dark', min = 0, max, label = 'Cantidad' }) => {
  const isDark = (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray';

  return (
    <div className="space-y-2">
      <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-muted' : 'text-slate-500'}`}>
        <span>#️⃣</span> {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className={`w-12 h-12 rounded-xl font-black text-xl transition-all ${
            isDark 
              ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
          }`}
        >
          -
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || min)}
          min={min}
          max={max}
          className={`flex-1 px-4 py-3 rounded-xl text-center text-lg font-black transition-all outline-none ${
            isDark
              ? 'bg-surface border border-white/10 text-white focus:border-blue-500'
              : 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-blue-600'
          }`}
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max || Infinity, value + 1))}
          className={`w-12 h-12 rounded-xl font-black text-xl transition-all ${
            isDark 
              ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
          }`}
        >
          +
        </button>
      </div>
    </div>
  );
};

/** Selector de tipo de evento */
export const EventTypeSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; icon?: string; color?: string }>;
  theme?: 'dark' | 'light';
  label?: string;
}> = ({ value, onChange, options, theme = 'dark', label = 'Tipo de Evento' }) => {
  const isDark = (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray';

  return (
    <div className="space-y-2">
      <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-muted' : 'text-slate-500'}`}>
        <span>⚡</span> {label}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
              value === opt.value
                ? opt.color === 'rose'
                  ? 'bg-rose-600 border-rose-500 text-white'
                  : opt.color === 'amber'
                  ? 'bg-amber-600 border-amber-500 text-white'
                  : opt.color === 'blue'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-emerald-600 border-emerald-500 text-white'
                : isDark
                ? 'bg-white/5 border-white/10 text-muted hover:border-white/20'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {opt.icon && <span className="mr-1">{opt.icon}</span>}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

/** Selector de destino con chips */
export const DestinationSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: string[];
  theme?: 'dark' | 'light';
  label?: string;
  showCustom?: boolean;
}> = ({ value, onChange, options, theme = 'dark', label = 'Destino', showCustom = true }) => {
  const isDark = (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray';
  const [customValue, setCustomValue] = React.useState('');

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim().toUpperCase());
      setCustomValue('');
    }
  };

  return (
    <div className="space-y-2">
      <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-muted' : 'text-slate-500'}`}>
        <span>🏭</span> {label}
      </label>
      
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              value === opt
                ? 'bg-blue-600 text-white'
                : isDark
                ? 'bg-white/5 text-muted hover:bg-white/10'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value.toUpperCase())}
            placeholder="Otro destino..."
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold ${
              isDark
                ? 'bg-surface border border-white/10 text-white'
                : 'bg-slate-50 border border-slate-200 text-slate-800'
            }`}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
          />
          <button
            type="button"
            onClick={handleCustomSubmit}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${
              isDark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
};

export default FormField;
