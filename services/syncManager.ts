
import { db } from '../db';
import { fetchCloudData, fetchReceptionData, fetchProductsFromCloud, syncToAppSheet, syncReceptionToAppSheet, SHEET_COLUMNS, parseFlexibleDate } from './appsheet';
import { CountingSession, ScanRecord, Product, ConsolidatedItem } from '../types';
import * as sessionService from './sessionService';
import * as productService from './productService';
import { generateCompositeKey, normalizeKey, sanitizeBarcode, generateUUID } from './utils';
import { logger } from './logger';
import { CloudInventoryRowSchema, CloudProductSchema, CloudReceptionRowSchema } from './schemas';
import { useSyncStore } from '../store/useSyncStore';

export { SYNC_ENGINE_VERSION } from './constants';

const BATCH_SIZE = 50; 
let isSyncingInProgress = false;

export interface UploadGroup {
    erpOrder: string;
    sessionCount: number;
    totalUnits: number;
    sessionIds: string[];
    logisticsLabels: string[];
    type: 'inventory' | 'reception';
}

export const getPendingUploadGroups = async (): Promise<UploadGroup[]> => {
    const groups: Record<string, UploadGroup> = {};
    const unsyncedScans = await db.scans.where('synced').equals(0).toArray();
    
    if (unsyncedScans.length > 0) {
        const sessionIds = Array.from(new Set(unsyncedScans.map(s => s.sessionId)));
        const sessions = await db.sessions.where('id').anyOf(sessionIds).toArray();
        const sessionMap = new Map<string, CountingSession>(sessions.map(s => [s.id, s]));

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

    const pendingDrafts: CountingSession[] = await db.sessions
        .where('status').equals('draft')
        .and(s => !s.lastSyncTimestamp)
        .toArray() as CountingSession[];

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

export const performBatchUpload = async (group: UploadGroup, onProgress?: (msg: string) => void): Promise<void> => {
    if (isSyncingInProgress) return;
    isSyncingInProgress = true;
    useSyncStore.getState().setSyncing(true);

    try {
        if (group.type === 'reception') {
            const drafts = await db.sessions.where('id').anyOf(group.sessionIds).toArray();
            if (drafts.length === 0) return;
            const result = await syncReceptionToAppSheet(drafts);
            if (result.failed > 0) throw new Error(`${result.failed} bultos fallaron.`);
        } else {
            for (const sessionId of group.sessionIds) {
                const session = await db.sessions.get(sessionId);
                if (!session) continue;
                onProgress?.(`Procesando bulto ${session.logisticsLabel}...`);
                await syncToAppSheet(session);
                await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
            }
        }
        useSyncStore.getState().setLastSyncTime(Date.now());
    } finally {
        isSyncingInProgress = false;
        useSyncStore.getState().setSyncing(false);
        const remaining = await getPendingUploadGroups();
        useSyncStore.getState().setPendingItems(remaining.length);
    }
};

export const processSyncQueue = async () => {
    if (isSyncingInProgress || !navigator.onLine) return;
    try {
        const pendingGroups = await getPendingUploadGroups();
        useSyncStore.getState().setPendingItems(pendingGroups.length);
        
        if (pendingGroups.length > 0) {
            for (const group of pendingGroups) {
                try {
                    await performBatchUpload(group);
                } catch (e: any) {
                    logger.warn('AutoSync', `Fallo en ${group.erpOrder}: ${e.message}`);
                }
            }
        }
    } catch (error) {
        console.error("[AutoSync] Error general:", error);
    }
};

export const importProductsFromAppSheet = async (): Promise<number> => {
    logger.info('Sync', 'Iniciando descarga de catálogo maestro...');
    const rawRows = await fetchProductsFromCloud();
    
    if (!rawRows || rawRows.length === 0) {
        logger.warn('Sync', 'La nube devolvió 0 productos.');
        return 0;
    }

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

    if (validProducts.length > 0) {
        await db.products.clear();
        await productService.saveProductBatch(validProducts);
        logger.success('Sync', `Sincronización exitosa: ${validProducts.length} productos.`);
    }
    return validProducts.length;
};

export const restoreFromCloud = async (options?: { erpFilter?: string; dateRange?: { start: string, end: string }, skipExisting?: boolean }): Promise<{ sessions: number, items: number }> => {
  const rawRows = await fetchCloudData(options);
  if (rawRows.length === 0) return { sessions: 0, items: 0 };

  const validRows = rawRows.map(r => CloudInventoryRowSchema.safeParse(r))
                         .filter(p => p.success)
                         .map(p => p.data!);

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
    const erp = firstRow[SHEET_COLUMNS.ERP_ORDER];
    const label = firstRow[SHEET_COLUMNS.LABEL] || "GENERAL";
    
    let localSession = await db.sessions.where('erpOrder').equals(erp)
                               .and(s => normalizeKey(s.logisticsLabel) === normalizeKey(label))
                               .first();
    
    if (options?.skipExisting && localSession) continue;

    const sessionId = localSession ? localSession.id : generateUUID();
    await db.scans.where('sessionId').equals(sessionId).delete();

    const scansToAdd: ScanRecord[] = sessionRows.map(row => ({
        id: generateUUID(),
        sessionId,
        barcode: sanitizeBarcode(row[SHEET_COLUMNS.BARCODE]),
        quantity: row[SHEET_COLUMNS.QUANTITY],
        timestamp: parseFlexibleDate(row[SHEET_COLUMNS.DATE]),
        mm: row[SHEET_COLUMNS.MONTH],
        yyyy: row[SHEET_COLUMNS.YEAR],
        synced: 1, 
        isIncident: row[SHEET_COLUMNS.INCIDENT] === "FRC"
    }));

    if (!localSession) {
        await db.sessions.add({
            id: sessionId,
            erpOrder: erp,
            logisticsLabel: label,
            createdAt: parseFlexibleDate(firstRow[SHEET_COLUMNS.DATE]),
            status: 'completed',
            totalUnits: scansToAdd.reduce((a, b) => a + b.quantity, 0),
            totalSKUs: new Set(scansToAdd.map(s => s.barcode)).size,
            lastSyncTimestamp: Date.now()
        });
        sessionsProcessed++;
    } else {
        await db.sessions.update(sessionId, {
            totalUnits: scansToAdd.reduce((a, b) => a + b.quantity, 0),
            totalSKUs: new Set(scansToAdd.map(s => s.barcode)).size,
            lastSyncTimestamp: Date.now()
        });
    }

    if (scansToAdd.length > 0) await db.scans.bulkAdd(scansToAdd);
    itemsRestored += scansToAdd.length;
  }
  
  return { sessions: sessionsProcessed, items: itemsRestored };
};
