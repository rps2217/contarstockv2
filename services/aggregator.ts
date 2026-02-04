
import { ScanRecord, ConsolidatedItem } from "../types";
import { db } from "../db";
import { getSettings } from "./settings";

const aggregateScansSync = (scans: ScanRecord[], productMap: Record<string, string>): ConsolidatedItem[] => {
    const aggregation: Record<string, ConsolidatedItem> = {};
    const settings = getSettings();
    
    for (const scan of scans) {
        // SI EL RASTREO ESTÁ DESACTIVADO, IGNORAMOS LOS CAMPOS DE FECHA Y LOTE EN LA CLAVE ÚNICA
        const batchPart = settings.batchTrackingEnabled ? (scan.batch || 'NO_BATCH') : 'DISABLED';
        const mmPart = settings.batchTrackingEnabled ? (scan.mm || 0) : 0;
        const yyyyPart = settings.batchTrackingEnabled ? (scan.yyyy || 0) : 0;

        const key = `${scan.barcode}_${batchPart}_${mmPart}_${yyyyPart}_${scan.logisticsLabel || 'UNSET'}`;
        
        if (!aggregation[key]) {
            aggregation[key] = {
                barcode: scan.barcode,
                productName: productMap[scan.barcode] || 'Cargando...',
                batch: settings.batchTrackingEnabled ? scan.batch : undefined,
                totalQuantity: 0,
                scans: 0,
                mm: settings.batchTrackingEnabled ? scan.mm : undefined,
                yyyy: settings.batchTrackingEnabled ? scan.yyyy : undefined,
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
