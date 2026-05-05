
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
  variant?: 'normal' | 'compact';
}

export const ExpiryStats: React.FC<ExpiryStatsProps> = ({ 
  stats, 
  selectedStatuses, 
  onStatusClick, 
  theme = 'dark',
  variant = 'normal'
}) => {
  const statItems = [
    { id: 'expired', label: 'Vencidos', count: stats.expired, icon: AlertTriangle, color: 'rose' },
    { id: 'critical', label: 'Críticos', count: stats.critical, icon: ShieldAlert, color: 'amber' },
    { id: 'withdrawal', label: 'Retiros', count: stats.withdrawal, icon: Download, color: 'indigo' },
    { id: 'next_expiry', label: 'Próx', count: stats.next_expiry, icon: Clock, color: 'blue' },
    { id: 'safe', label: 'Vigentes', count: stats.total - stats.expired - stats.critical - stats.next_expiry - stats.withdrawal, icon: CheckCircle2, color: 'emerald' },
  ];

  const isCompact = variant === 'compact';

  return (
    <div className={`flex gap-2 ${isCompact ? '' : 'mb-6'} overflow-x-auto no-scrollbar`}>
      {statItems.map((item) => {
        const Icon = item.icon;
        const isSelected = selectedStatuses.includes(item.id);
        
        if (isCompact) {
          return (
            <button
              key={item.id}
              onClick={() => onStatusClick(item.id)}
              className={`shrink-0 px-5 py-3 rounded-2xl flex items-center gap-4 transition-all border ${
                isSelected
                  ? item.color === 'rose' ? 'bg-rose-500 border-rose-400 text-white shadow-lg' :
                    item.color === 'amber' ? 'bg-amber-500 border-amber-400 text-white shadow-lg' :
                    item.color === 'indigo' ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg' :
                    item.color === 'blue' ? 'bg-blue-500 border-blue-400 text-white shadow-lg' :
                    'bg-emerald-500 border-emerald-400 text-white shadow-lg'
                  : theme === 'dark'
                    ? `bg-slate-900/50 border-white/5 text-${item.color}-500 hover:bg-slate-800`
                    : `bg-white border-stone-200 text-${item.color}-600 hover:bg-stone-50 shadow-sm`
              }`}
            >
              <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : `text-${item.color}-500`}`} />
              <div className="flex flex-col items-start leading-none -space-y-0.5">
                <span className={`text-xl font-black italic tracking-tighter ${isSelected ? 'text-white' : `text-${item.color}-500`}`}>
                  {item.count}
                </span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-white/80' : 'text-slate-500/80'}`}>
                  {item.label}
                </span>
              </div>
            </button>
          );
        }

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
                  ? `bg-slate-900/50 border-white/10 text-${item.color}-500 hover:bg-slate-800`
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

