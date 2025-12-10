import { fetchProductsFromCloud, fetchCloudData, SHEET_COLUMNS, syncToAppSheet, syncProductsToAppSheet, syncReceptionToAppSheet } from './appsheet';
import { db } from '../db';
import { sanitizeBarcode, generateUUID } from './utils';
import { Product, CountingSession, ScanRecord } from '../types';
import * as sessionService from './sessionService';
import * as productService from './productService';

// Re-export core sync functions for UI components to avoid split dependencies
export { syncToAppSheet, syncProductsToAppSheet, syncReceptionToAppSheet };

/**
 * Imports products from AppSheet and saves them to the local DB.
 * Acts as a bridge between API and DB to prevent circular deps in lower-level services.
 */
export const importProductsFromAppSheet = async (): Promise<number> => {
    const rows = await fetchProductsFromCloud();
    const products: Product[] = rows.map(r => ({
        barcode: sanitizeBarcode(r["COD PRODUCTO"]),
        name: r.DESCRIPCION,
        category: r.MUNDO,
        supplier: r.PROVEEDOR,
        supplierRut: r['RUT PROVEEDOR'],
        syncStatus: 'synced' 
    }));

    if (products.length > 0) {
        await db.products.bulkPut(products);
    }
    return products.length;
};

// Helper for date parsing
const parseFlexibleDate = (dateVal: any): number => {
    if (!dateVal) return Date.now();
    if (typeof dateVal === 'number') return dateVal; 
    const s = String(dateVal).trim();
    if (s.match(/^\d{4}-\d{2}-\d{2}/)) { const ts = new Date(s).getTime(); if (!isNaN(ts)) return ts; }
    const parts = s.split(/[\/\-]/);
    if (parts.length === 3) {
        const d = parseInt(parts[0], 10); const m = parseInt(parts[1], 10) - 1; const y = parseInt(parts[2], 10);
        if (d > 0 && d <= 31 && m >= 0 && m <= 11) { const ts = new Date(y, m, d).getTime(); if (!isNaN(ts)) return ts; }
    }
    const ts = new Date(s).getTime(); return isNaN(ts) ? Date.now() : ts;
};

export const restoreFromCloud = async (options?: { erpFilter?: string; dateRange?: { start: string, end: string } }): Promise<{ sessions: number, items: number }> => {
  const rows = await fetchCloudData(options);
  if (rows.length === 0) return { sessions: 0, items: 0 };

  let sessionsProcessed = 0;
  let itemsRestored = 0;

  const sessionsMap = new Map<string, any[]>();
  
  rows.forEach(row => {
    let erp = row[SHEET_COLUMNS.ERP_ORDER];
    let label = row[SHEET_COLUMNS.LABEL];
    erp = erp ? String(erp).trim() : "";
    if (!label || String(label).trim() === "") label = "GENERAL"; else label = String(label).trim();
    if (options?.erpFilter && erp !== options.erpFilter) return;

    if (erp) {
        const key = `${erp}_${label}`;
        if (!sessionsMap.has(key)) sessionsMap.set(key, []);
        sessionsMap.get(key)?.push(row);
    }
  });

  for (const [key, sessionRows] of sessionsMap.entries()) {
    const firstRow = sessionRows[0];
    const erp = String(firstRow[SHEET_COLUMNS.ERP_ORDER]).trim();
    const labelRaw = firstRow[SHEET_COLUMNS.LABEL];
    const label = (!labelRaw || String(labelRaw).trim() === "") ? "GENERAL" : String(labelRaw).trim();

    let sessionId: string;
    const existingSession = await db.sessions
      .where('erpOrder').equals(erp)
      .and(s => s.logisticsLabel === label)
      .first();

    if (existingSession) {
        sessionId = existingSession.id;
        await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
    } else {
        const dateStr = firstRow[SHEET_COLUMNS.DATE];
        const sessionCreatedAt = parseFlexibleDate(dateStr);
        sessionId = generateUUID();
        
        await db.sessions.add({
            id: sessionId,
            erpOrder: erp,
            logisticsLabel: label,
            createdAt: sessionCreatedAt,
            status: 'completed',
            totalUnits: 0,
            totalSKUs: 0,
            lastSyncTimestamp: Date.now()
        });
        sessionsProcessed++;
    }

    const scansToAdd: ScanRecord[] = [];
    const productsToAdd: Map<string, Product> = new Map();

    const localScans = await db.scans.where('sessionId').equals(sessionId).toArray();
    const localQtyMap = new Map<string, number>();
    
    const getCompositeKey = (barcode: string, mm: any, yyyy: any) => {
        const m = mm ? Number(mm) : 0;
        const y = yyyy ? Number(yyyy) : 0;
        return `${sanitizeBarcode(barcode)}_${m}_${y}`;
    };
    
    localScans.forEach(s => {
        const dateKey = getCompositeKey(s.barcode, s.mm, s.yyyy);
        localQtyMap.set(dateKey, (localQtyMap.get(dateKey) || 0) + s.quantity);
    });

    interface AggregatedItem { qty: number; name: string; mm?: number; yyyy?: number; isIncident?: boolean; }
    const cloudAggregated = new Map<string, AggregatedItem>();

    for (const row of sessionRows) {
        const barcodeRaw = row[SHEET_COLUMNS.BARCODE];
        const barcode = sanitizeBarcode(barcodeRaw);
        const rawQty = row[SHEET_COLUMNS.QUANTITY];
        const qty = typeof rawQty === 'number' ? rawQty : Number(String(rawQty).replace(/,/g, ''));
        
        if (!qty || isNaN(qty) || qty <= 0) continue;

        const mm = row[SHEET_COLUMNS.MONTH] ? Number(row[SHEET_COLUMNS.MONTH]) : undefined;
        const yyyy = row[SHEET_COLUMNS.YEAR] ? Number(row[SHEET_COLUMNS.YEAR]) : undefined;
        const name = row[SHEET_COLUMNS.PRODUCT_NAME] || 'Producto Importado';
        const isIncident = row[SHEET_COLUMNS.INCIDENT] === "FRC";

        const dateKey = getCompositeKey(barcode, mm, yyyy);
        
        if (cloudAggregated.has(dateKey)) {
            const current = cloudAggregated.get(dateKey)!;
            current.qty += qty;
            if (isIncident) current.isIncident = true;
        } else {
            cloudAggregated.set(dateKey, { qty, name, mm, yyyy, isIncident });
        }
    }

    for (const [dateKey, cloudData] of cloudAggregated.entries()) {
        const localQty = localQtyMap.get(dateKey) || 0;
        const [barcode] = dateKey.split('_');

        if (cloudData.qty > localQty) {
            const quantityToAdd = cloudData.qty - localQty;

            const existingProduct = await db.products.get(barcode);
            if (!existingProduct && !productsToAdd.has(barcode)) {
                productsToAdd.set(barcode, {
                    barcode: barcode,
                    name: cloudData.name,
                    category: 'IMPORTADO',
                    syncStatus: 'synced'
                });
            }

            scansToAdd.push({
                id: generateUUID(),
                sessionId: sessionId,
                barcode: barcode,
                quantity: quantityToAdd,
                timestamp: Date.now(),
                mm: cloudData.mm,
                yyyy: cloudData.yyyy,
                synced: 1,
                isIncident: cloudData.isIncident
            });
            itemsRestored += quantityToAdd;
        }
    }

    if (productsToAdd.size > 0) {
        await productService.saveProductBatch(Array.from(productsToAdd.values()));
    }
    if (scansToAdd.length > 0) {
        await db.scans.bulkAdd(scansToAdd);
    }

    await sessionService.updateSessionStats(sessionId);
  }

  return { sessions: sessionsProcessed, items: itemsRestored };
};