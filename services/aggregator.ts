
import { ScanRecord, ConsolidatedItem, Product } from "../types";
import { db } from "../db";

/**
 * Core logic to aggregate raw scans into consolidated items.
 * Groups by: Barcode + Expiration Date (MM/YYYY).
 * 
 * OPTIMIZATION: Implements Batch Fetching to avoid N+1 Query problem.
 */
export const aggregateScans = async (scans: ScanRecord[]): Promise<ConsolidatedItem[]> => {
    if (scans.length === 0) return [];

    // 1. Performance: Extract unique barcodes to fetch metadata in ONE query
    const uniqueBarcodes = new Set<string>();
    scans.forEach(s => uniqueBarcodes.add(s.barcode));
    
    // Batch Fetch
    const products = await db.products.where('barcode').anyOf(Array.from(uniqueBarcodes)).toArray();
    
    // Create fast lookup map O(1)
    const productMap = new Map<string, string>();
    products.forEach(p => productMap.set(p.barcode, p.name));

    // 2. Aggregation Map
    const map = new Map<string, ConsolidatedItem>();

    // Single pass aggregation O(N)
    for (const scan of scans) {
        // Composite Key: BARCODE_MM_YYYY
        // Using bitwise OR 0 is slightly faster for integer fallback
        const mm = scan.mm || 0;
        const yyyy = scan.yyyy || 0;
        const compositeKey = `${scan.barcode}_${mm}_${yyyy}`;
        
        let existing = map.get(compositeKey);
        
        if (existing) {
            existing.totalQuantity += scan.quantity;
            existing.scans += 1;
            if (scan.isIncident) existing.isIncident = true; 
        } else {
            // Lazy name lookup
            const name = productMap.get(scan.barcode) || 'Producto Desconocido';
            
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

    // Convert map to array
    return Array.from(map.values());
};
