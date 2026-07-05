/**
 * Excel Export Handler
 * 
 * Genera archivos Excel (.xlsx) a partir de datos tabulares.
 * Usa lazy loading de xlsx para optimizar bundle.
 */

import type { ExportData, ExcelColumn, ExportColumn } from './exportTypes';

export interface ExcelExportOptions {
  sheetName?: string;
  columns?: ExportColumn[];
}

/**
 * Helper para crear workbook con columnas estilizadas
 */
async function createWorkbook(
  data: ExportData[],
  sheetName: string,
  columns?: ExportColumn[]
): Promise<{ workbook: any; worksheet: any }> {
  const XLSX = await import('xlsx');
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  if (columns) {
    worksheet['!cols'] = columns.map(col => ({ wch: col.width }));
  }
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  return { workbook, worksheet };
}

/**
 * Genera y descarga un archivo Excel
 */
export async function exportToExcel(
  data: ExportData[],
  fileName: string,
  options: ExcelExportOptions = {}
): Promise<void> {
  const { sheetName = 'Sheet1', columns } = options;
  
  const { workbook } = await createWorkbook(data, sheetName, columns);
  const { writeFile } = await import('xlsx');
  
  writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Genera Excel para sesiones de conteo (Hammer)
 */
export async function exportHammerToExcel(
  batchId: string,
  items: Array<{
    barcode: string;
    name: string;
    loc?: string;
    totalQuantity: number;
    expectedQty?: number;
    lastTimestamp: number;
  }>
): Promise<void> {
  const data: ExportData[] = items.map(item => ({
    'Código/SKU': item.barcode,
    'Descripción': item.name,
    'Ubicación': item.loc || '',
    'Cantidad Escaneada': item.totalQuantity,
    'Cantidad Esperada (Teórica)': item.expectedQty ?? '',
    'Diferencia': item.expectedQty !== undefined ? item.totalQuantity - item.expectedQty : '',
    'Último Escaneo': item.lastTimestamp > 0 
      ? new Date(item.lastTimestamp).toLocaleString('es-DO', { 
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit' 
        })
      : ''
  }));

  const columns: ExportColumn[] = [
    { header: 'Código/SKU', width: 20 },
    { header: 'Descripción', width: 45 },
    { header: 'Ubicación', width: 15 },
    { header: 'Cantidad Escaneada', width: 18 },
    { header: 'Cantidad Esperada (Teórica)', width: 18 },
    { header: 'Diferencia', width: 12 },
    { header: 'Último Escaneo', width: 22 },
  ];

  const { workbook } = await createWorkbook(data, 'Auditoría', columns);
  const dateStr = new Date().toISOString().substring(0, 10);
  
  const { writeFile } = await import('xlsx');
  writeFile(workbook, `Hammer_Auditoria_${batchId}_${dateStr}.xlsx`);
}

/**
 * Genera Excel para sesiones de conteo regulares
 */
export async function exportSessionToExcel(
  session: { erpOrder: string; logisticsLabel: string; createdAt: number; isVerifiedMode: boolean },
  items: Array<{
    barcode: string;
    productName: string;
    totalQuantity: number;
    scans: number;
    expectedQuantity?: number;
  }>
): Promise<void> {
  const data: ExportData[] = items.map(item => {
    const base = {
      'Código/SKU': item.barcode,
      'Descripción': item.productName,
      'Cantidad Total': item.totalQuantity,
      'Conteo de Escaneos': item.scans,
    };

    if (session.isVerifiedMode) {
      const expected = item.expectedQuantity || 0;
      const diff = item.totalQuantity - expected;
      return {
        ...base,
        'Esperado/ERP': expected,
        'Diferencia/Etiqueta': diff > 0 ? `+${diff}` : diff,
        'Fecha': ''
      };
    }

    return {
      ...base,
      'Esperado/ERP': session.erpOrder,
      'Diferencia/Etiqueta': session.logisticsLabel,
      'Fecha': new Date(session.createdAt).toLocaleDateString('es-DO')
    };
  });

  const columns: ExportColumn[] = [
    { header: 'Código/SKU', width: 20 },
    { header: 'Descripción', width: 40 },
    { header: 'Cantidad Total', width: 15 },
    { header: 'Conteo de Escaneos', width: 15 },
    { header: 'Esperado/ERP', width: 15 },
    { header: 'Diferencia/Etiqueta', width: 15 },
    { header: 'Fecha', width: 15 },
  ];

  const { workbook } = await createWorkbook(data, 'Conteo', columns);
  const { writeFile } = await import('xlsx');
  writeFile(workbook, `Conteo_${session.erpOrder}_${session.logisticsLabel}.xlsx`);
}

/**
 * Genera Excel como Blob (para preview o upload)
 */
export async function generateExcelBlob(
  data: ExportData[],
  sheetName = 'Sheet1'
): Promise<Blob> {
  const { workbook } = await createWorkbook(data, sheetName);
  const { write } = await import('xlsx');
  
  const buffer = write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export default {
  exportToExcel,
  exportHammerToExcel,
  exportSessionToExcel,
  generateExcelBlob,
};