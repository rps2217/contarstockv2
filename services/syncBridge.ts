
import { fetchProductsFromCloud, fetchCloudData, fetchReceptionData, SHEET_COLUMNS, syncToAppSheet, syncProductsToAppSheet, syncReceptionToAppSheet, parseFlexibleDate } from './appsheet';
import { db } from '../db';
import { sanitizeBarcode, generateUUID } from './utils';
import { Product, CountingSession, ScanRecord } from '../types';
import * as sessionService from './sessionService';
import * as productService from './productService';

// Re-export core sync functions for UI components to avoid split dependencies
export { syncToAppSheet, syncProductsToAppSheet, syncReceptionToAppSheet };

/**
 * INTELLIGENT BATCH SYNC
 * Scans the entire local DB for unsynced items (synced = 0)
 * and uploads them session by session.
 */
export const syncAllPendingData = async (onProgress?: (current: number, total: number) => void): Promise<number> => {
    // 1. Identify sessions that have unsynced items
    // We query the scans table for synced=0 (falsey)
    const unsyncedScans = await db.scans.where('synced').equals(0).toArray();
    
    if (unsyncedScans.length === 0) return 0;

    // Get unique session IDs involved
    const uniqueSessionIds = Array.from(new Set(unsyncedScans.map(s => s.sessionId)));
    
    // Fetch the actual session objects
    const sessionsToSync = await db.sessions.where('id').anyOf(uniqueSessionIds).toArray();

    console.log(`[Global Sync] Found ${uniqueSessionIds.length} sessions with pending items.`);

    let processedCount = 0;

    for (const session of sessionsToSync) {
        try {
            // Re-use the robust syncToAppSheet logic (it handles aggregation and deltas)
            await syncToAppSheet(session);
            
            // Mark session as synced in local DB to update UI (Green Cloud Icon)
            await db.sessions.update(session.id, { lastSyncTimestamp: Date.now() });
            
            processedCount++;
            if (onProgress) {
                onProgress(processedCount, sessionsToSync.length);
            }
        } catch (error) {
            console.error(`[Global Sync] Failed for session ${session.erpOrder}:`, error);
            // We continue to the next session even if one fails
        }
    }

    return processedCount;
};

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
        await productService.saveProductBatch(products);
    }
    return products.length;
};

export const restoreReceptionFromCloud = async (): Promise<number> => {
    const rows = await fetchReceptionData();
    let restoredCount = 0;

    for (const row of rows) {
        const id = row["ID_RECEPCION"];
        const label = row["ETIQUETA"];
        const status = row["ESTADO"]; 
        const dateStr = row["FECHA_HORA"];

        if (!id || !label) continue;

        const exists = await db.sessions.get(id);
        if (exists) {
            if (status === 'PROCESADO' && exists.status === 'draft') {
                await db.sessions.update(id, { status: 'completed' });
            }
            continue;
        }
        
        const localStatus = status === 'PENDIENTE' ? 'draft' : 'completed';
        
        const newSession: CountingSession = {
            id: id,
            erpOrder: 'PENDIENTE',
            logisticsLabel: label,
            createdAt: dateStr ? new Date(dateStr).getTime() : Date.now(),
            status: localStatus,
            totalUnits: 0,
            totalSKUs: 0,
            lastSyncTimestamp: Date.now()
        };

        await db.sessions.add(newSession);
        restoredCount++;
    }

    return restoredCount;
};


// Main Restore Logic - Optimized
export const restoreFromCloud = async (options?: { erpFilter?: string; dateRange?: { start: string, end: string } }): Promise<{ sessions: number, items: number }> => {
  const rows = await fetchCloudData(options);
  if (rows.length === 0) return { sessions: 0, items: 0 };

  let sessionsProcessed = 0;
  let itemsRestored = 0;

  // 1. Group Rows by Session (Key: ERP_LABEL)
  const sessionsMap = new Map<string, any[]>();
  rows.forEach(row => {
    let erp = row[SHEET_COLUMNS.ERP_ORDER];
    let label = row[SHEET_COLUMNS.LABEL];
    
    // Safety handling for empty values
    erp = erp ? String(erp).trim() : "";
    label = (!label || String(label).trim() === "") ? "GENERAL" : String(label).trim();

    if (erp) {
        const key = `${erp}_${label}`;
        if (!sessionsMap.has(key)) sessionsMap.set(key, []);
        sessionsMap.get(key)?.push(row);
    }
  });

  // 2. Prefetch existing sessions to reduce DB calls inside loop
  const erpList = Array.from(new Set(rows.map(r => r[SHEET_COLUMNS.ERP_ORDER])));
  const existingSessions = await db.sessions.where('erpOrder').anyOf(erpList).toArray();
  const existingSessionMap = new Map<string, CountingSession>();
  
  existingSessions.forEach(s => {
      existingSessionMap.set(`${s.erpOrder}_${s.logisticsLabel}`, s);
  });

  // 3. Process Groups
  for (const [key, sessionRows] of sessionsMap.entries()) {
    const firstRow = sessionRows[0];
    const erp = String(firstRow[SHEET_COLUMNS.ERP_ORDER]).trim();
    const label = String(firstRow[SHEET_COLUMNS.LABEL] || "GENERAL").trim();

    let sessionId: string;
    let isNewSession = false;

    // Check pre-fetched map
    const existingSession = existingSessionMap.get(key);

    if (existingSession) {
        sessionId = existingSession.id;
        // Just update sync timestamp to keep it alive
        await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
    } else {
        const dateStr = firstRow[SHEET_COLUMNS.DATE];
        // Use the robust parser from appsheet.ts
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
        isNewSession = true;
    }

    // 4. Calculate Cloud Aggregates
    interface AggregatedItem { qty: number; name: string; mm?: number; yyyy?: number; isIncident?: boolean; }
    const cloudAggregated = new Map<string, AggregatedItem>();

    const getCompositeKey = (barcode: string, mm: any, yyyy: any) => {
        const m = mm ? Number(mm) : 0;
        const y = yyyy ? Number(yyyy) : 0;
        return `${sanitizeBarcode(barcode)}_${m}_${y}`;
    };

    for (const row of sessionRows) {
        const barcodeRaw = row[SHEET_COLUMNS.BARCODE];
        const barcode = sanitizeBarcode(barcodeRaw);
        const rawQty = row[SHEET_COLUMNS.QUANTITY];
        const qty = typeof rawQty === 'number' ? rawQty : Number(String(rawQty).replace(/,/g, ''));
        
        if (!barcode || !qty || isNaN(qty) || qty <= 0) continue;

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

    // 5. Compare with Local Data (Only if session existed previously, otherwise local is 0)
    const localQtyMap = new Map<string, number>();
    
    if (!isNewSession) {
        const localScans = await db.scans.where('sessionId').equals(sessionId).toArray();
        localScans.forEach(s => {
            const dateKey = getCompositeKey(s.barcode, s.mm, s.yyyy);
            localQtyMap.set(dateKey, (localQtyMap.get(dateKey) || 0) + s.quantity);
        });
    }

    // 6. Generate Diff Scans
    const scansToAdd: ScanRecord[] = [];
    const productsToAdd: Map<string, Product> = new Map();

    for (const [dateKey, cloudData] of cloudAggregated.entries()) {
        const localQty = localQtyMap.get(dateKey) || 0;
        const [barcode] = dateKey.split('_');

        if (cloudData.qty > localQty) {
            const quantityToAdd = cloudData.qty - localQty;

            // Check if product exists in DB efficiently? 
            // We can assume it does or we add it safely via batch later.
            // For optimized flow, we just accumulate products to add.
            if (!productsToAdd.has(barcode)) {
                 // Note: We check DB existence later in batch
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
                synced: 1, // Mark as synced so we don't re-upload it
                isIncident: cloudData.isIncident
            });
            itemsRestored += quantityToAdd;
        }
    }

    // 7. Commit Changes for this session
    if (scansToAdd.length > 0) {
        await db.scans.bulkAdd(scansToAdd);
        
        // Save new products (service handles existing check)
        const productsArray = Array.from(productsToAdd.values());
        if (productsArray.length > 0) {
            await productService.saveProductBatch(productsArray);
        }

        await sessionService.updateSessionStats(sessionId);
    }
  }

  return { sessions: sessionsProcessed, items: itemsRestored };
};
