import { db, SystemLog } from '../db';
import { BaseDexieRepository } from './core/BaseDexieRepository';

export class SystemLogRepository extends BaseDexieRepository<SystemLog> {
  constructor() {
    super(db.logs);
  }

  async getRecentLogs(limit: number = 200, levelFilter?: string): Promise<SystemLog[]> {
    let query = this.table.orderBy('timestamp').reverse();
    if (levelFilter && levelFilter !== 'all') {
      let filtered = await query.toArray();
      return filtered.filter(l => l.level === levelFilter).slice(0, limit);
    }
    return await query.limit(limit).toArray();
  }

  async clearAllLogs(): Promise<void> {
    await this.table.clear();
  }
}

export const systemLogRepository = new SystemLogRepository();
