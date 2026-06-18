/**
 * SyncManager - Orquestador de sincronizacion
 * 
 * Wrapper que mantiene compatibilidad hacia atras.
 * La logica principal esta en:
 * - src/features/sync/commands/ - Commands modulares
 * - src/features/sync/fsm/ - Maquina de estados
 */

import { db } from '../db';
import { logger } from './logger';
import { useSyncStore } from '../store/useSyncStore';
import { toast } from 'sonner';
import { getSettings } from './settings';
import { supabaseSyncService } from './supabaseSyncService';
import { ScanRepository, SessionRepository } from '../repositories';
import { Product, Provider } from '../types';
import { CloudProductSchema, CloudProviderSchema } from './schemas';
import { saveProductBatch } from './productService';
import { dynamicSyncService } from './dynamicSync';
import { handleError } from './types';

export { backupProductsToSupabase, backupProvidersToSupabase } from './cloudBackupService';

let isSyncingInProgress = false;
const UPLOAD_BATCH_SIZE = 500;

export interface UploadGroup {
  erpOrder: string;
  sessionCount: number;
  totalUnits: number;
  sessionIds: string[];
  logisticsLabels: string[];
  type: 'inventory' | 'reception' | 'products' | 'orphans' | 'dynamic';
  isHammer: boolean;
  tableName?: string;
}

export const getPendingUploadGroups = async (): Promise<UploadGroup[]> => {
  const groups: Record<string, UploadGroup> = {};
  const unsyncedScans = await ScanRepository.getUnsynced();

  if (unsyncedScans.length > 0) {
    const sessionIds = Array.from(new Set(unsyncedScans.map(s => s.sessionId)));
    const sessions = await SessionRepository.getByIds(sessionIds);
    const sessionMap = new Map<string, any>(sessions.map(s => [s.id, s]));

    for (const scan of unsyncedScans) {
      const session = sessionMap.get(scan.sessionId);
      if (!session) {
        if (!groups['SISTEMA_RESIDUAL']) {
          groups['SISTEMA_RESIDUAL'] = {
            erpOrder: 'REGISTROS_HUERFANOS',
            sessionCount: 1, totalUnits: 0,
            sessionIds: ['ORPHAN'],
            logisticsLabels: ['Recuperado de Memoria'],
            type: 'orphans', isHammer: true
          };
        }
        groups['SISTEMA_RESIDUAL'].totalUnits += scan.quantity;
        continue;
      }

      const erp = session.erpOrder;
      if (!groups[erp]) {
        groups[erp] = {
          erpOrder: erp, sessionCount: 0, totalUnits: 0,
          sessionIds: [], logisticsLabels: [],
          type: 'inventory', isHammer: session.sessionType === 'hammer'
        };
      }
      groups[erp].totalUnits += scan.quantity;
      if (!groups[erp].sessionIds.includes(session.id)) {
        groups[erp].sessionIds.push(session.id);
        groups[erp].logisticsLabels.push(session.logisticsLabel);
        groups[erp].sessionCount++;
      }
    }
  }

  const receptionSessions = await SessionRepository.getByType('reception');
  const unsyncedReception = receptionSessions.filter(s => !s.lastSyncTimestamp);
  if (unsyncedReception.length > 0) {
    groups['RECEP_CLOUD'] = {
      erpOrder: 'RECEPCION_BULTOS', sessionCount: unsyncedReception.length, totalUnits: 0,
      sessionIds: unsyncedReception.map(s => s.id),
      logisticsLabels: unsyncedReception.map(s => s.logisticsLabel),
      type: 'reception', isHammer: false
    };
  }

  const pendingDynamic = await db.dynamic_data.where('syncStatus').equals('pending').toArray();
  if (pendingDynamic.length > 0) {
    const dynamicGroups: Record<string, number> = {};
    pendingDynamic.forEach(r => { dynamicGroups[r.tableName] = (dynamicGroups[r.tableName] || 0) + 1; });
    for (const [tableName, count] of Object.entries(dynamicGroups)) {
      groups[`DYNAMIC_${tableName}`] = {
        erpOrder: `TABLA: ${tableName}`, sessionCount: count, totalUnits: count,
        sessionIds: [], logisticsLabels: [], type: 'dynamic', isHammer: false, tableName
      };
    }
  }

  return Object.values(groups);
};

export const reconcileReception = async (onProgress?: (msg: string) => void): Promise<{ deleted: number }> => {
  try {
    const config = getSettings().cloudConfig;
    const targetTable = config?.receptionTableName || "RECEPCION_BULTOS";
    if (onProgress) onProgress("Verificando integridad...");
    const response = await supabaseSyncService.pullBatch(targetTable);
    if (!response.success || !response.rows) return { deleted: 0 };
    const remoteIds = new Set(response.rows.map((r: any) => String(r.id || r.ID)));
    const localSyncedReception = await SessionRepository.getByType('reception');
    const filteredSynced = localSyncedReception.filter(s => !!s.lastSyncTimestamp);
    const toDelete = filteredSynced.filter(s => !remoteIds.has(s.id));
    if (toDelete.length > 0) {
      const idsToDelete = toDelete.map(s => s.id);
      if (onProgress) onProgress(`Limpiando ${idsToDelete.length} registros...`);
      await (db as any).transaction('rw', db.scans, db.sessions, async () => {
        await ScanRepository.deleteBySessions(idsToDelete);
        await SessionRepository.deleteMany(idsToDelete);
      });
      return { deleted: idsToDelete.length };
    }
    return { deleted: 0 };
  } catch (err: unknown) {
    logger.error("RECONCILE_FAIL", handleError(err).message);
    return { deleted: 0 };
  }
};

export const performBatchUpload = async (group: UploadGroup, onProgress?: (msg: string) => void): Promise<void> => {
  if (isSyncingInProgress) throw new Error("Sincronizacion en progreso");
  isSyncingInProgress = true;
  useSyncStore.getState().setSyncing(true);
  try {
    const config = getSettings().cloudConfig;
    if (group.type === 'dynamic' && group.tableName) {
      await dynamicSyncService.syncAllPending(onProgress, group.tableName);
    } else if (group.erpOrder === 'REGISTROS_HUERFANOS') {
      if (onProgress) onProgress("Purgando registros residuales...");
      const unsynced = await ScanRepository.getUnsynced();
      const orphanIds = unsynced.filter(s => !s.sessionId || s.sessionId === 'ORPHAN').map(s => s.id);
      await ScanRepository.markAsSynced(orphanIds);
    } else if (group.type === 'reception') {
      if (onProgress) onProgress(`Subiendo ${group.sessionCount} bultos...`);
      const rows = group.sessionIds.map((id, idx) => ({
        "id": id, "ID_RECEPCION": id, "FECHA_HORA": new Date().toISOString(),
        "ETIQUETA": group.logisticsLabels[idx], "ESTADO": "INGRESADO"
      }));
      const targetTable = config?.receptionTableName || "RECEPCION_BULTOS";
      const result = await supabaseSyncService.pushBatch(targetTable, rows);
      if (result.success) {
        for (const id of group.sessionIds) await SessionRepository.updateSyncTimestamp(id);
        if (onProgress) onProgress(`✓ Recepcion sincronizada.`);
      } else throw new Error(result.error);
    } else {
      for (const sessionId of group.sessionIds) {
        const session = await SessionRepository.getById(sessionId);
        if (!session) continue;
        if (session.labelPhoto && !session.photoUrl) {
          if (onProgress) onProgress(`Respaldando foto [${session.logisticsLabel}]...`);
          try {
            const uploadResult = await supabaseSyncService.uploadPhoto(session.labelPhoto, `labels/${session.id}.jpg`);
            if (uploadResult.success && uploadResult.fileUrl) {
              await SessionRepository.updatePhotoUrl(session.id, uploadResult.fileUrl);
              if (onProgress) onProgress(`✓ Foto respaldada.`);
            }
          } catch (e) { console.warn("Fallo foto:", e); }
        }
        if (onProgress) onProgress(`Preparando bulto ${session.logisticsLabel}...`);
        const allScans = await ScanRepository.getBySession(session.id);
        const unsyncedScans = allScans.filter(s => s.synced === 0);
        if (unsyncedScans.length === 0) {
          await SessionRepository.updateSyncTimestamp(sessionId);
          continue;
        }
        const { aggregateScans } = await import('./aggregator');
        const { createInventoryPayload } = await import('./cloud/mappers');
        const consolidatedItems = await aggregateScans(allScans);
        const fullPayload = createInventoryPayload(session, consolidatedItems, 'manual');
        const targetTable = session.sessionType === 'hammer'
          ? (config?.countsTableName || "CONTEOS")
          : (config?.consolidatedTableName || "CONSOLIDADO");
        const totalBatches = Math.ceil(fullPayload.length / UPLOAD_BATCH_SIZE);
        let sessionSuccess = true;
        const allScanIdsToMark: string[] = unsyncedScans.map(s => s.id);
        for (let i = 0; i < totalBatches; i++) {
          const chunk = fullPayload.slice(i * UPLOAD_BATCH_SIZE, (i + 1) * UPLOAD_BATCH_SIZE);
          if (onProgress) onProgress(`Subiendo lote ${i + 1}/${totalBatches}...`);
          try {
            const result = await supabaseSyncService.pushBatch(targetTable, chunk);
            if (!result.success) {
              sessionSuccess = false;
              logger.error("BATCH_FAIL", result.error);
              useSyncStore.getState().addIncident(targetTable, result.error || "Fallo");
            }
          } catch (batchError: any) {
            sessionSuccess = false;
            logger.error("BATCH_CRITICAL", batchError.message);
            useSyncStore.getState().addIncident(targetTable, batchError.message);
          }
        }
        if (sessionSuccess) {
          await ScanRepository.markAsSynced(allScanIdsToMark);
          await SessionRepository.updateSyncTimestamp(sessionId);
          try {
            await supabaseSyncService.pushBatch('SESIONES_CONTEO', [{
              id: session.id, erpOrder: session.erpOrder, logisticsLabel: session.logisticsLabel,
              sessionType: session.sessionType, status: session.status || 'completed',
              createdAt: session.createdAt, totalUnits: session.totalUnits || 0,
              totalSKUs: session.totalSKUs || 0, photoUrl: session.photoUrl || '',
              lastSyncTimestamp: Date.now()
            }]);
          } catch (e) { console.warn("Fallo sesion:", e); }
          if (onProgress) onProgress(`✓ Bulto ${session.logisticsLabel} Sincronizado.`);
        } else if (onProgress) {
          onProgress(`⚠ Bulto ${session.logisticsLabel} con errores.`);
        }
      }
    }
    useSyncStore.getState().setLastSyncTime(Date.now());
  } catch (err: unknown) {
    logger.error("SYNC_FAIL", handleError(err).message);
    throw err;
  } finally {
    isSyncingInProgress = false;
    useSyncStore.getState().setSyncing(false);
  }
};

export const syncCatalogs = async (onProgress?: (msg: string) => void): Promise<{ products: number, providers: number }> => {
  if (onProgress) onProgress("Sincronizando catalogos...");
  try {
    const [productsCount, providersCount] = await Promise.all([
      importProductsFromCloud(), importProvidersFromCloud()
    ]);
    if (onProgress) onProgress(`✓ ${productsCount} productos, ${providersCount} proveedores.`);
    return { products: productsCount, providers: providersCount };
  } catch (err: unknown) {
    const msg = handleError(err).message;
    if (msg === 'Failed to fetch') toast.error('Error de red');
    else logger.warn("CATALOG_FAIL", msg);
    throw err;
  }
};

export const importProductsFromCloud = async (): Promise<number> => {
  try {
    const config = getSettings().cloudConfig;
    const tableName = config?.productsTableName || "PRODUCTOS";
    const { lastSyncPerTable, setTableSyncTime } = useSyncStore.getState();
    const lastSyncIso = lastSyncPerTable[tableName] ? new Date(lastSyncPerTable[tableName]).toISOString() : undefined;
    const response = await supabaseSyncService.pullBatch(tableName, lastSyncIso, 'updated_at');
    if (!response.success || !response.rows) return 0;
    const products: Product[] = response.rows
      .filter((p: any) => p.id !== 'undefined')
      .map((p: any) => {
        const result = CloudProductSchema.safeParse(p);
        return result.success ? result.data : null;
      })
      .filter((p): p is Product => p !== null)
      .map(p => ({ ...p, syncStatus: 'synced' as const }));
    if (products.length > 0) await saveProductBatch(products);
    setTableSyncTime(tableName, Date.now());
    return products.length;
  } catch (err: unknown) {
    logger.error("FETCH_PRODUCTS", (err as Error).message);
    throw err;
  }
};

export const importProvidersFromCloud = async (): Promise<number> => {
  try {
    const config = getSettings().cloudConfig;
    const tableName = config?.providersTableName || "PROVEEDORES";
    const { lastSyncPerTable, setTableSyncTime } = useSyncStore.getState();
    const lastSyncIso = lastSyncPerTable[tableName] ? new Date(lastSyncPerTable[tableName]).toISOString() : undefined;
    const response = await supabaseSyncService.pullBatch(tableName, lastSyncIso, 'updated_at');
    if (!response.success || !response.rows) return 0;
    logger.info("FETCH_PROVIDERS", `${response.rows.length} filas`);
    const providers: Provider[] = response.rows
      .filter((row: any) => row.id !== 'undefined')
      .map((row: any) => {
        const result = CloudProviderSchema.safeParse(row);
        if (!result.success && (row.rut || row.RUT)) {
          return { rut: String(row.rut || row.RUT), name: String(row.name || row.NOMBRE || 'PROV'),
                   withdrawalDays: Number(row.withdrawaldays || 0), hasExchange: !!(row.hasexchange) } as Provider;
        }
        return result.success ? result.data : null;
      })
      .filter((p): p is Provider => p !== null && !!p.rut && !!p.name)
      .map(p => ({ ...p, syncStatus: 'synced' as const }));
    if (providers.length > 0) await db.providers.bulkPut(providers);
    setTableSyncTime(tableName, Date.now());
    return providers.length;
  } catch (err: unknown) {
    logger.error("FETCH_PROVIDERS", (err as Error).message);
    throw err;
  }
};

export const importCustomersAndTemplatesFromCloud = async (): Promise<void> => {
  for (const table of ['CLIENTES', 'PLANTILLAS_MENSAJES', 'PLANTILLAS_CORREOS']) {
    try { await dynamicSyncService.pullSync(table); }
    catch (err: unknown) {
      const msg = handleError(err).message;
      if (!msg.includes('Table not found')) logger.warn("FETCH_CONFIG", msg);
    }
  }
};

export const getGlobalPendingCount = async (): Promise<number> => {
  try {
    let count = await ScanRepository.getPendingSyncCount();
    count += await db.sessions.where('syncStatus').anyOf(['pending', 'error', 'pending_delete']).count();
    count += await db.products.where('syncStatus').anyOf(['pending', 'error', 'pending_delete']).count();
    count += await db.providers.where('syncStatus').anyOf(['pending', 'error', 'pending_delete']).count();
    count += await db.dynamic_data.where('syncStatus').anyOf(['pending', 'error', 'pending_delete']).count();
    return count;
  } catch { return 0; }
};

export const resetSyncLock = () => {
  isSyncingInProgress = false;
  useSyncStore.getState().setSyncing(false);
};
