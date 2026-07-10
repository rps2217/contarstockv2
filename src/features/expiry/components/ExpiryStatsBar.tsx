/**
 * ExpiryStatsBar - Barra de estadísticas simplificada
 */

import React, { memo } from 'react';
import { AlertTriangle, AlertCircle, Clock, CheckCircle2, Package } from 'lucide-react';
import { ExpiryStats, ExpiryStatus } from '../hooks/useExpiry';

interface ExpiryStatsBarProps {
  stats: ExpiryStats;
  selectedStatuses: ExpiryStatus[];
  onStatusFilter: (statuses: ExpiryStatus[]) => void;
}

const statusConfig = [
  {
    key: ExpiryStatus.EXPIRED,
    label: 'Vencidos',
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30'
  },
  {
    key: ExpiryStatus.CRITICAL,
    label: 'Críticos',
    icon: AlertCircle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30'
  },
  {
    key: ExpiryStatus.WITHDRAWAL,
    label: 'Retirar',
    icon: Clock,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30'
  },
  {
    key: ExpiryStatus.NEXT_EXPIRY,
    label: 'Próximos',
    icon: Clock,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30'
  },
  {
    key: ExpiryStatus.SAFE,
    label: 'Vigentes',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30'
  }
];

export const ExpiryStatsBar = memo<ExpiryStatsBarProps>(({
  stats,
  selectedStatuses,
  onStatusFilter
}) => {
  const getCount = (status: ExpiryStatus): number => {
    switch (status) {
      case ExpiryStatus.EXPIRED: return stats.expired;
      case ExpiryStatus.CRITICAL: return stats.critical;
      case ExpiryStatus.WITHDRAWAL: return stats.withdrawal;
      case ExpiryStatus.NEXT_EXPIRY: return stats.nextExpiry;
      default: return stats.safe;
    }
  };

  const isSelected = (status: ExpiryStatus) => selectedStatuses.includes(status);

  const toggleStatus = (status: ExpiryStatus) => {
    if (isSelected(status)) {
      onStatusFilter(selectedStatuses.filter(s => s !== status));
    } else {
      onStatusFilter([...selectedStatuses, status]);
    }
  };

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
      {/* Total */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 shrink-0">
        <Package className="w-4 h-4 text-muted" />
        <span className="text-sm font-black text-white">{stats.total}</span>
      </div>

      {/* Status chips */}
      {statusConfig.map(({ key, label, icon: Icon, color, bg, border }) => {
        const count = getCount(key);
        const selected = isSelected(key);
        
        return (
          <button
            key={key}
            onClick={() => toggleStatus(key)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-xl transition-all shrink-0
              ${selected 
                ? `${bg} border ${border}` 
                : 'bg-white/5 border border-white/10 hover:bg-white/10'
              }
            `}
          >
            <Icon className={`w-4 h-4 ${selected ? color : 'text-slate-500'}`} />
            <span className={`text-xs font-bold ${selected ? color : 'text-muted'}`}>
              {count}
            </span>
            <span className={`text-[10px] font-medium ${selected ? color : 'text-slate-500'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
});

export default ExpiryStatsBar;
