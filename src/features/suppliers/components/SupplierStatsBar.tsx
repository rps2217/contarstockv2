/**
 * SupplierStatsBar.tsx - Barra de estadísticas para el módulo de proveedores
 * 
 * Muestra métricas clave: total, con canje, sin canje
 */

import React from 'react';
import { Truck, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ProviderStats, ProviderStatus, PROVIDER_STATUS_CONFIG } from '../domain/suppliersDomain';

interface SupplierStatsBarProps {
  stats: ProviderStats;
  onFilterChange?: (filter: string) => void;
  selectedFilter?: string;
}

export const SupplierStatsBar: React.FC<SupplierStatsBarProps> = ({
  stats,
  onFilterChange,
  selectedFilter = 'all'
}) => {
  const statItems = [
    {
      key: 'all',
      label: 'Total',
      value: stats.total,
      icon: <Truck className="w-4 h-4" />,
      color: 'text-[var(--appsheet-primary)]',
      bgColor: 'bg-[var(--appsheet-primary-subtle)]'
    },
    {
      key: 'withExchange',
      label: PROVIDER_STATUS_CONFIG[ProviderStatus.WITH_EXCHANGE].label,
      value: stats.withExchange,
      icon: <ArrowUpRight className="w-4 h-4" />,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      filter: true
    },
    {
      key: 'withoutExchange',
      label: PROVIDER_STATUS_CONFIG[ProviderStatus.WITHOUT_EXCHANGE].label,
      value: stats.withoutExchange,
      icon: <ArrowDownRight className="w-4 h-4" />,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      filter: true
    }
  ];

  return (
    <div className="px-4 py-3 bg-[var(--appsheet-bg-elevated)] border-b border-[var(--appsheet-border-subtle)]">
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
        {statItems.map(item => (
          <button
            key={item.key}
            onClick={() => item.filter && onFilterChange?.(item.key)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg min-w-fit
              transition-all duration-150
              ${item.filter 
                ? `cursor-pointer hover:brightness-110 ${selectedFilter === item.key ? `${item.bgColor}` : 'bg-[var(--appsheet-bg-surface)]'}` 
                : 'bg-[var(--appsheet-bg-surface)] cursor-default'
              }
            `}
          >
            <span className={item.color}>{item.icon}</span>
            <span className="text-sm font-medium text-[var(--appsheet-text-primary)]">
              {item.value.toLocaleString()}
            </span>
            <span className="text-xs text-[var(--appsheet-text-secondary)] hidden sm:inline">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
