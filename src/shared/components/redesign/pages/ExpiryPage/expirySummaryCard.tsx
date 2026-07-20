/**
 * =============================================================================
 * EXPIRY SUMMARY CARD - Componente de resumen
 * =============================================================================
 *
 * Tarjeta de resumen con icono y计数 para el dashboard de vencimientos.
 *
 * @module ExpiryPage/expirySummaryCard
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  variant?: 'default' | 'warning' | 'danger' | 'success';
  className?: string;
}

const variantStyles = {
  default: 'bg-blue-500/10 text-blue-500',
  warning: 'bg-amber-500/10 text-amber-500',
  danger: 'bg-rose-500/10 text-rose-500',
  success: 'bg-emerald-500/10 text-emerald-500',
};

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  icon: Icon,
  variant = 'default',
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-surface border border-subtle rounded-xl p-3 flex items-center gap-3',
        className
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          variantStyles[variant]
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-muted">{title}</p>
        <p className="text-xl font-bold text-primary">{value}</p>
      </div>
    </div>
  );
};
