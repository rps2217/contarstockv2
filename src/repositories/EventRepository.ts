import { db, DynamicRecord } from '../db';
import { liveQuery } from 'dexie';

export interface EventRecord {
  id: string;
  barcode: string;
  productName: string;
  providerName: string;
  event: string;
  quantity: number;
  location: string;
  frc: string;
  nguia: string;
  timestamp: number;
  claveUnica?: string;
  category?: string;
  isAdjusted: boolean;
  mm?: string;
  yyyy?: string;
  syncStatus: 'synced' | 'pending' | 'error';
  destino?: string;
  traspaso?: string;
  observaciones?: string;
}

export class EventRepository {
  private tableName = 'EVENTOS';

  async getAll(): Promise<EventRecord[]> {
    const records = await db.dynamic_data
      .where('tableName')
      .equals(this.tableName)
      .toArray();
    
    return records.map(r => this.mapToEvent(r));
  }

  liveAll() {
    return liveQuery(() => 
      db.dynamic_data
        .where('tableName')
        .equals(this.tableName)
        .reverse()
        .sortBy('timestamp')
        .then(records => records.map(r => this.mapToEvent(r)))
    );
  }

  async save(event: Partial<EventRecord> & { id: string }) {
    const record: DynamicRecord = {
      id: event.id,
      tableName: this.tableName,
      data: event,
      timestamp: event.timestamp || Date.now(),
      syncStatus: event.syncStatus || 'pending'
    };
    await db.dynamic_data.put(record);
  }

  async bulkSave(events: EventRecord[]) {
    const records: DynamicRecord[] = events.map(e => ({
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

  private mapToEvent(record: DynamicRecord): EventRecord {
    return {
      ...record.data,
      id: record.id,
      syncStatus: record.syncStatus,
      timestamp: record.timestamp
    } as EventRecord;
  }
}

export const eventRepository = new EventRepository();
