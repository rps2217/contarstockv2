
import { db } from '../db';
import { ScanRecord, CountingSession } from '../types';
import { generateUUID, sanitizeBarcode } from './utils';
import { logger } from './logger';
import { validateScanRecord } from './validator';

let scanBuffer: ScanRecord[] = [];
let flushTimer: any = null;
let isFlushing = false;
const MIRROR_KEY = 'logicount_emergency_buffer_v2';

const recoverFromCrash = async () => {
    try {
        const mirrored = localStorage.getItem(MIRROR_KEY);
        if (mirrored) {
            const batch = JSON.parse(mirrored);
            if (Array.isArray(batch) && batch.length > 0) {
                console.warn(`[Blindaje] Rescatando ${batch.length} registros...`);
                await (db as any).transaction('rw', db.scans, db.sessions, async () => {
                    await db.scans.bulkAdd(batch);
                    const sessionIds = Array.from(new Set(batch.map(s => s.sessionId)));
                    for (const id of sessionIds) await recalculateSessionMetadata(id);
                });
                localStorage.removeItem(MIRROR_KEY);
            }
        }
    } catch (e) {
        logger.error("Database", "Fallo en motor de recuperación", e);
    }
};

recoverFromCrash();

const saveMirror = () => {
    try {
        if (scanBuffer.length > 0) localStorage.setItem(MIRROR_KEY, JSON.stringify(scanBuffer));
        else localStorage.removeItem(MIRROR_KEY);
    } catch (e) {}
};

const flushBuffer = async () => {
    if (scanBuffer.length === 0 || isFlushing) return;
    isFlushing = true;
    const batch = [...scanBuffer];
    try {
        await (db as any).transaction('rw', db.scans, db.sessions, async () => {
            await db.scans.bulkAdd(batch);
            const affectedSessions = new Set(batch.map(s => s.sessionId));
            for (const sessionId of affectedSessions) await recalculateSessionMetadata(sessionId);
        });
        scanBuffer = scanBuffer.filter(s => !batch.find(b => b.id === s.id));
        saveMirror();
    } catch (e: any) {
        logger.error("Database", "Error crítico en flush", e);
    } finally {
        isFlushing = false;
        if (scanBuffer.length > 0) {
            if (flushTimer) clearTimeout(flushTimer);
            flushTimer = setTimeout(flushBuffer, 300);
        } else flushTimer = null;
    }
};

export const recalculateSessionMetadata = async (sessionId: string) => {
    const scans = await db.scans.where('sessionId').equals(sessionId).toArray();
    const totalUnits = scans.reduce((acc, s) => acc + s.quantity, 0);
    const totalSKUs = new Set(scans.map(s => s.barcode)).size;
    await db.sessions.update(sessionId, { totalUnits, totalSKUs });
};

export const addScan = async (sessionId: string, barcode: string, quantity: number, mm?: number, yyyy?: number): Promise<ScanRecord> => {
    const validation = validateScanRecord({ sessionId, barcode, quantity, mm, yyyy });
    
    if (!validation.valid) {
        throw new Error(`Escaneo Rechazado: ${validation.error}`);
    }

    const validatedData = validation.data!;
    const record: ScanRecord = {
        id: generateUUID(),
        ...validatedData,
        timestamp: Date.now(),
        synced: 0
    };
    
    scanBuffer.push(record);
    saveMirror();
    
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flushBuffer, 200);
    
    return record;
};

export const undoLastScan = async (sessionId: string): Promise<string | null> => {
    // Primero intentamos borrar del buffer si hay algo
    if (scanBuffer.length > 0) {
        const lastInBuffer = scanBuffer[scanBuffer.length - 1];
        if (lastInBuffer.sessionId === sessionId) {
            const barcode = lastInBuffer.barcode;
            scanBuffer.pop();
            saveMirror();
            return barcode;
        }
    }

    // Si no, buscamos en la DB el registro más reciente de esta sesión
    const lastScan = await db.scans
        .where('sessionId').equals(sessionId)
        .reverse()
        .sortBy('timestamp')
        .then(results => results[0]);

    if (lastScan) {
        const barcode = lastScan.barcode;
        await (db as any).transaction('rw', db.scans, db.sessions, async () => {
            await db.scans.delete(lastScan.id);
            await recalculateSessionMetadata(sessionId);
        });
        return barcode;
    }

    return null;
};

export const createSession = async (erpOrder: string, logisticsLabel: string): Promise<CountingSession> => {
  const activeSessions = await db.sessions.where('status').equals('active').toArray();
  if (activeSessions.length > 0) { 
      await Promise.all(activeSessions.map(s => db.sessions.update(s.id, { status: 'completed' }))); 
  }
  const newSession: CountingSession = { 
      id: generateUUID(), 
      erpOrder: erpOrder.trim(), 
      logisticsLabel: logisticsLabel.trim(), 
      createdAt: Date.now(), 
      status: 'active', 
      totalUnits: 0, 
      totalSKUs: 0 
  };
  await db.sessions.add(newSession); 
  return newSession;
};

export const deleteSession = async (sessionId: string) => { 
    scanBuffer = scanBuffer.filter(s => s.sessionId !== sessionId);
    saveMirror();
    return (db as any).transaction('rw', db.sessions, db.scans, async () => { 
        await db.scans.where('sessionId').equals(sessionId).delete(); 
        await db.sessions.delete(sessionId); 
    });
};

export const updateScanQuantity = async (scanId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    const scan = await db.scans.get(scanId); 
    if (scan) {
        await (db as any).transaction('rw', db.scans, db.sessions, async () => {
            await db.scans.update(scanId, { quantity: newQuantity, synced: 0 }); 
            await recalculateSessionMetadata(scan.sessionId);
        });
    }
};

export const deleteScan = async (scanId: string) => { 
    const scan = await db.scans.get(scanId); 
    if (scan) { 
        await (db as any).transaction('rw', db.scans, db.sessions, async () => {
            await db.scans.delete(scanId); 
            await recalculateSessionMetadata(scan.sessionId);
        });
    } 
};

export const createDraftSession = async (label: string) => {
    const s: CountingSession = { id: generateUUID(), erpOrder: 'PENDIENTE', logisticsLabel: label, createdAt: Date.now(), status: 'draft', totalUnits: 0, totalSKUs: 0 };
    await db.sessions.add(s);
    return s;
};

export const activateDraftSession = async (id: string, erp: string) => {
    await db.sessions.update(id, { erpOrder: erp, status: 'active' });
    return await db.sessions.get(id);
};

export const closeSession = async (id: string) => {
    await flushBuffer();
    await db.sessions.update(id, { status: 'completed' });
};

export const cleanSyncedSessions = async () => {
    const synced = await db.sessions.filter(s => !!s.lastSyncTimestamp).toArray();
    for (const s of synced) {
        await db.scans.where('sessionId').equals(s.id).delete();
        await db.sessions.delete(s.id);
    }
    return synced.length;
};

export const markScansAsSynced = async (ids: string[]) => {
    await db.scans.where('id').anyOf(ids).modify({ synced: 1 });
};

export const markDraftsAsSynced = async (ids: string[]) => {
    await db.sessions.where('id').anyOf(ids).modify({ lastSyncTimestamp: Date.now() });
};

export const updateScanIncident = async (id: string, status: boolean) => {
    await db.scans.update(id, { isIncident: status, synced: 0 });
};

export const deleteSessionItem = async (sessionId: string, barcode: string) => {
    await db.scans.where('[sessionId+barcode]').equals([sessionId, barcode]).delete();
    await recalculateSessionMetadata(sessionId);
};

export const adjustSessionItemQuantity = async (sessionId: string, barcode: string, delta: number) => {
    const last = await db.scans.where('[sessionId+barcode]').equals([sessionId, barcode]).last();
    if (delta > 0) await addScan(sessionId, barcode, delta, last?.mm, last?.yyyy);
    else {
        if (last && last.quantity > Math.abs(delta)) await updateScanQuantity(last.id, last.quantity + delta);
        else if (last) await deleteScan(last.id);
    }
};
