/**
 * Export Factory
 * 
 * Factory para crear exporters según el formato seleccionado.
 * Proporciona una interfaz unificada para todos los formatos de exportación.
 */

import type { ExportFormat, ExportData, ExportOptions, ExportResult } from './exportTypes';
import { exportToCSV } from './csvExport';
import { exportToExcel } from './excelExport';
import { exportToPDF, exportSessionManifestPDF, exportDiscrepancyPDF } from './pdfExport';

export interface ExportConfig {
  format: ExportFormat;
  data: ExportData[];
  fileName: string;
  options?: {
    sheetName?: string;
    columns?: { header: string; width: number; key: string }[];
    title?: string;
  };
}

/**
 * Factory para exportar datos
 */
export class ExportFactory {
  
  /**
   * Exportar datos usando el formato especificado
   */
  static async export(config: ExportConfig): Promise<ExportResult> {
    try {
      switch (config.format) {
        case 'csv':
          await exportToCSV(config.data, config.fileName);
          break;
          
        case 'excel':
          await exportToExcel(
            config.data, 
            config.fileName,
            config.options
          );
          break;
          
        case 'pdf':
          if (config.options?.title) {
            await exportToPDF(
              config.data,
              config.options.columns?.map(c => c.header) || [],
              config.fileName,
              { title: config.options.title }
            );
          } else {
            await exportToPDF(
              config.data,
              [],
              config.fileName
            );
          }
          break;
          
        case 'json':
          this.exportJSON(config.data, config.fileName);
          break;
          
        default:
          throw new Error(`Unsupported format: ${config.format}`);
      }
      
      return {
        success: true,
        fileName: config.fileName,
        mimeType: this.getMimeType(config.format),
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Exportar sesión de conteo
   */
  static async exportSession(
    session: any,
    items: any[],
    format: ExportFormat
  ): Promise<ExportResult> {
    try {
      switch (format) {
        case 'excel':
          const { exportSessionToExcel } = await import('./excelExport');
          await exportSessionToExcel(session, items);
          break;
          
        case 'pdf':
          await exportSessionManifestPDF(session, items);
          break;
          
        case 'csv':
          const csvData = items.map(item => ({
            barcode: item.barcode,
            productName: item.productName,
            totalQuantity: item.totalQuantity,
            scans: item.scans,
          }));
          await exportToCSV(csvData, `Conteo_${session.erpOrder}`);
          break;
          
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
      
      return {
        success: true,
        fileName: `Conteo_${session.erpOrder}.${format}`,
        mimeType: this.getMimeType(format),
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Exportar hammer/auditoría
   */
  static async exportHammer(
    batchId: string,
    items: any[],
    format: ExportFormat
  ): Promise<ExportResult> {
    try {
      switch (format) {
        case 'excel':
          const { exportHammerToExcel } = await import('./excelExport');
          await exportHammerToExcel(batchId, items);
          break;
          
        case 'csv':
          const csvData = items.map(item => ({
            barcode: item.barcode,
            name: item.name,
            location: item.loc,
            quantity: item.totalQuantity,
            expected: item.expectedQty,
            difference: item.expectedQty !== undefined 
              ? item.totalQuantity - item.expectedQty 
              : null,
          }));
          await exportToCSV(csvData, `Hammer_${batchId}`);
          break;
          
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
      
      return {
        success: true,
        fileName: `Hammer_${batchId}.${format}`,
        mimeType: this.getMimeType(format),
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Exportar discrepancias
   */
  static async exportDiscrepancies(
    match: any,
    sessionLabel: string,
    format: ExportFormat
  ): Promise<ExportResult> {
    try {
      if (format === 'pdf') {
        await exportDiscrepancyPDF(
          match.discrepancies || [],
          sessionLabel
        );
      } else {
        const csvData = (match.discrepancies || []).map((d: any) => ({
          barcode: d.barcode,
          productName: d.productName,
          physical: d.physical,
          expected: d.expected,
          difference: d.difference,
        }));
        await exportToCSV(csvData, `Discrepancias_${sessionLabel}`);
      }
      
      return {
        success: true,
        fileName: `Discrepancias_${sessionLabel}.${format}`,
        mimeType: this.getMimeType(format),
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Obtener MIME type según formato
   */
  static getMimeType(format: ExportFormat): string {
    switch (format) {
      case 'csv':
        return 'text/csv';
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'pdf':
        return 'application/pdf';
      case 'json':
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Obtener extensiones válidas
   */
  static getExtension(format: ExportFormat): string {
    switch (format) {
      case 'csv': return '.csv';
      case 'excel': return '.xlsx';
      case 'pdf': return '.pdf';
      case 'json': return '.json';
      default: return '.dat';
    }
  }

  /**
   * Detectar formato desde extensión
   */
  static detectFormat(fileName: string): ExportFormat | null {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'csv': return 'csv';
      case 'xlsx':
      case 'xls': return 'excel';
      case 'pdf': return 'pdf';
      case 'json': return 'json';
      default: return null;
    }
  }

  /**
   * Exportar como JSON
   */
  private static exportJSON(data: ExportData[], fileName: string): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export default ExportFactory;