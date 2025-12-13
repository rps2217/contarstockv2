
import { fetchProductsFromCloud, fetchCloudData, fetchReceptionData, SHEET_COLUMNS, syncToAppSheet, syncProductsToAppSheet, syncReceptionToAppSheet, parseFlexibleDate } from './appsheet';
import { db } from '../db';
import { sanitizeBarcode, generateUUID } from './utils';
import { Product, CountingSession, ScanRecord } from '../types';
import * as productService from './productService';

// Re-export core sync functions for UI components to avoid split dependencies
export { syncToAppSheet, syncProductsToAppSheet, syncReceptionToAppSheet };

/**
 * INTELLIGENT BATCH SYNC
 */
export const syncAllPendingData = async (onProgress?: (current: number, total: number) => void): Promise<number> => {
    const unsyncedScans = await db.scans.where('synced').equals(0).toArray();
    if (unsyncedScans.length === 0) return 0;

    const uniqueSessionIds = Array.from(new Set(unsyncedScans.map(s => s.sessionId)));
    const sessionsToSync = await db.sessions.where('id').anyOf(uniqueSessionIds).toArray();

    console.log(`[Global Sync] Found ${uniqueSessionIds.length} sessions with pending items.`);

    let processedCount = 0;
    for (const session of sessionsToSync) {
        try {
            await syncToAppSheet(session);
            await db.sessions.update(session.id, { lastSyncTimestamp: Date.now() });
            processedCount++;
            if (onProgress) onProgress(processedCount, sessionsToSync.length);
        } catch (error) {
            console.error(`[Global Sync] Failed for session ${session.erpOrder}:`, error);
        }
    }
    return processedCount;
};

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
        
        await db.sessions.add({
            id: id,
            erpOrder: 'PENDIENTE',
            logisticsLabel: label,
            createdAt: dateStr ? new Date(dateStr).getTime() : Date.now(),
            status: localStatus,
            totalUnits: 0,
            totalSKUs: 0,
            lastSyncTimestamp: Date.now()
        });
        restoredCount++;
    }
    return restoredCount;
};


// OPTIMIZED RESTORE LOGIC
export const restoreFromCloud = async (options?: { erpFilter?: string; dateRange?: { start: string, end: string }, skipExisting?: boolean }): Promise<{ sessions: number, items: number }> => {
  const rows = await fetchCloudData(options);
  if (rows.length === 0) return { sessions: 0, items: 0 };

  // --- FILTER: DISCARD EXISTING LOCAL SESSIONS ---
  let rowsToProcess = rows;
  
  // If skipExisting is true (default for bulk download), we filter out data we already have locally.
  if (options?.skipExisting) {
      console.log("[Restore] Applying 'Skip Existing' filter...");
      const cloudErps = Array.from(new Set(rows.map(r => String(r[SHEET_COLUMNS.ERP_ORDER]).trim())));
      const localSessions = await db.sessions.where('erpOrder').anyOf(cloudErps).toArray();
      
      // Create a signature set of "ERP_LABEL" that exists locally
      const localSignatures = new Set(localSessions.map(s => `${s.erpOrder}_${s.logisticsLabel}`));
      
      rowsToProcess = rows.filter(row => {
          const erp = String(row[SHEET_COLUMNS.ERP_ORDER]).trim();
          const label = String(row[SHEET_COLUMNS.LABEL] || "GENERAL").trim();
          const signature = `${erp}_${label}`;
          return !localSignatures.has(signature);
      });
      console.log(`[Restore] Filtered out ${rows.length - rowsToProcess.length} rows that already exist locally.`);
  }

  if (rowsToProcess.length === 0) return { sessions: 0, items: 0 };

  let sessionsProcessed = 0;
  let itemsRestored = 0;

  // 1. Group Rows by Session
  const sessionsMap = new Map<string, any[]>();
  rowsToProcess.forEach(row => {
    let erp = row[SHEET_COLUMNS.ERP_ORDER];
    let label = row[SHEET_COLUMNS.LABEL];
    erp = erp ? String(erp).trim() : "";
    label = (!label || String(label).trim() === "") ? "GENERAL" : String(label).trim();

    if (erp) {
        const key = `${erp}_${label}`;
        if (!sessionsMap.has(key)) sessionsMap.set(key, []);
        sessionsMap.get(key)?.push(row);
    }
  });

  // 2. Batch Prefetch (Only needed if we didn't fully skip, or for delta syncs)
  const erpList = Array.from(new Set(rowsToProcess.map(r => r[SHEET_COLUMNS.ERP_ORDER])));
  const existingSessions = await db.sessions.where('erpOrder').anyOf(erpList).toArray();
  const existingSessionMap = new Map<string, CountingSession>();
  existingSessions.forEach(s => existingSessionMap.set(`${s.erpOrder}_${s.logisticsLabel}`, s));

  // 3. Process Groups
  for (const [key, sessionRows] of sessionsMap.entries()) {
    const firstRow = sessionRows[0];
    const erp = String(firstRow[SHEET_COLUMNS.ERP_ORDER]).trim();
    const label = String(firstRow[SHEET_COLUMNS.LABEL] || "GENERAL").trim();

    let sessionId: string;
    let isNewSession = false;
    let sessionTotalUnits = 0;
    let sessionTotalSKUs = 0;

    const existingSession = existingSessionMap.get(key);

    if (existingSession) {
        // If we are here, it means skipExisting was FALSE, or the signature matching logic missed it.
        // We proceed with Delta Sync logic.
        sessionId = existingSession.id;
        sessionTotalUnits = existingSession.totalUnits || 0;
        sessionTotalSKUs = existingSession.totalSKUs || 0;
        await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
    } else {
        sessionId = generateUUID();
        isNewSession = true;
        sessionsProcessed++;
    }

    // 4. Calculate Aggregates
    interface AggregatedItem { qty: number; name: string; mm?: number; yyyy?: number; isIncident?: boolean; }
    const cloudAggregated = new Map<string, AggregatedItem>();
    const getCompositeKey = (barcode: string, mm: any, yyyy: any) => `${sanitizeBarcode(barcode)}_${mm ? Number(mm) : 0}_${yyyy ? Number(yyyy) : 0}`;

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

    // 5. Compare with Local Data (Delta Logic)
    const localQtyMap = new Map<string, number>();
    if (!isNewSession) {
        const localScans = await db.scans.where('sessionId').equals(sessionId).toArray();
        localScans.forEach(s => {
            const dateKey = getCompositeKey(s.barcode, s.mm, s.yyyy);
            localQtyMap.set(dateKey, (localQtyMap.get(dateKey) || 0) + s.quantity);
        });
    }

    // 6. Generate Diff & Update Stats In-Memory
    const scansToAdd: ScanRecord[] = [];
    const productsToAdd: Map<string, Product> = new Map();
    const uniqueSKUsSet = new Set<string>();

    for (const [dateKey, cloudData] of cloudAggregated.entries()) {
        const localQty = localQtyMap.get(dateKey) || 0;
        const [barcode] = dateKey.split('_');
        
        uniqueSKUsSet.add(barcode);

        if (cloudData.qty > localQty) {
            const quantityToAdd = cloudData.qty - localQty;

            if (!productsToAdd.has(barcode)) {
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
            
            // Update in-memory stats instead of re-querying DB
            sessionTotalUnits += quantityToAdd;
            itemsRestored += quantityToAdd;
        }
    }

    if (isNewSession) {
        sessionTotalSKUs = uniqueSKUsSet.size;
    }

    // 7. Commit
    if (isNewSession) {
         await db.sessions.add({
            id: sessionId,
            erpOrder: erp,
            logisticsLabel: label,
            createdAt: parseFlexibleDate(firstRow[SHEET_COLUMNS.DATE]),
            status: 'completed',
            totalUnits: sessionTotalUnits,
            totalSKUs: sessionTotalSKUs,
            lastSyncTimestamp: Date.now()
        });
    } else if (scansToAdd.length > 0) {
        // Update stats for existing
        await db.sessions.update(sessionId, { totalUnits: sessionTotalUnits });
    }

    if (scansToAdd.length > 0) {
        await db.scans.bulkAdd(scansToAdd);
        if (productsToAdd.size > 0) {
            await productService.saveProductBatch(Array.from(productsToAdd.values()));
        }
    }
  }

  return { sessions: sessionsProcessed, items: itemsRestored };
};
