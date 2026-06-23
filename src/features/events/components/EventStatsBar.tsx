/**
 * EventStatsBar - Barra de estadísticas para eventos
 */

import React, { memo } from 'react';
import { Package, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { EventStats, EventStatus } from '../hooks/useEvents';

interface EventStatsBarProps {
  stats: EventStats;
  selectedStatuses: EventStatus[];
  onStatusFilter: (statuses: EventStatus[]) => void;
}

const statusConfig = [
  {
    key: EventStatus.PENDING,
    label: 'Pendientes',
    icon: Clock,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30'
  },
  {
    key: EventStatus.DESTINED,
    label: 'Destinados',
    icon: MapPin,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30'
  },
  {
    key: EventStatus.ADJUSTED,
    label: 'Ajustados',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30'
  }
];

export const EventStatsBar = memo<EventStatsBarProps>(({
  stats,
  selectedStatuses,
  onStatusFilter
}) => {
  const getCount = (status: EventStatus): number => {
    switch (status) {
      case EventStatus.PENDING: return stats.pending;
      case EventStatus.DESTINED: return stats.destined;
      case EventStatus.ADJUSTED: return stats.adjusted;
      default: return 0;
    }
  };

  const isSelected = (status: EventStatus) => selectedStatuses.includes(status);

  const toggleStatus = (status: EventStatus) => {
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
        <Package className="w-4 h-4 text-slate-400" />
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
            <span className={`text-xs font-bold ${selected ? color : 'text-slate-400'}`}>
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

export default EventStatsBar;
