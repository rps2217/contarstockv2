/**
 * DashboardStatCard - Tarjeta de estadística optimizada
 * 
 * Componente memoizado para evitar re-renders innecesarios.
 */

import React, { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardStatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  icon: React.ReactNode;
  colorClass: string;
  onClick?: () => void;
  linkTo?: string;
  index?: number;
}

export const DashboardStatCard = memo(({
  title,
  value,
  trend,
  icon,
  colorClass,
  onClick,
  linkTo,
  index = 0,
}: DashboardStatCardProps) => {
  // Memoizar el handler de click
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
    }
  }, [onClick]);

  const isClickable = !!(onClick || linkTo);

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={handleClick}
      disabled={!isClickable}
      className={cn(
        'bg-surface border border-subtle rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden transition-all duration-200',
        isClickable && 'hover:bg-elevated hover:border-blue-500/30 cursor-pointer group'
      )}
    >
      {/* Gradient overlay */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />

      <div className="flex justify-between items-start relative z-10">
        <div className={cn('p-2.5 rounded-xl', colorClass)}>
          {icon}
        </div>
        
        {trend && (
          <div className="flex items-center gap-1 text-emerald-500 text-xs font-medium bg-emerald-500/10 px-2 py-1 rounded-full">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </div>
        )}
        
        {isClickable && (
          <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      <div className="text-left relative z-10">
        <h3 className="text-secondary text-sm font-medium mb-1">{title}</h3>
        <p className="text-2xl font-bold text-primary">{value}</p>
      </div>
    </motion.button>
  );
});

DashboardStatCard.displayName = 'DashboardStatCard';

// Versión simple sin animación
export const DashboardStatCardSimple = memo(({
  title,
  value,
  trend,
  icon,
  colorClass,
  onClick,
}: Omit<DashboardStatCardProps, 'index'>) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'bg-surface border border-subtle rounded-xl p-4 flex items-center gap-4 transition-colors',
        onClick && 'hover:bg-elevated cursor-pointer'
      )}
    >
      <div className={cn('p-2 rounded-lg', colorClass)}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className="text-xs text-muted">{title}</p>
        <p className="text-lg font-bold text-primary">{value}</p>
      </div>
      {trend && (
        <span className="text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
          {trend}
        </span>
      )}
    </button>
  );
});

DashboardStatCardSimple.displayName = 'DashboardStatCardSimple';

export default DashboardStatCard;