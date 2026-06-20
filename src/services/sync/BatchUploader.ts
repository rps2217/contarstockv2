/**
 * BatchUploader - Sube datos al servidor en lotes
 *
 * Usa SyncFSM para control de flujo robusto.
 */

import { useSyncStore } from '@/stores';
import { logger } from '../logger';
import { supabaseSyncService } from '../supabaseSyncService';
import { dynamicSyncService } from '../dynamicSync';
import { SessionRepository } from '../../repositories/SessionRepository';
import { ScanRepository } from '../../repositories/ScanRepository';
import { getSettings } from '../settings';
import { syncFSM } from './fsm';
import { UploadGroup } from './UploadGroupBuilder';

const UPLOAD_BATCH_SIZE = 500;

export const getBatchSize = (): number => UPLOAD_BATCH_SIZE;

export const isUploadInProgress = (): boolean => syncFSM.isRunning();

export const resetUploadLock = () => {
  syncFSM.reset();
};

export const resetSyncLock = resetUploadLock;

/**
 * Sube un grupo de datos al servidor
 */
export const performBatchUpload = async (
  group: UploadGroup,
  onProgress?: (msg: string) => void
): Promise<void> => {
  if (syncFSM.isRunning()) {
    throw new Error("Sincronización en progreso, por favor intente nuevamente en unos segundos.");
  }

  await syncFSM.execute(async () => {
    const config = getSettings().cloudConfig;

    if (group.type === 'dynamic' && 'tableName' in group && (group as any).tableName) {
      await dynamicSyncService.syncAllPending(onProgress, (group as any).tableName);
    } else if (group.erpOrder === 'REGISTROS_HUERFANOS') {
      if (onProgress) onProgress("Purgando registros residuales...");
      const unsynced = await ScanRepository.getUnsynced();
      const orphanIds = unsynced.filter(s => !s.sessionId || s.sessionId === 'ORPHAN').map(s => s.id);
      for (const id of orphanIds) {
        await ScanRepository.markAsSynced([id]);
      }
    } else if (group.type === 'reception') {
      if (onProgress) onProgress(`Subiendo registro de ${group.sessionCount} bultos...`);
      const rows = group.sessionIds.map((id, idx) => ({
        "id": id,
        "ID_RECEPCION": id,
        "FECHA_HORA": new Date().toISOString(),
        "ETIQUETA": group.logisticsLabels[idx],
        "ESTADO": "INGRESADO"
      }));
      const targetTable = config?.receptionTableName || "RECEPCION_BULTOS";
      const result = await supabaseSyncService.pushBatch(targetTable, rows);
      if (result.success) {
        for (const id of group.sessionIds) {
          await SessionRepository.updateSyncTimestamp(id);
        }
        if (onProgress) onProgress(`✓ Recepción sincronizada.`);
      } else {
        throw new Error(result.error);
      }
    } else {
      // Inventory / Hammer sessions
      for (const sessionId of group.sessionIds) {
        const session = await SessionRepository.getById(sessionId);
        if (!session) {
          if (onProgress) onProgress(`⚠ Sesión ${sessionId} no encontrada.`);
          continue;
        }

        const scans = await ScanRepository.getBySession(sessionId);
        const allScanIdsToMark: string[] = scans.map(s => s.id);
        let sessionSuccess = true;

        const locations = new Set<string>();
        scans.forEach(s => {
          if (s.location) locations.add(s.location);
        });

        for (const location of locations) {
          const locationScans = scans.filter(s => s.location === location);
          const payload = {
            erpOrder: session.erpOrder,
            logisticsLabel: session.logisticsLabel,
            location,
            scans: locationScans.map(s => ({
              barcode: s.barcode,
              quantity: s.quantity,
              timestamp: s.timestamp
            })),
            totalUnits: locationScans.reduce((sum, s) => sum + s.quantity, 0)
          };

          const targetTable = "INVENTARIO";
          const result = await supabaseSyncService.pushBatch(targetTable, [payload]);

          if (!result.success) {
            sessionSuccess = false;
            useSyncStore.getState().addIncident(targetTable, result.error || 'Unknown error');
          }
        }

        if (sessionSuccess) {
          await ScanRepository.markAsSynced(allScanIdsToMark);
          await SessionRepository.updateSyncTimestamp(sessionId);

          try {
            const sessionPayload = {
              id: session.id,
              erpOrder: session.erpOrder,
              logisticsLabel: session.logisticsLabel,
              sessionType: session.sessionType,
              status: session.status || 'completed',
              createdAt: session.createdAt,
              totalUnits: session.totalUnits || 0,
              totalSKUs: session.totalSKUs || 0,
              photoUrl: session.photoUrl || '',
              lastSyncTimestamp: Date.now()
            };
            await supabaseSyncService.pushBatch('SESIONES_CONTEO', [sessionPayload]);
          } catch (sessionPushError) {
            console.warn("Fallo al subir datos de sesion a SESIONES_CONTEO:", sessionPushError);
          }

          if (onProgress) onProgress(`✓ Bulto ${session.logisticsLabel} Sincronizado.`);
        } else {
          if (onProgress) onProgress(`⚠ Bulto ${session.logisticsLabel} con errores.`);
        }
      }
    }
    useSyncStore.getState().setLastSyncTime(Date.now());
  }, onProgress);
};
