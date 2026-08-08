/**
 * =============================================================================
 * SYNC TABLE OPERATIONS - Operaciones de sincronización por tabla
 * =============================================================================
 *
 * Funciones para empujar y obtener cambios de tablas específicas.
 *
 * @module sync/unified/syncTableOperations
 */

import { db } from '@/db';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';
import { syncRegistry } from './registry';
import type { TableSyncMeta } from './types';

interface SyncResult {
  success: boolean;
  uploaded: number;
  errors: string[];
}

/**
 * Obtiene los elementos pendientes de sincronización para una tabla
 */
export async function getDirtyItems(
  tableName: string,
  meta: TableSyncMeta
): Promise<{ dirtyItems: any[]; toDelete: any[] }> {
  let dirtyItems: any[] = [];
  let toDelete: any[] = [];

  if (meta.isDynamic) {
    const pending = await db.dynamic_data
      .where({ tableName: meta.filterValue, syncStatus: 'pending' })
      .toArray();
    const errors = await db.dynamic_data
      .where({ tableName: meta.filterValue, syncStatus: 'error' })
      .toArray();
    dirtyItems = [...pending, ...errors];

    toDelete = await db.dynamic_data
      .where({ tableName: meta.filterValue, syncStatus: 'pending_delete' })
      .toArray();
  } else {
    const localTable = (db as any)[meta.localTable];
    if (!localTable) return { dirtyItems: [], toDelete: [] };

    const pending = await localTable.where('syncStatus').equals('pending').toArray();
    const errors = await localTable.where('syncStatus').equals('error').toArray();
    dirtyItems = [...pending, ...errors];
  }

  return { dirtyItems, toDelete };
}

/**
 * Procesa eliminaciones pendientes
 */
export async function processDeletions(meta: TableSyncMeta, toDelete: any[]): Promise<void> {
  for (const item of toDelete) {
    const remoteId = item.data?.id || item.data?.ID || item.id;
    try {
      const { error } = await supabase
        .from(meta.remoteTable)
        .delete()
        .eq(meta.primaryKey, remoteId);

      if (!error) {
        await db.dynamic_data.delete(item.id);
        logger.info('SYNC', `Eliminado de nube: ${meta.remoteTable}/${remoteId}`);
      }
    } catch (err) {
      logger.error('SYNC', `Error eliminando de nube: ${err}`);
    }
  }
}

/**
 * Marca elementos como sincronizados en la tabla local
 */
export async function markAsSynced(
  tableName: string,
  meta: TableSyncMeta,
  items: any[]
): Promise<void> {
  if (!items.length) return;

  if (meta.isDynamic) {
    await db.transaction('rw', db.dynamic_data, async () => {
      for (const item of items) {
        await db.dynamic_data.update(item.id, {
          syncStatus: 'synced',
          lastSyncTimestamp: Date.now(),
        });
      }
    });
  } else {
    const localTable = (db as any)[meta.localTable];
    if (!localTable) return;

    await db.transaction('rw', localTable, async () => {
      for (const item of items) {
        const id = item[meta.primaryKey] || item.id;
        await localTable.update(id, {
          syncStatus: 'synced',
          lastSyncTimestamp: Date.now(),
        });
      }
    });
  }
}

/**
 * Obtiene el mapeo de tabla local
 */
export function getLocalTable(meta: TableSyncMeta): any {
  return meta.isDynamic ? db.dynamic_data : (db as any)[meta.localTable];
}
