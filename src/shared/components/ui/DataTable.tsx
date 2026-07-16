/**
 * DataTable - Componente de tabla responsivo
 *
 * Características:
 * - Scroll horizontal automático en móvil
 * - Header sticky
 * - Filas seleccionables
 * - Soporte para overflow de contenido
 * - Variantes de estilo
 */

import React, { forwardRef, memo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

export interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  minWidth?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;

  // Estado
  loading?: boolean;
  emptyMessage?: string;

  // Interactividad
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelect?: (keys: Set<string>) => void;
  onRowClick?: (row: T) => void;

  // Estilo
  variant?: 'default' | 'compact' | 'comfortable';
  maxHeight?: string;

  // Clases adicionales
  className?: string;
  rowClassName?: string | ((row: T) => string);
}

// =============================================================================
// ESTILOS
// =============================================================================

const variantStyles = {
  default: {
    table: 'min-w-[600px]',
    th: 'py-3 px-4',
    td: 'py-3 px-4',
    row: 'border-b border-subtle',
  },
  compact: {
    table: 'min-w-[500px]',
    th: 'py-2 px-3 text-xs',
    td: 'py-2 px-3 text-xs',
    row: 'border-b border-subtle',
  },
  comfortable: {
    table: 'min-w-[800px]',
    th: 'py-4 px-6',
    td: 'py-4 px-6',
    row: 'border-b border-subtle',
  },
};

// =============================================================================
// COMPONENTE
// =============================================================================

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = 'No hay datos para mostrar',
  selectable = false,
  selectedKeys,
  onSelect,
  onRowClick,
  variant = 'default',
  maxHeight,
  className,
  rowClassName,
}: DataTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const styles = variantStyles[variant];

  // Ordenamiento
  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (!onSelect) return;
    if (selectedKeys?.size === data.length) {
      onSelect(new Set());
    } else {
      onSelect(new Set(data.map(keyExtractor)));
    }
  };

  const handleSelectRow = (key: string) => {
    if (!onSelect || !selectedKeys) return;
    const newKeys = new Set(selectedKeys);
    if (newKeys.has(key)) {
      newKeys.delete(key);
    } else {
      newKeys.add(key);
    }
    onSelect(newKeys);
  };

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  if (loading) {
    return (
      <div className={cn('bg-surface border border-subtle rounded-xl overflow-hidden', className)}>
        <div className="animate-pulse space-y-4 p-4">
          <div className="h-8 bg-elevated rounded" />
          <div className="h-12 bg-elevated rounded" />
          <div className="h-12 bg-elevated rounded" />
          <div className="h-12 bg-elevated rounded" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'bg-surface border border-subtle rounded-xl overflow-hidden',
        maxHeight && 'overflow-y-auto',
        className
      )}
      style={maxHeight ? { maxHeight } : undefined}
    >
      {/* Scroll wrapper con gradientes en móvil */}
      <div className="relative overflow-x-auto overscroll-contain">
        {/* Gradiente indicador de scroll */}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-surface to-transparent z-10 pointer-events-none md:hidden" />
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-surface to-transparent z-10 pointer-events-none md:hidden" />

        <table className={cn('w-full', styles.table)}>
          {/* Header */}
          <thead className="sticky top-0 bg-elevated/95 backdrop-blur-sm z-20">
            <tr className="divide-x divide-subtle">
              {selectable && (
                <th className={cn(styles.th, 'w-12')}>
                  <input
                    type="checkbox"
                    checked={selectedKeys?.size === data.length && data.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-subtle bg-transparent text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key as string}
                  className={cn(
                    styles.th,
                    getAlignClass(col.align),
                    col.sortable && 'cursor-pointer select-none hover:bg-elevated/50',
                    'font-semibold text-xs uppercase tracking-wider text-muted whitespace-nowrap'
                  )}
                  style={{ width: col.width, minWidth: col.minWidth }}
                  onClick={() => col.sortable && handleSort(col.key as string)}
                >
                  <div className={cn('flex items-center gap-1', getAlignClass(col.align))}>
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="w-4 h-4">
                        {sortKey === col.key ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-4 h-4 opacity-30" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-subtle">
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className={cn(styles.td, 'text-center text-muted py-12')}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => {
                const key = keyExtractor(row);
                const isSelected = selectedKeys?.has(key);
                const rowClass =
                  typeof rowClassName === 'function' ? rowClassName(row) : rowClassName;

                return (
                  <tr
                    key={key}
                    className={cn(
                      styles.row,
                      'transition-colors',
                      isSelected && 'bg-primary/10',
                      onRowClick && 'cursor-pointer hover:bg-elevated/50',
                      rowClass
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className={cn(styles.td, 'w-12')} onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(key)}
                          className="w-4 h-4 rounded border-subtle bg-transparent text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map(col => (
                      <td
                        key={col.key as string}
                        className={cn(styles.td, getAlignClass(col.align), col.className)}
                        style={{ minWidth: col.minWidth }}
                      >
                        {col.render ? col.render(row, index) : (row[col.key] as React.ReactNode)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export { DataTable as default };
