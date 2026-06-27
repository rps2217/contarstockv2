/**
 * MetricCard - Tarjeta de métrica para el dashboard
 * Muestra un valor principal con cambio porcentual opcional
 */

import React, { memo } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: number; // Porcentaje de cambio (positivo, negativo o cero)
  icon?: React.ReactNode;
  variant?: 'default' | 'warning' | 'error' | 'success';
  isDark?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = memo(({
  label,
  value,
  change,
  icon,
  variant = 'default',
  isDark = true
}) => {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) {
      return <Minus className="w-3 h-3" />;
    }
    return change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) {
      return isDark ? 'text-neutral-500' : 'text-neutral-500';
    }
    return change > 0 ? 'text-emerald-500' : 'text-rose-500';
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return isDark ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-300 bg-amber-50';
      case 'error':
        return isDark ? 'border-rose-500/30 bg-rose-500/10' : 'border-rose-300 bg-rose-50';
      case 'success':
        return isDark ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-300 bg-emerald-50';
      default:
        return isDark ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-200 bg-white';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        p-4 rounded-xl border transition-all
        ${getVariantStyles()}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={`text-xs font-medium ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
          {label}
        </span>
        {icon && (
          <div className={`p-1.5 rounded-lg ${isDark ? 'bg-neutral-800' : 'bg-neutral-100'}`}>
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex items-end gap-2">
        <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        
        {change !== undefined && (
          <div className={`flex items-center gap-0.5 mb-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-xs font-semibold">
              {Math.abs(change)}%
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
});

MetricCard.displayName = 'MetricCard';

export default MetricCard;