/**
 * MetricCard - Tarjeta de métrica para el dashboard
 * Estilo inspirado en Magic Patterns con gradientes y glow effects
 */

import React, { memo } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SparklineChart } from './SparklineChart';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label?: string;
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  variant?: 'default' | 'warning' | 'error' | 'success';
  isDark?: boolean;
  sparklineData?: number[];
  sparklineColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = memo(({
  title,
  value,
  change,
  icon,
  variant = 'default',
  isDark = true,
  sparklineData,
  sparklineColor = '#3b82f6'
}) => {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) {
      return <Minus className="w-3 h-3" />;
    }
    return change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
  };

  // Colores según variante
  const getColorClasses = () => {
    switch (variant) {
      case 'warning':
        return {
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          border: 'border-amber-500/20'
        };
      case 'error':
        return {
          bg: 'bg-rose-500/10',
          text: 'text-rose-400',
          border: 'border-rose-500/20'
        };
      case 'success':
        return {
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          border: 'border-emerald-500/20'
        };
      default:
        return {
          bg: 'bg-blue-500/10',
          text: 'text-blue-400',
          border: 'border-slate-800/60'
        };
    }
  };

  const colors = getColorClasses();

  // Determinar color del sparkline basado en la tendencia
  const getSparklineColor = () => {
    if (change !== undefined && change !== 0) {
      return change > 0 ? '#10b981' : '#ef4444';
    }
    return sparklineColor;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden group"
    >
      {/* Glow effect */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />

      <div className="flex justify-between items-start">
        <div className={cn('p-2.5 rounded-xl', colors.bg, colors.text)}>
          {icon}
        </div>
        
        {change !== undefined && change !== 0 && (
          <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium bg-emerald-400/10 px-2 py-1 rounded-full">
            <TrendingUp className="w-3 h-3" />
            <span>+{change}%</span>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
        <p className="text-2xl font-bold text-slate-100">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </div>

      {/* Sparkline chart */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-1">
          <SparklineChart 
            data={sparklineData} 
            color={getSparklineColor()}
            height={28}
            isDark={isDark}
          />
        </div>
      )}
    </motion.div>
  );
});

MetricCard.displayName = 'MetricCard';

export default MetricCard;