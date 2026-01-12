
import { db } from '../db';
import { ScanRecord, CountingSession } from '../types';
import { generateUUID, normalizeKey } from './utils';
import { logger } from './logger';
import { IntegrityGuard } from './integrityGuard';

let writeBuffer: ScanRecord[] = [];
let flushTimeout: any = null;
const BUFFER_DELAY_MS = 100;

/**
 * Persistencia Blindada: Valida integridad antes del commit.
 */
const commitBufferToDatabase = async () => {
    if (writeBuffer.length === 0) return;
    const batch = [...writeBuffer];
    writeBuffer = [];
    
    try {
        // Validación preventiva de todo el lote
        batch.forEach(scan => IntegrityGuard.validateScan(scan));

        await (db as any).transaction('rw', db.scans, db.sessions, async () => {
            await db.scans.bulkAdd(batch);
            const affectedIds = Array.from(new Set(batch.map(s => s.sessionId)));
            for (const id of affectedIds) {
                await updateSessionMetadata(id);
            }
        });
    } catch (error: any) {
        logger.error("CRITICAL_RECOVERY", "Fallo de integridad en escritura", error.message);
        // Si falla, devolvemos al buffer para no perder datos, pero alertamos
        writeBuffer = [...batch, ...writeBuffer];
    }
};

export const updateSessionMetadata = async (sessionId: string) => {
    const scans = await db.scans.where('sessionId').equals(sessionId).toArray();
    const totalUnits = scans.reduce((acc, s) => acc + s.quantity, 0);
    const totalSKUs = new Set(scans.map(s => s.barcode)).size;
    await db.sessions.update(sessionId, { totalUnits, totalSKUs });
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

    // Validación inmediata antes de entrar al buffer
    IntegrityGuard.validateScan(newRecord);

    writeBuffer.push(newRecord);
    if (flushTimeout) clearTimeout(flushTimeout);
    flushTimeout = setTimeout(commitBufferToDatabase, BUFFER_DELAY_MS);
    return newRecord;
};

export const checkLabelExists = async (label: string): Promise<boolean> => {
    const count = await db.sessions.where('logisticsLabel').equals(normalizeKey(label)).count();
    return count > 0;
};

export const createSession = async (erp: string, label: string): Promise<CountingSession> => {
    const s: CountingSession = { 
        id: generateUUID(), 
        erpOrder: erp.trim(), 
        logisticsLabel: label.trim(), 
        createdAt: Date.now(), 
        status: 'active', 
        totalUnits: 0, 
        totalSKUs: 0 
    };
    await db.sessions.add(s);
    return s;
};

// --- FIX: Added missing createDraftSession for high-speed reception mode ---
export const createDraftSession = async (label: string): Promise<CountingSession> => {
    const s: CountingSession = { 
        id: generateUUID(), 
        erpOrder: 'RECEPCION_BORRADOR', 
        logisticsLabel: label.trim(), 
        createdAt: Date.now(), 
        status: 'draft', 
        totalUnits: 0, 
        totalSKUs: 0 
    };
    await db.sessions.add(s);
    return s;
};

export const deleteSession = async (id: string) => { 
    await db.scans.where('sessionId').equals(id).delete(); 
    await db.sessions.delete(id); 
};

export const closeSession = async (id: string) => { 
    await commitBufferToDatabase(); 
    await db.sessions.update(id, { status: 'completed' }); 
};

export const cleanSyncedSessions = async (): Promise<number> => {
    const synced = await db.sessions.where('lastSyncTimestamp').above(0).toArray();
    const ids = synced.map(s => s.id);
    if (ids.length === 0) return 0;
    await (db as any).transaction('rw', db.scans, db.sessions, async () => {
        await db.scans.where('sessionId').anyOf(ids).delete();
        await db.sessions.where('id').anyOf(ids).delete();
    });
    return ids.length;
};

// --- FIX: Added missing markScansAsSynced for cloud synchronization tracking ---
export const markScansAsSynced = async (ids: string[]) => {
    if (ids.length === 0) return;
    await db.scans.where('id').anyOf(ids).modify({ synced: 1 });
};

export const recalculateSessionMetadata = updateSessionMetadata;
export const adjustSessionItemQuantity = async (sessionId: string, barcode: string, delta: number) => {
    const lastScan = await db.scans.where('[sessionId+barcode]').equals([sessionId, barcode]).reverse().sortBy('timestamp').then(r => r[0]);
    if (lastScan) {
        const newQty = Math.max(1, lastScan.quantity + delta);
        await db.scans.update(lastScan.id, { quantity: newQty });
        await updateSessionMetadata(sessionId);
    }
};

// --- FIX: Added missing updateScanQuantity for real-time scanner adjustments ---
export const updateScanQuantity = async (id: string, currentQty: number, delta: number) => {
    const scan = await db.scans.get(id);
    if (scan) {
        const newQty = Math.max(1, currentQty + delta);
        await db.scans.update(id, { quantity: newQty });
        await updateSessionMetadata(scan.sessionId);
    }
};

// --- FIX: Added missing updateScanIncident for FRC (Falla Real de Conteo) flagging ---
export const updateScanIncident = async (e: any, id: string, currentStatus: boolean) => {
    const scan = await db.scans.get(id);
    if (scan) {
        await db.scans.update(id, { isIncident: !currentStatus });
    }
};

export const deleteSessionItem = async (sessionId: string, barcode: string) => {
    await db.scans.where('[sessionId+barcode]').equals([sessionId, barcode]).delete();
    await updateSessionMetadata(sessionId);
};

export const deleteScan = async (e: any, id: string) => {
    const scan = await db.scans.get(id);
    if (scan) { 
        await db.scans.delete(id); 
        await updateSessionMetadata(scan.sessionId); 
    }
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
        await db.scans.delete(lastPersisted.id);
        await updateSessionMetadata(sessionId);
        return lastPersisted.barcode;
    }
    return null;
};
