
import { ScanRecord, ConsolidatedItem } from "../types";
import { db } from "../db";

// Instancia única del worker para evitar overhead de creación
let aggregatorWorker: Worker | null = null;

/**
 * Agregador Inteligente: Decide si procesar en hilo principal o Worker
 * basado en la carga de datos.
 */
export const aggregateScans = async (scans: ScanRecord[]): Promise<ConsolidatedItem[]> => {
    if (scans.length === 0) return [];

    // Umbral de activación del Worker (p. ej. > 500 registros)
    const USE_WORKER_THRESHOLD = 500;

    // 1. Obtener nombres de productos (necesario para ambos métodos)
    const uniqueBarcodes = Array.from(new Set(scans.map(s => s.barcode)));
    const productMap: Record<string, string> = {};
    
    const CHUNK_SIZE = 100;
    for (let i = 0; i < uniqueBarcodes.length; i += CHUNK_SIZE) {
        const chunk = uniqueBarcodes.slice(i, i + CHUNK_SIZE);
        const products = await db.products.where('barcode').anyOf(chunk).toArray();
        products.forEach(p => { productMap[p.barcode] = p.name; });
    }

    if (scans.length < USE_WORKER_THRESHOLD) {
        // PROCESAMIENTO LOCAL (Rápido para pocos datos)
        const aggregation: Record<string, ConsolidatedItem> = {};
        for (const scan of scans) {
            const key = `${scan.barcode}_${scan.mm || 0}_${scan.yyyy || 0}`;
            if (!aggregation[key]) {
                aggregation[key] = {
                    barcode: scan.barcode,
                    productName: productMap[scan.barcode] || 'Cargando...',
                    totalQuantity: 0,
                    scans: 0,
                    mm: scan.mm,
                    yyyy: scan.yyyy,
                    isIncident: false
                };
            }
            aggregation[key].totalQuantity += scan.quantity;
            aggregation[key].scans += 1;
            if (scan.isIncident) aggregation[key].isIncident = true;
        }
        return Object.values(aggregation);
    } else {
        // PROCESAMIENTO EN WORKER (Evita lag en la UI para grandes volúmenes)
        return new Promise((resolve, reject) => {
            if (!aggregatorWorker) {
                aggregatorWorker = new Worker(new URL('../workers/aggregator.worker.ts', import.meta.url), { type: 'module' });
            }
            
            aggregatorWorker.onmessage = (e) => resolve(e.data);
            aggregatorWorker.onerror = (e) => reject(e);
            
            aggregatorWorker.postMessage({ scans, productMap });
        });
    }
};
