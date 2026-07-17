/**
 * CountingExportService - Exportación de reportes de conteo
 *
 * Formatos soportados:
 * - CSV: Para análisis en Excel/Google Sheets
 * - Excel (XLSX): Formato nativo de Excel
 * - PDF: Reporte formateado para impresión
 */

import { logger } from '@/services/logger';
import type {
  ExpectedItemValidation,
  CountingValidationSummary,
} from './CountingValidationService';

// ============================================================================
// TIPOS
// ============================================================================

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface CountingReportData {
  sessionId: string;
  sessionName: string;
  createdAt: number;
  completedAt?: number;
  summary: CountingValidationSummary;
  items: ExpectedItemValidation[];
  totalExpected: number;
  totalScanned: number;
}

// ============================================================================
// HELPER: Generar nombre de archivo
// ============================================================================

const generateFilename = (sessionName: string, format: ExportFormat): string => {
  const date = new Date().toISOString().split('T')[0];
  const safeName = sessionName.replace(/[^a-zA-Z0-9]/g, '_');
  return `conteo_${safeName}_${date}.${format}`;
};

// ============================================================================
// HELPER: Convertir items a filas para exportar
// ============================================================================

const itemsToRows = (items: ExpectedItemValidation[]): Record<string, any>[] => {
  return items.map((item, index) => ({
    '#': index + 1,
    SKU: item.sku,
    Producto: item.name,
    Esperado: item.expectedQuantity,
    Contado: item.scannedQuantity,
    Diferencia: item.discrepancy,
    'Diferencia %': item.discrepancyPercent,
    Estado: getStatusLabel(item.status),
    Severidad: item.severity.toUpperCase(),
    Tipo: item.isExpected ? 'Esperado' : 'No Esperado',
  }));
};

const getStatusLabel = (status: ExpectedItemValidation['status']): string => {
  const labels = {
    complete: 'Completo',
    partial: 'Parcial',
    missing: 'Faltante',
    over: 'Sobrecuento',
    pending: 'Pendiente',
  };
  return labels[status] || status;
};

// ============================================================================
// EXPORT: CSV
// ============================================================================

export const exportToCSV = async (data: CountingReportData): Promise<string> => {
  const rows = itemsToRows(data.items);

  if (rows.length === 0) {
    throw new Error('No hay datos para exportar');
  }

  // Headers
  const headers = Object.keys(rows[0]);

  // Generar CSV
  const csvLines = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(h => {
          const val = row[h];
          // Escapar comas y comillas
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(',')
    ),
  ];

  const csv = csvLines.join('\n');

  // Descargar
  downloadFile(csv, generateFilename(data.sessionName, 'csv'), 'text/csv;charset=utf-8');

  logger.info('CountingExport', 'Exported to CSV', {
    sessionId: data.sessionId,
    itemCount: rows.length,
  });

  return csv;
};

// ============================================================================
// EXPORT: XLSX (usando SheetJS)
// ============================================================================

export const exportToXLSX = async (data: CountingReportData): Promise<void> => {
  // Lazy import de xlsx para reducir bundle inicial
  const XLSX = await import('xlsx');

  const rows = itemsToRows(data.items);

  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Resumen
  const summaryData = [
    ['REPORTE DE CONTEO'],
    [''],
    ['Sesión:', data.sessionName],
    ['ID:', data.sessionId],
    ['Fecha:', new Date(data.createdAt).toLocaleString()],
    ['Completado:', data.completedAt ? new Date(data.completedAt).toLocaleString() : 'En progreso'],
    [''],
    ['RESUMEN'],
    ['Total Items Esperados:', data.summary.expectedItems],
    ['Items Completos:', data.summary.completeItems],
    ['Items Faltantes:', data.summary.missingItems],
    ['Items Parciales:', data.summary.partialItems],
    ['Items Sobrecuento:', data.summary.overCountedItems],
    ['Items No Esperados:', data.summary.unexpectedItems],
    [''],
    ['DISCREPANCIAS'],
    ['Total Discrepancia:', data.summary.totalDiscrepancy],
    ['Críticos:', data.summary.criticalDiscrepancies],
    ['Advertencias:', data.summary.warningDiscrepancies],
    [''],
    ['PROGRESO'],
    ['Progreso:', `${data.summary.progressPercent}%`],
    ['Velocidad:', `${data.summary.itemsPerMinute} items/min`],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Ajustar anchos de columna
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 30 }];

  XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumen');

  // Sheet 2: Items
  const itemsSheet = XLSX.utils.json_to_sheet(rows);

  // Ajustar anchos
  itemsSheet['!cols'] = [
    { wch: 5 }, // #
    { wch: 15 }, // SKU
    { wch: 40 }, // Producto
    { wch: 10 }, // Esperado
    { wch: 10 }, // Contado
    { wch: 10 }, // Diferencia
    { wch: 12 }, // Diferencia %
    { wch: 12 }, // Estado
    { wch: 10 }, // Severidad
    { wch: 15 }, // Tipo
  ];

  XLSX.utils.book_append_sheet(wb, itemsSheet, 'Detalle');

  // Descargar
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });

  downloadBlob(blob, generateFilename(data.sessionName, 'xlsx'));

  logger.info('CountingExport', 'Exported to XLSX', {
    sessionId: data.sessionId,
    itemCount: rows.length,
  });
};

// ============================================================================
// EXPORT: PDF (básico con jsPDF)
// ============================================================================

export const exportToPDF = async (data: CountingReportData): Promise<void> => {
  // Lazy import de jspdf
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF();

  // Título
  doc.setFontSize(20);
  doc.setTextColor(33, 33, 33);
  doc.text('REPORTE DE CONTEO', 20, 20);

  // Info sesión
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Sesión: ${data.sessionName}`, 20, 35);
  doc.text(`Fecha: ${new Date(data.createdAt).toLocaleString()}`, 20, 42);
  doc.text(
    `Items: ${data.summary.expectedItems} esperados, ${data.summary.completeItems} completos`,
    20,
    49
  );

  // Separador
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 55, 190, 55);

  // Resumen
  doc.setFontSize(12);
  doc.setTextColor(33, 33, 33);
  doc.text('RESUMEN', 20, 65);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const summaryY = 75;
  doc.text(`Completos: ${data.summary.completeItems}`, 25, summaryY);
  doc.text(`Faltantes: ${data.summary.missingItems}`, 70, summaryY);
  doc.text(`Parciales: ${data.summary.partialItems}`, 115, summaryY);
  doc.text(`Críticos: ${data.summary.criticalDiscrepancies}`, 155, summaryY);

  // Discrepancias
  doc.setFontSize(12);
  doc.setTextColor(33, 33, 33);
  doc.text('DISCREPANCIAS', 20, 95);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Total diferencia: ${data.summary.totalDiscrepancy} unidades`, 25, 105);
  doc.text(`Progreso: ${data.summary.progressPercent}%`, 25, 112);
  doc.text(`Velocidad: ${data.summary.itemsPerMinute} items/min`, 25, 119);

  // Items con problemas
  const problematicItems = data.items
    .filter(i => i.severity !== 'ok' || !i.isExpected)
    .slice(0, 20); // Limitar a 20 para caber en página

  if (problematicItems.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(33, 33, 33);
    doc.text('ITEMS CON PROBLEMAS', 20, 135);

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);

    let y = 145;
    for (const item of problematicItems) {
      const severityColor =
        item.severity === 'critical'
          ? [220, 53, 69]
          : item.severity === 'warning'
            ? [255, 193, 7]
            : [100, 100, 100];
      doc.setTextColor(...(severityColor as [number, number, number]));
      doc.text(`${item.sku}`, 25, y);
      doc.text(`${item.name.substring(0, 30)}`, 60, y);
      doc.text(`${item.expectedQuantity}`, 130, y);
      doc.text(`${item.scannedQuantity}`, 145, y);
      doc.text(`${item.discrepancy > 0 ? '+' : ''}${item.discrepancy}`, 160, y);
      y += 7;

      if (y > 280) break;
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado el ${new Date().toLocaleString()}`, 20, doc.internal.pageSize.height - 10);

  // Descargar
  doc.save(generateFilename(data.sessionName, 'pdf'));

  logger.info('CountingExport', 'Exported to PDF', {
    sessionId: data.sessionId,
    itemCount: data.items.length,
  });
};

// ============================================================================
// HELPERS: Download
// ============================================================================

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ============================================================================
// EXPORT MAIN
// ============================================================================

export const exportCountingReport = async (
  data: CountingReportData,
  format: ExportFormat = 'xlsx'
): Promise<void> => {
  switch (format) {
    case 'csv':
      await exportToCSV(data);
      break;
    case 'xlsx':
      await exportToXLSX(data);
      break;
    case 'pdf':
      await exportToPDF(data);
      break;
    default:
      throw new Error(`Formato no soportado: ${format}`);
  }
};

export default exportCountingReport;
