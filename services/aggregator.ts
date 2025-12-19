
import { ScanRecord, ConsolidatedItem, Product } from "../types";
import { db } from "../db";

/**
 * HIGH-PERFORMANCE AGGREGATOR v2 (Map-Reduce Style)
 * Optimizado para procesar grandes volúmenes de datos usando buffers de memoria eficientes.
 */
export const aggregateScans = async (scans: ScanRecord[]): Promise<ConsolidatedItem[]> => {
    if (scans.length === 0) return [];

    // 1. Fase de Extracción: Obtener metadatos en paralelo
    const uniqueBarcodes = Array.from(new Set(scans.map(s => s.barcode)));
    
    // Chunking de lectura para evitar límites de IDB en consultas gigantes
    const CHUNK_SIZE = 100;
    const productMap = new Map<string, string>();
    
    for (let i = 0; i < uniqueBarcodes.length; i += CHUNK_SIZE) {
        const chunk = uniqueBarcodes.slice(i, i + CHUNK_SIZE);
        const products = await db.products.where('barcode').anyOf(chunk).toArray();
        products.forEach(p => productMap.set(p.barcode, p.name));
    }

    // 2. Fase de Reducción (Agrupación)
    // Usamos un objeto simple de clave-valor para máxima velocidad de acceso en el bucle
    const aggregation: Record<string, ConsolidatedItem> = {};

    for (let i = 0; i < scans.length; i++) {
        const scan = scans[i];
        const mm = scan.mm || 0;
        const yyyy = scan.yyyy || 0;
        const key = `${scan.barcode}_${mm}_${yyyy}`;
        
        if (!aggregation[key]) {
            aggregation[key] = {
                barcode: scan.barcode,
                productName: productMap.get(scan.barcode) || 'Producto Desconocido',
                totalQuantity: 0,
                scans: 0,
                mm: scan.mm,
                yyyy: scan.yyyy,
                isIncident: false
            };
        }
        
        const target = aggregation[key];
        target.totalQuantity += scan.quantity;
        target.scans += 1;
        if (scan.isIncident) target.isIncident = true;
    }

    return Object.values(aggregation);
};
