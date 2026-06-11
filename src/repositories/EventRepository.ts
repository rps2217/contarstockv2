import { db, DynamicRecord } from '../db';
import { liveQuery } from 'dexie';
import { dynamicDataService } from '../services/dynamicDataService';

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

  async put(data: any, tableName?: string) {
    // Método requerido para recibir payloads en tiempo real sin activar un re-upload a la nube infinito.
    const id = data.id || data.ID;
    if (!id) return;

    // MULTI-USER CONCURRENCY FIX
    const existing = await db.dynamic_data.get(String(id));
    if (existing && existing.syncStatus === 'pending') {
       return; // Preservar cambios locales no sincronizados
    }

    await db.dynamic_data.put({
      id: String(id),
      tableName: tableName || this.tableName,
      data: data,
      timestamp: data.timestamp || Date.now(),
      syncStatus: 'synced' // Crucial: No lo enviamos de vuelta
    });
  }

  async save(event: Partial<EventRecord> & { id: string }) {
    await dynamicDataService.saveRecord(this.tableName, event, event.id);
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
    await dynamicDataService.deleteRecord(id);
  }

  async clear() {
    const records = await this.getAll();
    for (const record of records) {
      await this.delete(record.id);
    }
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
