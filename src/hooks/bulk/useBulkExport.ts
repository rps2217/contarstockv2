/**
 * useBulkExport - Hook para exportación de datos a CSV
 * 
 * Funcionalidades:
 * - Exportar historial a CSV
 * - Exportar items a CSV
 * - Detección automática de columnas
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import { BulkHistoryEntry } from '@/db';

export interface UseBulkExportReturn {
  exportHistoryToCSV: (entries: BulkHistoryEntry[]) => void;
  exportItemsToCSV: <T>(items: T[], filename?: string) => void;
}

/**
 * Hook para funcionalidades de exportación CSV
 */
export function useBulkExport(module?: string): UseBulkExportReturn {
  
  const exportHistoryToCSV = useCallback((entries: BulkHistoryEntry[]) => {
    const headers = ['Fecha', 'Módulo', 'Acción', 'Ítems', 'Deshecho', 'Estado'];
    const rows = entries.map(entry => [
      new Date(entry.timestamp).toLocaleString(),
      entry.module,
      entry.actionLabel,
      entry.itemCount.toString(),
      entry.undone ? 'Sí' : 'No',
      entry.canUndo && !entry.undone ? 'Reversible' : 'Finalizado'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bulk_history_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Historial exportado a CSV');
  }, []);

  const exportItemsToCSV = useCallback(<T,>(items: T[], filename?: string) => {
    if (items.length === 0) {
      toast.error('No hay elementos para exportar');
      return;
    }

    const keys = new Set<string>();
    items.forEach(item => {
      Object.keys(item as object).forEach(key => keys.add(key));
    });
    const keyArray = Array.from(keys);

    const headers = keyArray;
    const rows = items.map(item => {
      const obj = item as Record<string, any>;
      return keyArray.map(key => {
        const value = obj[key];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      });
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `export_${module || 'data'}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${items.length} elementos exportados`);
  }, [module]);

  return {
    exportHistoryToCSV,
    exportItemsToCSV
  };
}

export default useBulkExport;
