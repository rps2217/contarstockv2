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

/**
 * FIX: Cache de productos ahora tiene invalidación.
 * Antes: El cache nunca se invalidaba, mostrando nombres obsoletos.
 * Ahora: Se puede invalidar cuando los productos cambian.
 */
const productCache = new Map<string, {name: string, embedding?: number[], cachedAt: number}>();
const MAX_CACHE_SIZE = 5000;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de TTL

export const clearProductCache = () => productCache.clear();

/**
 * Invalida productos específicos del cache.
 * Debe llamarse cuando se actualiza o guarda un producto.
 */
export const invalidateProductCache = (barcodes: string[]) => {
  barcodes.forEach(b => productCache.delete(b));
};

/**
 * Invalida todo el cache de productos.
 */
export const invalidateAllProductCache = () => productCache.clear();

/**
 * Verifica si una entrada del cache es válida (no expirada).
 */
const isCacheValid = (entry: { cachedAt: number } | undefined): boolean => {
  if (!entry) return false;
  return Date.now() - entry.cachedAt < CACHE_TTL_MS;
};

export const aggregateScans = async (scans: ScanRecord[]): Promise<ConsolidatedItem[]> => {
  if (scans.length === 0) return [];
  
  const uniqueBarcodes = Array.from(new Set(scans.map(s => s.barcode)));
  
  // Identificar qué códigos no están en caché o están expirados
  const missingBarcodes = uniqueBarcodes.filter(b => {
    const cached = productCache.get(b);
    return !isCacheValid(cached);
  });
  
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
      productCache.set(p.barcode, { 
        name: p.name, 
        embedding: p.embedding,
        cachedAt: Date.now()
      }); 
    });
  }
  
  return aggregateScansSync(scans, productCache);
};

