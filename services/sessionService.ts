
import { db } from '../db';
import { ScanRecord, CountingSession } from '../types';
import { generateUUID, normalizeKey } from './utils';
import { logger } from './logger';

export { db }; // Exportación para acceso directo desde modales si es necesario

let writeBuffer: ScanRecord[] = [];
let flushTimeout: any = null;
const BUFFER_DELAY_MS = 150;
const RECOVERY_KEY = 'logicount_recovery_v2';

const commitBufferToDatabase = async () => {
    if (writeBuffer.length === 0) return;
    const batch = [...writeBuffer];
    writeBuffer = [];
    try {
        await (db as any).transaction('rw', db.scans, db.sessions, async () => {
            await db.scans.bulkAdd(batch);
            const affectedSessionIds = Array.from(new Set(batch.map(s => s.sessionId)));
            for (const id of affectedSessionIds) {
                await updateSessionMetadata(id);
            }
        });
        localStorage.removeItem(RECOVERY_KEY);
    } catch (error) {
        logger.error("Database", "Error en escritura por lotes", error);
        writeBuffer = [...batch, ...writeBuffer];
    }
};

export const updateSessionMetadata = async (sessionId: string) => {
    const scans = await db.scans.where('sessionId').equals(sessionId).toArray();
    const totalUnits = scans.reduce((acc, s) => acc + s.quantity, 0);
    const totalSKUs = new Set(scans.map(s => s.barcode)).size;
    await db.sessions.update(sessionId, { totalUnits, totalSKUs });
};

/**
 * Verifica si una etiqueta logística ya existe en la base de datos local (activa o draft).
 */
export const checkLabelExists = async (label: string): Promise<boolean> => {
    const cleanLabel = normalizeKey(label);
    const count = await db.sessions.where('logisticsLabel').equals(cleanLabel).count();
    return count > 0;
};

export const addScanEvent = async (sessionId: string, barcode: string, quantity: number, mm?: number, yyyy?: number): Promise<ScanRecord> => {
    const newRecord: ScanRecord = {
        id: generateUUID(),
        sessionId,
        barcode,
        quantity,
        mm,
        yyyy,
        timestamp: Date.now() + Math.random(),
        synced: 0
    };
    writeBuffer.push(newRecord);
    localStorage.setItem(RECOVERY_KEY, JSON.stringify(writeBuffer));
    if (flushTimeout) clearTimeout(flushTimeout);
    flushTimeout = setTimeout(commitBufferToDatabase, BUFFER_DELAY_MS);
    return newRecord;
};

export const undoLastAction = async (sessionId: string): Promise<string | null> => {
    const volatileIdx = [...writeBuffer].reverse().findIndex(s => s.sessionId === sessionId);
    if (volatileIdx !== -1) {
        const actualIdx = writeBuffer.length - 1 - volatileIdx;
        const [removed] = writeBuffer.splice(actualIdx, 1);
        return removed.barcode;
    }
    const lastPersisted = await db.scans.where('sessionId').equals(sessionId).reverse().sortBy('timestamp').then(r => r[0]);
    if (lastPersisted) {
        await (db as any).transaction('rw', db.scans, db.sessions, async () => {
            await db.scans.delete(lastPersisted.id);
            await updateSessionMetadata(sessionId);
        });
        return lastPersisted.barcode;
    }
    return null;
};

export const closeSession = async (id: string) => { await commitBufferToDatabase(); await db.sessions.update(id, { status: 'completed' }); };
export const deleteSession = async (id: string) => { await db.scans.where('sessionId').equals(id).delete(); await db.sessions.delete(id); };
export const createSession = async (erp: string, label: string): Promise<CountingSession> => {
    const s: CountingSession = { id: generateUUID(), erpOrder: erp.trim(), logisticsLabel: label.trim(), createdAt: Date.now(), status: 'active', totalUnits: 0, totalSKUs: 0 };
    await db.sessions.add(s);
    return s;
};
export const createDraftSession = async (label: string) => {
    const s: CountingSession = { id: generateUUID(), erpOrder: 'PENDIENTE', logisticsLabel: label, createdAt: Date.now(), status: 'draft' };
    await db.sessions.add(s);
    return s;
};
export const activateDraftSession = async (id: string, erp: string): Promise<CountingSession> => {
    await db.sessions.update(id, { erpOrder: erp.trim(), status: 'active' });
    return (await db.sessions.get(id))!;
};
export const markScansAsSynced = async (ids: string[]) => { if (ids.length === 0) return; await db.scans.where('id').anyOf(ids).modify({ synced: 1 }); };
export const markDraftsAsSynced = async (ids: string[]) => { if (ids.length === 0) return; await db.sessions.where('id').anyOf(ids).modify({ lastSyncTimestamp: Date.now() }); };
export const updateScanQuantity = async (id: string, currentQty: number, delta: number) => {
    const newQty = Math.max(1, currentQty + delta);
    await db.scans.update(id, { quantity: newQty });
    const scan = await db.scans.get(id);
    if (scan) await updateSessionMetadata(scan.sessionId);
};
export const deleteScan = async (e: any, id: string) => {
    const scan = await db.scans.get(id);
    if (scan) { await db.scans.delete(id); await updateSessionMetadata(scan.sessionId); }
};
export const updateScanIncident = async (e: any, id: string, currentStatus: boolean) => {
    await db.scans.update(id, { isIncident: !currentStatus });
};
export const adjustSessionItemQuantity = async (sessionId: string, barcode: string, delta: number) => {
    const lastScan = await db.scans.where('[sessionId+barcode]').equals([sessionId, barcode]).reverse().sortBy('timestamp').then(r => r[0]);
    if (lastScan) await updateScanQuantity(lastScan.id, lastScan.quantity, delta);
};
export const deleteSessionItem = async (sessionId: string, barcode: string) => {
    await db.scans.where('[sessionId+barcode]').equals([sessionId, barcode]).delete();
    await updateSessionMetadata(sessionId);
};
export const cleanSyncedSessions = async (): Promise<number> => {
    const syncedSessions = await db.sessions.where('lastSyncTimestamp').above(0).toArray();
    const sessionIds = syncedSessions.map(s => s.id);
    if (sessionIds.length === 0) return 0;
    let deletedCount = 0;
    await (db as any).transaction('rw', db.scans, db.sessions, async () => {
        await db.scans.where('sessionId').anyOf(sessionIds).delete();
        deletedCount = await db.sessions.where('id').anyOf(sessionIds).delete();
    });
    return deletedCount;
};
export const recalculateSessionMetadata = updateSessionMetadata;
export const addScan = async (sessionId: string, barcode: string, quantity: number) => {
    return addScanEvent(sessionId, barcode, quantity);
};
