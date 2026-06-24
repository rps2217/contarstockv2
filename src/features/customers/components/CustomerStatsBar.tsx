/**
 * CustomerStatsBar.tsx - Barra de estadísticas para el módulo de clientes
 */

import React from 'react';
import { Users, Cloud, CloudOff } from 'lucide-react';
import { CustomerStats } from '../domain/customersDomain';

interface CustomerStatsBarProps {
  stats: CustomerStats;
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const CustomerStatsBar: React.FC<CustomerStatsBarProps> = ({
  stats,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  
  const statItems = [
    {
      label: 'Total',
      value: stats.total,
      icon: <Users className="w-4 h-4" />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Sincronizados',
      value: stats.syncedCount,
      icon: <Cloud className="w-4 h-4" />,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    },
    {
      label: 'Pendientes',
      value: stats.pendingCount,
      icon: <CloudOff className="w-4 h-4" />,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10'
    }
  ];

  return (
    <div className={`px-4 py-3 border-b ${
      isDark ? 'bg-[var(--appsheet-bg-elevated)] border-[var(--appsheet-border-subtle)]' : 'bg-slate-100 border-slate-200'
    }`}>
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
        {statItems.map((item, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg min-w-fit ${item.bgColor}`}
          >
            <span className={item.color}>{item.icon}</span>
            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {item.value.toLocaleString()}
            </span>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
