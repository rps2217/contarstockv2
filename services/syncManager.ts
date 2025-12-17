import { db } from '../db';
import { fetchCloudData, fetchReceptionData, fetchProductsFromCloud, syncToAppSheet, syncReceptionToAppSheet, SHEET_COLUMNS, parseFlexibleDate } from './appsheet';
import { CountingSession, ScanRecord, Product, ConsolidatedItem } from '../types';
import * as sessionService from './sessionService';
import * as productService from './productService';
import { generateCompositeKey, normalizeKey, sanitizeBarcode, generateUUID } from './utils';
import { logger } from './logger';

export { SYNC_ENGINE_VERSION } from './constants';

// --- TYPES ---

export interface UploadGroup {
    erpOrder: string;
    sessionCount: number;
    totalUnits: number;
    sessionIds: string[];
    logisticsLabels: string[];
    type: 'inventory' | 'reception';
}

export interface CloudItem {
    erpOrder: string;
    label: string;
    date: Date;
    totalQty: number;
    status: 'new' | 'exists_identical' | 'exists_different';
    rawRow: any;
}

// ==========================================
// 1. UPLOAD MANAGEMENT (Local -> Cloud)
// ==========================================

/**
 * Agrupa todos los escaneos pendientes por Orden ERP.
 * Agrupa los bultos recepcionados (Check-in) pendientes.
 */
export const getPendingUploadGroups = async (): Promise<UploadGroup[]> => {
    const groups: Record<string, UploadGroup> = {};

    // A. INVENTORY: Get all unsynced scans
    const unsyncedScans = await db.scans.where('synced').equals(0).toArray();
    
    if (unsyncedScans.length > 0) {
        const sessionIds = Array.from(new Set(unsyncedScans.map(s => s.sessionId)));
        const sessions = await db.sessions.where('id').anyOf(sessionIds).toArray();
        
        const sessionMap = new Map<string, CountingSession>();
        sessions.forEach(s => sessionMap.set(s.id, s));

        for (const scan of unsyncedScans) {
            const session = sessionMap.get(scan.sessionId);
            if (!session) continue;

            const erp = session.erpOrder;
            
            if (!groups[erp]) {
                groups[erp] = {
                    erpOrder: erp,
                    sessionCount: 0,
                    totalUnits: 0,
                    sessionIds: [],
                    logisticsLabels: [],
                    type: 'inventory'
                };
            }

            groups[erp].totalUnits += scan.quantity;
            if (!groups[erp].sessionIds.includes(session.id)) {
                groups[erp].sessionIds.push(session.id);
                groups[erp].logisticsLabels.push(session.logisticsLabel);
                groups[erp].sessionCount++;
            }
        }
    }

    // B. RECEPTION: Get pending drafts
    const pendingDrafts = await db.sessions
        .where('status').equals('draft')
        .and(s => !s.lastSyncTimestamp)
        .toArray();

    if (pendingDrafts.length > 0) {
        const receptionKey = "BITÁCORA RECEPCIÓN";
        
        groups[receptionKey] = {
            erpOrder: receptionKey,
            sessionCount: pendingDrafts.length,
            totalUnits: 0, 
            sessionIds: pendingDrafts.map(d => d.id),
            logisticsLabels: pendingDrafts.map(d => d.logisticsLabel),
            type: 'reception'
        };
    }

    return Object.values(groups);
};

/**
 * Ejecuta la subida consolidada.
 */
export const performBatchUpload = async (group: UploadGroup): Promise<void> => {
    
    // CASE A: RECEPTION LOGS
    if (group.type === 'reception') {
        const drafts = await db.sessions.where('id').anyOf(group.sessionIds).toArray();
        if (drafts.length === 0) return;

        const result = await syncReceptionToAppSheet(drafts);
        
        if (result.failed > 0) {
            const errStr = result.errors.slice(0, 3).join('; ');
            throw new Error(`Hubo fallos parciales (${result.failed} errores / ${result.success} éxitos). Info: ${errStr}`);
        }
        return;
    }

    // CASE B: INVENTORY COUNTS
    // 1. Create a Virtual Session for the payload
    const virtualSession: CountingSession = {
        id: 'BATCH_UPLOAD_' + Date.now(),
        erpOrder: group.erpOrder,
        logisticsLabel: group.logisticsLabels.join(', '),
        createdAt: Date.now(),
        status: 'completed'
    };

    // 2. Send to AppSheet
    await syncToAppSheet(virtualSession);

    // 3. Mark all involved sessions as synced locally
    await db.sessions.where('id').anyOf(group.sessionIds).modify({ lastSyncTimestamp: Date.now() });
};

// ==========================================
// 2. QUEUE PROCESSING (Background Sync)
// ==========================================

export const processSyncQueue = async () => {
    const jobs = await db.syncQueue.where('status').equals('pending').toArray();
    
    for (const job of jobs) { 
        // Exponential Backoff Logic
        if (job.retryCount > 0) {
            const waitTime = Math.min(30000, Math.pow(2, job.retryCount) * 1000);
            if (job.retryCount > 3 && Math.random() > 0.3) continue; 
        }

        try { 
            await syncToAppSheet(job.session); 
            if (job.id) await db.syncQueue.delete(job.id); 
        } catch (e: any) { 
            console.error(`[Queue] Job ${job.id} failed. Retry count: ${job.retryCount + 1}`);
            if (job.id) {
                const nextStatus = job.retryCount >= 10 ? 'failed' : 'pending';
                await db.syncQueue.update(job.id, { 
                    retryCount: job.retryCount + 1, 
                    status: nextStatus,
                    lastError: e.message 
                }); 
            }
        } 
    }
};

// ==========================================
// 3. DOWNLOAD & RESTORE (Cloud -> Local)
// ==========================================

/**
 * Imports Products from AppSheet to Local DB
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

/**
 * Restores Reception Logs (Bitácora)
 */
export const restoreReceptionFromCloud = async (options?: { dateRange?: { start: string, end: string } }): Promise<number> => {
    const rows = await fetchReceptionData(options);
    let restoredCount = 0;

    const existingDrafts = await db.sessions.where('status').equals('draft').toArray();
    const existingMap = new Set(existingDrafts.map(d => d.logisticsLabel));

    for (const row of rows) {
        const cloudId = row["ID_RECEPCION"];
        const label = row["ETIQUETA"];
        const status = row["ESTADO"]; 
        const dateStr = row["FECHA_HORA"];
        const auditStatusRaw = row["ESTADO_AUDITORIA"];

        if (!label) continue;

        const existsById = cloudId ? await db.sessions.get(cloudId) : null;
        
        if (existsById) {
            if (status === 'PROCESADO' && existsById.status === 'draft') {
                await db.sessions.update(existsById.id, { status: 'completed' });
            }
            continue;
        }

        if (existingMap.has(label)) continue; 
        
        const localStatus = status === 'PENDIENTE' ? 'draft' : 'completed';
        
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
            lastSyncTimestamp: Date.now(),
            auditStatus: localAudit
        });
        restoredCount++;
    }
    return restoredCount;
};

/**
 * Restores Inventory Counts (Smart Delta Sync)
 */
export const restoreFromCloud = async (options?: { erpFilter?: string; dateRange?: { start: string, end: string }, skipExisting?: boolean }): Promise<{ sessions: number, items: number }> => {
  const rows = await fetchCloudData(options);
  if (rows.length === 0) return { sessions: 0, items: 0 };

  const allLocalSessions = await db.sessions.toArray();
  const localSessionMap = new Map<string, CountingSession>();
  
  allLocalSessions.forEach(s => {
      localSessionMap.set(generateCompositeKey(s.erpOrder, s.logisticsLabel), s);
  });

  let rowsToProcess = rows;
  if (options?.skipExisting) {
      rowsToProcess = rows.filter(row => {
          const key = generateCompositeKey(row[SHEET_COLUMNS.ERP_ORDER], row[SHEET_COLUMNS.LABEL]);
          return !localSessionMap.has(key);
      });
  }

  if (rowsToProcess.length === 0) return { sessions: 0, items: 0 };

  let sessionsProcessed = 0;
  let itemsRestored = 0;

  // Group Rows by Session
  const sessionsMap = new Map<string, any[]>();
  rowsToProcess.forEach(row => {
    let erp = row[SHEET_COLUMNS.ERP_ORDER];
    let label = row[SHEET_COLUMNS.LABEL];
    const key = generateCompositeKey(erp, label);

    if (normalizeKey(erp).length > 0) {
        if (!sessionsMap.has(key)) sessionsMap.set(key, []);
        sessionsMap.get(key)?.push(row);
    }
  });

  // Process Groups
  for (const [key, sessionRows] of sessionsMap.entries()) {
    const firstRow = sessionRows[0];
    const erp = String(firstRow[SHEET_COLUMNS.ERP_ORDER]).trim();
    const label = String(firstRow[SHEET_COLUMNS.LABEL] || "GENERAL").trim();

    let sessionId: string;
    let isNewSession = false;
    let sessionTotalUnits = 0;
    let sessionTotalSKUs = 0;

    let existingSession = localSessionMap.get(key);

    if (!existingSession) {
        const normErp = normalizeKey(erp);
        const normLabel = normalizeKey(label);
        
        existingSession = allLocalSessions.find(s => 
            normalizeKey(s.erpOrder) === normErp && 
            normalizeKey(s.logisticsLabel) === normLabel
        );
    }

    if (existingSession) {
        sessionId = existingSession.id;
        sessionTotalUnits = existingSession.totalUnits || 0;
        sessionTotalSKUs = existingSession.totalSKUs || 0;
        await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
    } else {
        sessionId = generateUUID();
        isNewSession = true;
        sessionsProcessed++;
    }

    // Calculate Aggregates
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

    // Compare with Local
    const localQtyMap = new Map<string, number>();
    if (!isNewSession) {
        const localScans = await db.scans.where('sessionId').equals(sessionId).toArray();
        localScans.forEach(s => {
            const dateKey = getCompositeKey(s.barcode, s.mm, s.yyyy);
            localQtyMap.set(dateKey, (localQtyMap.get(dateKey) || 0) + s.quantity);
        });
    }

    // Generate Diff
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
            
            sessionTotalUnits += quantityToAdd;
            itemsRestored += quantityToAdd;
        }
    }

    if (isNewSession) {
        sessionTotalSKUs = uniqueSKUsSet.size;
    }

    // Commit
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

// ==========================================
// 4. CENTRAL EXECUTOR (Called by UI)
// ==========================================

export const executeDownload = async (
    type: 'inventory' | 'reception' | 'products',
    dateRange?: { start: string, end: string },
    log?: (msg: string) => void
) => {
    const logger = log || console.log;

    try {
        if (type === 'inventory') {
            logger(`[Inventario] Solicitando datos (${dateRange?.start} - ${dateRange?.end})...`);
            const res = await restoreFromCloud({ 
                dateRange: dateRange, 
                skipExisting: true 
            });
            logger(`[Inventario] Procesamiento finalizado.`);
            return { success: true, message: `Se importaron ${res.sessions} bultos y ${res.items} items.` };
        } 
        
        else if (type === 'reception') {
            logger(`[Bitácora] Solicitando logs (${dateRange?.start} - ${dateRange?.end})...`);
            const count = await restoreReceptionFromCloud({ dateRange });
            logger(`[Bitácora] Finalizado.`);
            return { success: true, message: `${count} registros de recepción importados.` };
        } 
        
        else if (type === 'products') {
            logger(`[Maestro] Solicitando catálogo completo...`);
            const count = await importProductsFromAppSheet();
            logger(`[Maestro] Guardando en base de datos local...`);
            return { success: true, message: `${count} productos actualizados/creados.` };
        }

        return { success: false, message: "Tipo de descarga desconocido." };

    } catch (error: any) {
        logger(`[ERROR] ${error.message}`);
        throw error;
    }
};