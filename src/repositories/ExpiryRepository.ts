import { db, DynamicRecord } from '../db';
import { liveQuery } from 'dexie';
import { dynamicDataService } from '../services/dynamicDataService';

export interface ExpiryRecord {
  id: string;
  barcode: string;
  productName: string;
  providerName: string;
  mm: number;
  yyyy: number;
  batch: string;
  quantity: number;
  location: string;
  timestamp: number;
  claveUnica?: string;
  syncStatus: 'synced' | 'pending' | 'error' | 'pending_delete';
  origin?: string;
}

export class ExpiryRepository {
  private tableName = 'VENCIMIENTOS';

  async getAll(): Promise<ExpiryRecord[]> {
    const records = await db.dynamic_data
      .where('tableName')
      .equals(this.tableName)
      .toArray();
    
    return records
      .filter(r => r.syncStatus !== 'pending_delete')
      .map(r => this.mapToExpiry(r));
  }

  liveAll() {
    return liveQuery(() => 
      db.dynamic_data
        .where('tableName')
        .equals(this.tableName)
        .reverse()
        .sortBy('timestamp')
        .then(records => records
          .filter(r => r.syncStatus !== 'pending_delete')
          .map(r => this.mapToExpiry(r))
        )
    );
  }

  async save(expiry: Partial<ExpiryRecord> & { id: string }) {
    await dynamicDataService.saveRecord(this.tableName, expiry, expiry.id);
  }

  async bulkSave(expiries: ExpiryRecord[]) {
    const records: DynamicRecord[] = expiries.map(e => ({
      id: e.id,
      tableName: this.tableName,
      data: e,
      timestamp: e.timestamp || Date.now(),
      syncStatus: e.syncStatus || 'synced'
    }));
    await db.dynamic_data.bulkPut(records);
  }

  async delete(id: string) {
    await dynamicDataService.deleteRecord(id);
  }

  async clear() {
    const records = await this.getAll();
    for (const record of records) {
      await this.delete(record.id);
    }
  }

  private mapToExpiry(record: DynamicRecord): ExpiryRecord {
    return {
      ...record.data,
      id: record.id,
      syncStatus: record.syncStatus,
      timestamp: record.timestamp
    } as ExpiryRecord;
  }
}

export const expiryRepository = new ExpiryRepository();
