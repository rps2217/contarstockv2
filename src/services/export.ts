import { CountingSession, ConsolidatedItem, MatchResult } from '../types';

// Tipo para datos de exportación
export type ExportData = Record<string, string | number | boolean | null | undefined>;

export interface ExcelColumn {
  header: string;
  width: number;
}

export interface ExcelRow {
  [key: string]: string | number | boolean | null | undefined;
}

// Tipo para workbook de xlsx
interface XlsxWorkbook {
  SheetNames: string[];
  Sheets: Record<string, XlsxWorksheet>;
}

interface XlsxWorksheet {
  [key: string]: unknown;
}

/**
 * Helper to create an Excel workbook with styled columns from data array.
 */
const createExcelWorkbook = async (
  data: ExportData[],
  sheetName: string,
  columns: ExcelColumn[]
): Promise<{ workbook: XlsxWorkbook; worksheet: XlsxWorksheet }> => {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = columns.map(col => ({ wch: col.width }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return { workbook, worksheet };
};

/**
 * Generates and downloads a CSV file containing the provided data.
 */
export const exportToCSV = async (data: ExportData[], fileName: string) => {
  const Papa = await import('papaparse');
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const HAMMER_COLUMNS: ExcelColumn[] = [
  { header: 'Código/SKU', width: 20 },
  { header: 'Descripción', width: 45 },
  { header: 'Ubicación', width: 15 },
  { header: 'Cantidad Escaneada', width: 18 },
  { header: 'Cantidad Esperada (Teórica)', width: 18 },
  { header: 'Diferencia', width: 12 },
  { header: 'Último Escaneo', width: 22 },
];

/**
 * Generates and downloads an Excel file (.xlsx) containing the hammer/massive session data.
 */
export const exportHammerToExcel = async (batchId: string, items: any[]) => {
  const data: ExcelRow[] = items.map(item => ({
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

  const { workbook } = await createExcelWorkbook(data, 'Auditoría', HAMMER_COLUMNS);
  const dateStr = new Date().toISOString().substring(0, 10);
  const { writeFile } = await import('xlsx');
  writeFile(workbook, `Hammer_Auditoria_${batchId}_${dateStr}.xlsx`);
};

const SESSION_COLUMNS: ExcelColumn[] = [
  { header: 'Código/SKU', width: 20 },
  { header: 'Descripción', width: 40 },
  { header: 'Cantidad Total', width: 15 },
  { header: 'Conteo de Escaneos', width: 15 },
  { header: 'Esperado/ERP', width: 15 },
  { header: 'Diferencia/Etiqueta', width: 15 },
  { header: 'Fecha', width: 15 },
];

/**
 * Generates and downloads an Excel file (.xlsx) containing the session data.
 * Optimized with Dynamic Import to reduce initial bundle size.
 */
export const exportToExcel = async (session: CountingSession, items: ConsolidatedItem[]) => {
  const data: ExcelRow[] = items.map(item => {
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

  const { workbook } = await createExcelWorkbook(data, 'Conteo', SESSION_COLUMNS);
  const { writeFile } = await import('xlsx');
  writeFile(workbook, `Conteo_${session.erpOrder}_${session.logisticsLabel}.xlsx`);
};

/**
 * Generates and downloads a professional PDF Manifest.
 * Optimized with Dynamic Import.
 */
export const exportToPDF = async (session: CountingSession, items: ConsolidatedItem[]) => {
 const { jsPDF } = await import('jspdf');
 const { default: autoTable } = await import('jspdf-autotable');

 const doc = new jsPDF();
 
 // --- Header ---
 doc.setFontSize(22);
 doc.setTextColor(40, 40, 40);
 doc.text("MANIFIESTO DE INVENTARIO", 105, 20, { align: "center" });
 
 doc.setFontSize(10);
 doc.setTextColor(100, 100, 100);
 doc.text("Generado por LogiCount Pro", 105, 26, { align: "center" });

 // --- Session Info Block ---
 doc.setDrawColor(200, 200, 200);
 doc.setFillColor(245, 247, 250);
 doc.roundedRect(14, 35, 182, 35, 3, 3, 'FD');

 doc.setFontSize(10);
 doc.setTextColor(0, 0, 0);

 // Left Column
 doc.setFont(undefined, 'bold');
 doc.text("Orden ERP:", 20, 45);
 doc.setFont(undefined, 'normal');
 doc.text(session.erpOrder, 50, 45);

 doc.setFont(undefined, 'bold');
 doc.text("Etiqueta Logística:", 20, 52);
 doc.setFont(undefined, 'normal');
 doc.text(session.logisticsLabel, 50, 52);

 doc.setFont(undefined, 'bold');
 doc.text("Fecha:", 20, 59);
 doc.setFont(undefined, 'normal');
 doc.text(new Date(session.createdAt).toLocaleString(), 50, 59);

 // Right Column (Totals)
 const totalUnits = items.reduce((acc, i) => acc + i.totalQuantity, 0);
 const totalSKUs = items.length;

 doc.setFont(undefined, 'bold');
 doc.text("Total Unidades:", 120, 45);
 doc.setFont(undefined, 'normal');
 doc.text(totalUnits.toString(), 155, 45);

 doc.setFont(undefined, 'bold');
 doc.text("Total SKUs:", 120, 52);
 doc.setFont(undefined, 'normal');
 doc.text(totalSKUs.toString(), 155, 52);

  // --- Table ---
  const isVerified = session.isVerifiedMode;
  const tableColumn = isVerified 
    ? ["Código", "Descripción", "Físico", "Esperado", "Diferencia"]
    : ["Código", "Descripción", "Escaneos", "Cantidad"];
    
  const tableRows: any[] = [];

  items.forEach(item => {
    if (isVerified) {
      const expected = item.expectedQuantity || 0;
      const diff = item.totalQuantity - expected;
      tableRows.push([
        item.barcode,
        item.productName,
        item.totalQuantity,
        expected,
        diff > 0 ? `+${diff}` : diff
      ]);
    } else {
      tableRows.push([
        item.barcode,
        item.productName,
        item.scans,
        item.totalQuantity,
      ]);
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
      fontStyle: 'bold' 
    },
    styles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didParseCell: function (data: any) {
      if (isVerified && data.section === 'body' && data.column.index === 4) {
        const val = parseInt(data.cell.raw);
        if (val < 0) {
          data.cell.styles.textColor = [220, 53, 69]; // Red
          data.cell.styles.fontStyle = 'bold';
        } else if (val > 0) {
          data.cell.styles.textColor = [40, 167, 69]; // Green
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

 // --- Footer / Signature ---
 const finalY = (doc as any).lastAutoTable.finalY + 40;

 doc.setLineWidth(0.5);
 doc.line(20, finalY, 80, finalY); // Line for signature 1
 doc.line(130, finalY, 190, finalY); // Line for signature 2

 doc.setFontSize(8);
 doc.text("Firma Operador", 50, finalY + 5, { align: "center" });
 doc.text("Firma Supervisor", 160, finalY + 5, { align: "center" });

 doc.text(`ID Sesión: ${session.id}`, 14, 285);
 doc.text(`Página 1`, 190, 285, { align: "right" });

 // Save
 doc.save(`Manifiesto_${session.erpOrder}.pdf`);
};

/**
 * Generates a specific Discrepancy Report from the Detective/Conciliator module.
 */
export const exportDiscrepancyPDF = async (match: MatchResult, sessionLabel: string) => {
 const { jsPDF } = await import('jspdf');
 const { default: autoTable } = await import('jspdf-autotable');

 const doc = new jsPDF();
 
 // --- Header ---
 doc.setFontSize(18);
 doc.setTextColor(220, 53, 69); // Red color for alert
 doc.text("INFORME DE DISCREPANCIAS", 105, 20, { align: "center" });
 
 doc.setFontSize(10);
 doc.setTextColor(100, 100, 100);
 doc.text(`Generado: ${new Date().toLocaleString()}`, 105, 26, { align: "center" });
 
 // --- Summary Block ---
 doc.setFontSize(11);
 doc.setTextColor(0, 0, 0);
 doc.text(`Orden Esperada: ${match.expectedOrder.internalId}`, 14, 40);
 doc.text(`Bulto Físico: ${sessionLabel}`, 14, 46);
 doc.text(`Nivel de Coincidencia: ${match.matchScore.toFixed(1)}%`, 14, 52);
 
 // --- Table ---
 const tableColumn = ["SKU", "Producto", "Físico", "Esperado", "Diferencia"];
 const tableRows: any[] = [];
 
 // Sort to show errors first
 const sortedDetails = [...match.details].sort((a, b) => {
 const aDiff = Math.abs(a.difference);
 const bDiff = Math.abs(b.difference);
 return bDiff - aDiff;
 });
 
 sortedDetails.forEach(row => {
 // Only include if there is a difference or it's a key item
 if (row.difference !== 0) {
 const itemData = [
 row.barcode,
 row.name,
 row.physicalQty,
 row.expectedQty,
 row.difference > 0 ? `+${row.difference}` : `${row.difference}`
 ];
 tableRows.push(itemData);
 }
 });
 
 (autoTable as any)(doc, {
 startY: 60,
 head: [tableColumn],
 body: tableRows,
 theme: 'grid',
 headStyles: { fillColor: [220, 53, 69], textColor: 255, fontStyle: 'bold' }, // Red Header
 styles: { fontSize: 9, cellPadding: 3 },
 // Highlight rows logic
 didParseCell: function (data: any) {
 if (data.section === 'body' && data.column.index === 4) {
 const val = parseInt(data.cell.raw);
 if (val < 0) {
 data.cell.styles.textColor = [220, 53, 69]; // Red text for missing
 data.cell.styles.fontStyle = 'bold';
 } else if (val > 0) {
 data.cell.styles.textColor = [40, 167, 69]; // Green text for surplus
 data.cell.styles.fontStyle = 'bold';
 }
 }
 }
 });
 
 // Save
 doc.save(`Discrepancias_${match.expectedOrder.internalId}.pdf`);
};
