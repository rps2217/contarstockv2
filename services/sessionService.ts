
import { db } from '../db';
import { ScanRecord, CountingSession } from '../types';
import { generateUUID, sanitizeBarcode } from './utils';
import { logger } from './logger';

// ==========================================
// WRITE BUFFER OPTIMIZATION (ACID + MIRRORING)
// ==========================================

let scanBuffer: ScanRecord[] = [];
let flushTimer: any = null;
let isFlushing = false;
const MIRROR_KEY = 'logicount_emergency_buffer';

// --- BLACK BOX RECOVERY ---
(async () => {
    try {
        const mirrored = localStorage.getItem(MIRROR_KEY);
        if (mirrored) {
            const parsed = JSON.parse(mirrored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                console.warn(`[Recovery] Black Box: Recuperando ${parsed.length} registros no salvos...`);
                scanBuffer = [...scanBuffer, ...parsed];
                localStorage.removeItem(MIRROR_KEY);
                flushBuffer();
            }
        }
    } catch (e) {
        console.error("[Recovery] Error accediendo a Black Box", e);
    }
})();

const saveMirror = () => {
    try {
        if (scanBuffer.length > 0) {
            // Solo guardamos los últimos 500 para no exceder cuota de LS
            const slice = scanBuffer.slice(-500);
            localStorage.setItem(MIRROR_KEY, JSON.stringify(slice));
        } else {
            localStorage.removeItem(MIRROR_KEY);
        }
    } catch (e) {
        console.warn("Mirror save failed", e);
    }
};

const flushBuffer = async () => {
    if (scanBuffer.length === 0 || isFlushing) return;
    isFlushing = true;
    
    // Snapshot del batch actual
    const batch = [...scanBuffer];
    
    try {
        await (db as any).transaction('rw', db.scans, db.sessions, async () => {
            await db.scans.bulkAdd(batch);
            
            // Actualización atómica de contadores de cabecera
            const affectedSessions = new Set(batch.map(s => s.sessionId));
            for (const sessionId of affectedSessions) {
                const allScans = await db.scans.where('sessionId').equals(sessionId).toArray();
                const totalUnits = allScans.reduce((acc, s) => acc + s.quantity, 0);
                const uniqueSkus = new Set(allScans.map(s => s.barcode)).size;
                
                await db.sessions.update(sessionId, { 
                    totalUnits, 
                    totalSKUs: uniqueSkus 
                });
            }
        });

        // Limpiar solo lo que acabamos de escribir con éxito
        const writtenIds = new Set(batch.map(s => s.id));
        scanBuffer = scanBuffer.filter(s => !writtenIds.has(s.id));
        saveMirror();

    } catch (e: any) {
        logger.error("Buffer", "Fallo de transacción - Reintentando en siguiente ciclo", e);
    } finally {
        isFlushing = false;
        if (scanBuffer.length > 0) {
            if (flushTimer) clearTimeout(flushTimer);
            flushTimer = setTimeout(flushBuffer, 1000);
        } else {
            flushTimer = null;
        }
    }
};

// ==========================================
// SESSION & ITEM MANAGEMENT
// ==========================================

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

export const addScan = async (
    sessionId: string, 
    barcode: string, 
    quantity: number, 
    mm?: number, 
    yyyy?: number
): Promise<ScanRecord> => {
    const cleanCode = sanitizeBarcode(barcode);
    const record: ScanRecord = {
        id: generateUUID(),
        sessionId,
        barcode: cleanCode,
        quantity,
        timestamp: Date.now(),
        mm,
        yyyy,
        synced: 0
    };

    scanBuffer.push(record);
    saveMirror();

    // Flush dinámico basado en volumen
    if (scanBuffer.length >= 20) {
        flushBuffer();
    } else if (!flushTimer) {
        flushTimer = setTimeout(flushBuffer, 800);
    }
    
    return record;
};

export const deleteSession = async (sessionId: string) => { 
    // CRITICAL: Asegurar que el buffer no tenga nada de esta sesión
    scanBuffer = scanBuffer.filter(s => s.sessionId !== sessionId);
    saveMirror();

    return (db as any).transaction('rw', db.sessions, db.scans, async () => { 
        await db.scans.where('sessionId').equals(sessionId).delete(); 
        await db.sessions.delete(sessionId); 
    });
};

export const updateScanQuantity = async (scanId: string, newQuantity: number) => {
    const scan = await db.scans.get(scanId); 
    if (scan) {
        await (db as any).transaction('rw', db.scans, db.sessions, async () => {
            await db.scans.update(scanId, { quantity: newQuantity, synced: 0 }); 
            const scans = await db.scans.where('sessionId').equals(scan.sessionId).toArray();
            const totalUnits = scans.reduce((acc, s) => acc + s.quantity, 0);
            await db.sessions.update(scan.sessionId, { totalUnits });
        });
    }
};

export const deleteScan = async (scanId: string) => { 
    const scan = await db.scans.get(scanId); 
    if (scan) { 
        await (db as any).transaction('rw', db.scans, db.sessions, async () => {
            await db.scans.delete(scanId); 
            const scans = await db.scans.where('sessionId').equals(scan.sessionId).toArray();
            const totalUnits = scans.reduce((acc, s) => acc + s.quantity, 0);
            const uniqueSkus = new Set(scans.map(s => s.barcode)).size;
            await db.sessions.update(scan.sessionId, { totalUnits, totalSKUs: uniqueSkus });
        });
    } 
};

// Exportar funciones adicionales necesarias
export const createDraftSession = async (label: string) => {
    const session: CountingSession = {
        id: generateUUID(),
        erpOrder: 'PENDIENTE',
        logisticsLabel: label,
        createdAt: Date.now(),
        status: 'draft',
        totalUnits: 0,
        totalSKUs: 0
    };
    await db.sessions.add(session);
    return session;
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
    const scans = await db.scans.where('sessionId').equals(sessionId).toArray();
    await db.sessions.update(sessionId, { 
        totalUnits: scans.reduce((a, b) => a + b.quantity, 0),
        totalSKUs: new Set(scans.map(s => s.barcode)).size
    });
};

export const adjustSessionItemQuantity = async (sessionId: string, barcode: string, delta: number) => {
    const last = await db.scans.where('[sessionId+barcode]').equals([sessionId, barcode]).last();
    if (delta > 0) {
        await addScan(sessionId, barcode, delta, last?.mm, last?.yyyy);
    } else {
        // Lógica de sustracción simple para el registro más reciente
        if (last && last.quantity > Math.abs(delta)) {
            await updateScanQuantity(last.id, last.quantity + delta);
        } else if (last) {
            await deleteScan(last.id);
        }
    }
};
