/**
 * OrderStatsBar.tsx - Barra de estadísticas para el módulo de órdenes esperadas
 */

import React from 'react';
import { Package, Layers, Clock, FileSpreadsheet } from 'lucide-react';
import { OrderStats } from '../domain/expectedOrdersDomain';

interface OrderStatsBarProps {
  stats: OrderStats;
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const OrderStatsBar: React.FC<OrderStatsBarProps> = ({
  stats,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  
  const statItems = [
    {
      label: 'Órdenes',
      value: stats.total,
      icon: <FileSpreadsheet className="w-4 h-4" />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'SKUs Totales',
      value: stats.totalItems,
      icon: <Package className="w-4 h-4" />,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    },
    {
      label: 'Unidades Totales',
      value: stats.totalUnits,
      icon: <Layers className="w-4 h-4" />,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      label: 'Esta Semana',
      value: stats.recentCount,
      icon: <Clock className="w-4 h-4" />,
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
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg min-w-fit
              ${item.bgColor}
            `}
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
