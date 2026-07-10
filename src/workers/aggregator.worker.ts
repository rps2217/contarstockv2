
import { ScanRecord, ConsolidatedItem } from '../types';

/**
 * Computación de alto rendimiento para miles de escaneos.
 * Se ejecuta en un hilo separado para mantener la UI a 60fps.
 */
self.onmessage = (e: MessageEvent) => {
 const { scans, productMap } = e.data;
 if (!scans) return;

 const aggregation: Record<string, ConsolidatedItem> = {};

 for (let i = 0; i < scans.length; i++) {
 const scan = scans[i];
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
 
 const target = aggregation[key];
 target.totalQuantity += scan.quantity;
 target.scans += 1;
 if (scan.isIncident) target.isIncident = true;
 }

 self.postMessage(Object.values(aggregation));
};

