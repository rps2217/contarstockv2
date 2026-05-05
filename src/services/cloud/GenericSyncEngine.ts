import { supabaseSyncService } from '../supabaseSyncService';
import { syncRegistry, TableSyncMeta } from './syncRegistry';
import { db } from '../../db';
import { logger } from '../logger';
import { telemetry } from '../telemetryService';

export class GenericSyncEngine {
  /**
   * Pushes only dirty (non-synced) local changes to the cloud.
   */
  async pushIncremental(registryKey: string): Promise<{ success: number; failed: number }> {
    const meta = syncRegistry[registryKey];
    if (!meta) throw new Error(`Registry key ${registryKey} not found`);

    const localTable = (db as any)[meta.localTable];
    if (!localTable) return { success: 0, failed: 0 };

    // 1. Process Deletions First
    let deleteQuery = localTable.filter((item: any) => item.syncStatus === 'pending_delete');
    if (meta.filterField && meta.filterValue) {
      deleteQuery = deleteQuery.filter((item: any) => item[meta.filterField!] === meta.filterValue);
    }
    const toDelete = await deleteQuery.toArray();
    for (const record of toDelete) {
      try {
        const id = record[meta.primaryKey] || record.id;
        await supabaseSyncService.deleteRemote(meta.remoteTable, String(id));
        await localTable.delete(id);
      } catch (e: any) {
        logger.error('SYNC_ENGINE', `Deletion failed for ${meta.remoteTable}`, e.message);
      }
    }

    // 2. Process Upserts (Pushes)
    let query = localTable.filter((item: any) => item.syncStatus === 'pending' || item.syncStatus === 'error');
    
    if (meta.filterField && meta.filterValue) {
      query = query.filter((item: any) => item[meta.filterField!] === meta.filterValue);
    }

    const dirtyItems = await query.toArray();

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
        const result = await supabaseSyncService.pushBatch(meta.remoteTable, rows);
        if (result.success) {
          // Mark as synced locally
          await db.transaction('rw', localTable, async () => {
            for (const item of chunk) {
              const id = item[meta.primaryKey] || item.id;
              await localTable.update(id, { 
                syncStatus: 'synced',
                lastSyncTimestamp: Date.now()
              });
            }
          });
          totalSuccess += chunk.length;
        } else {
          totalFailed += chunk.length;
          logger.error('SYNC_ENGINE', `Incremental push failed for ${meta.remoteTable}`, result.error);
          telemetry.track('ERROR', 'SYNC_FAILED', { 
            table: meta.remoteTable, 
            error: result.error, 
            type: 'push' 
          });
        }
      } catch (e: any) {
        totalFailed += chunk.length;
        logger.error('SYNC_ENGINE', `Incremental push exception for ${meta.remoteTable}`, e.message);
        telemetry.track('ERROR', 'SYNC_EXCEPTION', { 
          table: meta.remoteTable, 
          error: e.message, 
          type: 'push' 
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

    const result = await supabaseSyncService.pullBatch(meta.remoteTable);
    if (!result.success || !result.rows) return { added: 0, updated: 0 };

    const remoteRows = result.rows;
    let added = 0;
    let updated = 0;

    const localTable = (db as any)[meta.localTable];
    if (!localTable) return { added: 0, updated: 0 };

    await db.transaction('rw', localTable, async () => {
      for (const row of remoteRows) {
        const mapped = meta.mapToLocal ? meta.mapToLocal(row) : row;
        const id = mapped[meta.primaryKey] || mapped.id;
        
        const existing = await localTable.get(id);
        if (existing) {
          // Conflict Resolution: Last Write Wins (using updated_at or timestamp)
          const remoteTime = new Date(row.updated_at || row.timestamp || 0).getTime();
          const localTime = existing.updatedAt || existing.timestamp || 0;

          if (existing.syncStatus === 'synced' || remoteTime > localTime) {
            await localTable.update(id, { ...mapped, syncStatus: 'synced' });
            updated++;
          }
        } else {
          await localTable.add({ ...mapped, syncStatus: 'synced' });
          added++;
        }
      }
    });

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
    } catch (e: any) {
      logger.error('SYNC_ENGINE', `Full sync failed for ${registryKey}`, e.message);
      return { success: false, error: e.message };
    }
  }
}

export const genericSyncEngine = new GenericSyncEngine();
