
import React, { memo } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = memo(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}: ButtonProps) => {
  const baseStyles = 'inline-flex items-center justify-center font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 select-none';
  
  const variants = {
    primary: 'bg-brand-warning text-white hover:bg-brand-warning/90 shadow-lg shadow-brand-warning/20',
    secondary: 'bg-brand-surface text-slate-300 hover:bg-brand-surface/80 border border-white/10',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-900/20',
    ghost: 'bg-transparent text-slate-400 hover:bg-white/5',
    outline: 'bg-transparent border-2 border-white/20 text-white hover:bg-white/5',
    accent: 'bg-brand-accent text-brand-dark hover:bg-brand-accent/90 shadow-lg shadow-brand-accent/10',
    info: 'bg-brand-info text-white hover:bg-brand-info/90 shadow-lg shadow-brand-info/20'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[10px] rounded-lg',
    md: 'px-5 py-3 text-xs rounded-xl',
    lg: 'px-8 py-4 text-sm rounded-2xl',
    xl: 'px-10 py-6 text-base rounded-[2rem] w-full' // Optimizado para PDAs (botones de acción principal)
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
      ) : leftIcon ? (
        <span className="mr-2">{leftIcon}</span>
      ) : null}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
});

Button.displayName = 'Button';

