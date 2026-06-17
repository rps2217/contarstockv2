/**
 * Button Components - Componentes de botones reutilizables
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-white shadow-slate-500/20',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20',
  ghost: 'bg-transparent hover:bg-white/5 text-slate-400 hover:text-white',
  outline: 'bg-transparent border-2 border-white/10 hover:border-white/20 text-slate-300 hover:text-white',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[10px] rounded-lg',
  md: 'px-5 py-3 text-xs rounded-xl',
  lg: 'px-8 py-4 text-sm rounded-2xl',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      disabled={disabled || isLoading}
      className={`
        font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2
        active:scale-95 shadow-lg
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : leftIcon ? (
        leftIcon
      ) : null}
      {children}
      {rightIcon && !isLoading && rightIcon}
    </button>
  );
};

/**
 * Botón secundario con variantes
 */
export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="secondary" {...props} />
);

/**
 * Botón de peligro
 */
export const DangerButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="danger" {...props} />
);

/**
 * Botón fantasma
 */
export const GhostButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="ghost" {...props} />
);
