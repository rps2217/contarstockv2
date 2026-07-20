/**
 * =============================================================================
 * SYNC CONFLICT CHECKER - Detección de conflictos de sincronización
 * =============================================================================
 *
 * Módulo para detectar conflictos entre datos locales y remotos.
 *
 * @module sync/unified/syncConflictChecker
 */

import { db } from '@/db';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';
import { telemetry } from '@/services/analytics/telemetryService';
import { formatError } from './syncHelpers';
import { syncRegistry } from './registry';
import type { SyncConflict, ConflictStrategy } from './types';

/**
 * Detecta conflictos de sincronización para todas las tablas registradas
 */
export async function checkConflicts(
  emitConflict: (conflict: SyncConflict) => void
): Promise<SyncConflict[]> {
  const conflicts: SyncConflict[] = [];
  const now = Date.now();

  for (const [tableName, meta] of Object.entries(syncRegistry)) {
    if (meta.optional) continue;

    try {
      const conflictsForTable = await checkTableConflicts(meta, tableName);
      conflicts.push(...conflictsForTable);
    } catch (e) {
      logger.error('CONFLICT_CHECK', `Error checking conflicts for ${tableName}`, formatError(e));
    }
  }

  // Emitir eventos para cada conflicto detectado
  for (const conflict of conflicts) {
    emitConflict(conflict);
  }

  telemetry.track('SYNC', 'CONFLICTS_DETECTED', { count: conflicts.length });

  return conflicts;
}

/**
 * Detecta conflictos para una tabla específica
 */
async function checkTableConflicts(
  meta: (typeof syncRegistry)[keyof typeof syncRegistry],
  tableName: string
): Promise<SyncConflict[]> {
  const conflicts: SyncConflict[] = [];
  const now = Date.now();

  const localTable = (db as any)[meta.localTable];
  if (!localTable) return conflicts;

  // Obtener items con cambios pendientes
  const localItems = await localTable.where('syncStatus').equals('pending').toArray();

  for (const localItem of localItems) {
    const recordId = localItem[meta.primaryKey] || localItem.id;

    // Obtener versión remota
    const { data: remoteItem, error } = await supabase
      .from(meta.remoteTable)
      .select('*')
      .eq(meta.primaryKey, recordId)
      .single();

    if (!error && remoteItem) {
      const remoteUpdated = new Date(remoteItem.updated_at).getTime();
      const localModified = localItem.lastSyncTimestamp || 0;

      // Conflicto si remoto es más nuevo y local tiene cambios
      if (remoteUpdated > localModified) {
        conflicts.push({
          tableName,
          recordId: String(recordId),
          localValue: localItem,
          remoteValue: remoteItem,
          field: 'multiple',
          detectedAt: now,
          resolved: false,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Resuelve conflictos usando la estrategia configurada
 */
export async function resolveConflicts(
  conflicts: SyncConflict[],
  strategy: ConflictStrategy,
  resolveSingle: (conflict: SyncConflict, strategy: ConflictStrategy) => Promise<boolean>,
  emitResolved: (conflict: SyncConflict, resolution: string) => void
): Promise<{ resolved: number; failed: number }> {
  let resolved = 0;
  let failed = 0;

  for (const conflict of conflicts) {
    try {
      const success = await resolveSingle(conflict, strategy);

      if (success) {
        conflict.resolved = true;
        conflict.resolution = strategy.type;
        resolved++;

        emitResolved(conflict, strategy.type);
      }
    } catch (e) {
      failed++;
      logger.error(
        'CONFLICT_RESOLVE',
        `Failed to resolve conflict for ${conflict.tableName}/${conflict.recordId}`,
        formatError(e)
      );
    }
  }

  telemetry.track('SYNC', 'CONFLICTS_RESOLVED', { resolved, failed, strategy: strategy.type });

  return { resolved, failed };
}
