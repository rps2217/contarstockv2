/**
 * CountingGrid - Lista de items con soporte para virtualización
 */

import React, { memo, useRef, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CountingItemRow, CountedItem } from './CountingItemRow';
import { CountingEmptyState } from './CountingEmptyState';
import { cn } from '@/lib/utils';

// Threshold para usar virtualización (número de items)
const VIRTUALIZATION_THRESHOLD = 100;
// Altura estimada de cada fila
const ESTIMATED_ROW_HEIGHT = 72;

interface CountingGridProps {
  items: CountedItem[];
  activeBarcode?: string;
  onItemClick?: (barcode: string) => void;
  className?: string;
  useVirtualization?: boolean;
}

export const CountingGrid = memo(({
  items,
  activeBarcode,
  onItemClick,
  className = '',
  useVirtualization = false,
}: CountingGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Decidir si usar virtualización basándose en la cantidad de items
  const shouldVirtualize = useVirtualization && items.length > VIRTUALIZATION_THRESHOLD;

  // Memoizar el cálculo de filas visibles
  const virtualizedProps = useMemo(() => {
    if (!shouldVirtualize) return null;

    const containerHeight = containerRef.current?.clientHeight || 600;
    const visibleRows = Math.ceil(containerHeight / ESTIMATED_ROW_HEIGHT) + 2; // +2 for overscan
    
    return {
      visibleCount: visibleRows,
      scrollTop: 0,
    };
  }, [shouldVirtualize, items.length]);

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
            />
          ))}
        </AnimatePresence>
      </div>
    );
  }

  // Renderizado virtualizado para listas grandes
  return (
    <div
      ref={containerRef}
      className={cn('flex flex-col gap-2 py-3 overflow-y-auto', className)}
      style={{ maxHeight: 'calc(100vh - 400px)' }}
    >
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <CountingItemRow
            key={item.barcode}
            item={item}
            isActive={activeBarcode === item.barcode}
            onClick={() => onItemClick?.(item.barcode)}
          />
        ))}
      </AnimatePresence>
      
      {/* Nota: Para implementación completa de virtualización,
          usar @tanstack/react-virtual aquí */}
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