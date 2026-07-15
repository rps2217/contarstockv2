/**
 * useExport - Hook reutilizable para exportar datos a CSV, Excel y PDF
 * 
 * Proporciona una interfaz unificada para exportar datos desde cualquier módulo
 * de la aplicación (vencimiento, inventario, eventos, conteos, etc.)
 */

import { useState, useCallback } from 'react'
import { logger } from '@/services/logger';
;
import { toast } from 'sonner';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export interface ExportColumn<T extends Record<string, any>> {
  key: keyof T;
  header: string;
  width?: number;
  format?: (value: T[keyof T], item: T) => string | number;
}

export interface UseExportOptions<T extends Record<string, any>> {
  fileName: string;
  columns: ExportColumn<T>[];
  sheetName?: string;
}

export interface UseExportReturn<T extends Record<string, any>> {
  isExporting: boolean;
  exportTo: (data: T[], format: ExportFormat) => Promise<void>;
  exportAll: (data: T[], format: ExportFormat) => Promise<void>;
}

/**
 * Hook para exportar datos a diferentes formatos
 */
export const useExport = <T extends Record<string, any>>(
  options: UseExportOptions<T>
): UseExportReturn<T> => {
  const [isExporting, setIsExporting] = useState(false);

  const formatData = useCallback((data: T[]) => {
    return data.map(item => {
      const row: Record<string, string | number> = {};
      options.columns.forEach(col => {
        const value = item[col.key];
        row[col.header] = col.format ? col.format(value, item) : String(value ?? '');
      });
      return row;
    });
  }, [options.columns]);

  const exportToCSV = useCallback(async (data: T[]) => {
    const { exportToCSV } = await import('@/services/export');
    const formattedData = formatData(data);
    const timestamp = new Date().toISOString().slice(0, 10);
    await exportToCSV(formattedData, `${options.fileName}_${timestamp}`);
    toast.success(`Exportado ${data.length} registros a CSV`);
  }, [formatData, options.fileName]);

  const exportToExcel = useCallback(async (data: T[]) => {
    const XLSX = await import('xlsx');
    const formattedData = formatData(data);
    const timestamp = new Date().toISOString().slice(0, 10);
    
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    worksheet['!cols'] = options.columns.map(col => ({ 
      wch: col.width || col.header.length * 2 
    }));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || 'Datos');
    XLSX.writeFile(workbook, `${options.fileName}_${timestamp}.xlsx`);
    
    toast.success(`Exportado ${data.length} registros a Excel`);
  }, [formatData, options.columns, options.fileName, options.sheetName]);

  const exportToPDF = useCallback(async (data: T[]) => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(options.fileName, 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CL')}`, 105, 26, { align: 'center' });
    
    // Table
    const headers = [options.columns.map(col => col.header)];
    const rows = data.map(item => 
      options.columns.map(col => {
        const value = item[col.key];
        return col.format ? col.format(value, item) : String(value ?? '');
      })
    );
    
    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 35,
      theme: 'striped',
      headStyles: { 
        fillColor: [59, 130, 246], // Blue
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
    
    const timestamp = new Date().toISOString().slice(0, 10);
    doc.save(`${options.fileName}_${timestamp}.pdf`);
    toast.success(`Exportado ${data.length} registros a PDF`);
  }, [options.columns, options.fileName]);

  const exportTo = useCallback(async (data: T[], format: ExportFormat) => {
    if (data.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    setIsExporting(true);
    try {
      switch (format) {
        case 'csv':
          await exportToCSV(data);
          break;
        case 'excel':
          await exportToExcel(data);
          break;
        case 'pdf':
          await exportToPDF(data);
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error al exportar datos');
    } finally {
      setIsExporting(false);
    }
  }, [exportToCSV, exportToExcel, exportToPDF]);

  const exportAll = exportTo;

  return {
    isExporting,
    exportTo,
    exportAll,
  };
};
