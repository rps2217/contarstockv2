
import { db } from '../db';
import { fetchCloudData, fetchReceptionData, fetchProductsFromCloud, syncToAppSheet, syncReceptionToAppSheet, SHEET_COLUMNS, parseFlexibleDate } from './appsheet';
import { CountingSession, ScanRecord, Product, ConsolidatedItem } from '../types';
import * as sessionService from './sessionService';
import * as productService from './productService';
import { generateCompositeKey, normalizeKey, sanitizeBarcode, generateUUID } from './utils';
import { logger } from './logger';
import { CloudInventoryRowSchema, CloudProductSchema, CloudReceptionRowSchema } from './schemas';

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

// Global lock to prevent concurrent sync runs
let isSyncingInProgress = false;

// ==========================================
// 1. UPLOAD MANAGEMENT (Local -> Cloud)
// ==========================================

export const getPendingUploadGroups = async (): Promise<UploadGroup[]> => {
    const groups: Record<string, UploadGroup> = {};

    // 1. Detect standard inventory scans (synced = 0)
    // Filter ensures we only process what is NOT in the cloud
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

    // 2. Detect pending Reception Drafts (status = draft & never synced)
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
 * Core logic to upload a group. Used by UI and Auto-sync.
 */
export const performBatchUpload = async (group: UploadGroup): Promise<void> => {
    if (group.type === 'reception') {
        const drafts = await db.sessions.where('id').anyOf(group.sessionIds).toArray();
        if (drafts.length === 0) return;
        const result = await syncReceptionToAppSheet(drafts);
        if (result.failed > 0) {
            const errStr = result.errors.slice(0, 3).join('; ');
            throw new Error(`Fallo parcial: ${result.failed} errores. Info: ${errStr}`);
        }
        return;
    }

    // Process Inventory Groups
    let errorCount = 0;
    for (const sessionId of group.sessionIds) {
        const session = await db.sessions.get(sessionId);
        if (!session) continue;
        
        try {
            // syncToAppSheet now only takes unsynced items (synced=0)
            await syncToAppSheet(session);
            
            // Mark session with timestamp to indicate activity
            await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
        } catch (e: any) {
            logger.error('Sync', `Error subiendo bulto ${session.logisticsLabel}`, e.message);
            errorCount++;
        }
    }

    if (errorCount > 0) {
        throw new Error(`Se completó la subida pero ${errorCount} bultos fallaron.`);
    }
};

// ==========================================
// 2. AUTO-SYNC ENGINE (Background Process)
// ==========================================

export const processSyncQueue = async () => {
    if (isSyncingInProgress || !navigator.onLine) return;

    try {
        isSyncingInProgress = true;
        
        const pendingGroups = await getPendingUploadGroups();
        if (pendingGroups.length > 0) {
            for (const group of pendingGroups) {
                try {
                    await performBatchUpload(group);
                    logger.success('AutoSync', `Bloque [${group.erpOrder}] sincronizado.`);
                } catch (e: any) {
                    logger.warn('AutoSync', `Fallo automático en ${group.erpOrder}: ${e.message}`);
                }
            }
        }

    } catch (error) {
        console.error("[AutoSync] Error general:", error);
    } finally {
        isSyncingInProgress = false;
    }
};

// ==========================================
// 3. DOWNLOAD & RESTORE (Cloud -> Local)
// ==========================================

export const importProductsFromAppSheet = async (): Promise<number> => {
    const rawRows = await fetchProductsFromCloud();
    const validProducts: Product[] = [];
    for (const row of rawRows) {
        const result = CloudProductSchema.safeParse(row);
        if (result.success) {
            const p = result.data;
            validProducts.push({
                barcode: sanitizeBarcode(p.barcode),
                name: p.name,
                category: p.category,
                supplier: p.supplier,
                supplierRut: p.supplierRut,
                syncStatus: 'synced'
            });
        }
    }
    if (validProducts.length > 0) await productService.saveProductBatch(validProducts);
    return validProducts.length;
};

/**
 * Recupera logs de recepción desde AppSheet y los mapea a la cola local.
 */
export const restoreReceptionFromCloud = async (options?: { dateRange?: { start: string, end: string } }): Promise<number> => {
    const rawRows = await fetchReceptionData(options);
    let restoredCount = 0;

    for (const row of rawRows) {
        const result = CloudReceptionRowSchema.safeParse(row);
        if (!result.success) continue;

        const data = result.data;
        const cloudId = data.ID_RECEPCION;
        const label = sanitizeBarcode(data.ETIQUETA);
        const cloudStatus = data.ESTADO; 
        
        if (!label) continue;

        // Mapeo de Auditoría
        let localAudit: 'verified' | 'warning' | 'failed' | 'pending' = 'pending';
        if (data.ESTADO_AUDITORIA === 'VERIFICADO_OK') localAudit = 'verified';
        else if (data.ESTADO_AUDITORIA === 'CON_DIFERENCIAS') localAudit = 'warning';
        else if (data.ESTADO_AUDITORIA === 'RECHAZADO') localAudit = 'failed';

        // 1. Verificar si ya existe
        const existing = await db.sessions.get(cloudId);
        
        if (existing) {
            const newLocalStatus = cloudStatus === 'PROCESADO' ? 'completed' : existing.status;
            await db.sessions.update(cloudId, { 
                status: newLocalStatus,
                auditStatus: localAudit 
            });
            continue; 
        }

        // 2. Crear nuevo registro local
        await db.sessions.add({
            id: cloudId || generateUUID(),
            erpOrder: 'PENDIENTE', 
            logisticsLabel: label,
            createdAt: data.FECHA_HORA ? parseFlexibleDate(data.FECHA_HORA) : Date.now(),
            status: cloudStatus === 'PENDIENTE' ? 'draft' : 'completed',
            totalUnits: 0,
            totalSKUs: 0,
            lastSyncTimestamp: Date.now(), 
            auditStatus: localAudit
        });
        restoredCount++;
    }
    return restoredCount;
};

export const restoreFromCloud = async (options?: { erpFilter?: string; dateRange?: { start: string, end: string }, skipExisting?: boolean }): Promise<{ sessions: number, items: number }> => {
  const rawRows = await fetchCloudData(options);
  if (rawRows.length === 0) return { sessions: 0, items: 0 };

  const validRows = [];
  for (const r of rawRows) {
      const parsed = CloudInventoryRowSchema.safeParse(r);
      if (parsed.success) validRows.push(parsed.data);
  }

  if (validRows.length === 0) return { sessions: 0, items: 0 };

  const sessionsMap = new Map<string, typeof validRows>();
  validRows.forEach(row => {
    const key = generateCompositeKey(row[SHEET_COLUMNS.ERP_ORDER], row[SHEET_COLUMNS.LABEL]);
    if (!sessionsMap.has(key)) sessionsMap.set(key, []);
    sessionsMap.get(key)?.push(row);
  });

  let sessionsProcessed = 0;
  let itemsRestored = 0;

  for (const [key, sessionRows] of sessionsMap.entries()) {
    const firstRow = sessionRows[0];
    const erp = firstRow[SHEET_COLUMNS.ERP_ORDER].trim();
    const label = (firstRow[SHEET_COLUMNS.LABEL] || "GENERAL").trim();
    
    let localSession = await db.sessions.where('erpOrder').equals(erp).and(s => normalizeKey(s.logisticsLabel) === normalizeKey(label)).first();
    
    if (options?.skipExisting && localSession) continue;

    const sessionId = localSession ? localSession.id : generateUUID();
    await db.scans.where('sessionId').equals(sessionId).delete();

    const cloudAggregated = new Map<string, any>();
    for (const row of sessionRows) {
        const barcode = sanitizeBarcode(row[SHEET_COLUMNS.BARCODE]);
        if (!barcode) continue;
        const dateKey = `${barcode}_${Number(row[SHEET_COLUMNS.MONTH]) || 0}_${Number(row[SHEET_COLUMNS.YEAR]) || 0}`;
        if (cloudAggregated.has(dateKey)) {
            cloudAggregated.get(dateKey).qty += row[SHEET_COLUMNS.QUANTITY];
        } else {
            cloudAggregated.set(dateKey, { 
                qty: row[SHEET_COLUMNS.QUANTITY], 
                name: row[SHEET_COLUMNS.PRODUCT_NAME], 
                mm: row[SHEET_COLUMNS.MONTH], 
                yyyy: row[SHEET_COLUMNS.YEAR],
                incident: row[SHEET_COLUMNS.INCIDENT] === "FRC"
            });
        }
    }

    const scansToAdd: ScanRecord[] = [];
    for (const [dateKey, data] of cloudAggregated.entries()) {
        const [barcode] = dateKey.split('_');
        scansToAdd.push({
            id: generateUUID(),
            sessionId,
            barcode,
            quantity: data.qty,
            timestamp: Date.now(),
            mm: data.mm,
            yyyy: data.yyyy,
            synced: 1, 
            isIncident: data.incident
        });
        itemsRestored += data.qty;
    }

    if (!localSession) {
        await db.sessions.add({
            id: sessionId,
            erpOrder: erp,
            logisticsLabel: label,
            createdAt: parseFlexibleDate(firstRow[SHEET_COLUMNS.DATE]),
            status: 'completed',
            totalUnits: sessionRows.reduce((a, b) => a + b[SHEET_COLUMNS.QUANTITY], 0),
            totalSKUs: cloudAggregated.size,
            lastSyncTimestamp: Date.now()
        });
        sessionsProcessed++;
    } else {
        await db.sessions.update(sessionId, {
            totalUnits: sessionRows.reduce((a, b) => a + b[SHEET_COLUMNS.QUANTITY], 0),
            totalSKUs: cloudAggregated.size,
            lastSyncTimestamp: Date.now()
        });
    }

    if (scansToAdd.length > 0) await db.scans.bulkAdd(scansToAdd);
  }
  return { sessions: sessionsProcessed, items: itemsRestored };
};

export const executeDownload = async (
    type: 'inventory' | 'reception' | 'products',
    dateRange?: { start: string, end: string },
    log?: (msg: string) => void
) => {
    const loggerFunc = log || console.log;
    try {
        if (type === 'inventory') {
            loggerFunc(`[Inventario] Sincronizando datos de bultos...`);
            const res = await restoreFromCloud({ dateRange, skipExisting: false });
            return { success: true, message: `Procesados ${res.sessions} bultos y ${res.items} items.` };
        } 
        else if (type === 'reception') {
            loggerFunc(`[Recepción] Actualizando bitácora...`);
            const count = await restoreReceptionFromCloud({ dateRange });
            return { success: true, message: `${count} bultos nuevos agregados.` };
        } 
        else if (type === 'products') {
            const count = await importProductsFromAppSheet();
            return { success: true, message: `${count} productos actualizados.` };
        }
        return { success: false, message: "Tipo desconocido." };
    } catch (error: any) {
        loggerFunc(`[ERROR] ${error.message}`);
        throw error;
    }
};
