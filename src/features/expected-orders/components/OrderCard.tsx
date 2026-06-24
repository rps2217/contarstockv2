/**
 * OrderCard.tsx - Card de orden simplificado
 */

import React, { memo } from 'react';
import { ExpectedOrder } from '@/types';
import { FileSpreadsheet, Package, Layers, ChevronRight } from 'lucide-react';
import { formatRelativeDate } from '../domain/expectedOrdersDomain';

interface OrderCardProps {
  order: ExpectedOrder;
  onClick?: () => void;
  isSelected?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = memo(({
  order,
  onClick,
  isSelected = false
}) => {
  const isDark = true; // Usar tema oscuro por defecto

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
      <div className="flex items-center min-h-[80px] px-4 py-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mr-3 shrink-0">
          <FileSpreadsheet className="w-5 h-5 text-blue-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className={`
              text-base font-medium truncate
              ${isSelected ? 'text-[var(--appsheet-primary)]' : 'text-[var(--appsheet-text-primary)]'}
            `}>
              {order.id || 'Sin ID'}
            </p>
            <span className="text-xs text-[var(--appsheet-text-tertiary)]">
              {order.importedAt ? formatRelativeDate(order.importedAt) : 'Sin fecha'}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-1.5">
            <span className="flex items-center gap-1 text-sm text-[var(--appsheet-text-tertiary)]">
              <Package className="w-3.5 h-3.5" />
              {order.totalExpectedSKUs || 0} SKUs
            </span>
            <span className="flex items-center gap-1 text-sm text-[var(--appsheet-text-tertiary)]">
              <Layers className="w-3.5 h-3.5" />
              {order.totalExpectedUnits || 0} unidades
            </span>
          </div>

          {order.metadata?.purchaseOrder && (
            <p className="text-xs text-[var(--appsheet-text-disabled)] truncate mt-1">
              PO: {order.metadata.purchaseOrder}
            </p>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-[var(--appsheet-text-disabled)] ml-2" />
      </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';
