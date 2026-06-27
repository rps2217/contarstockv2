/**
 * DataTable - Tabla de datos simple y reutilizable
 */

import React, { memo } from 'react';
import { cn } from '../tokens';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  isDark?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isDark = true,
  onRowClick,
  emptyMessage = 'Sin datos',
  className,
}: DataTableProps<T>) {
  const isEmpty = data.length === 0;

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden',
        isDark ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'grid px-4 py-2.5 text-xs font-medium uppercase tracking-wider',
          isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-neutral-100 text-neutral-600',
        )}
        style={{ gridTemplateColumns: columns.map(c => c.width || '1fr').join(' ') }}
      >
        {columns.map((col) => (
          <div key={col.key}>{col.header}</div>
        ))}
      </div>

      {/* Body */}
      {isEmpty ? (
        <div
          className={cn(
            'px-4 py-12 text-center text-sm',
            isDark ? 'text-neutral-500' : 'text-neutral-400'
          )}
        >
          {emptyMessage}
        </div>
      ) : (
        <div className="divide-y divide-neutral-800">
          {data.map((item, index) => (
            <div
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={cn(
                'grid px-4 py-3 text-sm items-center',
                isDark ? 'hover:bg-neutral-800/50' : 'hover:bg-neutral-50',
                onRowClick && 'cursor-pointer'
              )}
              style={{ gridTemplateColumns: columns.map(c => c.width || '1fr').join(' ') }}
            >
              {columns.map((col) => (
                <div
                  key={col.key}
                  className={cn(
                    'truncate',
                    isDark ? 'text-neutral-300' : 'text-neutral-700'
                  )}
                >
                  {col.render
                    ? col.render(item, index)
                    : String((item as any)[col.key] ?? '')}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Componente de fila simple
interface TableRowProps {
  cells: React.ReactNode[];
  onClick?: () => void;
  isDark?: boolean;
  gridCols?: string;
}

export const TableRow: React.FC<TableRowProps> = memo(({
  cells,
  onClick,
  isDark = true,
  gridCols,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'grid px-4 py-3 text-sm items-center gap-4',
        isDark ? 'hover:bg-neutral-800/50 border-neutral-800' : 'hover:bg-neutral-50 border-neutral-200',
        'border-b last:border-b-0',
        onClick && 'cursor-pointer'
      )}
      style={gridCols ? { gridTemplateColumns: gridCols } : undefined}
    >
      {cells.map((cell, i) => (
        <div key={i} className="truncate">{cell}</div>
      ))}
    </div>
  );
});

TableRow.displayName = 'TableRow';
