/**
 * Exports Module - Index
 * 
 * Módulo modularizado para exportación de datos.
 * 
 * Estructura:
 * - exportTypes.ts: Tipos compartidos
 * - csvExport.ts: Generador de CSV
 * - excelExport.ts: Generador de Excel
 * - pdfExport.ts: Generador de PDF
 * - ExportFactory.ts: Factory unificado
 */

// Tipos compartidos
export * from './exportTypes';

// CSV Export
export { exportToCSV, generateCSVString, parseCSV } from './csvExport';

// Excel Export
export { 
  exportToExcel, 
  exportHammerToExcel, 
  exportSessionToExcel,
  generateExcelBlob 
} from './excelExport';

// PDF Export
export { 
  exportToPDF, 
  exportSessionManifestPDF, 
  exportDiscrepancyPDF 
} from './pdfExport';

// Factory
export { ExportFactory } from './ExportFactory';
export type { ExportConfig } from './ExportFactory';