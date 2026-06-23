/**
 * Command para sincronizar sesiones de inventario/conteo
 * Extraido de syncManager.ts - performBatchUpload
 */
import { SessionRepository } from '../../../repositories';
import { ScanRepository } from '../../../repositories';
import { supabaseSyncService } from '../../../services/supabaseSyncService';
import { aggregateScans } from '../../../services/aggregator';
import { createInventoryPayload } from '../../../services/cloud/mappers';
import { getSettings } from '../../../services/settings';
import { logger } from '../../../services/logger';
import { useSyncStore } from '../../../store/useSyncStore';
import type { CountingSession } from '../../../types';

const UPLOAD_BATCH_SIZE = 500;

export interface InventorySyncResult {
  success: boolean;
  syncedSessions: number;
  failedSessions: number;
  totalUnits: number;
  errors: string[];
}

/**
 * Sincroniza sesiones de inventario (standard, hammer)
 */
export async function executeInventorySync(
  session: CountingSession,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; totalUnits: number }> {
  const config = getSettings().cloudConfig;

  // 1. RESPALDO DE FOTO EN STORAGE
  if (session.labelPhoto && !session.photoUrl) {
    if (onProgress) onProgress(`Respaldando foto en la nube [${session.logisticsLabel}]...`);
    try {
      const photoPath = `labels/${session.id}.jpg`;
      const uploadResult = await supabaseSyncService.uploadPhoto(session.labelPhoto, photoPath);

      if (uploadResult.success && uploadResult.fileUrl) {
        await SessionRepository.updatePhotoUrl(session.id, uploadResult.fileUrl);
        if (onProgress) onProgress(`✓ Foto respaldada.`);
      }
    } catch (photoError) {
      console.warn("Fallo al subir foto:", photoError);
    }
  }

  if (onProgress) onProgress(`Preparando bulto ${session.logisticsLabel}...`);

  // 2. Obtener y filtrar scans
  const allScans = await ScanRepository.getBySession(session.id);
  const unsyncedScans = allScans.filter(s => s.synced === 0);

  if (unsyncedScans.length === 0) {
    await SessionRepository.updateSyncTimestamp(session.id);
    return { success: true, totalUnits: 0 };
  }

  // 3. Consolidar y subir
  const consolidatedItems = await aggregateScans(allScans);
  const fullPayload = createInventoryPayload(session, consolidatedItems, 'manual');
  const targetTable = session.sessionType === 'hammer'
    ? (config?.countsTableName || "CONTEOS")
    : (config?.consolidatedTableName || "CONSOLIDADO");

  const totalBatches = Math.ceil(fullPayload.length / UPLOAD_BATCH_SIZE);
  const allScanIdsToMark: string[] = unsyncedScans.map(s => s.id);
  let sessionSuccess = true;

  for (let i = 0; i < totalBatches; i++) {
    const chunk = fullPayload.slice(i * UPLOAD_BATCH_SIZE, (i + 1) * UPLOAD_BATCH_SIZE);
    if (onProgress) onProgress(`Subiendo lote ${i + 1}/${totalBatches}...`);

    try {
      const result = await supabaseSyncService.pushBatch(targetTable, chunk);

      if (!result.success) {
        sessionSuccess = false;
        logger.error("BATCH_UPLOAD_PARTIAL_FAIL", result.error);
        useSyncStore.getState().addIncident(targetTable, result.error || "Fallo en lote parcial");
      }
    } catch (batchError: unknown) {
      sessionSuccess = false;
      const errorMsg = batchError instanceof Error ? batchError.message : String(batchError);
      logger.error("BATCH_UPLOAD_CRITICAL_FAIL", errorMsg);
      useSyncStore.getState().addIncident(targetTable, errorMsg);
    }
  }

  // 4. Marcar como sincronizado
  if (sessionSuccess) {
    await ScanRepository.markAsSynced(allScanIdsToMark);
    await SessionRepository.updateSyncTimestamp(session.id);

    // RESPALDO DE LA SESIÓN
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
    return { success: true, totalUnits: fullPayload.length };
  } else {
    if (onProgress) onProgress(`⚠ Bulto ${session.logisticsLabel} con errores. Se reintentará luego.`);
    return { success: false, totalUnits: fullPayload.length };
  }
}
