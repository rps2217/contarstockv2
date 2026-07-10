import { db, SyncLog } from '../db';
import { BaseDexieRepository } from './core/BaseDexieRepository';

export class SyncLogRepository extends BaseDexieRepository<SyncLog> {
  constructor() {
    super(db.sync_logs);
  }

  async getRecentLogs(limit: number = 200, statusFilter?: string): Promise<SyncLog[]> {
    let query = this.table.orderBy('timestamp').reverse();
    if (statusFilter && statusFilter !== 'all') {
      let filtered = await query.toArray();
      return filtered.filter(l => l.status === statusFilter).slice(0, limit);
    }
    return await query.limit(limit).toArray();
  }

  async clearAllLogs(): Promise<void> {
    await this.table.clear();
  }
}

export const syncLogRepository = new SyncLogRepository();
