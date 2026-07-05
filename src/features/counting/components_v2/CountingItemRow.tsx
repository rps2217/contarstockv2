/**
 * CountingItemRow - Fila individual de producto en la lista de conteo
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface CountedItem {
  barcode: string;
  productName?: string;
  totalQuantity: number;
  expectedQty?: number;
}

interface CountingItemRowProps {
  item: CountedItem;
  isActive: boolean;
  onClick?: () => void;
  className?: string;
}

export const CountingItemRow = memo(({
  item,
  isActive,
  onClick,
  className = '',
}: CountingItemRowProps) => {
  const diff = item.expectedQty !== undefined
    ? item.totalQuantity - item.expectedQty
    : null;
  
  const diffColor = diff === 0
    ? 'text-emerald-500'
    : diff !== null && diff > 0
      ? 'text-blue-500'
      : diff !== null
        ? 'text-rose-500'
        : 'text-muted';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer',
        isActive
          ? 'bg-blue-500/20 border border-blue-500/50'
          : 'bg-surface hover:bg-elevated',
        className
      )}
    >
      {/* Indicador lateral */}
      <div
        className={cn(
          'w-1.5 h-12 rounded-full shrink-0',
          isActive ? 'bg-blue-500' : 'bg-subtle'
        )}
      />

      {/* Info del producto */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary truncate">
          {item.productName || 'Producto sin nombre'}
        </p>
        <span className="text-xs text-muted font-mono">{item.barcode}</span>
      </div>

      {/* Cantidades */}
      <div className="text-right">
        <p className="text-lg font-bold text-primary">{item.totalQuantity}</p>
        {diff !== null && (
          <p className={cn('text-xs font-mono', diffColor)}>
            {diff > 0 ? '+' : ''}{diff}
          </p>
        )}
      </div>
    </motion.div>
  );
});

CountingItemRow.displayName = 'CountingItemRow';

// Compact version for smaller screens
export const CountingItemRowCompact = memo(({
  item,
  isActive,
  onClick,
  className = '',
}: CountingItemRowProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        'flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer text-sm',
        isActive
          ? 'bg-blue-500/20 border border-blue-500/50'
          : 'hover:bg-surface',
        className
      )}
    >
      <span className="text-primary truncate mr-2">
        {item.productName || item.barcode}
      </span>
      <span className="font-bold text-primary shrink-0">
        ×{item.totalQuantity}
      </span>
    </motion.div>
  );
});

CountingItemRowCompact.displayName = 'CountingItemRowCompact';