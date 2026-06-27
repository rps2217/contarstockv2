/**
 * TodaySummary - Resumen del día actual
 * Muestra métricas clave del día: sesiones, escaneos, etc.
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

interface TodaySummaryProps {
  sessionsCompleted: number;
  totalScanned: number;
  totalUnits: number;
  trend?: number; // Porcentaje vs ayer
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
      icon: <ClipboardCheck className="w-4 h-4" />,
      label: 'Sesiones',
      value: sessionsCompleted,
      color: 'blue'
    },
    {
      icon: <Scan className="w-4 h-4" />,
      label: 'Escaneos',
      value: totalScanned,
      color: 'emerald'
    },
    {
      icon: <Package className="w-4 h-4" />,
      label: 'Unidades',
      value: totalUnits,
      color: 'purple'
    },
  ];

  return (
    <div className={`
      rounded-xl border p-4
      ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-white border-neutral-200'}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`
            p-1.5 rounded-lg
            ${isDark ? 'bg-blue-600/20' : 'bg-blue-50'}
          `}>
            <Clock className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            Resumen de hoy
          </h3>
        </div>
        
        {/* Trend badge */}
        {trend !== 0 && (
          <div className={`
            flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
            ${trend > 0 
              ? 'bg-emerald-500/10 text-emerald-500' 
              : 'bg-rose-500/10 text-rose-500'
            }
          `}>
            <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            <span>{Math.abs(trend)}%</span>
          </div>
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
            <div className={`
              inline-flex items-center justify-center w-10 h-10 rounded-xl mb-2
              ${isDark ? 'bg-neutral-800' : 'bg-neutral-100'}
              ${stat.color === 'blue' ? (isDark ? 'text-blue-400' : 'text-blue-600') : ''}
              ${stat.color === 'emerald' ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : ''}
              ${stat.color === 'purple' ? (isDark ? 'text-purple-400' : 'text-purple-600') : ''}
            `}>
              {stat.icon}
            </div>
            
            {/* Value */}
            <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              {stat.value.toLocaleString()}
            </div>
            
            {/* Label */}
            <div className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
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
          className={`
            mt-4 pt-4 border-t flex items-center justify-center gap-2
            ${isDark ? 'border-neutral-800' : 'border-neutral-200'}
          `}
        >
          <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <span className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
            {sessionsCompleted} sesión{sessionsCompleted !== 1 ? 'es' : ''} completada{sessionsCompleted !== 1 ? 's' : ''} hoy
          </span>
        </motion.div>
      )}
    </div>
  );
});

TodaySummary.displayName = 'TodaySummary';

export default TodaySummary;