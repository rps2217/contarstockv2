import { supabaseSyncService } from '../supabaseSyncService';
import { syncRegistry, TableSyncMeta } from './syncRegistry';
import { db } from '../../db';
import { logger } from '../logger';
import { telemetry } from '../telemetryService';
import { useSyncStore } from '@/stores';
import {
  getConfiguredStrategy,
  applyStrategy,
  type ConflictStrategy,
  type ConflictResolution,
} from './ConflictResolution';

// Tipo para registros de sync
type SyncRecord = Record<string, unknown>;

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
  };
};

export class GenericSyncEngine {
  /**
   * Pushes only dirty (non-synced) local changes to the cloud.
   */
  async pushIncremental(registryKey: string): Promise<{ success: number; failed: number }> {
    const meta = syncRegistry[registryKey];
    if (!meta) throw new Error(`Registry key ${registryKey} not found`);

    const localTable = db[meta.localTable] as DexieTable;
    if (!localTable) return { success: 0, failed: 0 };

    // Skip optional tables that don't exist
    if (meta.optional) {
      return { success: 0, failed: 0 };
    }

    // 1. Process Deletions First
    let toDelete: SyncRecord[] = [];
    if (meta.filterField === 'tableName' && meta.filterValue) {
      toDelete = await localTable
        .where('[tableName+syncStatus]')
        .equals([meta.filterValue, 'pending_delete'])
        .toArray();
    } else {
      toDelete = await localTable.where('syncStatus').equals('pending_delete').toArray();
      if (meta.filterField && meta.filterValue) {
        toDelete = toDelete.filter(item => item[meta.filterField!] === meta.filterValue);
      }
    }

    for (const record of toDelete) {
      try {
        const id = record[meta.primaryKey] || record.id;
        await supabaseSyncService.deleteRemote(meta.remoteTable, String(id));
        await localTable.delete(id);
      } catch (e: unknown) {
        logger.error(
          'SYNC_ENGINE',
          `Deletion failed for ${meta.remoteTable}`,
          (e as Error).message
        );
      }
    }

    // 2. Process Upserts (Pushes)
    let dirtyItems: SyncRecord[] = [];
    if (meta.filterField === 'tableName' && meta.filterValue) {
      const pendingItems = await localTable
        .where('[tableName+syncStatus]')
        .equals([meta.filterValue, 'pending'])
        .toArray();
      const errorItems = await localTable
        .where('[tableName+syncStatus]')
        .equals([meta.filterValue, 'error'])
        .toArray();
      dirtyItems = [...pendingItems, ...errorItems];
    } else {
      const pendingItems = await localTable.where('syncStatus').equals('pending').toArray();
      const errorItems = await localTable.where('syncStatus').equals('error').toArray();
      dirtyItems = [...pendingItems, ...errorItems];
      if (meta.filterField && meta.filterValue) {
        dirtyItems = dirtyItems.filter(item => item[meta.filterField!] === meta.filterValue);
      }
    }

    if (!dirtyItems.length) return { success: 0, failed: 0 };

    const BATCH_SIZE = 100;
    let totalSuccess = 0;
    let totalFailed = 0;

    for (let i = 0; i < dirtyItems.length; i += BATCH_SIZE) {
      const chunk = dirtyItems.slice(i, i + BATCH_SIZE);
      const rows = meta.mapToRemote
        ? chunk.map(meta.mapToRemote)
        : chunk.map(item => ({ ...item, id: item[meta.primaryKey] || item.id }));

      try {
        const result = await supabaseSyncService.pushBatch(meta.remoteTable, rows as object[]);
        if (result.success) {
          // Mark as synced locally
          await db.transaction('rw', localTable as unknown as string[], async () => {
            for (const item of chunk) {
              const id = item[meta.primaryKey] || item.id;
              await localTable.update(id, {
                syncStatus: 'synced',
                lastSyncTimestamp: Date.now(),
              });
            }
          });
          totalSuccess += chunk.length;
        } else {
          totalFailed += chunk.length;
          logger.error(
            'SYNC_ENGINE',
            `Incremental push failed for ${meta.remoteTable}`,
            result.error
          );
          telemetry.track('ERROR', 'SYNC_FAILED', {
            table: meta.remoteTable,
            error: result.error,
            type: 'push',
          });
        }
      } catch (e: unknown) {
        totalFailed += chunk.length;
        logger.error(
          'SYNC_ENGINE',
          `Incremental push exception for ${meta.remoteTable}`,
          (e as Error).message
        );
        telemetry.track('ERROR', 'SYNC_EXCEPTION', {
          table: meta.remoteTable,
          error: (e as Error).message,
          type: 'push',
        });
      }
    }

    return { success: totalSuccess, failed: totalFailed };
  }

  /**
   * Pulls remote changes and merges them locally.
   */
  async pullRemoteChanges(registryKey: string): Promise<{ added: number; updated: number }> {
    const meta = syncRegistry[registryKey];
    if (!meta) throw new Error(`Registry key ${registryKey} not found`);

    // Skip optional tables that don't exist
    if (meta.optional) {
      return { added: 0, updated: 0 };
    }

    const lastSyncKey = `lastSync_${meta.remoteTable}`;
    let lastSyncDate: string | undefined;
    try {
      const setting = await db.settings.get(lastSyncKey);
      if (setting && typeof setting.value === 'string') lastSyncDate = setting.value;
    } catch {
      // db.settings might not exist or be accessible, fallback
    }

    const result = await supabaseSyncService.pullBatch(meta.remoteTable, lastSyncDate);
    if (!result.success) return { added: 0, updated: 0 };

    const remoteRows = result.rows || [];

    // Si es una sincronización incremental y no hay registros nuevos, salimos temprano
    if (remoteRows.length === 0 && lastSyncDate) {
      return { added: 0, updated: 0 };
    }

    const localTable = db[meta.localTable] as DexieTable;
    if (!localTable) return { added: 0, updated: 0 };

    let added = 0;
    let updated = 0;
    let maxRemoteTime = 0;

    await db.transaction('rw', localTable as unknown as string[], async () => {
      // 1. Obtener todos los registros locales cargados para este registry (solo si es full pull)
      let localRecords: SyncRecord[] = [];
      if (!lastSyncDate) {
        if (meta.filterField === 'tableName' && meta.filterValue) {
          localRecords = await localTable.where('tableName').equals(meta.filterValue).toArray();
        } else {
          localRecords = await localTable.toArray();
          if (meta.filterField && meta.filterValue) {
            localRecords = localRecords.filter(
              item => item[meta.filterField!] === meta.filterValue
            );
          }
        }
      }

      // 2. Procesar inserciones y actualizaciones remotas (Upsert remoto -> local)
      const remoteIds = new Set<string>();
      for (const row of remoteRows) {
        const mapped = meta.mapToLocal ? meta.mapToLocal(row) : (row as Record<string, unknown>);
        const mappedRecord = mapped as Record<string, unknown>;
        const id = mappedRecord[meta.primaryKey] || mappedRecord.id;
        remoteIds.add(String(id));

        const existing = (await localTable.get(id)) as SyncRecord | undefined;
        const rawRemoteTime = row.updated_at || row.timestamp || 0;
        let remoteTime = 0;
        if (rawRemoteTime) {
          const parsedRemote = new Date(rawRemoteTime as string | number).getTime();
          if (!isNaN(parsedRemote)) {
            remoteTime = parsedRemote;
          }
        }
        if (remoteTime > maxRemoteTime) maxRemoteTime = remoteTime;

        if (existing) {
          const rawLocalTime =
            (existing as { updatedAt?: unknown; timestamp?: unknown }).updatedAt ||
            (existing as { timestamp?: unknown }).timestamp ||
            0;
          let localTime = 0;
          if (rawLocalTime) {
            const parsedLocal = new Date(rawLocalTime as string | number).getTime();
            if (!isNaN(parsedLocal)) {
              localTime = parsedLocal;
            }
          }

          if (
            existing.syncStatus === 'pending' ||
            existing.syncStatus === 'error' ||
            existing.syncStatus === 'pending_delete'
          ) {
            // CONFLICT DETECTED: Local version is unsynced, remote version was updated.
            // Apply conflict resolution strategy
            const strategy = getConfiguredStrategy();
            const resolution = applyStrategy(
              strategy,
              { data: existing, timestamp: localTime },
              { data: mapped as Record<string, unknown>, timestamp: remoteTime }
            );

            const store = useSyncStore.getState();

            if (!resolution.resolved) {
              // Manual: Register conflict for user decision
              store.addConflict();
              store.addIncident(
                meta.remoteTable,
                `Conflicto requiere decisión manual (ID: ${id}): ${resolution.reason}`
              );
              logger.warn('SYNC_CONFLICT', `Conflicto manual detectado para ${id}`);
            } else if (resolution.useLocal) {
              // Client wins: Keep local version
              logger.info(
                'SYNC_CONFLICT',
                `Conflicto resuelto (client_wins) para ${id}: ${resolution.reason}`
              );
            } else {
              // Server wins: Apply remote version
              await localTable.update(id, {
                ...(resolution.resolvedData as Record<string, unknown>),
                syncStatus: 'synced',
              });
              updated++;
              logger.info(
                'SYNC_CONFLICT',
                `Conflicto resuelto (server_wins) para ${id}: ${resolution.reason}`
              );
            }
          } else if (remoteTime > localTime) {
            await localTable.update(id, { ...mappedRecord, syncStatus: 'synced' });
            updated++;
          }
        } else {
          await localTable.add({ ...mappedRecord, syncStatus: 'synced' });
          added++;
        }
      }

      // 3. Reconciliación total de eliminaciones (Solo en pull completo)
      // Si un registro local está marcado como 'synced' (o 'error') pero NO está en las filas de la nube,
      // significa que fue borrado en otro dispositivo/servidor y debe ser removido localmente.
      if (!lastSyncDate && localRecords.length > 0) {
        for (const localRec of localRecords) {
          const localId = String(localRec[meta.primaryKey] || localRec.id || '');
          if (
            (localRec.syncStatus === 'synced' || localRec.syncStatus === 'error') &&
            !remoteIds.has(localId)
          ) {
            logger.info(
              'SYNC_RECONCILE',
              `Eliminando registro huérfano local de ${meta.remoteTable}: ${localId}`
            );
            await localTable.delete(localRec[meta.primaryKey] || localRec.id);
          }
        }
      }
    });

    if (maxRemoteTime > 0) {
      try {
        // Save the date slightly before the max to handle identical timestamps if any.
        // Actually, saving maxRemoteTime exactly is okay.
        await db.settings.put({ key: lastSyncKey, value: new Date(maxRemoteTime).toISOString() });
      } catch (e: unknown) {
        logger.error('SYNC_ENGINE', `Failed to update last sync date for ${meta.remoteTable}`);
      }
    }

    return { added, updated };
  }

  /**
   * Full Sync Cycle: Pull then Push.
   */
  async sync(registryKey: string) {
    try {
      const pullRes = await this.pullRemoteChanges(registryKey);
      const pushRes = await this.pushIncremental(registryKey);
      return { pullRes, pushRes, success: true };
    } catch (e: unknown) {
      logger.error('SYNC_ENGINE', `Full sync failed for ${registryKey}`, (e as Error).message);
      return { success: false, error: (e as Error).message };
    }
  }
}

export const genericSyncEngine = new GenericSyncEngine();
