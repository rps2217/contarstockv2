/**
 * Badge - Componente atómico para etiquetas y estados
 */

import React, { memo } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-700 text-primary',
  success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  danger: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
  info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  muted: 'bg-white/5 text-slate-500 border border-white/10',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[9px]',
  md: 'px-2 py-1 text-[10px]',
  lg: 'px-3 py-1.5 text-xs',
};

export const Badge = memo(({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  ...props
}: BadgeProps) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${
          variant === 'success' ? 'bg-emerald-400' :
          variant === 'warning' ? 'bg-amber-400' :
          variant === 'danger' ? 'bg-rose-400' :
          variant === 'info' ? 'bg-blue-400' :
          'bg-current'
        }`} />
      )}
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

// StatusDot - Indicador visual simple
export const StatusDot = memo(({
  status,
  pulse = false,
  size = 'md',
}: {
  status: 'success' | 'warning' | 'danger' | 'info' | 'muted';
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const colors = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-blue-500',
    muted: 'bg-slate-500',
  };
  
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  return (
    <span className={`relative inline-flex ${sizes[size]}`}>
      <span className={`absolute inline-flex h-full w-full rounded-full ${colors[status]} ${pulse ? 'animate-ping opacity-75' : ''}`} />
      <span className={`relative inline-flex rounded-full h-full w-full ${colors[status]}`} />
    </span>
  );
});

StatusDot.displayName = 'StatusDot';
