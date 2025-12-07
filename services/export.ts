
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CountingSession, ConsolidatedItem } from '../types';

/**
 * Generates and downloads an Excel file (.xlsx) containing the session data.
 */
export const exportToExcel = (session: CountingSession, items: ConsolidatedItem[]) => {
  // 1. Prepare Data Structure for Excel
  const data = items.map(item => ({
    'Código/SKU': item.barcode,
    'Descripción': item.productName,
    'Cantidad Total': item.totalQuantity,
    'Conteo de Escaneos': item.scans,
    'Orden ERP': session.erpOrder,
    'Etiqueta Logística': session.logisticsLabel,
    'Fecha Conteo': new Date(session.createdAt).toLocaleDateString()
  }));

  // 2. Create Worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // 3. Auto-adjust column width (heuristic)
  const wscols = [
    { wch: 20 }, // SKU
    { wch: 40 }, // Desc
    { wch: 15 }, // Qty
    { wch: 15 }, // Scans
    { wch: 15 }, // ERP
    { wch: 15 }, // Label
    { wch: 15 }, // Date
  ];
  worksheet['!cols'] = wscols;

  // 4. Create Workbook and Append
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Conteo");

  // 5. Download
  const fileName = `Conteo_${session.erpOrder}_${session.logisticsLabel}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

/**
 * Generates and downloads a professional PDF Manifest.
 */
export const exportToPDF = (session: CountingSession, items: ConsolidatedItem[]) => {
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
  const tableColumn = ["Código", "Descripción", "Escaneos", "Cantidad"];
  const tableRows: any[] = [];

  items.forEach(item => {
    const itemData = [
      item.barcode,
      item.productName,
      item.scans,
      item.totalQuantity,
    ];
    tableRows.push(itemData);
  });

  (autoTable as any)(doc, {
    startY: 80,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
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
