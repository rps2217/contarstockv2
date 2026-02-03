
import { Dexie } from 'dexie';
import { db } from '../db';
import { ScanRecord, CountingSession, ExpectedOrder } from '../types';
import { generateUUID, normalizeKey, sanitizeBarcode } from './utils';
import { logger } from './logger';
import { IntegrityGuard } from './integrityGuard';
import { fetchFromGas } from './gasService';
import { CloudOrderRowSchema } from './schemas';
import { getSettings } from './settings';

let writeBuffer: { record: ScanRecord, retries: number }[] = [];
let flushTimeout: any = null;
const BUFFER_DELAY_MS = 100;
const MAX_RETRIES = 3;

const triggerBackgroundSync = async () => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await (registration as any).sync.register('sync-bultos');
        } catch (e) {}
    }
};

const commitBufferToDatabase = async () => {
    if (writeBuffer.length === 0) return;
    const currentBatch = [...writeBuffer];
    writeBuffer = [];
    const recordsToSave = currentBatch.map(item => item.record);
    try {
        recordsToSave.forEach(scan => IntegrityGuard.validateScan(scan));
        await (db as any).transaction('rw', db.scans, db.sessions, async () => {
            await db.scans.bulkAdd(recordsToSave);
            const affectedIds = Array.from(new Set(recordsToSave.map(s => s.sessionId)));
            for (const id of affectedIds) {
                await updateSessionMetadata(id);
            }
        });
        triggerBackgroundSync();
    } catch (error: any) {
        logger.error("WRITE_FAIL", "Fallo de escritura en lote", error.message);
        const retryableItems = currentBatch
            .map(item => ({ ...item, retries: item.retries + 1 }))
            .filter(item => item.retries < MAX_RETRIES);
        if (retryableItems.length > 0) {
            writeBuffer = [...retryableItems, ...writeBuffer];
            if (!flushTimeout) flushTimeout = setTimeout(commitBufferToDatabase, BUFFER_DELAY_MS * 2);
        }
    }
};

export const updateSessionMetadata = async (sessionId: string) => {
    let totalUnits = 0;
    const uniqueSkus = new Set<string>();
    await db.scans.where('sessionId').equals(sessionId).each(s => {
        totalUnits += s.quantity;
        uniqueSkus.add(s.barcode);
    });
    await db.sessions.update(sessionId, { 
        totalUnits, 
        totalSKUs: uniqueSkus.size 
    });
};

export const fetchExpectedItemsFromCloud = async (erpOrder: string): Promise<ExpectedOrder | null> => {
    const config = getSettings().appSheetConfig;
    const tableName = config?.ordersTableName || "PEDIDOS";
    
    try {
        const rawRows = await fetchFromGas(tableName);
        const erpClean = erpOrder.trim().toUpperCase();

        const items = rawRows
            .map(row => {
                const result = CloudOrderRowSchema.safeParse(row);
                return result.success ? result.data : null;
            })
            .filter(item => item !== null && item.erp.toUpperCase() === erpClean)
            .map(item => ({
                barcode: sanitizeBarcode(item!.barcode),
                name: item!.name,
                expectedQty: item!.qty
            }));
            
        if (items.length === 0) return null;

        return {
            id: generateUUID(),
            internalId: erpClean,
            items: items,
            totalExpectedUnits: items.reduce((a, b) => a + b.expectedQty, 0),
            totalExpectedSKUs: items.length,
            importedAt: Date.now()
        };
    } catch (e: any) {
        logger.error('CLOUD_FETCH_ORDERS_FAIL', e.message);
        throw e;
    }
};

export const addScanEvent = async (
    sessionId: string, 
    barcode: string, 
    quantity: number, 
    mm?: number, 
    yyyy?: number,
    location?: string
): Promise<ScanRecord> => {
    const operatorId = localStorage.getItem('logicount_operator_id') || 'SISTEMA_LOCAL';
    
    // Obtenemos el bulto activo de la sesión
    const session = await db.sessions.get(sessionId);
    const logisticsLabel = session?.logisticsLabel || 'DESCONOCIDO';

    const newRecord: ScanRecord = {
        id: generateUUID(),
        sessionId,
        barcode,
        quantity,
        logisticsLabel, // Ahora cada pick guarda a qué bulto pertenece
        mm,
        yyyy,
        location,
        operatorId,
        timestamp: Date.now(),
        synced: 0
    };
    
    IntegrityGuard.validateScan(newRecord);
    writeBuffer.push({ record: newRecord, retries: 0 });
    if (flushTimeout) clearTimeout(flushTimeout);
    flushTimeout = setTimeout(commitBufferToDatabase, BUFFER_DELAY_MS);
    return newRecord;
};

export const updateSessionLabel = async (sessionId: string, newLabel: string) => {
    await db.sessions.update(sessionId, { logisticsLabel: newLabel.trim().toUpperCase() });
};

export const checkLabelExists = async (label: string): Promise<boolean> => {
    const count = await db.sessions.where('logisticsLabel').equals(normalizeKey(label)).count();
    return count > 0;
};

export const createSession = async (
    erp: string, 
    label: string, 
    type: 'standard' | 'hammer' = 'standard',
    expectedItems?: ExpectedOrder
): Promise<CountingSession> => {
    const s: CountingSession = { 
        id: generateUUID(), 
        erpOrder: erp.trim().toUpperCase(), 
        logisticsLabel: label.trim().toUpperCase(), 
        createdAt: Date.now(), 
        status: 'active', 
        sessionType: type,
        totalUnits: 0, 
        totalSKUs: 0,
        isVerifiedMode: !!expectedItems,
        expectedItems: expectedItems?.items
    };
    await db.sessions.add(s);
    return s;
};

export const createDraftSession = async (label: string): Promise<CountingSession> => {
    const s: CountingSession = { 
        id: generateUUID(), 
        erpOrder: 'RECEPCION_BORRADOR', 
        logisticsLabel: label.trim().toUpperCase(), 
        createdAt: Date.now(), 
        status: 'draft', 
        sessionType: 'standard',
        totalUnits: 0, 
        totalSKUs: 0 
    };
    await db.sessions.add(s);
    triggerBackgroundSync();
    return s;
};

export const deleteSession = async (id: string) => { 
    await db.scans.where('sessionId').equals(id).delete(); 
    await db.sessions.delete(id); 
};

export const closeSession = async (id: string) => { 
    if (flushTimeout) {
        clearTimeout(flushTimeout);
        await commitBufferToDatabase();
    }
    await db.sessions.update(id, { status: 'completed' });
    triggerBackgroundSync();
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

export const markScansAsSynced = async (ids: string[]) => {
    if (ids.length === 0) return;
    await db.scans.where('id').anyOf(ids).modify({ synced: 1 });
};

export const recalculateSessionMetadata = updateSessionMetadata;

export const adjustSessionItemQuantity = async (sessionId: string, barcode: string, delta: number) => {
    const lastScan = await db.scans.where('[sessionId+barcode]').equals([sessionId, barcode]).reverse().first();
    if (lastScan) {
        const newQty = Math.max(1, lastScan.quantity + delta);
        await db.scans.update(lastScan.id, { quantity: newQty });
        await updateSessionMetadata(sessionId);
        triggerBackgroundSync();
    }
};

export const updateScanQuantity = async (id: string, currentQty: number, delta: number) => {
    const scan = await db.scans.get(id);
    if (scan) {
        const newQty = Math.max(1, currentQty + delta);
        await db.scans.update(id, { quantity: newQty });
        await updateSessionMetadata(scan.sessionId);
        triggerBackgroundSync();
    }
};

export const updateScanIncident = async (e: any, id: string, currentStatus: boolean) => {
    const scan = await db.scans.get(id);
    if (scan) {
        await db.scans.update(id, { isIncident: !currentStatus });
        triggerBackgroundSync();
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
    const bufferIdx = writeBuffer.findIndex(item => item.record.sessionId === sessionId);
    if (bufferIdx !== -1) {
        for (let i = writeBuffer.length - 1; i >= 0; i--) {
            if (writeBuffer[i].record.sessionId === sessionId) {
                const [removed] = writeBuffer.splice(i, 1);
                return removed.record.barcode;
            }
        }
    }
    const lastPersisted = await db.scans
        .where('[sessionId+timestamp]')
        .between([sessionId, Dexie.minKey], [sessionId, Dexie.maxKey])
        .reverse()
        .first();
    if (lastPersisted) {
        await db.scans.delete(lastPersisted.id);
        await updateSessionMetadata(sessionId);
        return lastPersisted.barcode;
    }
    return null;
};
