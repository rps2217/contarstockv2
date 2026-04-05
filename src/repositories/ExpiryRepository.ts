import { db, DynamicRecord } from '../db';
import { liveQuery } from 'dexie';

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
  syncStatus: 'synced' | 'pending' | 'error';
  origin?: string;
}

export class ExpiryRepository {
  private tableName = 'VENCIMIENTOS';

  async getAll(): Promise<ExpiryRecord[]> {
    const records = await db.dynamic_data
      .where('tableName')
      .equals(this.tableName)
      .toArray();
    
    return records.map(r => this.mapToExpiry(r));
  }

  liveAll() {
    return liveQuery(() => 
      db.dynamic_data
        .where('tableName')
        .equals(this.tableName)
        .reverse()
        .sortBy('timestamp')
        .then(records => records.map(r => this.mapToExpiry(r)))
    );
  }

  async save(expiry: Partial<ExpiryRecord> & { id: string }) {
    const record: DynamicRecord = {
      id: expiry.id,
      tableName: this.tableName,
      data: expiry,
      timestamp: expiry.timestamp || Date.now(),
      syncStatus: expiry.syncStatus || 'pending'
    };
    await db.dynamic_data.put(record);
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
    await db.dynamic_data.delete(id);
  }

  async clear() {
    await db.dynamic_data.where('tableName').equals(this.tableName).delete();
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
