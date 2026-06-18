/**
 * Input Components - Componentes de entrada reutilizables
 */

import React from 'react';

type InputSize = 'sm' | 'md' | 'lg';
type InputVariant = 'default' | 'filled' | 'minimal';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: InputSize;
  variant?: InputVariant;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-3 text-sm',
  lg: 'px-5 py-4 text-base',
};

const baseInputClasses = `
  w-full rounded-xl font-bold border-2 transition-all outline-none
  placeholder:text-slate-500 placeholder:font-normal
`;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  size = 'md',
  variant = 'default',
  leftIcon,
  rightIcon,
  className = '',
  ...props
}, ref) => {
  const variantClasses = {
    default: 'bg-black/40 border-white/10 focus:border-blue-500 text-white',
    filled: 'bg-slate-800 border-slate-700 focus:border-blue-500 text-white',
    minimal: 'bg-transparent border-transparent focus:border-blue-500 text-white',
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
            {leftIcon}
          </div>
        )}
        
        <input
          ref={ref}
          className={`
            ${baseInputClasses}
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            ${leftIcon ? 'pl-12' : ''}
            ${rightIcon ? 'pr-12' : ''}
            ${error ? 'border-rose-500 focus:border-rose-500' : ''}
            ${className}
          `}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
            {rightIcon}
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <p className={`text-[10px] ${error ? 'text-rose-400' : 'text-slate-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

/**
 * Textarea component
 */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </label>
      )}
      
      <textarea
        ref={ref}
        className={`
          ${baseInputClasses}
          px-5 py-4 text-sm
          ${error ? 'border-rose-500 focus:border-rose-500' : 'border-white/10 focus:border-blue-500'}
          ${className}
        `}
        {...props}
      />
      
      {error && (
        <p className="text-[10px] text-rose-400">{error}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

/**
 * Select component
 */
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  options,
  placeholder,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </label>
      )}
      
      <select
        ref={ref}
        className={`
          ${baseInputClasses}
          ${sizeClasses.md}
          appearance-none bg-no-repeat
          pr-10
          ${error ? 'border-rose-500 focus:border-rose-500' : 'border-white/10 focus:border-blue-500'}
          bg-[length:1.25rem] bg-[right_1rem_center]
          ${className}
        `}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`
        }}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p className="text-[10px] text-rose-400">{error}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

/**
 * Checkbox component
 */
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  className = '',
  ...props
}, ref) => {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        ref={ref}
        type="checkbox"
        className={`
          w-4 h-4 rounded border-white/10 bg-slate-950 
          text-blue-600 focus:ring-blue-500 focus:ring-offset-0
          cursor-pointer
          ${className}
        `}
        {...props}
      />
      {label && (
        <span className="text-xs font-bold text-slate-300">{label}</span>
      )}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';
