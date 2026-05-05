
import React, { memo } from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  className?: string;
}

export const Badge = memo(({ children, variant = 'neutral', className = '' }: BadgeProps) => {
  const variants = {
    success: 'bg-brand-info/10 text-brand-info border-brand-info/20',
    warning: 'bg-brand-warning/10 text-brand-warning border-brand-warning/20',
    error: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    info: 'bg-brand-accent/10 text-brand-accent border-brand-accent/20',
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
        bg-brand-surface/60 backdrop-blur-md border border-white/5 rounded-3xl p-6
        ${hoverable ? 'hover:bg-brand-surface/90 hover:border-white/10 cursor-pointer transition-all active:scale-[0.98]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

