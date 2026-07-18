/**
 * ReportsPage - Componentes reutilizables
 */

import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Tipos
// ============================================================================

export type TimePeriod = 'today' | 'week' | 'month' | 'year';
export type ReportType = 'counting' | 'inventory' | 'sync' | 'expiry';

// ============================================================================
// StatCard
// ============================================================================

export interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  isPositive?: boolean;
  icon?: React.ElementType;
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'cyan';
}

const colorMap: Record<string, string> = {
  blue: 'text-blue-500',
  green: 'text-emerald-500',
  red: 'text-rose-500',
  amber: 'text-amber-500',
  purple: 'text-purple-500',
  cyan: 'text-cyan-500',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  trend,
  isPositive,
  icon: Icon,
  color = 'blue',
}) => {
  return (
    <div className="bg-surface border border-subtle rounded-2xl p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-secondary text-sm font-medium">{title}</h3>
        {Icon && <Icon className={cn('w-4 h-4', colorMap[color])} />}
      </div>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-primary">{value}</p>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
              isPositive ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {trend}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MiniChart
// ============================================================================

export interface MiniChartProps {
  data: number[];
  color?: 'blue' | 'green' | 'red';
}

export const MiniChart: React.FC<MiniChartProps> = ({ data, color = 'blue' }) => {
  const max = Math.max(...data, 1);
  const colorClass =
    color === 'blue' ? 'bg-blue-500' : color === 'green' ? 'bg-emerald-500' : 'bg-rose-500';

  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((value, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end">
          <div
            className={cn('w-full rounded-sm', colorClass)}
            style={{ height: `${Math.max((value / max) * 100, 10)}%` }}
          />
        </div>
      ))}
    </div>
  );
};

export default {
  StatCard,
  MiniChart,
};
