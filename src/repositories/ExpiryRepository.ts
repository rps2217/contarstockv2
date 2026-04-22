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

  /**
   * Asegura que el repositorio trabaje con el nombre de tabla correcto según configuración
   */
  setTableName(name: string) {
    if (name) this.tableName = name;
  }

  async getAll(tableName: string): Promise<ExpiryRecord[]> {
    const targetTable = tableName || this.tableName;
    const records = await db.dynamic_data
      .where('tableName')
      .equals(targetTable)
      .toArray();
    
    return records
      .filter(r => r.syncStatus !== 'pending_delete')
      .map(r => this.mapToExpiry(r));
  }

  liveAll(tableName: string) {
    const targetTable = tableName || this.tableName;
    return liveQuery(() => 
      db.dynamic_data
        .where('tableName')
        .equals(targetTable)
        .reverse()
        .sortBy('timestamp')
        .then(records => records
          .filter(r => r.syncStatus !== 'pending_delete')
          .map(r => this.mapToExpiry(r))
        )
    );
  }

  async put(data: any, tableName?: string) {
    // Método requerido por supabaseSyncService.startSync
    const id = data.id || data.ID || data.claveUnica || data.CLAVE_UNICA;
    if (!id) return;

    await db.dynamic_data.put({
      id: String(id),
      tableName: tableName || this.tableName,
      data: data,
      timestamp: data.timestamp || Date.now(),
      syncStatus: 'synced'
    });
  }

  async save(expiry: Partial<ExpiryRecord> & { id: string }, tableName?: string) {
    await dynamicDataService.saveRecord(tableName || this.tableName, expiry, expiry.id);
  }

  async bulkSave(expiries: ExpiryRecord[], tableName?: string) {
    const records: DynamicRecord[] = expiries.map(e => ({
      id: e.id,
      tableName: tableName || this.tableName,
      data: e,
      timestamp: e.timestamp || Date.now(),
      syncStatus: e.syncStatus || 'synced'
    }));
    await db.dynamic_data.bulkPut(records);
  }

  async delete(id: string, tableName?: string) {
    await dynamicDataService.deleteRecord(id);
  }

  async clear() {
    const records = await this.getAll(this.tableName);
    for (const record of records) {
      await this.delete(record.id, this.tableName);
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
