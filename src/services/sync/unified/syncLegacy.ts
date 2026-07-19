/**
 * =============================================================================
 * SYNC LEGACY - Funciones de Compatibilidad
 * =============================================================================
 *
 * Proporciona funciones legacy para compatibilidad hacia atrás con código
 * que usa las APIs antiguas de sincronización.
 *
 * @module unified/syncLegacy
 */

import { unifiedSyncEngine } from './UnifiedSyncEngine';
import { logger } from '@/services/logger';

/**
 * Mapeo de tipos legacy a tablas de Supabase
 */
const GROUP_TYPE_MAPPING: Record<string, string> = {
  INVENTARIO: 'INVENTARIO',
  RECEPCION: 'RECEPCION',
  VENCIMIENTOS: 'VENCIMIENTOS',
  EVENTOS: 'EVENTOS',
  AUDIT_LOGS: 'AUDIT_LOGS',
};

/**
 * Realiza upload de un grupo de datos (compatibilidad legacy)
 */
export async function uploadBatch(
  group: { type: string; data: Record<string, unknown>[] },
  onProgress?: (message: string) => void
): Promise<{ success: boolean; uploaded: number }> {
  const tableName = mapGroupTypeToTable(group.type);
  onProgress?.(`Iniciando upload a ${tableName}...`);

  const result = await unifiedSyncEngine.pushBatch(tableName, group.data);

  if (result.success) {
    onProgress?.(`Upload completado: ${result.uploaded} registros`);
  } else {
    onProgress?.(`Error: ${result.errors?.join(', ') || 'Error desconocido'}`);
  }

  return {
    success: result.success,
    uploaded: result.uploaded || 0,
  };
}

/**
 * Upload un grupo legacy (UploadGroup) con datos preparados
 */
export async function uploadGroupLegacy(
  _erpOrder: string,
  type: string,
  data: Record<string, unknown>[]
): Promise<{ success: boolean; uploaded: number }> {
  return uploadBatch({ type, data });
}

/**
 * Resetea el lock de sincronización (compatibilidad legacy)
 */
export function resetSyncLock(): void {
  logger.info('SYNC', 'Sync lock reset (no-op in unified engine)');
}

/**
 * Mapea tipo legacy a nombre de tabla
 */
function mapGroupTypeToTable(type: string): string {
  return GROUP_TYPE_MAPPING[type] || type;
}
