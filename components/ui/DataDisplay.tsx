
import React, { memo } from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  className?: string;
}

export const Badge = memo(({ children, variant = 'neutral', className = '' }: BadgeProps) => {
  const variants = {
    success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    error: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    neutral: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  };

  return (
    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card = memo(({ children, className = '', onClick, hoverable = false }: CardProps) => {
  return (
    <div 
      onClick={onClick}
      className={`
        bg-slate-900/40 border border-white/5 rounded-3xl p-6
        ${hoverable ? 'hover:bg-slate-900/60 hover:border-white/10 cursor-pointer transition-all active:scale-[0.98]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';
