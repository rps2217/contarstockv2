import { db, SyncLog } from '../db';
import { BaseDexieRepository } from './core/BaseDexieRepository';

/**
 * Repository para cola de sincronización (sync_logs)
 * Gestiona registros de logs de sincronización
 */
export class SyncQueueRepository extends BaseDexieRepository<SyncLog> {
  constructor() {
    super(db.sync_logs);
  }

  async getRecent(limit: number = 50): Promise<SyncLog[]> {
    return await this.table.orderBy('timestamp').reverse().limit(limit).toArray();
  }

  async countByStatus(status: 'success' | 'error'): Promise<number> {
    return await this.table.where('status').equals(status).count();
  }

  async clearOldLogs(olderThanDays: number = 7): Promise<void> {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const oldLogs = await this.table.filter(log => log.timestamp < cutoff).toArray();
    const ids = oldLogs.map(log => log.id as number).filter(id => id !== undefined);
    if (ids.length > 0) {
      await this.table.bulkDelete(ids);
    }
  }
}

export const syncQueueRepository = new SyncQueueRepository();
