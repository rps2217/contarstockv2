
import { fetchProductsFromCloud, fetchCloudData, fetchReceptionData, SHEET_COLUMNS, syncToAppSheet, syncProductsToAppSheet, syncReceptionToAppSheet, parseFlexibleDate } from './appsheet';
import { db } from '../db';
import { sanitizeBarcode, generateUUID, generateCompositeKey, normalizeKey } from './utils';
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

// IMPROVED RECEPTION RESTORE
export const restoreReceptionFromCloud = async (options?: { dateRange?: { start: string, end: string } }): Promise<number> => {
    // 1. Fetch from Cloud with Filter
    const rows = await fetchReceptionData(options);
    let restoredCount = 0;

    // 2. Load existing to prevent duplicates (Upsert logic)
    // We check by logisticsLabel basically, assuming one entry per label in 'draft' mode conceptually
    const existingDrafts = await db.sessions.where('status').equals('draft').toArray();
    const existingMap = new Set(existingDrafts.map(d => d.logisticsLabel));

    for (const row of rows) {
        const cloudId = row["ID_RECEPCION"];
        const label = row["ETIQUETA"];
        const status = row["ESTADO"]; 
        const dateStr = row["FECHA_HORA"];
        const auditStatusRaw = row["ESTADO_AUDITORIA"];

        if (!label) continue;

        // If we already have this specific ID, skip or update?
        // Let's check if the ID exists
        const existsById = cloudId ? await db.sessions.get(cloudId) : null;
        
        if (existsById) {
            // Already have it. Maybe update status?
            if (status === 'PROCESADO' && existsById.status === 'draft') {
                await db.sessions.update(existsById.id, { status: 'completed' });
            }
            continue;
        }

        // If no ID match, check by label to avoid logical duplicates if user redownloads
        if (existingMap.has(label)) {
            continue; 
        }
        
        const localStatus = status === 'PENDIENTE' ? 'draft' : 'completed';
        
        // Map cloud audit status to local
        let localAudit: 'verified' | 'warning' | 'failed' | 'pending' = 'pending';
        if (auditStatusRaw === 'VERIFICADO_OK') localAudit = 'verified';
        else if (auditStatusRaw === 'CON_DIFERENCIAS') localAudit = 'warning';
        else if (auditStatusRaw === 'RECHAZADO') localAudit = 'failed';

        await db.sessions.add({
            id: cloudId || generateUUID(),
            erpOrder: 'PENDIENTE',
            logisticsLabel: label,
            createdAt: dateStr ? parseFlexibleDate(dateStr) : Date.now(),
            status: localStatus,
            totalUnits: 0,
            totalSKUs: 0,
            lastSyncTimestamp: Date.now(), // Mark as synced since it came from cloud
            auditStatus: localAudit
        });
        restoredCount++;
    }
    return restoredCount;
};


// OPTIMIZED RESTORE LOGIC
export const restoreFromCloud = async (options?: { erpFilter?: string; dateRange?: { start: string, end: string }, skipExisting?: boolean }): Promise<{ sessions: number, items: number }> => {
  const rows = await fetchCloudData(options);
  if (rows.length === 0) return { sessions: 0, items: 0 };

  // --- PREPARE LOCAL REFERENCE MAP ---
  // We fetch ALL local sessions to build a robust, case-insensitive existence map.
  const allLocalSessions = await db.sessions.toArray();
  const localSessionMap = new Map<string, CountingSession>();
  
  allLocalSessions.forEach(s => {
      // Use central generator to ensure keys match exactly what we generate for cloud rows
      localSessionMap.set(generateCompositeKey(s.erpOrder, s.logisticsLabel), s);
  });

  // --- FILTER: DISCARD EXISTING LOCAL SESSIONS ---
  let rowsToProcess = rows;
  
  // If skipExisting is true (default for bulk download), we filter out data we already have locally.
  if (options?.skipExisting) {
      console.log("[Restore] Applying 'Skip Existing' filter...");
      
      rowsToProcess = rows.filter(row => {
          const key = generateCompositeKey(row[SHEET_COLUMNS.ERP_ORDER], row[SHEET_COLUMNS.LABEL]);
          return !localSessionMap.has(key);
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
    
    // Normalize logic
    const key = generateCompositeKey(erp, label);

    // Only process valid ERPs (ignore garbage rows)
    if (normalizeKey(erp).length > 0) {
        if (!sessionsMap.has(key)) sessionsMap.set(key, []);
        sessionsMap.get(key)?.push(row);
    }
  });

  // 2. Process Groups
  for (const [key, sessionRows] of sessionsMap.entries()) {
    const firstRow = sessionRows[0];
    const erp = String(firstRow[SHEET_COLUMNS.ERP_ORDER]).trim();
    const label = String(firstRow[SHEET_COLUMNS.LABEL] || "GENERAL").trim();

    let sessionId: string;
    let isNewSession = false;
    let sessionTotalUnits = 0;
    let sessionTotalSKUs = 0;

    // --- CRITICAL DUPLICATE CHECK ---
    // First, try the fast Map lookup
    let existingSession = localSessionMap.get(key);

    // SAFETY FALLBACK: If map fails (rare edge case), check the full array manually
    if (!existingSession) {
        const normErp = normalizeKey(erp);
        const normLabel = normalizeKey(label);
        
        // This handles cases where 'label' might be resolved to 'GENERAL' internally
        // matching a local session that effectively maps to the same key
        existingSession = allLocalSessions.find(s => 
            normalizeKey(s.erpOrder) === normErp && 
            normalizeKey(s.logisticsLabel) === normLabel
        );
    }

    if (existingSession) {
        // Delta Sync Logic
        sessionId = existingSession.id;
        sessionTotalUnits = existingSession.totalUnits || 0;
        sessionTotalSKUs = existingSession.totalSKUs || 0;
        await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
    } else {
        // New Session Logic
        sessionId = generateUUID();
        isNewSession = true;
        sessionsProcessed++;
    }

    // 4. Calculate Aggregates from Cloud Data
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

        // Only add if cloud has MORE than local
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
