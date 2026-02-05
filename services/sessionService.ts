import { Dexie } from 'dexie';
import { db } from '../db';
import { ScanRecord, CountingSession, ExpectedOrder } from '../types';
import { generateUUID, normalizeKey, sanitizeBarcode } from './utils';
import { logger } from './logger';
import { IntegrityGuard } from './integrityGuard';
import { callGas } from './gasService';
import { CloudOrderRowSchema } from './schemas';

let writeBuffer: { record: ScanRecord, retries: number }[] = [];
let flushTimeout: any = null;
const BUFFER_DELAY_MS = 100;

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
        await db.scans.bulkAdd(recordsToSave);
        const affectedIds = Array.from(new Set(recordsToSave.map(s => s.sessionId)));
        for (const id of affectedIds) {
            await updateSessionMetadata(id);
        }
        triggerBackgroundSync();
    } catch (error: any) {
        logger.error("WRITE_FAIL", error.message);
    }
};

export const updateSessionMetadata = async (sessionId: string) => {
    const scans = await db.scans.where('sessionId').equals(sessionId).toArray();
    let totalUnits = 0;
    const uniqueSkus = new Set<string>();
    
    scans.forEach(s => {
        totalUnits += s.quantity;
        uniqueSkus.add(s.barcode);
    });
    
    await db.sessions.update(sessionId, { 
        totalUnits, 
        totalSKUs: uniqueSkus.size,
        status: 'active'
    });
};

export const recalculateSessionMetadata = updateSessionMetadata;

export const addScanEvent = async (
    sessionId: string, 
    barcode: string, 
    quantity: number, 
    mm?: number, 
    yyyy?: number,
    location?: string,
    batch?: string
): Promise<ScanRecord> => {
    const session = await db.sessions.get(sessionId);
    const newRecord: ScanRecord = {
        id: generateUUID(),
        sessionId,
        barcode: sanitizeBarcode(barcode),
        quantity,
        batch,
        logisticsLabel: session?.logisticsLabel || 'DESCONOCIDO',
        mm,
        yyyy,
        location,
        timestamp: Date.now(),
        synced: 0
    };
    writeBuffer.push({ record: newRecord, retries: 0 });
    if (flushTimeout) clearTimeout(flushTimeout);
    flushTimeout = setTimeout(commitBufferToDatabase, BUFFER_DELAY_MS);
    return newRecord;
};

export const createSession = async (erp: string, label: string, type: 'standard' | 'hammer' = 'standard', expected?: any): Promise<CountingSession> => {
    const s: CountingSession = { 
        id: generateUUID(), 
        erpOrder: erp.trim().toUpperCase(), 
        logisticsLabel: label.trim().toUpperCase(), 
        createdAt: Date.now(), 
        status: 'active', 
        sessionType: type, 
        totalUnits: 0, 
        totalSKUs: 0, 
        expectedItems: expected?.items || [], 
        isVerifiedMode: !!(expected && expected.items && expected.items.length > 0) 
    };
    await db.sessions.add(s);
    return s;
};

// Added createDraftSession function to fix property missing error in Reception view and hook
export const createDraftSession = async (label: string): Promise<CountingSession> => {
    const s: CountingSession = { 
        id: generateUUID(), 
        erpOrder: 'RECEPCION_BORRADOR', 
        logisticsLabel: label.trim().toUpperCase(), 
        createdAt: Date.now(), 
        status: 'draft', 
        sessionType: 'standard',
        totalUnits: 0, 
        totalSKUs: 0,
        expectedItems: [],
        isVerifiedMode: false
    };
    await db.sessions.add(s);
    triggerBackgroundSync();
    return s;
};

/**
 * DESCARGA MASIVA DE PEDIDOS
 * Almacena todos los pedidos en la tabla local expectedOrders para el motor detective.
 */
export const fetchAllOrdersFromCloud = async (): Promise<number> => {
    try {
        const res = await callGas('fetch_rows', { tableName: 'PEDIDOS' });
        if (res.success && res.rows) {
            const groups = new Map<string, ExpectedOrder>();
            
            res.rows.forEach((row: any) => {
                const parsed = CloudOrderRowSchema.safeParse(row);
                if (parsed.success) {
                    const { erp, barcode, name, qty } = parsed.data;
                    if (!groups.has(erp)) {
                        groups.set(erp, {
                            id: generateUUID(),
                            internalId: erp,
                            items: [],
                            totalExpectedUnits: 0,
                            totalExpectedSKUs: 0,
                            importedAt: Date.now()
                        });
                    }
                    const group = groups.get(erp)!;
                    group.items.push({ barcode, name, expectedQty: qty });
                    group.totalExpectedUnits += qty;
                    group.totalExpectedSKUs++;
                }
            });

            await db.expectedOrders.clear();
            await db.expectedOrders.bulkAdd(Array.from(groups.values()));
            return groups.size;
        }
        return 0;
    } catch (err) {
        logger.error("FETCH_ALL_ORDERS_ERROR", err);
        return 0;
    }
};

export const fetchExpectedItemsFromCloud = async (erpOrder: string): Promise<ExpectedOrder | null> => {
  try {
    const cleanErp = erpOrder.trim().toUpperCase();
    const res = await callGas('fetch_order', { erpOrder: cleanErp });
    
    if (res.success && res.rows && res.rows.length > 0) {
      const items = res.rows.map((row: any) => {
        const parsed = CloudOrderRowSchema.safeParse(row);
        if (!parsed.success) return null;
        return {
          barcode: parsed.data.barcode,
          name: parsed.data.name,
          expectedQty: parsed.data.qty
        };
      }).filter((i: any) => i !== null);

      if (items.length === 0) return null;

      return {
        id: generateUUID(),
        internalId: cleanErp,
        items,
        totalExpectedUnits: items.reduce((acc: number, i: any) => acc + i.expectedQty, 0),
        totalExpectedSKUs: items.length,
        importedAt: Date.now()
      };
    }
    return null;
  } catch (err) {
    return null;
  }
};

export const closeSession = async (id: string) => { 
    await commitBufferToDatabase();
    await db.sessions.update(id, { status: 'completed' }); 
    triggerBackgroundSync();
};

export const deleteSession = async (id: string) => { 
    await db.scans.where('sessionId').equals(id).delete(); 
    await db.sessions.delete(id); 
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

export const checkLabelExists = async (label: string): Promise<boolean> => {
    const count = await db.sessions.where('logisticsLabel').equals(label.trim().toUpperCase()).count();
    return count > 0;
};

export const markScansAsSynced = async (ids: string[]) => {
    if (ids.length === 0) return;
    await db.scans.where('id').anyOf(ids).modify({ synced: 1 });
};

export const updateSessionLabel = async (sessionId: string, newLabel: string) => {
    const cleanLabel = newLabel.trim().toUpperCase();
    await db.sessions.update(sessionId, { logisticsLabel: cleanLabel });
    await db.scans.where('sessionId').equals(sessionId).modify({ logisticsLabel: cleanLabel });
};

export const adjustSessionItemQuantity = async (sessionId: string, barcode: string, delta: number) => {
    const lastScan = await db.scans.where('[sessionId+barcode]').equals([sessionId, barcode]).reverse().first();
    if (lastScan) {
        const newQty = Math.max(1, lastScan.quantity + delta);
        await db.scans.update(lastScan.id, { quantity: newQty });
        await updateSessionMetadata(sessionId);
    }
};

export const deleteSessionItem = async (sessionId: string, barcode: string) => {
    await db.scans.where('[sessionId+barcode]').equals([sessionId, barcode]).delete();
    await updateSessionMetadata(sessionId);
};

export const deleteSessionItemByBatch = async (sessionId: string, barcode: string, batch?: string) => {
    const query = db.scans.where('[sessionId+barcode]').equals([sessionId, barcode]);
    if (batch) {
        await query.filter(s => s.batch === batch).delete();
    } else {
        await query.delete();
    }
    await updateSessionMetadata(sessionId);
};
