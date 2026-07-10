/**
 * StatCard - Componente base para mostrar estadísticas
 * Versión simple y reutilizable para cualquier parte de la aplicación
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  /** Título de la estadística */
  label: string;
  /** Valor a mostrar */
  value: string | number;
  /** Icono a mostrar (opcional) */
  icon?: React.ReactNode;
  /** Variante de color */
  variant?: 'default' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  /** Cambio porcentual (opcional) */
  trend?: number;
  /** Clases CSS adicionales (opcional) */
  className?: string;
}

const variantStyles: Record<string, { bg: string; text: string }> = {
  default: { bg: 'bg-elevated', text: 'text-muted' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  green: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  yellow: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  red: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
};

export const StatCard: React.FC<StatCardProps> = memo(({
  label,
  value,
  icon,
  variant = 'default',
  trend,
  className
}) => {
  const styles = variantStyles[variant];
  
  return (
    <div className={cn(
      'bg-surface/50 border border-subtle/60 rounded-xl p-4 text-center',
      className
    )}>
      {/* Icon */}
      {icon && (
        <div className={cn(
          'inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3',
          styles.bg, styles.text
        )}>
          {icon}
        </div>
      )}
      
      {/* Value */}
      <p className="text-xl font-bold text-slate-100">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      
      {/* Label */}
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      
      {/* Trend */}
      {trend !== undefined && trend !== 0 && (
        <div className={cn(
          'flex items-center justify-center gap-1 mt-2 text-xs font-medium',
          trend > 0 ? 'text-emerald-400' : 'text-rose-400'
        )}>
          {trend > 0 ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
    </div>
  );
});

StatCard.displayName = 'StatCard';

export default StatCard;