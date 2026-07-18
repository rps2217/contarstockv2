import { db } from '../db';
import { supabaseSyncService } from './supabaseSyncService';
import { getSettings } from './settings';
import { logger } from './logger';
import { ExpectedOrderRepository } from '../repositories/ExpectedOrderRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { ScanRepository } from '../repositories/ScanRepository';
import { CountingSession, ExpectedOrder, ExpectedItem, ScanRecord } from '../types';

// ✅ Unit of Work para operaciones atómicas
import { createUnitOfWork, withUnitOfWork, UnitOfWork } from '@/repositories/core/UnitOfWork';

interface PendingScanEvent {
  id: string;
  sessionId: string;
  barcode: string;
  quantity: number;
  mm?: number;
  yyyy?: number;
  location?: string;
  batch?: string;
  synced: number;
  timestamp: number;
}

let pendingBuffer: PendingScanEvent[] = [];

export const getPendingBuffer = () => pendingBuffer;

export const createSession = async (
  erpOrder: string,
  logisticsLabel: string,
  sessionType: 'standard' | 'hammer' | 'reception',
  expectedItems?: ExpectedItem[] | { items: ExpectedItem[] },
  photoUrl?: string,
  isAutoLockEnabled?: boolean
): Promise<CountingSession> => {
  // Support both direct array or { items: [] } format
  const itemsToSave: ExpectedItem[] = Array.isArray(expectedItems)
    ? expectedItems
    : expectedItems?.items || [];

  logger.debug('SessionService', 'expectedItems input', {
    expectedItems,
    itemsToSaveCount: itemsToSave.length,
  });
  logger.debug('SessionService', 'itemsToSave sample', { items: itemsToSave.slice(0, 2) });

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
    totalSKUs: 0,
  };

  logger.debug('SessionService', 'session.expectedItems before save', {
    expectedItems: session.expectedItems,
  });

  // ✅ Usar UnitOfWork para crear sesión atómicamente
  const result = await withUnitOfWork(async uow => {
    uow.addOperation('CREATE', 'session', session, async () => {
      await SessionRepository.delete(session.id);
    });
    return session;
  });

  if (!result.success) {
    logger.error('SESSION', `Error al crear sesión: ${result.error}`);
    throw new Error(`Error al crear sesión: ${result.error}`);
  }

  logger.debug('SessionService', 'session saved', {
    expectedItemsCount: session.expectedItems?.length,
  });
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
    supabaseSyncService
      .pushBatch('SESIONES_CONTEO', [session as any])
      .catch(err =>
        logger.error(
          'sessionService',
          'Error en pushBatch',
          err instanceof Error ? err.message : String(err)
        )
      );
  }
};

export const addScanEvent = async (
  sessionId: string,
  barcode: string,
  quantity: number = 1,
  mm?: number,
  yyyy?: number,
  location?: string,
  batch?: string
) => {
  const event = {
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
  };
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
  // ✅ Usar UnitOfWork para eliminar sesión atómicamente
  const result = await withUnitOfWork(async uow => {
    // Primero obtener los scans para poder eliminarlos
    const scans = await ScanRepository.getBySession(id);

    // Agregar operación para eliminar scans
    for (const scan of scans) {
      uow.addOperation('DELETE', 'scan', scan, async () => {
        // Inverse: recrear el scan
        await db.scans.add(scan);
      });
    }

    // Agregar operación para eliminar sesión
    const session = await SessionRepository.getById(id);
    if (session) {
      uow.addOperation('DELETE', 'session', session, async () => {
        await SessionRepository.save(session);
      });
    }

    return { scansDeleted: scans.length, sessionDeleted: !!session };
  });

  if (!result.success) {
    logger.error('SESSION', `Error al eliminar sesión: ${result.error}`);
    throw new Error(`Error al eliminar sesión: ${result.error}`);
  }

  logger.info('SESSION', `Sesión eliminada: ${id}`);
};

export { cleanSyncedSessions } from './maintenance';

export const checkLabelExists = async (labelId: string) => {
  const existing = await db.sessions
    .where('logisticsLabel')
    .equals(labelId.toUpperCase())
    .toArray();
  return existing.length > 0;
};

export const fetchExpectedItemsFromCloud = async (
  erpOrder: string
): Promise<ExpectedOrder | null> => {
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
        const mappedItems = manifest.items.map((item: Record<string, unknown>) => ({
          barcode: String(item.barcode),
          name: String(item.name || '') || `Producto ${item.barcode}`,
          expectedQty: (item.qty as number) || 0,
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
            orderNote: 'Generado desde consulta en la nube',
          },
        };

        // Guardar automáticamente en el IndexedDB local
        await ExpectedOrderRepository.save(newExpectedOrder);
        return newExpectedOrder;
      }
    }
  } catch (err) {
    logger.warn('SessionService', 'Error al descargar teórico desde nube', { error: String(err) });
  }
  return (await ExpectedOrderRepository.getById(cleanId)) || null;
};

export const markScansAsSynced = async (scanIds: string[]) => {
  await db.scans.where('id').anyOf(scanIds).modify({ synced: 1 });
};

/**
 * ✅ Guarda un scan junto con un vencimiento de forma atómica
 * Si falla el scan, no se guarda el vencimiento y viceversa
 */
export const addScanWithExpiry = async (
  sessionId: string,
  barcode: string,
  quantity: number,
  expiryData: {
    mm: number;
    yyyy: number;
    productName?: string;
    providerName?: string;
    location?: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  const scanId = crypto.randomUUID();
  const expiryId = crypto.randomUUID();

  const scanEvent = {
    id: scanId,
    sessionId,
    barcode,
    quantity,
    synced: 0,
    timestamp: Date.now(),
  };

  const expiryEvent = {
    id: expiryId,
    barcode,
    productName: expiryData.productName || '',
    providerName: expiryData.providerName || 'SIN PROVEEDOR',
    mm: expiryData.mm,
    yyyy: expiryData.yyyy,
    quantity,
    location: expiryData.location || '',
    observaciones: '',
    claveUnica: `${barcode}-${expiryData.yyyy}-${String(expiryData.mm).padStart(2, '0')}`,
    withdrawalDays: 30,
    hasCanje: false,
    timestamp: Date.now(),
    syncStatus: 'pending',
    status: 'critical',
    daysLeft: Math.ceil(
      (new Date(expiryData.yyyy, expiryData.mm - 1, 1).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    ),
    expiryDate: new Date(expiryData.yyyy, expiryData.mm - 1, 1).toISOString(),
    expiryDateObj: new Date(expiryData.yyyy, expiryData.mm - 1, 1),
    withdrawalDate: new Date(
      new Date(expiryData.yyyy, expiryData.mm - 1, 1).getTime() - 30 * 24 * 60 * 60 * 1000
    ),
    category: 'GENERAL',
    estado: 'Crítico',
    type: 'Individual' as const,
  };

  return withUnitOfWork(async uow => {
    uow.addOperation('CREATE', 'scan', scanEvent, async () => {
      await db.scans.delete(scanId);
    });

    uow.addOperation('CREATE', 'expiry', expiryEvent, async () => {
      await db.table('expirations').delete(expiryId);
    });

    return { scanId, expiryId };
  });
};
