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

// Cache simple de productos para evitar consultas repetitivas a IndexedDB
const productCache = new Map<string, {name: string, embedding?: number[]}>();
const MAX_CACHE_SIZE = 5000;

export const clearProductCache = () => productCache.clear();

export const aggregateScans = async (scans: ScanRecord[]): Promise<ConsolidatedItem[]> => {
  if (scans.length === 0) return [];
  
  const uniqueBarcodes = Array.from(new Set(scans.map(s => s.barcode)));
  
  // Identificar qué códigos no están en caché
  const missingBarcodes = uniqueBarcodes.filter(b => !productCache.has(b));
  
  if (missingBarcodes.length > 0) {
    const products = await db.products.where('barcode').anyOf(missingBarcodes).toArray();
    
    // Si la caché es muy grande, limpiamos la mitad más antigua (aproximadamente)
    if (productCache.size > MAX_CACHE_SIZE) {
      const keys = Array.from(productCache.keys());
      for (let i = 0; i < Math.floor(keys.length / 2); i++) {
        productCache.delete(keys[i]);
      }
    }

    products.forEach(p => { 
      productCache.set(p.barcode, { name: p.name, embedding: p.embedding }); 
    });
  }
  
  return aggregateScansSync(scans, productCache);
};
