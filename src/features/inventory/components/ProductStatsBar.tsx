/**
 * ProductStatsBar.tsx - Barra de estadísticas para el módulo de productos
 * 
 * Muestra métricas clave de productos: total, por política, y estados de stock
 */

import React from 'react';
import { Package, ArrowUpRight, ArrowDownRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { ProductStats } from '../domain/productsDomain';
import { PRODUCT_POLICY_CONFIG, STOCK_STATUS_CONFIG } from '../domain/productsDomain';

interface ProductStatsBarProps {
  stats: ProductStats;
  onPolicyFilter?: (filter: string) => void;
  selectedFilter?: string;
}

export const ProductStatsBar: React.FC<ProductStatsBarProps> = ({
  stats,
  onPolicyFilter,
  selectedFilter = 'all'
}) => {
  const statItems = [
    {
      key: 'total',
      label: 'Total',
      value: stats.total,
      icon: <Package className="w-4 h-4" />,
      color: 'text-[var(--appsheet-primary)]',
      bgColor: 'bg-[var(--appsheet-primary-subtle)]'
    },
    {
      key: 'EXCHANGE',
      label: PRODUCT_POLICY_CONFIG.EXCHANGE.label,
      value: stats.byPolicy.EXCHANGE,
      icon: <ArrowUpRight className="w-4 h-4" />,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      policy: true
    },
    {
      key: 'LOSS',
      label: PRODUCT_POLICY_CONFIG.LOSS.label,
      value: stats.byPolicy.LOSS,
      icon: <ArrowDownRight className="w-4 h-4" />,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      policy: true
    },
    {
      key: 'NO_INFO',
      label: PRODUCT_POLICY_CONFIG.NO_INFO.label,
      value: stats.byPolicy.NO_INFO,
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      policy: true
    }
  ];

  return (
    <div className="px-4 py-3 bg-[var(--appsheet-bg-elevated)] border-b border-[var(--appsheet-border-subtle)]">
      {/* Stats row */}
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
        {statItems.map(item => (
          <button
            key={item.key}
            onClick={() => item.policy && onPolicyFilter?.(item.key)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg min-w-fit
              transition-all duration-150
              ${item.policy 
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
        
        {/* Sync indicator */}
        {stats.pendingChanges > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--appsheet-bg-surface)]">
            <RefreshCw className="w-4 h-4 text-[var(--appsheet-info)] animate-spin" />
            <span className="text-sm font-medium text-[var(--appsheet-info)]">
              {stats.pendingChanges}
            </span>
            <span className="text-xs text-[var(--appsheet-text-secondary)] hidden sm:inline">
              pendientes
            </span>
          </div>
        )}
      </div>

      {/* Stock alerts */}
      {(stats.lowStock > 0 || stats.missingPolicy > 0) && (
        <div className="flex items-center gap-3 mt-2 overflow-x-auto scrollbar-hide">
          {stats.lowStock > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs">
              <AlertTriangle className="w-3 h-3" />
              <span>{stats.lowStock} stock bajo</span>
            </div>
          )}
          {stats.missingPolicy > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-500/10 text-slate-400 text-xs">
              <span>Sin política</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
