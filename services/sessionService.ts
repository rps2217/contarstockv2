
import { Dexie } from 'dexie';
import { db } from '../db';
import { ScanRecord, CountingSession, ExpectedOrder } from '../types';
import { generateUUID, normalizeKey, sanitizeBarcode } from './utils';
import { logger } from './logger';
import { IntegrityGuard } from './integrityGuard';
// Added missing imports for cloud operations
import { callGas } from './gasService';
import { CloudOrderRowSchema } from './schemas';

let writeBuffer: { record: ScanRecord, retries: number }[] = [];
let flushTimeout: any = null;
const BUFFER_DELAY_MS = 100;

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
    } catch (error: any) {
        logger.error("WRITE_FAIL", error.message);
    }
};

export const updateSessionMetadata = async (sessionId: string) => {
    let totalUnits = 0;
    const uniqueSkus = new Set<string>();
    await db.scans.where('sessionId').equals(sessionId).each(s => {
        totalUnits += s.quantity;
        uniqueSkus.add(s.barcode);
    });
    await db.sessions.update(sessionId, { totalUnits, totalSKUs: uniqueSkus.size });
};

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
        barcode,
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

// Added markScansAsSynced
export const markScansAsSynced = async (ids: string[]) => {
    if (ids.length === 0) return;
    await db.scans.where('id').anyOf(ids).modify({ synced: 1 });
};

export const deleteSessionItemByBatch = async (sessionId: string, barcode: string, batch?: string) => {
    if (batch) {
        await db.scans.where({ sessionId, barcode, batch }).delete();
    } else {
        await db.scans.where({ sessionId, barcode }).delete();
    }
    await updateSessionMetadata(sessionId);
};

// Added deleteSessionItem as requested by ReportDetail
export const deleteSessionItem = async (sessionId: string, barcode: string) => {
    await db.scans.where('[sessionId+barcode]').equals([sessionId, barcode]).delete();
    await updateSessionMetadata(sessionId);
};

// Added adjustSessionItemQuantity for manual adjustments
export const adjustSessionItemQuantity = async (sessionId: string, barcode: string, delta: number) => {
    const lastScan = await db.scans.where('[sessionId+barcode]').equals([sessionId, barcode]).reverse().first();
    if (lastScan) {
        const newQty = Math.max(1, lastScan.quantity + delta);
        await db.scans.update(lastScan.id, { quantity: newQty });
        await updateSessionMetadata(sessionId);
    }
};

export const updateSessionLabel = async (sessionId: string, newLabel: string) => {
    await db.sessions.update(sessionId, { logisticsLabel: newLabel.trim().toUpperCase() });
};

export const createSession = async (erp: string, label: string, type: 'standard' | 'hammer' = 'standard', expected?: any): Promise<CountingSession> => {
    const s: CountingSession = { id: generateUUID(), erpOrder: erp.trim().toUpperCase(), logisticsLabel: label.trim().toUpperCase(), createdAt: Date.now(), status: 'active', sessionType: type, totalUnits: 0, totalSKUs: 0, expectedItems: expected?.items, isVerifiedMode: !!expected };
    await db.sessions.add(s);
    return s;
};

// Added createDraftSession for blind reception
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
    return s;
};

// Added cleanSyncedSessions to purge local history
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

// Added recalculateSessionMetadata alias
export const recalculateSessionMetadata = updateSessionMetadata;

// Added fetchExpectedItemsFromCloud to resolve order details via AI/Cloud
export const fetchExpectedItemsFromCloud = async (erpOrder: string): Promise<ExpectedOrder | null> => {
  try {
    const res = await callGas('fetch_order', { erpOrder });
    if (res.success && res.rows) {
      const items = res.rows.map((row: any) => {
        const parsed = CloudOrderRowSchema.safeParse(row);
        return parsed.success ? {
          barcode: parsed.data.barcode,
          name: parsed.data.name,
          expectedQty: parsed.data.qty
        } : null;
      }).filter((i: any) => i !== null);

      if (items.length === 0) return null;

      return {
        id: generateUUID(),
        internalId: erpOrder,
        items,
        totalExpectedUnits: items.reduce((acc: number, i: any) => acc + i.expectedQty, 0),
        totalExpectedSKUs: items.length,
        importedAt: Date.now()
      };
    }
    return null;
  } catch (err) {
    console.error("fetchExpectedItemsFromCloud error", err);
    return null;
  }
};

export const closeSession = async (id: string) => { await db.sessions.update(id, { status: 'completed' }); };
export const deleteSession = async (id: string) => { await db.scans.where('sessionId').equals(id).delete(); await db.sessions.delete(id); };
export const checkLabelExists = async (label: string): Promise<boolean> => { return (await db.sessions.where('logisticsLabel').equals(label.toUpperCase()).count()) > 0; };
