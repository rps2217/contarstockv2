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

// Tipo para acceso dinámico a tablas Dexie
type DexieTable = {
  get: (id: unknown) => Promise<unknown>;
  put: (item: unknown) => Promise<unknown>;
  add: (item: unknown) => Promise<unknown>;
  update: (id: unknown, changes: unknown) => Promise<number>;
  delete: (id: unknown) => Promise<void>;
  toArray: () => Promise<SyncRecord[]>;
  where: (field: string) => {
    equals: (value: unknown) => { toArray: () => Promise<SyncRecord[]> };
    anyOf: (values: unknown[]) => { toArray: () => Promise<SyncRecord[]> };
  };
};

// Tipo para registros de sync
interface SyncRecord {
  id?: number | string;
  syncStatus?: string;
  created_at?: string | number;
  updated_at?: string | number;
  lastSyncTimestamp?: number;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Obtiene los elementos pendientes de sincronización para una tabla
 */
export async function getDirtyItems(
  tableName: string,
  meta: TableSyncMeta
): Promise<{ dirtyItems: SyncRecord[]; toDelete: SyncRecord[] }> {
  let dirtyItems: SyncRecord[] = [];
  let toDelete: SyncRecord[] = [];

  if (meta.isDynamic) {
    const pending = (await db.dynamic_data
      .where({ tableName: meta.filterValue, syncStatus: 'pending' })
      .toArray()) as unknown as SyncRecord[];
    const errors = (await db.dynamic_data
      .where({ tableName: meta.filterValue, syncStatus: 'error' })
      .toArray()) as unknown as SyncRecord[];
    dirtyItems = [...pending, ...errors];

    toDelete = (await db.dynamic_data
      .where({ tableName: meta.filterValue, syncStatus: 'pending_delete' })
      .toArray()) as unknown as SyncRecord[];
  } else {
    const localTable = db[meta.localTable] as DexieTable;
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
export async function processDeletions(meta: TableSyncMeta, toDelete: SyncRecord[]): Promise<void> {
  for (const item of toDelete) {
    const remoteId =
      (item.data as Record<string, unknown> | undefined)?.id ||
      (item.data as Record<string, unknown> | undefined)?.ID ||
      item.id;
    try {
      const { error } = await supabase
        .from(meta.remoteTable)
        .delete()
        .eq(meta.primaryKey, remoteId as string);

      if (!error) {
        await db.dynamic_data.delete(item.id as number);
        logger.info('SYNC', `Eliminado de nube: ${meta.remoteTable}/${remoteId}`);
      }
    } catch (err: unknown) {
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
  items: SyncRecord[]
): Promise<void> {
  if (!items.length) return;

  if (meta.isDynamic) {
    await db.transaction('rw', db.dynamic_data, async () => {
      for (const item of items) {
        await db.dynamic_data.update(item.id as number, {
          syncStatus: 'synced',
          lastSyncTimestamp: Date.now(),
        });
      }
    });
  } else {
    const localTable = db[meta.localTable] as DexieTable;
    if (!localTable) return;

    await db.transaction('rw', localTable as unknown as string[], async () => {
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
export function getLocalTable(meta: TableSyncMeta): DexieTable | typeof db.dynamic_data {
  return meta.isDynamic ? db.dynamic_data : (db[meta.localTable] as DexieTable);
}
