/**
 * Theoretical Loads Page Components
 * Componentes de UI reutilizables para la página de cargas teóricas
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Download } from 'lucide-react';

export const SummaryCard = ({
  label,
  value,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  colorClass: string;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-surface border border-subtle rounded-2xl p-4 flex items-center gap-3"
  >
    <div
      className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center',
        colorClass.replace('text-', 'bg-') + '/10'
      )}
    >
      <Icon className={cn('w-6 h-6', colorClass)} />
    </div>
    <div>
      <p className={cn('text-2xl font-bold', colorClass)}>{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  </motion.div>
);

export const TabButton = ({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
}) => {
  const colorMap: Record<string, string> = {
    emerald: 'emerald-500',
    indigo: 'indigo-500',
    amber: 'amber-500',
  };
  const c = colorMap[color] || 'blue-500';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
        active
          ? `bg-${c}/10 text-${c} border border-${c}/30`
          : 'bg-surface text-secondary hover:text-primary border border-subtle'
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
      <span
        className={cn(
          'px-2 py-0.5 rounded-full text-xs font-bold',
          active ? `bg-${c}/20 text-${c.replace('-500', '-400')}` : 'bg-elevated text-muted'
        )}
      >
        {count}
      </span>
    </button>
  );
};

export const EmptyState = ({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) => (
  <div className="py-6 bg-surface/40 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
    <Icon className="w-7 h-7 text-slate-700 mb-2" />
    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{title}</span>
    <p className="text-[8px] font-bold text-slate-600 uppercase mt-1">{subtitle}</p>
  </div>
);

export const SyncButton = ({
  onClick,
  icon: Icon,
  label,
  isLoading,
  disabled,
  color = 'emerald',
}: {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  isLoading: boolean;
  disabled?: boolean;
  color?: 'emerald' | 'blue' | 'amber';
}) => {
  const colorClasses = {
    emerald: 'bg-emerald-600 hover:bg-emerald-500',
    blue: 'bg-blue-600 hover:bg-blue-500',
    amber: 'bg-amber-600 hover:bg-amber-500',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'px-3 py-2 text-white rounded-xl text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50',
        colorClasses[color]
      )}
    >
      {isLoading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Icon className="w-4 h-4" />
        </motion.div>
      ) : (
        <Icon className="w-4 h-4" />
      )}
      {label}
    </button>
  );
};
