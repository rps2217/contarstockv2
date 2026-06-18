import { db } from '../db';

/**
 * Repository para cola de sincronizacion
 * Gestiona elementos pendientes de sincronizar
 */
export class SyncQueueRepository {
  private table = db.sync_logs;

  async getAll(): Promise<never[]> {
    return await this.table.toArray() as never[];
  }

  async getById(id: number): Promise<never | null> {
    return (await this.table.get(id)) as never ?? null;
  }

  async getByStatus(status: 'success' | 'error'): Promise<never[]> {
    return await this.table.where('status').equals(status).toArray() as never[];
  }

  async getByTable(tableName: string): Promise<never[]> {
    return await this.table.where('tableName').equals(tableName).toArray() as never[];
  }

  async add(item: { timestamp: number; action: string; tableName: string; payload: unknown; status: 'success' | 'error' }): Promise<number> {
    return await this.table.add(item as never) as number;
  }

  async update(id: number, changes: Record<string, unknown>): Promise<void> {
    await this.table.update(id, changes as never);
  }

  async delete(id: number): Promise<void> {
    await this.table.delete(id);
  }

  async markSuccess(id: number): Promise<void> {
    await this.table.update(id, { status: 'success' } as never);
  }

  async markError(id: number, error: string): Promise<void> {
    await this.table.update(id, { status: 'error', errorMessage: error } as never);
  }

  async getRecent(limit: number = 50): Promise<never[]> {
    return await this.table.orderBy('timestamp').reverse().limit(limit).toArray() as never[];
  }

  async count(): Promise<number> {
    return await this.table.count();
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
