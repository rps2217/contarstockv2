
import React, { memo, forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = memo(forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  leftIcon,
  rightIcon,
  containerClassName = '',
  className = '',
  ...props
}, ref) => {
  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        {leftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-info transition-colors">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-brand-surface/40 border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold
            placeholder:text-slate-600 focus:outline-none focus:border-brand-info focus:bg-brand-surface/60
            transition-all disabled:opacity-50
            ${leftIcon ? 'pl-12' : ''}
            ${rightIcon ? 'pr-12' : ''}
            ${error ? 'border-rose-500 bg-rose-500/5' : ''}
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
      {error && (
        <span className="text-[10px] font-bold text-rose-500 ml-1 animate-pulse">
          {error}
        </span>
      )}
    </div>
  );
}));

Input.displayName = 'Input';

