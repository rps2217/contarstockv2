/**
 * TodaySummary - Resumen del día actual
 * Estilo inspirado en Magic Patterns
 */

import React, { memo } from 'react';
import { motion } from 'motion/react';
import { 
  ClipboardCheck, 
  Scan, 
  Package, 
  TrendingUp,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TodaySummaryProps {
  sessionsCompleted: number;
  totalScanned: number;
  totalUnits: number;
  trend?: number;
  isDark?: boolean;
}

export const TodaySummary: React.FC<TodaySummaryProps> = memo(({
  sessionsCompleted,
  totalScanned,
  totalUnits,
  trend = 0,
  isDark = true
}) => {
  const stats = [
    {
      icon: <ClipboardCheck className="w-5 h-5" />,
      label: 'Sesiones',
      value: sessionsCompleted,
      colorClass: 'bg-blue-500/10 text-blue-400'
    },
    {
      icon: <Scan className="w-5 h-5" />,
      label: 'Escaneos',
      value: totalScanned,
      colorClass: 'bg-emerald-500/10 text-emerald-400'
    },
    {
      icon: <Package className="w-5 h-5" />,
      label: 'Unidades',
      value: totalUnits,
      colorClass: 'bg-purple-500/10 text-purple-400'
    },
  ];

  return (
    <div className="bg-surface/50 border border-subtle/60 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10">
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Resumen de hoy
            </h3>
            <p className="text-xs text-slate-500">
              Tu actividad del día
            </p>
          </div>
        </div>
        
        {/* Trend badge */}
        {trend !== 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
              trend > 0 
                ? 'bg-emerald-500/10 text-emerald-400' 
                : 'bg-rose-500/10 text-rose-400'
            )}
          >
            <TrendingUp className={cn("w-3.5 h-3.5", trend < 0 && 'rotate-180')} />
            <span>{trend > 0 ? '+' : ''}{trend}% vs ayer</span>
          </motion.div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="text-center"
          >
            {/* Icon */}
            <div className={cn(
              "inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3",
              stat.colorClass
            )}>
              {stat.icon}
            </div>
            
            {/* Value */}
            <div className="text-2xl font-bold text-slate-100">
              {stat.value.toLocaleString()}
            </div>
            
            {/* Label */}
            <div className="text-xs text-slate-500 mt-1">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Completed badge */}
      {sessionsCompleted > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 pt-4 border-t border-subtle/60 flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-muted">
            {sessionsCompleted} sesión{sessionsCompleted !== 1 ? 'es' : ''} completada{sessionsCompleted !== 1 ? 's' : ''} hoy
          </span>
        </motion.div>
      )}
    </div>
  );
});

TodaySummary.displayName = 'TodaySummary';

export default TodaySummary;