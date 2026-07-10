import { db, DynamicRecord } from '../db';
import { BaseDexieRepository } from './core/BaseDexieRepository';

export class DynamicDataRepository extends BaseDexieRepository<DynamicRecord> {
  constructor() {
    super(db.dynamic_data);
  }

  async getAllByTableName(tableName: string): Promise<DynamicRecord[]> {
    return await this.table.where('tableName').equals(tableName).reverse().sortBy('timestamp');
  }

  async getPendingCount(): Promise<number> {
    return await this.table.where('syncStatus').equals('pending').count();
  }

  async getErrorCount(): Promise<number> {
    return await this.table.where('syncStatus').equals('error').count();
  }

  async getPendingDynamicData(): Promise<DynamicRecord[]> {
    return await this.table.where('syncStatus').anyOf(['pending', 'error']).toArray();
  }

  async markAsSynced(id: string): Promise<void> {
    await this.table.update(id, { syncStatus: 'synced', syncError: undefined });
  }

  async setSyncError(id: string, error: string): Promise<void> {
    await this.table.update(id, { syncStatus: 'error', syncError: error });
  }

  async retryPending(id: string): Promise<void> {
    await this.table.update(id, { syncStatus: 'pending', syncError: undefined });
  }

  async deleteMany(ids: string[]): Promise<void> {
    await this.table.bulkDelete(ids);
  }
}

export const dynamicDataRepository = new DynamicDataRepository();
