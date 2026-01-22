
import * as XLSX from 'xlsx';
import { ConsolidatedBlindItem } from '../hooks/useMassiveScanner';

export const exportMassiveToExcel = (batchId: string, items: ConsolidatedBlindItem[]) => {
    const data = items.map(item => {
        const expected = item.expectedQty || 0;
        const physical = item.totalQuantity;
        return {
            'SKU/EAN': item.barcode,
            'Descripción': item.name,
            'Cant. Contada': physical,
            'Cant. Esperada': expected,
            'Diferencia': physical - expected,
            'Último Escaneo': item.lastTimestamp > 0 ? new Date(item.lastTimestamp).toLocaleString() : 'N/A',
            'ID Lote': batchId
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Auditoria_Martillo");

    const wscols = [
        { wch: 20 }, // SKU
        { wch: 35 }, // Desc
        { wch: 15 }, // Qty
        { wch: 15 }, // Exp
        { wch: 12 }, // Diff
        { wch: 22 }, // Date
        { wch: 18 }, // Batch
    ];
    worksheet['!cols'] = wscols;

    const fileName = `Audit_${batchId}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
};
