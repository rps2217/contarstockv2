/**
 * CountingGrid - Lista de items con soporte para virtualización
 * 
 * Usa virtualización para listas grandes (>100 items) para mejor performance.
 */

import React, { memo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CountingItemRow, CountedItem } from './CountingItemRow';
import { CountingEmptyState } from './CountingEmptyState';
import { useVirtualList } from '@/shared/hooks';
import { cn } from '@/lib/utils';

// Threshold para usar virtualización (número de items)
const VIRTUALIZATION_THRESHOLD = 100;
// Altura estimada de cada fila
const ESTIMATED_ROW_HEIGHT = 80;

interface CountingGridProps {
  items: CountedItem[];
  activeBarcode?: string;
  onItemClick?: (barcode: string) => void;
  onEditExpiry?: (item: CountedItem) => void;
  className?: string;
  useVirtualization?: boolean;
}

export const CountingGrid = memo(({
  items,
  activeBarcode,
  onItemClick,
  onEditExpiry,
  className = '',
  useVirtualization = false,
}: CountingGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Decidir si usar virtualización basándose en la cantidad de items
  const shouldVirtualize = useVirtualization && items.length > VIRTUALIZATION_THRESHOLD;

  // Handler para edición - definido antes de los returns
  const handleEditExpiry = (item: CountedItem) => {
    onEditExpiry?.(item);
  };

  // Hook para virtualización - SE LLAMA ANTES de cualquier return
  const {
    virtualItems,
    totalSize,
    containerRef: virtualContainerRef,
  } = useVirtualList({
    items,
    itemHeight: ESTIMATED_ROW_HEIGHT,
    overscan: 5,
  });

  if (items.length === 0) {
    return <CountingEmptyState className={className} />;
  }

  // Renderizado simple para listas pequeñas
  if (!shouldVirtualize) {
    return (
      <div className={cn('flex flex-col gap-2 py-3', className)}>
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <CountingItemRow
              key={item.barcode}
              item={item}
              isActive={activeBarcode === item.barcode}
              onClick={() => onItemClick?.(item.barcode)}
              onEditExpiry={onEditExpiry ? () => handleEditExpiry(item) : undefined}
            />
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      ref={(el) => {
        // Combinar refs
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        (virtualContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      className={cn('relative overflow-y-auto py-3', className)}
      style={{ height: 'calc(100vh - 400px)' }}
    >
      <div style={{ height: totalSize, position: 'relative' }}>
        <AnimatePresence mode="popLayout">
          {virtualItems.map(({ index, data, style }) => (
            <div key={data.barcode} style={style}>
              <CountingItemRow
                item={data}
                isActive={activeBarcode === data.barcode}
                onClick={() => onItemClick?.(data.barcode)}
                onEditExpiry={onEditExpiry ? () => handleEditExpiry(data) : undefined}
                className="mx-2"
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});

CountingGrid.displayName = 'CountingGrid';

// QuickAdd - Acceso rápido para agregar producto
interface QuickAddProps {
  onAdd: () => void;
  className?: string;
}

export const QuickAdd = memo(({
  onAdd,
  className = '',
}: QuickAddProps) => {
  return (
    <button
      onClick={onAdd}
      className={cn(
        'flex items-center justify-center gap-2 p-4',
        'bg-blue-500 hover:bg-blue-400',
        'rounded-xl font-bold text-white',
        'transition-colors',
        className
      )}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      Agregar Producto
    </button>
  );
});

QuickAdd.displayName = 'QuickAdd';