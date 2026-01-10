import { db } from '../db';
import { fetchCloudData, fetchProductsFromCloud, syncToAppSheet, syncReceptionToAppSheet, syncProductsToAppSheet, parseFlexibleDate } from './appsheet';
import { SHEET_COLUMNS } from './constants';
import { CountingSession, Product } from '../types';
import * as sessionService from './sessionService';
import * as productService from './productService';
import { normalizeKey, sanitizeBarcode, generateUUID } from './utils';
import { logger } from './logger';
import { CloudInventoryRowSchema, CloudProductSchema } from './schemas';
import { useSyncStore } from '../store/useSyncStore';

let isSyncingInProgress = false;

export const resetSyncLock = () => {
    isSyncingInProgress = false;
    useSyncStore.getState().setSyncing(false);
};

export interface UploadGroup {
    erpOrder: string;
    sessionCount: number;
    totalUnits: number;
    sessionIds: string[];
    logisticsLabels: string[];
    type: 'inventory' | 'reception' | 'products';
}

export const pullOrderProgress = async (erpOrder: string): Promise<{ added: number, updated: number }> => {
    if (!erpOrder) return { added: 0, updated: 0 };
    const rawRows = await fetchCloudData({ erpFilter: erpOrder });
    if (rawRows.length === 0) return { added: 0, updated: 0 };

    let added = 0;
    let updated = 0;

    for (const row of rawRows) {
        const parsed = CloudInventoryRowSchema.safeParse(row);
        if (!parsed.success) continue;
        
        const cloudData = parsed.data;
        const barcode = sanitizeBarcode(cloudData[SHEET_COLUMNS.BARCODE]);
        const label = cloudData[SHEET_COLUMNS.LABEL] || "GENERAL";
        
        let session = await db.sessions
            .where('erpOrder').equals(erpOrder)
            .and(s => normalizeKey(s.logisticsLabel) === normalizeKey(label))
            .first();
            
        if (!session) {
            const sessionId = generateUUID();
            await db.sessions.add({
                id: sessionId,
                erpOrder,
                logisticsLabel: label,
                createdAt: parseFlexibleDate(cloudData[SHEET_COLUMNS.DATE]),
                status: 'completed',
                totalUnits: 0,
                totalSKUs: 0,
                lastSyncTimestamp: Date.now()
            });
            session = (await db.sessions.get(sessionId))!;
            added++;
        }

        const existingScan = await db.scans.where('[sessionId+barcode]').equals([session.id, barcode]).first();
        if (!existingScan) {
            await db.scans.add({
                id: generateUUID(),
                sessionId: session.id,
                barcode,
                quantity: cloudData[SHEET_COLUMNS.QUANTITY],
                timestamp: parseFlexibleDate(cloudData[SHEET_COLUMNS.DATE]),
                mm: cloudData[SHEET_COLUMNS.MONTH],
                yyyy: cloudData[SHEET_COLUMNS.YEAR],
                synced: 1,
                isIncident: cloudData[SHEET_COLUMNS.INCIDENT] === "FRC"
            });
            updated++;
        }
    }

    const affectedSessions = await db.sessions.where('erpOrder').equals(erpOrder).toArray();
    for (const s of affectedSessions) await sessionService.updateSessionMetadata(s.id);

    return { added, updated };
};

export const getPendingUploadGroups = async (): Promise<UploadGroup[]> => {
    const groups: Record<string, UploadGroup> = {};
    const unsyncedScans = await db.scans.where('synced').equals(0).toArray();
    
    if (unsyncedScans.length > 0) {
        const sessionIds = Array.from(new Set(unsyncedScans.map(s => s.sessionId)));
        const sessions = await db.sessions.where('id').anyOf(sessionIds).toArray();
        // Fix: Explicitly typing the Map to resolve 'unknown' property access errors in the loop below
        const sessionMap = new Map<string, CountingSession>(sessions.map(s => [s.id, s]));

        for (const scan of unsyncedScans) {
            const session = sessionMap.get(scan.sessionId);
            if (!session) continue;
            const erp = session.erpOrder;
            if (!groups[erp]) groups[erp] = { erpOrder: erp, sessionCount: 0, totalUnits: 0, sessionIds: [], logisticsLabels: [], type: 'inventory' };
            groups[erp].totalUnits += scan.quantity;
            if (!groups[erp].sessionIds.includes(session.id)) {
                groups[erp].sessionIds.push(session.id);
                groups[erp].logisticsLabels.push(session.logisticsLabel);
                groups[erp].sessionCount++;
            }
        }
    }
    return Object.values(groups);
};

export const performBatchUpload = async (group: UploadGroup, onProgress?: (msg: string) => void): Promise<void> => {
    if (isSyncingInProgress) return;
    isSyncingInProgress = true;
    useSyncStore.getState().setSyncing(true);

    try {
        for (const sessionId of group.sessionIds) {
            const session = await db.sessions.get(sessionId);
            if (!session) continue;
            await syncToAppSheet(session, onProgress);
            await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
        }
        useSyncStore.getState().setLastSyncTime(Date.now());
    } finally {
        isSyncingInProgress = false;
        useSyncStore.getState().setSyncing(false);
    }
};

export const importProductsFromAppSheet = async (): Promise<number> => {
    const rawRows = await fetchProductsFromCloud();
    if (!rawRows || rawRows.length === 0) return 0;
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
    }
    return validProducts.length;
};