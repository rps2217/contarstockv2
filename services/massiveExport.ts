
import * as XLSX from 'xlsx';
import { ConsolidatedBlindItem } from '../hooks/useMassiveScanner';

export const exportMassiveToExcel = (batchId: string, items: ConsolidatedBlindItem[]) => {
    const data = items.map(item => ({
        'SKU/EAN': item.barcode,
        'Descripción': item.name,
        'Cantidad Total': item.totalQuantity,
        'Último Escaneo': new Date(item.lastTimestamp).toLocaleString(),
        'ID Lote': batchId
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Martillo_Data");

    // Auto-ajuste de columnas
    const wscols = [
        { wch: 20 }, // SKU
        { wch: 40 }, // Desc
        { wch: 15 }, // Qty
        { wch: 25 }, // Date
        { wch: 20 }, // Batch
    ];
    worksheet['!cols'] = wscols;

    const fileName = `Martillo_${batchId}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
};
