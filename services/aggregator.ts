
import { ScanRecord, ConsolidatedItem, Product } from "../types";
import { db } from "../db";

/**
 * Core logic to aggregate raw scans into consolidated items.
 * Groups by: Barcode + Expiration Date (MM/YYYY).
 */
export const aggregateScans = async (scans: ScanRecord[]): Promise<ConsolidatedItem[]> => {
    if (scans.length === 0) return [];

    // 1. Fetch needed products efficiently (Batch read)
    const uniqueBarcodes = Array.from(new Set(scans.map(s => s.barcode)));
    const products = await db.products.where('barcode').anyOf(uniqueBarcodes).toArray();
    
    const productMap = products.reduce((acc, p) => {
        acc[p.barcode] = p;
        return acc;
    }, {} as Record<string, Product>);

    // 2. Aggregation Map
    const map = new Map<string, ConsolidatedItem>();

    for (const scan of scans) {
        // Composite Key: BARCODE_MM_YYYY
        const mm = scan.mm || 0;
        const yyyy = scan.yyyy || 0;
        const compositeKey = `${scan.barcode}_${mm}_${yyyy}`;
        
        const existing = map.get(compositeKey);
        const name = productMap[scan.barcode]?.name || 'Producto Desconocido';
        
        if (existing) {
            existing.totalQuantity += scan.quantity;
            existing.scans += 1;
            if (scan.isIncident) existing.isIncident = true; // Flag incident if any scan has it
        } else {
            map.set(compositeKey, {
                barcode: scan.barcode,
                productName: name,
                totalQuantity: scan.quantity,
                scans: 1,
                mm: scan.mm,
                yyyy: scan.yyyy,
                isIncident: scan.isIncident || false
            });
        }
    }

    return Array.from(map.values());
};
