/**
 * Command para sincronizar sesiones de recepcion
 * Extraido de syncManager.ts - performBatchUpload
 */
import { SessionRepository } from '../../../repositories';
import { supabaseSyncService } from '../../../services/supabaseSyncService';
import { getSettings } from '../../../services/settings';
import type { UploadGroup } from '../fsm/types';

/**
 * Sincroniza sesiones de recepcion de bultos
 */
export async function executeReceptionSync(
  group: UploadGroup,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
  const config = getSettings().cloudConfig;
  const errors: string[] = [];
  let syncedCount = 0;

  if (onProgress) onProgress(`Subiendo registro de ${group.sessionCount} bultos...`);

  const rows = group.sessionIds.map((id, idx) => ({
    "id": id,
    "ID_RECEPCION": id,
    "FECHA_HORA": new Date().toISOString(),
    "ETIQUETA": group.logisticsLabels[idx],
    "ESTADO": "INGRESADO"
  }));

  const targetTable = config?.receptionTableName || "RECEPCION_BULTOS";

  try {
    const result = await supabaseSyncService.pushBatch(targetTable, rows);

    if (result.success) {
      for (const id of group.sessionIds) {
        await SessionRepository.updateSyncTimestamp(id);
        syncedCount++;
      }
      if (onProgress) onProgress(`✓ Recepcion sincronizada.`);
      return { success: true, syncedCount, errors: [] };
    } else {
      const error = result.error || 'Error desconocido';
      errors.push(error);
      if (onProgress) onProgress(`✗ Error: ${error}`);
      return { success: false, syncedCount: 0, errors };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    errors.push(errorMsg);
    if (onProgress) onProgress(`✗ Error: ${errorMsg}`);
    return { success: false, syncedCount, errors };
  }
}
