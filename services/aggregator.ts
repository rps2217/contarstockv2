import { ScanRecord, ConsolidatedItem } from "../types";
import { db } from "../db";
import { getSettings } from "./settings";

const aggregateScansSync = (scans: ScanRecord[], productMap: Map<string, {name: string, embedding?: number[]}>): ConsolidatedItem[] => {
    const aggregation: Record<string, ConsolidatedItem> = {};
    const settings = getSettings();
    
    for (const scan of scans) {
        const batchPart = settings.batchTrackingEnabled ? (scan.batch || 'NO_BATCH') : 'DISABLED';
        const mmPart = settings.batchTrackingEnabled ? (scan.mm || 0) : 0;
        const yyyyPart = settings.batchTrackingEnabled ? (scan.yyyy || 0) : 0;

        const key = `${scan.barcode}_${batchPart}_${mmPart}_${yyyyPart}_${scan.logisticsLabel || 'UNSET'}`;
        
        if (!aggregation[key]) {
            const productInfo = productMap.get(scan.barcode);
            aggregation[key] = {
                barcode: scan.barcode,
                productName: productInfo?.name || 'Cargando...',
                embedding: productInfo?.embedding,
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
    
    const productMap = new Map<string, {name: string, embedding?: number[]}>();
    products.forEach(p => { 
        productMap.set(p.barcode, { name: p.name, embedding: p.embedding }); 
    });
    
    return aggregateScansSync(scans, productMap);
};