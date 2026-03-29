
import React from 'react';
import { AlertTriangle, ShieldAlert, Download, Clock, CheckCircle2 } from 'lucide-react';

interface ExpiryStatsProps {
  stats: {
    expired: number;
    critical: number;
    withdrawal: number;
    next_expiry: number;
    total: number;
  };
  selectedStatuses: string[];
  onStatusClick: (status: string) => void;
  theme?: 'dark' | 'light';
}

export const ExpiryStats: React.FC<ExpiryStatsProps> = ({ stats, selectedStatuses, onStatusClick, theme = 'dark' }) => {
  const statItems = [
    { id: 'expired', label: 'Vencidos', count: stats.expired, icon: AlertTriangle, color: 'rose' },
    { id: 'critical', label: 'Críticos', count: stats.critical, icon: ShieldAlert, color: 'amber' },
    { id: 'withdrawal', label: 'Retiros', count: stats.withdrawal, icon: Download, color: 'indigo' },
    { id: 'next_expiry', label: 'Próx', count: stats.next_expiry, icon: Clock, color: 'blue' },
    { id: 'safe', label: 'Vigentes', count: stats.total - stats.expired - stats.critical - stats.next_expiry - stats.withdrawal, icon: CheckCircle2, color: 'emerald' },
  ];

  return (
    <div className="flex gap-3 mb-6 overflow-x-auto no-scrollbar pb-2">
      {statItems.map((item) => {
        const Icon = item.icon;
        const isSelected = selectedStatuses.includes(item.id);
        return (
          <button
            key={item.id}
            onClick={() => onStatusClick(item.id)}
            className={`shrink-0 px-5 py-3 rounded-2xl flex items-center gap-3 transition-all border ${
              isSelected
                ? item.color === 'rose' ? 'bg-rose-500 border-rose-400 text-white shadow-lg' :
                  item.color === 'amber' ? 'bg-amber-500 border-amber-400 text-white shadow-lg' :
                  item.color === 'indigo' ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg' :
                  item.color === 'blue' ? 'bg-blue-500 border-blue-400 text-white shadow-lg' :
                  'bg-emerald-500 border-emerald-400 text-white shadow-lg'
                : theme === 'dark'
                  ? `bg-white/5 border-white/10 text-${item.color}-500 hover:bg-white/10`
                  : `bg-white border-stone-200 text-${item.color}-600 hover:bg-stone-50 shadow-sm`
            }`}
          >
            <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : `text-${item.color}-500`}`} />
            <span className="text-sm font-black uppercase tracking-tighter">
              {item.count} {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
