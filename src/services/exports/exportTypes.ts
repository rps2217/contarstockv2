/**
 * Export Types - Tipos compartidos para exportación
 */

import { CountingSession, ConsolidatedItem, MatchResult } from '@/types';

// ============================================================================
// Tipos base
// ============================================================================

export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

export type ExportData = Record<string, string | number | boolean | null | undefined>;

export interface ExportColumn {
  header: string;
  width: number;
  key: string;
}

export interface ExportOptions {
  format: ExportFormat;
  fileName: string;
  sheetName?: string;
  columns?: ExportColumn[];
  includeMetadata?: boolean;
}

// ============================================================================
// Tipos específicos de exportación
// ============================================================================

export interface HammerExportItem {
  barcode: string;
  name: string;
  loc?: string;
  totalQuantity: number;
  expectedQty?: number;
  lastTimestamp: number;
}

export interface SessionExportData {
  session: CountingSession;
  items: ConsolidatedItem[];
}

export interface DiscrepancyExportData {
  match: MatchResult;
  sessionLabel: string;
}

// ============================================================================
// Excel Types
// ============================================================================

export interface ExcelColumn {
  header: string;
  width: number;
}

export interface ExcelRow {
  [key: string]: string | number | boolean | null | undefined;
}

interface XlsxWorkbook {
  SheetNames: string[];
  Sheets: Record<string, XlsxWorksheet>;
}

interface XlsxWorksheet {
  [key: string]: unknown;
}

// ============================================================================
// Export Result
// ============================================================================

export interface ExportResult {
  success: boolean;
  fileName?: string;
  error?: string;
  mimeType?: string;
  data?: Blob | string;
}

// ============================================================================
// Export Column Presets
// ============================================================================

export const HAMMER_COLUMNS: ExportColumn[] = [
  { key: 'barcode', header: 'Código/SKU', width: 20 },
  { key: 'name', header: 'Descripción', width: 45 },
  { key: 'loc', header: 'Ubicación', width: 15 },
  { key: 'totalQuantity', header: 'Cantidad Escaneada', width: 18 },
  { key: 'expectedQty', header: 'Cantidad Esperada', width: 18 },
  { key: 'difference', header: 'Diferencia', width: 12 },
  { key: 'lastTimestamp', header: 'Último Escaneo', width: 22 },
];

export const SESSION_COLUMNS: ExportColumn[] = [
  { key: 'barcode', header: 'Código/SKU', width: 20 },
  { key: 'productName', header: 'Descripción', width: 40 },
  { key: 'totalQuantity', header: 'Cantidad Total', width: 15 },
  { key: 'scans', header: 'Conteo de Escaneos', width: 15 },
  { key: 'expected', header: 'Esperado/ERP', width: 15 },
  { key: 'difference', header: 'Diferencia/Etiqueta', width: 15 },
  { key: 'date', header: 'Fecha', width: 15 },
];

// ============================================================================
// Re-export types
// ============================================================================

export type {
  XlsxWorkbook,
  XlsxWorksheet,
};