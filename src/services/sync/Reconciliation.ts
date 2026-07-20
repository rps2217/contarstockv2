/**
 * Reconciliation - Reconciliación de datos entre local y nube
 *
 * Extraído de syncManager.ts para reducir complejidad.
 */

import { db } from '../../db';
import { logger } from '../logger';
import { supabaseSyncService } from '../supabaseSyncService';
import { SessionRepository } from '../../repositories/SessionRepository';
import { ScanRepository } from '../../repositories/ScanRepository';
import { getSettings } from '../settings';
import type { SupabaseRow } from '../types/common';

/**
 * Reconciliación de Recepción:
 * Compara los registros locales con la nube y elimina los que ya no existen en Firestore.
 */
export const reconcileReception = async (
  onProgress?: (msg: string) => void
): Promise<{ deleted: number }> => {
  try {
    const config = getSettings().cloudConfig;
    const targetTable = config?.receptionTableName || 'RECEPCION_BULTOS';

    if (onProgress) onProgress('Verificando integridad con la nube...');

    const response = await supabaseSyncService.pullBatch(targetTable);
    if (!response.success || !response.rows) return { deleted: 0 };

    const remoteIds = new Set(response.rows.map((r: SupabaseRow) => String(r.id || r.ID)));

    // Buscar sesiones locales de recepción que ya fueron sincronizadas (tienen timestamp)
    const localSyncedReception = await SessionRepository.getByType('reception');
    const filteredSynced = localSyncedReception.filter(s => !!s.lastSyncTimestamp);

    const toDelete = filteredSynced.filter(s => !remoteIds.has(s.id));

    if (toDelete.length > 0) {
      const idsToDelete = toDelete.map(s => s.id);
      if (onProgress) onProgress(`Limpiando ${idsToDelete.length} registros obsoletos...`);

      await db.transaction('rw', [db.scans, db.sessions], async () => {
        await ScanRepository.deleteBySessions(idsToDelete);
        await SessionRepository.deleteMany(idsToDelete);
      });

      return { deleted: idsToDelete.length };
    }

    return { deleted: 0 };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('RECONCILE_RECEPTION_FAIL', error.message);
    return { deleted: 0 };
  }
};

/**
 * Obtiene el conteo global de elementos pendientes de sincronizar
 */
export const getGlobalPendingCount = async (): Promise<number> => {
  try {
    let count = 0;

    // 1. Pending scans (inventory/compliance/reception items)
    const scanCount = await ScanRepository.getPendingSyncCount();
    count += scanCount;

    // 2. Pending sessions
    const sessionCount = await db.sessions
      .where('syncStatus')
      .anyOf(['pending', 'error', 'pending_delete'])
      .count();
    count += sessionCount;

    // 3. Products
    const productCount = await db.products
      .where('syncStatus')
      .anyOf(['pending', 'error', 'pending_delete'])
      .count();
    count += productCount;

    // 4. Providers
    const providerCount = await db.providers
      .where('syncStatus')
      .anyOf(['pending', 'error', 'pending_delete'])
      .count();
    count += providerCount;

    // 5. Dynamic data (Expiry, Events, etc.)
    const dynamicCount = await db.dynamic_data
      .where('syncStatus')
      .anyOf(['pending', 'error', 'pending_delete'])
      .count();
    count += dynamicCount;

    return count;
  } catch (error: unknown) {
    logger.error(
      'Reconciliation',
      'getGlobalPendingCount failed',
      error instanceof Error ? error.message : String(error)
    );
    return 0;
  }
};
