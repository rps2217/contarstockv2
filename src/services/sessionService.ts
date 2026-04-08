

import { Dexie } from 'dexie';
import { db } from '../db';
import { ScanRecord, CountingSession, ExpectedOrder } from '../types';
import { generateUUID, sanitizeBarcode, compressImage } from './utils';
import { logger } from './logger';
import { IntegrityGuard } from './integrityGuard';
import { CloudOrderRowSchema } from './schemas';
import { createEmergencySnapshot } from './backupService';
import { firebaseSyncService } from './firebaseSyncService';
import { getSettings } from './settings';

/**
 * POOL DE ESCRITURA INDUSTRIAL v3.0 (Atomic Buffer)
 * Agrupa ráfagas de escaneo para proteger la vida útil del almacenamiento flash
 * y reducir la fragmentación de la base de datos.
 */
let writeBuffer: { record: ScanRecord, retries: number }[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
const FLUSH_DELAY = 400; // Optimizado para ráfagas de clicks manuales

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
  const records = currentBatch.map(item => item.record);
  
  try {
    await (db as any).transaction('rw', db.scans, db.sessions, async () => {
      await db.scans.bulkAdd(records);
      const affectedSessionIds = Array.from(new Set(records.map(s => s.sessionId)));
      for (const id of affectedSessionIds) {
        await updateSessionMetadata(id);
      }
    });
    
    // Snapshot de emergencia tras persistencia exitosa
    createEmergencySnapshot().catch(() => {});
    
    // Empuje proactivo a Firestore (Sincronización Inteligente)
    if (navigator.onLine) {
      const settings = getSettings();
      const targetTable = settings.cloudConfig?.countsTableName || 'CONTEOS';
      firebaseSyncService.pushBatch(targetTable, records).then(res => {
        if (res.success) {
          markScansAsSynced(records.map(r => r.id));
        }
      });
    }

    triggerBackgroundSync();
  } catch (error: any) {
    logger.error("DB_COMMIT_FAIL", error.message);
    // Recuperación: Re-encolar si no es un error de integridad
    writeBuffer = [...currentBatch, ...writeBuffer];
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
    status: (await db.sessions.get(sessionId))?.status === 'draft' ? 'draft' : 'active'
  });
};

export const recalculateSessionMetadata = updateSessionMetadata;

/**
 * Retorna los registros que aún no han sido persistidos en disco.
 * Útil para mantener la consistencia de la UI durante el delay del buffer.
 */
export const getPendingBuffer = () => writeBuffer.map(item => item.record);

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
  const cleanBarcode = sanitizeBarcode(barcode);
  const finalLocation = location || session?.logisticsLabel || 'UNSET';

  // LÓGICA DE AGREGACIÓN EN BUFFER (Evita múltiples filas para el mismo item en ráfaga)
  const existingIdx = writeBuffer.findIndex(item => 
    item.record.sessionId === sessionId &&
    item.record.barcode === cleanBarcode &&
    item.record.location === finalLocation &&
    item.record.mm === mm &&
    item.record.yyyy === yyyy &&
    item.record.batch === batch
  );

  if (existingIdx !== -1) {
    // Actualizamos registro existente en el buffer
    writeBuffer[existingIdx].record.quantity += quantity;
    writeBuffer[existingIdx].record.timestamp = Date.now();
    
    // Si la cantidad llega a 0 o menos por un decremento, eliminamos del buffer
    if (writeBuffer[existingIdx].record.quantity <= 0) {
      writeBuffer.splice(existingIdx, 1);
    }
    
    if (flushTimeout) clearTimeout(flushTimeout);
    flushTimeout = setTimeout(commitBufferToDatabase, FLUSH_DELAY);
    return writeBuffer[existingIdx]?.record || ({} as ScanRecord);
  }

  // Si no existe o es un nuevo item, validamos y encolamos
  const newRecord: ScanRecord = IntegrityGuard.validateScan({
    id: generateUUID(),
    sessionId,
    barcode: cleanBarcode,
    quantity,
    batch,
    logisticsLabel: session?.logisticsLabel || 'UNSET',
    mm,
    yyyy,
    location: finalLocation,
    timestamp: Date.now(),
    synced: 0
  }) as ScanRecord;

  writeBuffer.push({ record: newRecord, retries: 0 });
  
  if (flushTimeout) clearTimeout(flushTimeout);
  flushTimeout = setTimeout(commitBufferToDatabase, FLUSH_DELAY);
  
  return newRecord;
};

export const createSession = async (
  erp: string, 
  label: string, 
  type: 'standard' | 'hammer' = 'standard', 
  expected?: any,
  labelPhoto?: string,
  isAutoLockEnabled: boolean = true
): Promise<CountingSession> => {
  // Optimización de Imagen (Punto 6)
  let finalPhoto = labelPhoto;
  if (labelPhoto && labelPhoto.startsWith('data:image')) {
    try {
      finalPhoto = await compressImage(labelPhoto);
    } catch (e) {
      console.warn("Image compression failed, using original", e);
    }
  }

  const s: CountingSession = { 
    id: generateUUID(), 
    erpOrder: String(erp || '').trim().toUpperCase(), 
    logisticsLabel: String(label || '').trim().toUpperCase(), 
    createdAt: Date.now(), 
    status: 'active', 
    sessionType: type, 
    totalUnits: 0, 
    totalSKUs: 0, 
    expectedItems: expected?.items || [], 
    isVerifiedMode: !!(expected?.items?.length),
    labelPhoto: finalPhoto,
    isAutoLockEnabled
  };
  await db.sessions.add(s);
  
  // Sincronización proactiva de sesión
  if (navigator.onLine) {
    const settings = getSettings();
    const sessionsTable = settings.cloudConfig?.sessionsTableName || 'SESSIONS';
    firebaseSyncService.pushChange(sessionsTable, s.id, s);
  }

  // Snapshot de emergencia tras crear sesión
  createEmergencySnapshot().catch(() => {});
  
  return s;
};

export const createDraftSession = async (label: string, erpOrder?: string, mm?: number, yyyy?: number, batch?: string): Promise<CountingSession> => {
 const s: CountingSession = { 
 id: generateUUID(), 
 erpOrder: erpOrder ? String(erpOrder || '').trim().toUpperCase() : 'RECEPCION_BORRADOR', 
 logisticsLabel: String(label || '').trim().toUpperCase(), 
 createdAt: Date.now(), 
 status: 'draft', 
 sessionType: 'standard',
 totalUnits: 0, 
 totalSKUs: 0,
 expectedItems: [],
 isVerifiedMode: false,
 mm,
 yyyy,
 batch
 };
 await db.sessions.add(s);
 
 // Sincronización proactiva de sesión borrador
 if (navigator.onLine) {
   const settings = getSettings();
   const sessionsTable = settings.cloudConfig?.sessionsTableName || 'SESSIONS';
   firebaseSyncService.pushChange(sessionsTable, s.id, s);
 }

 triggerBackgroundSync();
 return s;
};

export const fetchExpectedItemsFromCloud = async (erp: string): Promise<ExpectedOrder | null> => {
 try {
 const settings = getSettings();
 const tableName = settings.cloudConfig?.ordersTableName || 'PEDIDOS';
 const res = await firebaseSyncService.pullBatch(tableName);
 if (res.success && res.rows) {
 const rows = res.rows
 .map((row: any) => CloudOrderRowSchema.safeParse(row))
 .filter((p: any) => p.success && String(p.data.erp || '').toUpperCase() === String(erp || '').toUpperCase());

 if (rows.length === 0) return null;

 const items = rows.map((p: any) => ({
 barcode: p.data.barcode,
 name: p.data.name,
 expectedQty: p.data.qty
 }));

 return {
 id: String(erp || '').toUpperCase(),
 internalId: String(erp || '').toUpperCase(),
 items,
 totalExpectedUnits: items.reduce((acc, i) => acc + i.expectedQty, 0),
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
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    await commitBufferToDatabase();
  }
  await db.sessions.update(id, { status: 'completed' }); 
  
  // Sincronización proactiva de cierre
  if (navigator.onLine) {
    const session = await db.sessions.get(id);
    if (session) {
      const settings = getSettings();
      const sessionsTable = settings.cloudConfig?.sessionsTableName || 'SESSIONS';
      firebaseSyncService.pushChange(sessionsTable, id, session);
    }
  }

  // Remove from pending orders queue
  const session = await db.sessions.get(id);
  if (session && session.erpOrder && session.erpOrder !== 'RECEPCION_BORRADOR') {
    await db.expectedOrders.delete(session.erpOrder);
  }
  
  triggerBackgroundSync();
};

export const deleteSession = async (id: string) => { 
 // FIX: Using (db as any) to resolve type error: Property 'transaction' does not exist on type 'LogiCountDB'
 await (db as any).transaction('rw', db.scans, db.sessions, async () => {
 await db.scans.where('sessionId').equals(id).delete(); 
 await db.sessions.delete(id); 
 });
};

export const cleanSyncedSessions = async (): Promise<number> => {
 const synced = await db.sessions.where('lastSyncTimestamp').above(0).toArray();
 const ids = synced.map(s => s.id);
 if (ids.length === 0) return 0;
 // FIX: Using (db as any) to resolve type error: Property 'transaction' does not exist on type 'LogiCountDB'
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

export const checkLabelExists = async (label: string): Promise<boolean> => {
 const count = await db.sessions.where('logisticsLabel').equals(String(label || '').trim().toUpperCase()).count();
 return count > 0;
};

export const undoLastAction = async (sessionId: string): Promise<string | null> => {
 // Primero buscar en buffer no guardado
 const bufferIdx = writeBuffer.findIndex(item => item.record.sessionId === sessionId);
 if (bufferIdx !== -1) {
 for (let i = writeBuffer.length - 1; i >= 0; i--) {
 if (writeBuffer[i].record.sessionId === sessionId) {
 const [removed] = writeBuffer.splice(i, 1);
 return removed.record.barcode;
 }
 }
 }
 // Si no, buscar en DB
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

export const deleteSessionItem = async (sessionId: string, barcode: string) => {
 await db.scans.where('[sessionId+barcode]').equals([sessionId, barcode]).delete();
 await updateSessionMetadata(sessionId);
};

export const adjustSessionItemQuantity = async (sessionId: string, barcode: string, delta: number) => {
 const lastScan = await db.scans.where('[sessionId+barcode]').equals([sessionId, barcode]).reverse().first();
 if (lastScan) {
 const newQty = Math.max(1, lastScan.quantity + delta);
 await db.scans.update(lastScan.id, { quantity: newQty });
 await updateSessionMetadata(sessionId);
 }
};

// Forced GitHub sync
