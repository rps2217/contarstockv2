/**
 * =============================================================================
 * SYNC EVENT PULLER - Procesamiento de eventos desde la nube
 * =============================================================================
 *
 * Lógica para procesar eventos sincronizados desde Supabase.
 *
 * @module sync/unified/syncEventPuller
 */

import { supabase } from '@/lib/supabase';
import { db } from '@/db';
import { logger } from '@/services/logger';
import { syncRegistry } from './registry';
import { syncMetricsService } from './SyncMetricsService';
import type { TableSyncMeta, TableSyncResult } from './types';

/**
 * Pull de registros desde Supabase para una tabla específica
 */
export async function pullTable(tableName: string): Promise<TableSyncResult> {
  const startTime = performance.now();
  const meta = syncRegistry[tableName];

  if (!meta) {
    syncMetricsService.recordMetric({
      operation: 'batch_pull',
      tableName,
      duration: performance.now() - startTime,
      success: false,
      recordsAffected: 0,
      error: 'Unknown table',
      timestamp: Date.now(),
    });
    return {
      tableName,
      added: 0,
      updated: 0,
      deleted: 0,
      errors: ['Unknown table'],
      duration: 0,
    };
  }

  // Fetch remote data
  const { data, error } = await supabase.from(meta.remoteTable).select('*');

  if (error) {
    syncMetricsService.recordMetric({
      operation: 'batch_pull',
      tableName,
      duration: performance.now() - startTime,
      success: false,
      recordsAffected: 0,
      error: error.message,
      timestamp: Date.now(),
    });
    return {
      tableName,
      added: 0,
      updated: 0,
      deleted: 0,
      errors: [error.message],
      duration: performance.now() - startTime,
    };
  }

  // Process data based on table type
  let added = 0;
  let updated = 0;

  if (tableName === 'events') {
    const result = await processRemoteEvents(data || [], meta);
    added = result.added;
    updated = result.updated;
  } else if (meta.isDynamic) {
    added = await processDynamicData(data || [], meta);
  } else {
    updated = await processGenericTable(data || [], meta);
  }

  syncMetricsService.recordMetric({
    operation: 'batch_pull',
    tableName,
    duration: performance.now() - startTime,
    success: true,
    recordsAffected: added + updated,
    timestamp: Date.now(),
  });

  return {
    tableName,
    added,
    updated,
    deleted: 0,
    errors: [],
    duration: performance.now() - startTime,
  };
}

/**
 * Procesa eventos desde la nube con manejo de eliminados localmente
 */
export async function processRemoteEvents(
  data: any[],
  meta: TableSyncMeta
): Promise<{ added: number; updated: number }> {
  let added = 0;
  let updated = 0;

  try {
    // Obtener lista de eventos eliminados localmente
    const deletedEvents = await db.deletedEvents.toArray();
    const deletedKeys = new Set(deletedEvents.map(e => e.eventKey.toLowerCase()));

    // Obtener todos los eventos locales existentes
    const localTable = (db as any)[meta.localTable];
    if (!localTable) return { added, updated };

    const existingEvents = await localTable.toArray();

    // Crear mapa de eventos locales: key -> { id, localTimestamp }
    const localEventsMap = new Map<string, { id: number; timestamp: number }>();
    existingEvents.forEach((e: any) => {
      const key = `${e.frcNumber || ''}~${e.barcode || ''}`.toLowerCase();
      if (key !== '~') {
        localEventsMap.set(key, {
          id: e.id!,
          timestamp: e.createdAt || 0,
        });
      }
    });

    // Procesar cada evento remoto
    for (const row of data || []) {
      const remoteKey = `${row.frc_code || ''}~${row.barcode || ''}`.toLowerCase();
      const remoteTimestamp = row.updated_at ? new Date(row.updated_at).getTime() : 0;

      // Solo procesar si tiene clave válida
      if (remoteKey === '~' || (!row.frc_code && !row.barcode)) continue;

      // SKIP: Si el evento fue eliminado localmente, no descargarlo
      if (deletedKeys.has(remoteKey)) {
        logger.info('SYNC', `Evento omitido (eliminado localmente): ${remoteKey}`);
        continue;
      }

      const localEvent = localEventsMap.get(remoteKey);

      if (!localEvent) {
        // No existe localmente, agregar
        const local = meta.mapToLocal ? meta.mapToLocal(row) : row;
        if (local) {
          await localTable.put(local as any);
          added++;
        }
      } else if (remoteTimestamp > localEvent.timestamp) {
        // Existe pero remoto es más nuevo, actualizar
        const local = meta.mapToLocal ? meta.mapToLocal(row) : row;
        if (local) {
          await localTable.update(localEvent.id, {
            ...local,
            syncStatus: 'synced',
          } as any);
          updated++;
        }
      }
      // Si local es más nuevo o igual, no hacer nada
    }

    if (added > 0 || updated > 0) {
      logger.info('SYNC', `Eventos: ${added} agregados, ${updated} actualizados desde nube`);
    }
  } catch (err) {
    logger.warn('SYNC', 'Error procesando eventos desde nube:', err);
  }

  return { added, updated };
}

/**
 * Procesa datos remotos genéricos para tablas dinámicas
 */
export async function processDynamicData(data: any[], meta: TableSyncMeta): Promise<number> {
  let count = 0;
  for (const row of data || []) {
    const local = meta.mapToLocal ? meta.mapToLocal(row) : row;
    if (local) {
      await db.dynamic_data.put(local as any);
      count++;
    }
  }
  return count;
}

/**
 * Procesa datos remotos genéricos para tablas normales
 */
export async function processGenericTable(data: any[], meta: TableSyncMeta): Promise<number> {
  let count = 0;
  const localTable = (db as any)[meta.localTable];
  if (!localTable) return count;

  for (const row of data || []) {
    const local = meta.mapToLocal ? meta.mapToLocal(row) : row;
    if (local) {
      await localTable.put(local as any);
      count++;
    }
  }
  return count;
}
