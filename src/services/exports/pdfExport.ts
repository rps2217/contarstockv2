/**
 * PDF Export Handler
 *
 * Genera documentos PDF profesionales.
 * Usa lazy loading de jspdf para optimizar bundle.
 */

import type { ExportData } from './exportTypes';

export interface PDFExportOptions {
  title?: string;
  author?: string;
  subject?: string;
  orientation?: 'portrait' | 'landscape';
}

export interface SessionPDFData {
  erpOrder: string;
  logisticsLabel: string;
  createdAt: number;
  isVerifiedMode: boolean;
}

// Tipos para jsPDF-autotable
interface AutoTableData {
  section: 'head' | 'body' | 'foot';
  column: { index: number };
  cell: { raw: string | number; styles: Record<string, unknown> };
}

type TableRow = [string, string, number, number, string?];

/**
 * Genera y descarga un PDF básico
 */
export async function exportToPDF(
  data: ExportData[],
  columns: string[],
  fileName: string,
  options: PDFExportOptions = {}
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: 'a4',
  });

  // Metadata
  doc.setProperties({
    title: options.title || fileName,
    author: options.author || 'LogiCount Pro',
    subject: options.subject,
  });

  // Title
  if (options.title) {
    doc.setFontSize(18);
    doc.text(options.title, 105, 15, { align: 'center' });
  }

  // Table
  const tableRows: string[][] = data.map(row => columns.map(col => String(row[col] ?? '')));

  (autoTable as any)(doc, {
    head: [columns],
    body: tableRows,
    startY: options.title ? 25 : 15,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 9 },
  });

  doc.save(`${fileName}.pdf`);
}

/**
 * Genera Manifiesto de Inventario en PDF
 */
export async function exportSessionManifestPDF(
  session: SessionPDFData,
  items: Array<{
    barcode: string;
    productName: string;
    totalQuantity: number;
    scans: number;
    expectedQuantity?: number;
  }>
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();

  // --- Header ---
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text('MANIFIESTO DE INVENTARIO', 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Generado por LogiCount Pro', 105, 26, { align: 'center' });

  // --- Session Info Block ---
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(14, 35, 182, 35, 3, 3, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  // Left Column
  doc.setFont('helvetica', 'bold');
  doc.text('Orden ERP:', 20, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(session.erpOrder, 50, 45);

  doc.setFont('helvetica', 'bold');
  doc.text('Etiqueta Logística:', 20, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(session.logisticsLabel, 50, 52);

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', 20, 59);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(session.createdAt).toLocaleString(), 50, 59);

  // Right Column (Totals)
  const totalUnits = items.reduce((acc, i) => acc + i.totalQuantity, 0);
  const totalSKUs = items.length;

  doc.setFont('helvetica', 'bold');
  doc.text('Total Unidades:', 120, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(totalUnits.toString(), 155, 45);

  doc.setFont('helvetica', 'bold');
  doc.text('Total SKUs:', 120, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(totalSKUs.toString(), 155, 52);

  // --- Table ---
  const isVerified = session.isVerifiedMode;
  const tableColumn = isVerified
    ? ['Código', 'Descripción', 'Físico', 'Esperado', 'Diferencia']
    : ['Código', 'Descripción', 'Escaneos', 'Cantidad'];

  const tableRows: TableRow[] = [];

  items.forEach(item => {
    if (isVerified) {
      const expected = item.expectedQuantity || 0;
      const diff = item.totalQuantity - expected;
      tableRows.push([item.barcode, item.productName, item.totalQuantity, expected, String(diff)]);
    } else {
      tableRows.push([item.barcode, item.productName, item.scans, item.totalQuantity]);
    }
  });

  (autoTable as any)(doc, {
    startY: 80,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: isVerified ? [220, 53, 69] : [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didParseCell: function (data: AutoTableData) {
      if (isVerified && data.section === 'body' && data.column.index === 4) {
        const val = parseInt(String(data.cell.raw));
        if (val < 0) {
          data.cell.styles.textColor = [220, 53, 69];
          data.cell.styles.fontStyle = 'bold';
        } else if (val > 0) {
          data.cell.styles.textColor = [40, 167, 69];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // --- Footer / Signature ---
  const finalY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 40;

  doc.setLineWidth(0.5);
  doc.line(20, finalY, 80, finalY);
  doc.line(130, finalY, 190, finalY);

  doc.setFontSize(8);
  doc.text('Firma Operador', 50, finalY + 5, { align: 'center' });
  doc.text('Firma Supervisor', 160, finalY + 5, { align: 'center' });

  doc.text(`ID Sesión: ${session.erpOrder}`, 14, 285);
  doc.text(`Página 1`, 190, 285, { align: 'right' });

  // Save
  doc.save(`Manifiesto_${session.erpOrder}.pdf`);
}

/**
 * Genera Informe de Discrepancias en PDF
 */
export async function exportDiscrepancyPDF(
  discrepancies: Array<{
    barcode: string;
    productName: string;
    physical: number;
    expected: number;
    difference: number;
  }>,
  sessionLabel: string
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();

  // --- Header ---
  doc.setFontSize(18);
  doc.setTextColor(220, 53, 69);
  doc.text('INFORME DE DISCREPANCIAS', 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 105, 26, { align: 'center' });

  doc.text(`Sesión: ${sessionLabel}`, 105, 32, { align: 'center' });

  // --- Table ---
  const tableRows = discrepancies.map(item => [
    item.barcode,
    item.productName,
    item.physical,
    item.expected,
    item.difference > 0 ? `+${item.difference}` : item.difference,
  ]);

  (autoTable as any)(doc, {
    startY: 40,
    head: [['Código', 'Producto', 'Físico', 'Esperado', 'Diferencia']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [220, 53, 69],
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: { fontSize: 9, cellPadding: 3 },
    didParseCell: function (data: AutoTableData) {
      if (data.section === 'body' && data.column.index === 4) {
        const val = parseInt(String(data.cell.raw));
        if (val < 0) {
          data.cell.styles.textColor = [220, 53, 69];
        } else if (val > 0) {
          data.cell.styles.textColor = [40, 167, 69];
        }
      }
    },
  });

  doc.save(`Discrepancias_${sessionLabel}.pdf`);
}

export default {
  exportToPDF,
  exportSessionManifestPDF,
  exportDiscrepancyPDF,
};
