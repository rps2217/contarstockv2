/**
 * Orchestrador de sincronizacion
 * Coordina los comandos de sync usando la FSM
 * Reemplaza la logica principal de syncManager.ts
 */
import { useSyncStore } from '../../../store/useSyncStore';
import { handleError } from '../../../services/types';
import { logger } from '../../../services/logger';
import { syncFSM } from '../fsm';
import { executeInventorySync } from './InventorySyncCommand';
import { executeReceptionSync } from './ReceptionSyncCommand';
import { executeCatalogSync } from './CatalogSyncCommand';
import { dynamicSyncService } from '../../../services/dynamicSync';
import { ScanRepository, SessionRepository } from '../../../repositories';
import type { UploadGroup } from '../fsm/types';
import type { CountingSession } from '../../../types';

let isSyncingInProgress = false;

/**
 * Resetea el lock de sincronizacion
 */
export function resetSyncLock(): void {
  isSyncingInProgress = false;
  syncFSM.reset();
  useSyncStore.getState().setSyncing(false);
}

/**
 * Ejecuta la sincronizacion completa
 */
export async function executeFullSync(
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; syncedCount: number; errorCount: number }> {
  if (isSyncingInProgress) {
    throw new Error("Sincronizacion en progreso, por favor intente nuevamente en unos segundos.");
  }

  isSyncingInProgress = true;
  syncFSM.handle({ type: 'START_SYNC' });
  useSyncStore.getState().setSyncing(true);

  let syncedCount = 0;
  let errorCount = 0;

  try {
    // 1. Obtener grupos pendientes
    if (onProgress) onProgress("Preparando sincronizacion...");
    const groups = await getPendingUploadGroups();

    if (groups.length === 0) {
      if (onProgress) onProgress("No hay elementos pendientes de sincronizar.");
      syncFSM.handle({ type: 'SYNC_COMPLETE' });
      return { success: true, syncedCount: 0, errorCount: 0 };
    }

    // 2. Procesar cada grupo
    for (const group of groups) {
      try {
        const result = await executeGroupSync(group, onProgress);
        syncedCount += result.syncedCount;
        errorCount += result.errorCount;
      } catch (err) {
        const errorObj = handleError(err);
        const errorMsg = typeof errorObj === 'string' ? errorObj : errorObj.message;
        logger.error("GROUP_SYNC_FAIL", errorMsg);
        syncFSM.handle({ type: 'SYNC_ERROR', error: errorMsg });
        errorCount++;
      }
    }

    // 3. Marcar como completo
    if (errorCount === 0) {
      syncFSM.handle({ type: 'SYNC_COMPLETE' });
    }
    
    useSyncStore.getState().setLastSyncTime(Date.now());
    return { success: errorCount === 0, syncedCount, errorCount };

  } catch (err) {
    const errorObj = handleError(err);
    const errorMsg = typeof errorObj === 'string' ? errorObj : errorObj.message;
    logger.error("SYNC_FAIL", errorMsg);
    syncFSM.handle({ type: 'SYNC_ERROR', error: errorMsg });
    throw err;
  } finally {
    isSyncingInProgress = false;
    useSyncStore.getState().setSyncing(false);
  }
}

/**
 * Ejecuta sincronizacion de un grupo especifico
 */
async function executeGroupSync(
  group: UploadGroup,
  onProgress?: (msg: string) => void
): Promise<{ syncedCount: number; errorCount: number }> {
  try {
    if (group.type === 'dynamic' && group.tableName) {
      // Sincronizacion dinamica
      await dynamicSyncService.syncAllPending(onProgress, group.tableName);
      return { syncedCount: 1, errorCount: 0 };
    }

    if (group.erpOrder === 'REGISTROS_HUERFANOS') {
      // Purga de registros residuales
      if (onProgress) onProgress("Purgando registros residuales...");
      const unsynced = await ScanRepository.getUnsynced();
      const orphanIds = unsynced
        .filter(s => !s.sessionId || s.sessionId === 'ORPHAN')
        .map(s => s.id);
      await ScanRepository.markAsSynced(orphanIds);
      return { syncedCount: orphanIds.length, errorCount: 0 };
    }

    if (group.type === 'reception') {
      // Sincronizacion de recepcion
      const result = await executeReceptionSync(group, onProgress);
      return {
        syncedCount: result.syncedCount,
        errorCount: result.errors.length
      };
    }

    if (group.type === 'products') {
      // Sincronizacion de catalogos
      const result = await executeCatalogSync(onProgress);
      return {
        syncedCount: result.products + result.providers,
        errorCount: 0
      };
    }

    // Sincronizacion de inventario (standard/hammer)
    let syncedCount = 0;
    for (const sessionId of group.sessionIds) {
      const session = await SessionRepository.getById(sessionId);
      if (!session) continue;

      const result = await executeInventorySync(session, onProgress);
      if (result.success) {
        syncedCount++;
      }
    }

    return { syncedCount, errorCount: group.sessionCount - syncedCount };

  } catch (err) {
    const errorObj = handleError(err);
    const errorMsg = typeof errorObj === 'string' ? errorObj : errorObj.message;
    logger.error("GROUP_SYNC_ERROR", errorMsg);
    return { syncedCount: 0, errorCount: 1 };
  }
}

/**
 * Obtiene los grupos pendientes de sincronizar
 */
export async function getPendingUploadGroups(): Promise<UploadGroup[]> {
  const groups: Record<string, UploadGroup> = {};

  // 1. Scans (Inventory/Hammer)
  const unsyncedScans = await ScanRepository.getUnsynced();

  if (unsyncedScans.length > 0) {
    const sessionIds = Array.from(new Set(unsyncedScans.map(s => s.sessionId)));
    const sessions = await SessionRepository.getByIds(sessionIds);
    const sessionMap = new Map<string, CountingSession>(sessions.map(s => [s.id, s]));

    for (const scan of unsyncedScans) {
      const session = sessionMap.get(scan.sessionId);
      if (!session) {
        if (!groups['SISTEMA_RESIDUAL']) {
          groups['SISTEMA_RESIDUAL'] = {
            erpOrder: 'REGISTROS_HUERFANOS',
            sessionCount: 1,
            totalUnits: 0,
            sessionIds: ['ORPHAN'],
            logisticsLabels: ['Recuperado de Memoria'],
            type: 'orphans',
            isHammer: true
          };
        }
        groups['SISTEMA_RESIDUAL'].totalUnits += scan.quantity;
        continue;
      }

      const erp = session.erpOrder;
      if (!groups[erp]) {
        groups[erp] = {
          erpOrder: erp,
          sessionCount: 0,
          totalUnits: 0,
          sessionIds: [],
          logisticsLabels: [],
          type: 'inventory',
          isHammer: session.sessionType === 'hammer'
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

  // 2. Reception (bultos finalizados no sincronizados)
  const receptionSessions = await SessionRepository.getByType('reception');
  const unsyncedReception = receptionSessions.filter(s => !s.lastSyncTimestamp);

  if (unsyncedReception.length > 0) {
    groups['RECEP_CLOUD'] = {
      erpOrder: 'RECEPCIÓN_BULTOS',
      sessionCount: unsyncedReception.length,
      totalUnits: 0,
      sessionIds: unsyncedReception.map(s => s.id),
      logisticsLabels: unsyncedReception.map(s => s.logisticsLabel),
      type: 'reception',
      isHammer: false
    };
  }

  return Object.values(groups);
}

/**
 * Obtiene el conteo total de elementos pendientes
 */
export async function getGlobalPendingCount(): Promise<number> {
  const scans = await ScanRepository.getUnsynced();
  const sessions = await SessionRepository.getByType('reception');
  const unsyncedReception = sessions.filter(s => !s.lastSyncTimestamp);
  
  return scans.length + unsyncedReception.length;
}
