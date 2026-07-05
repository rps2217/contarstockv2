/**
 * CSV Export Handler
 * 
 * Genera archivos CSV a partir de datos tabulares.
 */

import type { ExportData } from './exportTypes';

export interface CsvExportOptions {
  delimiter?: string;
  header?: boolean;
  encoding?: string;
}

/**
 * Genera y descarga un archivo CSV
 */
export async function exportToCSV(
  data: ExportData[],
  fileName: string,
  options: CsvExportOptions = {}
): Promise<void> {
  const { delimiter = ',', header = true, encoding = 'utf-8' } = options;
  
  const Papa = await import('papaparse');
  
  // Configurar delimitador personalizado si no es coma
  const config = delimiter !== ',' 
    ? { delimiter } 
    : {};

  const csv = Papa.unparse(data, config);
  const blob = new Blob([csv], { type: `text/csv;charset=${encoding};` });
  
  downloadBlob(blob, `${fileName}.csv`);
}

/**
 * Genera CSV como string (para preview)
 */
export async function generateCSVString(
  data: ExportData[],
  options: CsvExportOptions = {}
): Promise<string> {
  const { delimiter = ',', header = true } = options;
  
  const Papa = await import('papaparse');
  
  const config = delimiter !== ',' 
    ? { delimiter } 
    : {};

  return Papa.unparse(data, config);
}

/**
 * Parsea un archivo CSV a datos
 */
export async function parseCSV(
  csvString: string,
  options: CsvExportOptions = {}
): Promise<ExportData[]> {
  const { delimiter = ',' } = options;
  
  const Papa = await import('papaparse');
  
  const config = delimiter !== ',' 
    ? { delimiter } 
    : {};

  const result = Papa.parse(csvString, {
    ...config,
    header: true,
    skipEmptyLines: true,
  });

  return result.data as ExportData[];
}

/**
 * Helper para descargar blob
 */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default {
  exportToCSV,
  generateCSVString,
  parseCSV,
};