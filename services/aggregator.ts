
import { ScanRecord, ConsolidatedItem } from "../types";
import { db } from "../db";

// Instancia única del worker para evitar overhead de creación
let aggregatorWorker: Worker | null = null;
let workerFailed = false;

/**
 * Procesa la agregación de forma síncrona (Hilo Principal)
 */
const aggregateScansSync = (scans: ScanRecord[], productMap: Record<string, string>): ConsolidatedItem[] => {
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
};

/**
 * Agregador Inteligente: Decide si procesar en hilo principal o Worker
 */
export const aggregateScans = async (scans: ScanRecord[]): Promise<ConsolidatedItem[]> => {
    if (scans.length === 0) return [];

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

    // Si hay pocos registros o el worker ya falló anteriormente, procesar síncronamente
    if (scans.length < USE_WORKER_THRESHOLD || workerFailed) {
        return aggregateScansSync(scans, productMap);
    } else {
        // PROCESAMIENTO EN WORKER con fallback
        return new Promise((resolve) => {
            try {
                if (!aggregatorWorker) {
                    aggregatorWorker = new Worker(new URL('../workers/aggregator.worker.ts', import.meta.url), { type: 'module' });
                }
                
                const timeout = setTimeout(() => {
                    console.warn("Worker timeout, falling back to sync processing");
                    resolve(aggregateScansSync(scans, productMap));
                }, 2000);

                aggregatorWorker.onmessage = (e) => {
                    clearTimeout(timeout);
                    resolve(e.data);
                };

                aggregatorWorker.onerror = (e) => {
                    console.error("Worker error:", e);
                    workerFailed = true;
                    clearTimeout(timeout);
                    resolve(aggregateScansSync(scans, productMap));
                };
                
                aggregatorWorker.postMessage({ scans, productMap });
            } catch (err) {
                console.warn("Could not start Worker:", err);
                workerFailed = true;
                resolve(aggregateScansSync(scans, productMap));
            }
        });
    }
};
