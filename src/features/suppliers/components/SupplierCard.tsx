/**
 * SupplierCard.tsx - Card de proveedor simplificado
 * 
 * Versión ligera para uso en listas del módulo Suppliers
 */

import React, { memo } from 'react';
import { Provider } from '@/types';
import { 
  Truck,
  MoreVertical,
  Package,
  Expand,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { evaluateProviderStatus, ProviderStatus } from '../domain/suppliersDomain';

interface SupplierCardProps {
  provider: Provider;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onShowProducts?: () => void;
  onViewDetail?: () => void;
  isSelected?: boolean;
}

export const SupplierCard: React.FC<SupplierCardProps> = memo(({
  provider,
  onClick,
  isSelected = false
}) => {
  const status = evaluateProviderStatus(provider);
  
  const statusConfig = {
    [ProviderStatus.WITH_EXCHANGE]: {
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10'
    },
    [ProviderStatus.WITHOUT_EXCHANGE]: {
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10'
    }
  };

  const statusStyle = statusConfig[status];

  return (
    <div
      onClick={onClick}
      className={`
        border-b border-[var(--appsheet-border-subtle)] cursor-pointer transition-colors duration-150
        ${isSelected 
          ? 'bg-[var(--appsheet-primary-subtle)] border-l-4 border-l-[var(--appsheet-primary)]' 
          : 'bg-[var(--appsheet-bg-surface)] hover:bg-[var(--appsheet-bg-elevated)]'
        }
      `}
    >
      <div className="flex items-center min-h-[72px] px-4 py-3">
        {/* Status indicator */}
        <div className={`w-8 h-8 rounded-lg ${statusStyle.bg} flex items-center justify-center mr-3 shrink-0`}>
          <span className={statusStyle.color}>{statusStyle.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`
              text-base font-medium truncate
              ${isSelected ? 'text-[var(--appsheet-primary)]' : 'text-[var(--appsheet-text-primary)]'}
            `}>
              {provider.name || 'Sin nombre'}
            </p>
            <span className={`
              text-[10px] font-black uppercase px-2 py-0.5 rounded-full
              ${provider.hasExchange 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
              }
            `}>
              {provider.hasExchange ? 'CON CANJE' : 'SIN CANJE'}
            </span>
          </div>
          
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-sm text-[var(--appsheet-text-tertiary)]">
              <span className="font-mono">{provider.rut}</span>
            </span>
            
            {provider.withdrawalDays !== undefined && (
              <span className="text-xs text-[var(--appsheet-text-tertiary)]">
                {provider.withdrawalDays} días anticipación
              </span>
            )}
          </div>

          {provider.exchangePolicy && (
            <p className="text-xs text-[var(--appsheet-text-disabled)] truncate mt-1 italic">
              « {provider.exchangePolicy} »
            </p>
          )}
        </div>

        {/* Actions indicator */}
        <button
          onClick={(e) => { e.stopPropagation(); }}
          className="p-2 rounded-full hover:bg-[var(--appsheet-bg-hover)] shrink-0"
        >
          <MoreVertical className="w-5 h-5 text-[var(--appsheet-text-secondary)]" />
        </button>
      </div>
    </div>
  );
});

SupplierCard.displayName = 'SupplierCard';
