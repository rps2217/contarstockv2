
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

const COLOR_MAPPING: Record<string, {
  text: string;
  darkBg: string;
  lightBg: string;
  selectedBg: string;
  selectedBorder: string;
}> = {
  rose: {
    text: 'text-rose-500',
    darkBg: 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20',
    lightBg: 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 shadow-sm',
    selectedBg: 'bg-rose-500 hover:bg-rose-600',
    selectedBorder: 'border-rose-400',
  },
  amber: {
    text: 'text-amber-500',
    darkBg: 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20',
    lightBg: 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100 shadow-sm',
    selectedBg: 'bg-amber-500 hover:bg-amber-600',
    selectedBorder: 'border-amber-400',
  },
  indigo: {
    text: 'text-indigo-500',
    darkBg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/20',
    lightBg: 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 shadow-sm',
    selectedBg: 'bg-indigo-500 hover:bg-indigo-600',
    selectedBorder: 'border-indigo-400',
  },
  blue: {
    text: 'text-blue-500',
    darkBg: 'bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500/20',
    lightBg: 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 shadow-sm',
    selectedBg: 'bg-blue-500 hover:bg-blue-600',
    selectedBorder: 'border-blue-400',
  },
  emerald: {
    text: 'text-emerald-500',
    darkBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20',
    lightBg: 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 shadow-sm',
    selectedBg: 'bg-emerald-500 hover:bg-emerald-600',
    selectedBorder: 'border-emerald-400',
  }
};

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
    <div className={`flex gap-2 ${isCompact ? '' : 'mb-6'} overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory`}>
      {statItems.map((item) => {
        const Icon = item.icon;
        const isSelected = selectedStatuses.includes(item.id);
        const styleMap = COLOR_MAPPING[item.color] || COLOR_MAPPING.emerald;
        
        if (isCompact) {
          return (
            <button
              key={item.id}
              onClick={() => onStatusClick(item.id)}
              className={`flex-1 shrink-0 px-3 md:px-5 py-2.5 md:py-3.5 rounded-xl flex items-center justify-center md:justify-start gap-2 md:gap-4 transition-all border snap-center ${
                isSelected
                  ? `${styleMap.selectedBg} border-white/20 text-white shadow-md shadow-black/20`
                  : theme === 'dark'
                    ? styleMap.darkBg
                    : styleMap.lightBg
              }`}
            >
              <Icon className={`w-5 h-5 md:w-6 md:h-6 shrink-0 ${isSelected ? 'text-white' : styleMap.text}`} />
              <div className="flex flex-col items-start leading-none -space-y-0.5 min-w-0">
                <span className={`text-base md:text-xl font-black italic tracking-tighter truncate w-full text-left ${isSelected ? 'text-white' : styleMap.text}`}>
                  {item.count}
                </span>
                <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest truncate w-full text-left ${isSelected ? 'text-white/90' : 'text-slate-500/80'}`}>
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
            className={`shrink-0 px-5 py-3 rounded-2xl flex items-center gap-3 transition-all border snap-center ${
              isSelected
                ? `${styleMap.selectedBg} border-white/20 text-white shadow-lg`
                : theme === 'dark'
                  ? styleMap.darkBg
                  : styleMap.lightBg
            }`}
          >
            <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : styleMap.text}`} />
            <span className="text-sm font-black uppercase tracking-tighter">
              {item.count} {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

