
import { db } from '../db';
import { ScanRecord, CountingSession } from '../types';
import { generateUUID } from './utils';
import { logger } from './logger';

let writeBuffer: ScanRecord[] = [];
let flushTimeout: any = null;
const BUFFER_DELAY_MS = 150;
const RECOVERY_KEY = 'logicount_recovery_v2';

/**
 * Orquestador de Persistencia Atómica
 */
const commitBufferToDatabase = async () => {
    if (writeBuffer.length === 0) return;
    
    const batch = [...writeBuffer];
    writeBuffer = []; // Limpieza inmediata para hilo no bloqueante
    
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
        writeBuffer = [...batch, ...writeBuffer]; // Re-encolar para reintento
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
        timestamp: Date.now() + Math.random(), // Evitar colisiones de timestamp en ráfaga
        synced: 0
    };
    
    writeBuffer.push(newRecord);
    localStorage.setItem(RECOVERY_KEY, JSON.stringify(writeBuffer));
    
    if (flushTimeout) clearTimeout(flushTimeout);
    flushTimeout = setTimeout(commitBufferToDatabase, BUFFER_DELAY_MS);
    
    return newRecord;
};

export const undoLastAction = async (sessionId: string): Promise<string | null> => {
    // 1. Intentar borrar del buffer volátil (más rápido)
    const volatileIdx = [...writeBuffer].reverse().findIndex(s => s.sessionId === sessionId);
    if (volatileIdx !== -1) {
        const actualIdx = writeBuffer.length - 1 - volatileIdx;
        const [removed] = writeBuffer.splice(actualIdx, 1);
        return removed.barcode;
    }

    // 2. Si no está en buffer, borrar de base de datos
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

// --- MÉTODOS DE SOPORTE ---
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

// --- FIX: Missing methods for synchronization, auditing, and fine-grained data control ---

/**
 * Marcar escaneos como sincronizados en la base de datos local
 */
export const markScansAsSynced = async (ids: string[]) => {
    if (ids.length === 0) return;
    await db.scans.where('id').anyOf(ids).modify({ synced: 1 });
};

/**
 * Marcar borradores de recepción como sincronizados
 */
export const markDraftsAsSynced = async (ids: string[]) => {
    if (ids.length === 0) return;
    await db.sessions.where('id').anyOf(ids).modify({ lastSyncTimestamp: Date.now() });
};

/**
 * Actualizar cantidad de un escaneo individual y refrescar metadatos de sesión
 */
export const updateScanQuantity = async (id: string, currentQty: number, delta: number) => {
    const newQty = Math.max(1, currentQty + delta);
    await db.scans.update(id, { quantity: newQty });
    const scan = await db.scans.get(id);
    if (scan) await updateSessionMetadata(scan.sessionId);
};

/**
 * Eliminar un escaneo individual (UI compatible)
 */
export const deleteScan = async (e: any, id: string) => {
    const scan = await db.scans.get(id);
    if (scan) {
        await db.scans.delete(id);
        await updateSessionMetadata(scan.sessionId);
    }
};

/**
 * Alternar bandera de incidencia para un registro de escaneo
 */
export const updateScanIncident = async (e: any, id: string, currentStatus: boolean) => {
    await db.scans.update(id, { isIncident: !currentStatus });
};

/**
 * Ajustar cantidad de un SKU específico dentro de una sesión (modifica el evento más reciente)
 */
export const adjustSessionItemQuantity = async (sessionId: string, barcode: string, delta: number) => {
    const lastScan = await db.scans
        .where('[sessionId+barcode]')
        .equals([sessionId, barcode])
        .reverse()
        .sortBy('timestamp')
        .then(r => r[0]);
    
    if (lastScan) {
        await updateScanQuantity(lastScan.id, lastScan.quantity, delta);
    }
};

/**
 * Eliminar todos los registros de un item (SKU) en una sesión específica
 */
export const deleteSessionItem = async (sessionId: string, barcode: string) => {
    await db.scans.where('[sessionId+barcode]').equals([sessionId, barcode]).delete();
    await updateSessionMetadata(sessionId);
};

/**
 * Purgar de la base de datos local aquellas sesiones que ya cuentan con respaldo en la nube
 */
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

/**
 * Alias para compatibilidad con la herramienta de mantenimiento RecalculateTool
 */
export const recalculateSessionMetadata = updateSessionMetadata;

/**
 * Wrapper simplificado para la creación de escaneos, utilizado principalmente en auditorías y tests
 */
export const addScan = async (sessionId: string, barcode: string, quantity: number) => {
    return addScanEvent(sessionId, barcode, quantity);
};
