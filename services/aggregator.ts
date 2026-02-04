
import { ScanRecord, ConsolidatedItem } from "../types";
import { db } from "../db";

const aggregateScansSync = (scans: ScanRecord[], productMap: Record<string, string>): ConsolidatedItem[] => {
    const aggregation: Record<string, ConsolidatedItem> = {};
    for (const scan of scans) {
        // La clave ahora incluye BATCH para separar inventario farmacéutico por lotes
        const key = `${scan.barcode}_${scan.batch || 'NO_BATCH'}_${scan.mm || 0}_${scan.yyyy || 0}_${scan.logisticsLabel || 'UNSET'}`;
        
        if (!aggregation[key]) {
            aggregation[key] = {
                barcode: scan.barcode,
                productName: productMap[scan.barcode] || 'Cargando...',
                batch: scan.batch,
                totalQuantity: 0,
                scans: 0,
                mm: scan.mm,
                yyyy: scan.yyyy,
                location: scan.logisticsLabel,
                isIncident: false
            };
        }
        aggregation[key].totalQuantity += scan.quantity;
        aggregation[key].scans += 1;
        if (scan.isIncident) aggregation[key].isIncident = true;
    }
    return Object.values(aggregation);
};

export const aggregateScans = async (scans: ScanRecord[]): Promise<ConsolidatedItem[]> => {
    if (scans.length === 0) return [];
    const uniqueBarcodes = Array.from(new Set(scans.map(s => s.barcode)));
    const products = await db.products.where('barcode').anyOf(uniqueBarcodes).toArray();
    const productMap: Record<string, string> = {};
    products.forEach(p => { productMap[p.barcode] = p.name; });
    return aggregateScansSync(scans, productMap);
};
