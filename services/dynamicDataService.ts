import { db, DynamicRecord } from '../db';
import { cloudApi } from './cloud/apiClient';
import { logger } from './logger';

export const dynamicDataService = {
  async saveRecord(tableName: string, data: any) {
    const id = crypto.randomUUID();
    const record: DynamicRecord = {
      id,
      tableName,
      data,
      timestamp: Date.now(),
      syncStatus: 'pending'
    };

    await db.dynamic_data.add(record);
    
    // Attempt background sync
    this.syncRecord(id).catch(err => {
      logger.error('DYNAMIC_DATA', `Error syncing record ${id}`, err.message);
    });

    return id;
  },

  async syncRecord(id: string) {
    const record = await db.dynamic_data.get(id);
    if (!record || record.syncStatus === 'synced') return;

    try {
      const response = await cloudApi.appendRows(record.tableName, [record.data]);
      if (response.success) {
        await db.dynamic_data.update(id, { syncStatus: 'synced' });
      } else {
        await db.dynamic_data.update(id, { syncStatus: 'error', syncError: response.error });
      }
    } catch (error: any) {
      await db.dynamic_data.update(id, { syncStatus: 'error', syncError: error.message });
      throw error;
    }
  },

  async syncAllPending() {
    const pending = await db.dynamic_data.where('syncStatus').equals('pending').toArray();
    for (const record of pending) {
      await this.syncRecord(record.id).catch(() => {});
    }
  }
};
