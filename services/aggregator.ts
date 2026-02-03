
import { ScanRecord, ConsolidatedItem } from "../types";
import { db } from "../db";

let aggregatorWorker: Worker | null = null;
let workerFailed = false;

const aggregateScansSync = (scans: ScanRecord[], productMap: Record<string, string>): ConsolidatedItem[] => {
    const aggregation: Record<string, ConsolidatedItem> = {};
    for (const scan of scans) {
        // La clave ahora incluye logisticsLabel para separar por bulto real
        const key = `${scan.barcode}_${scan.mm || 0}_${scan.yyyy || 0}_${scan.logisticsLabel || 'UNSET'}`;
        
        if (!aggregation[key]) {
            aggregation[key] = {
                barcode: scan.barcode,
                productName: productMap[scan.barcode] || 'Cargando...',
                totalQuantity: 0,
                scans: 0,
                mm: scan.mm,
                yyyy: scan.yyyy,
                location: scan.logisticsLabel, // Usamos la ubicación/bulto específica del scan
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
    const productMap: Record<string, string> = {};
    const products = await db.products.where('barcode').anyOf(uniqueBarcodes).toArray();
    products.forEach(p => { productMap[p.barcode] = p.name; });

    if (scans.length < 300 || workerFailed) {
        return aggregateScansSync(scans, productMap);
    }

    return new Promise((resolve) => {
        try {
            if (!aggregatorWorker) {
                aggregatorWorker = new Worker(new URL('../workers/aggregator.worker.ts', import.meta.url), { type: 'module' });
                aggregatorWorker.onerror = () => {
                    workerFailed = true;
                    resolve(aggregateScansSync(scans, productMap));
                };
            }
            
            const timeout = setTimeout(() => resolve(aggregateScansSync(scans, productMap)), 3000);

            aggregatorWorker.onmessage = (e) => {
                clearTimeout(timeout);
                resolve(e.data);
            };
            aggregatorWorker.postMessage({ scans, productMap });
        } catch (err) {
            workerFailed = true;
            resolve(aggregateScansSync(scans, productMap));
        }
    });
};
