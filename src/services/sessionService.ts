import { db } from '../db';
import { supabaseSyncService } from './supabaseSyncService';
import { getSettings } from './settings';
import { logger } from './logger';
import { ExpectedOrderRepository } from '../repositories/ExpectedOrderRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { ScanRepository } from '../repositories/ScanRepository';
import { CountingSession, ExpectedOrder, ScanRecord } from '../types';

let pendingBuffer: any[] = [];

export const getPendingBuffer = () => pendingBuffer;

export const createSession = async (
  erpOrder: string, 
  logisticsLabel: string, 
  sessionType: 'standard' | 'hammer' | 'reception', 
  expectedItems?: any,
  photoUrl?: string,
  isAutoLockEnabled?: boolean
): Promise<CountingSession> => {
  const itemsToSave = expectedItems?.items || [];
  console.log('[createSession] expectedItems input:', expectedItems);
  console.log('[createSession] itemsToSave:', itemsToSave);
  
  const session: CountingSession = {
    id: crypto.randomUUID(),
    erpOrder: erpOrder.toUpperCase(),
    logisticsLabel: logisticsLabel.toUpperCase(),
    sessionType,
    status: 'active',
    createdAt: Date.now(),
    expectedItems: itemsToSave,
    photoUrl,
    isAutoLockEnabled,
    totalUnits: 0,
    totalSKUs: 0
  };
  
  console.log('[createSession] session.expectedItems BEFORE save:', session.expectedItems);
  await SessionRepository.save(session);
  console.log('[createSession] session saved with expectedItems:', session.expectedItems?.length);
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

export const addScanEvent = async (sessionId: string, barcode: string, quantity: number = 1, mm?: number, yyyy?: number, location?: string, batch?: string) => {
  const event = { id: crypto.randomUUID(), sessionId, barcode, quantity, mm, yyyy, location, batch, synced: 0, timestamp: Date.now() };
  pendingBuffer.push({ ...event });
  if (pendingBuffer.length >= 5) {
    await db.scans.bulkAdd(pendingBuffer);
    pendingBuffer = [];
  }
};

export const undoLastAction = async (sessionId: string): Promise<boolean> => {
  const reversed = [...pendingBuffer].reverse();
  const idx = reversed.findIndex(s => s.sessionId === sessionId);
  if (idx !== -1) {
    const realIdx = pendingBuffer.length - 1 - idx;
    pendingBuffer.splice(realIdx, 1);
    return true;
  }
  const scans = await ScanRepository.getBySession(sessionId);
  if (scans.length > 0) {
    const last = scans.pop();
    if (last?.id) {
        await db.scans.delete(last.id);
        return true;
    }
  }
  return false;
};

export const deleteSessionItem = async (sessionId: string, barcode: string) => {
  const scans = await ScanRepository.getBySession(sessionId);
  const toDelete = scans.filter(s => s.barcode === barcode).map(s => s.id!);
  if (toDelete.length > 0) {
      await db.scans.bulkDelete(toDelete);
  }
  pendingBuffer = pendingBuffer.filter(s => !(s.sessionId === sessionId && s.barcode === barcode));
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
         const mappedItems: Array<{ barcode: string; name: string; expectedQty: number }> = manifest.items.map((item: { barcode: unknown; name?: unknown; qty?: unknown }) => ({
           barcode: String(item.barcode),
           name: String(item.name || "") || `Producto ${item.barcode}`,
           expectedQty: (item.qty as number) || 0
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