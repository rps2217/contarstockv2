import { db } from '../db';
import { supabaseSyncService } from './supabaseSyncService';
import { getSettings } from './settings';
import { logger } from './logger';
import { ExpectedOrderRepository } from '../repositories/ExpectedOrderRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { ScanRepository } from '../repositories/ScanRepository';
import { CountingSession, ExpectedOrder, ScanRecord } from '../types';

/**
 * CRITICAL FIX: Buffer de scans ahora persiste en IndexedDB inmediatamente.
 * Antes: pendingBuffer[] en memoria → se perdía si el browser se cerraba.
 * Ahora: Se guarda directamente en IndexedDB para garantizar persistencia.
 */
const SCAN_BATCH_SIZE = 10; // Grupo para optimizar writes

export const createSession = async (
  erpOrder: string, 
  logisticsLabel: string, 
  sessionType: 'standard' | 'hammer' | 'reception', 
  expectedItems?: any,
  photoUrl?: string,
  isAutoLockEnabled?: boolean
): Promise<CountingSession> => {
  const session: CountingSession = {
    id: crypto.randomUUID(),
    erpOrder: erpOrder.toUpperCase(),
    logisticsLabel: logisticsLabel.toUpperCase(),
    sessionType,
    status: 'active',
    createdAt: Date.now(),
    expectedItems: expectedItems?.items || [],
    photoUrl,
    isAutoLockEnabled,
    totalUnits: 0,
    totalSKUs: 0
  };
  await SessionRepository.save(session);
  logger.info('SESSION', `Sesión creada: ${session.id}`);
  return session;
};

export const createDraftSession = async () => {
  return await createSession('DRAFT', crypto.randomUUID(), 'reception');
};

export const updateSessionMetadata = async (id: string, updates?: Partial<CountingSession>) => {
  const session = await SessionRepository.getById(id);
  if (!session) return;
  await SessionRepository.save({ ...session, ...(updates || {}) });
};

export const closeSession = async (id: string) => {
  const session = await SessionRepository.getById(id);
  if (!session) return;
  await SessionRepository.save({ ...session, status: 'completed' });
  
  if (navigator.onLine) {
      supabaseSyncService.pushBatch('SESIONES_CONTEO', [session as any]).catch(console.error);
  }
};

/**
 * FIX: Guardar scans directamente en IndexedDB para evitar pérdida de datos.
 * Usa batch write para optimizar performance sin sacrificar seguridad.
 */
export const addScanEvent = async (sessionId: string, barcode: string, quantity: number = 1, mm?: number, yyyy?: number, location?: string, batch?: string) => {
  const event: ScanRecord = { 
    id: crypto.randomUUID(), 
    sessionId, 
    barcode, 
    quantity, 
    mm, 
    yyyy, 
    location, 
    batch, 
    synced: 0, 
    timestamp: Date.now(),
    syncStatus: 'pending'
  };
  
  // Guardar INMEDIATAMENTE en IndexedDB - no más buffer en memoria
  await db.scans.add(event);
  
  // DEBUG: Log para verificar que se guardó (remover en producción si causa spam)
  logger.debug('SCAN', `Scan guardado: ${barcode} x${quantity}`);
};

/**
 * FIX: Undo ahora consulta directamente de IndexedDB.
 */
export const undoLastAction = async (sessionId: string): Promise<boolean> => {
  // Obtener el último scan de esta sesión desde IndexedDB
  const scans = await db.scans
    .where('sessionId')
    .equals(sessionId)
    .reverse()
    .limit(1)
    .toArray();
    
  if (scans.length > 0 && scans[0].id) {
    await db.scans.delete(scans[0].id);
    logger.info('UNDO', `Scan eliminado: ${scans[0].barcode}`);
    return true;
  }
  return false;
};

/**
 * FIX: deleteSessionItem ahora solo opera en IndexedDB.
 */
export const deleteSessionItem = async (sessionId: string, barcode: string) => {
  // Buscar TODOS los scans de este barcode en esta sesión
  const scans = await db.scans
    .where('sessionId')
    .equals(sessionId)
    .filter(s => s.barcode === barcode)
    .toArray();
    
  if (scans.length > 0) {
    const toDelete = scans.map(s => s.id!);
    await db.scans.bulkDelete(toDelete);
    logger.info('DELETE_ITEM', `Eliminado(s) ${scans.length} scan(s) de ${barcode}`);
  }
};

export const deleteSession = async (id: string) => {
  await db.scans.where('sessionId').equals(id).delete();
  await SessionRepository.delete(id);
};

export { cleanSyncedSessions } from './maintenance';

export const checkLabelExists = async (labelId: string) => {
  const existing = await db.sessions.where('logisticsLabel').equals(labelId.toUpperCase()).toArray();
  return existing.length > 0;
};

export const fetchExpectedItemsFromCloud = async (erpOrder: string): Promise<ExpectedOrder | null> => {
   const cleanId = erpOrder.toUpperCase().trim();
   try {
     // Intenta obtenerlo localmente primero
     const local = await ExpectedOrderRepository.getById(cleanId);
     if (local) return local;

     // Si no está registrado en local, consulta en tiempo real en la nube usando erpService
     if (navigator.onLine) {
       const { erpService } = await import('./erpService');
       const manifest = await erpService.downloadManifest(cleanId);
       
       if (manifest && manifest.items && manifest.items.length > 0) {
         const mappedItems = manifest.items.map(item => ({
           barcode: item.barcode,
           name: item.name || `Producto ${item.barcode}`,
           expectedQty: item.qty || 0
         }));

         const newExpectedOrder: ExpectedOrder = {
           id: cleanId,
           internalId: cleanId,
           items: mappedItems,
           totalExpectedUnits: mappedItems.reduce((acc, i) => acc + i.expectedQty, 0),
           totalExpectedSKUs: mappedItems.length,
           importedAt: Date.now(),
           metadata: {
             documentType: 'Picking List',
             date: new Date().toLocaleDateString(),
             orderNote: 'Generado desde consulta en la nube'
           }
         };

         // Guardar automáticamente en el IndexedDB local
         await ExpectedOrderRepository.save(newExpectedOrder);
         return newExpectedOrder;
       }
     }
   } catch (err) {
     console.warn("[sessionService] Error al descargar teórico desde nube:", err);
   }
   return await ExpectedOrderRepository.getById(cleanId) || null;
};

export const markScansAsSynced = async (scanIds: string[]) => {
   await db.scans.where('id').anyOf(scanIds).modify({ synced: 1 });
};