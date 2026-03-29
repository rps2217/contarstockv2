import { db, DynamicRecord } from '../db';
import { cloudApi } from './cloud/apiClient';
import { logger } from './logger';

export const dynamicDataService = {
  async saveRecord(tableName: string, data: any, id?: string) {
    const recordId = id || crypto.randomUUID();
    const record: DynamicRecord = {
      id: recordId,
      tableName,
      data,
      timestamp: Date.now(),
      syncStatus: 'pending'
    };

    await db.dynamic_data.put(record);
    
    // Attempt background sync
    this.syncRecord(recordId).catch(err => {
      logger.error('DYNAMIC_DATA', `Error syncing record ${recordId}`, err.message);
    });

    return recordId;
  },

  async deleteRecord(id: string) {
    const record = await db.dynamic_data.get(id);
    if (!record) return;

    // 1. Borrado local
    await db.dynamic_data.delete(id);

    // 2. Borrado en la nube (si tiene clave única o ID de fila)
    // Nota: Esto depende de cómo implementemos el borrado en cloudApi.
    // Por ahora, lo marcamos como pendiente de borrado si fuera necesario, 
    // o simplemente confiamos en que el motor de sincronización lo maneje.
    // Para AppSheet, borrar una fila suele requerir el ID de la fila.
    try {
      if (record.data.claveUnica || record.data.ID) {
        await cloudApi.deleteRow(record.tableName, record.data.claveUnica || record.data.ID);
      }
    } catch (error: any) {
      logger.error('DYNAMIC_DATA', `Error deleting record ${id} from cloud`, error.message);
    }
  },

  async syncRecord(id: string) {
    const record = await db.dynamic_data.get(id);
    if (!record || record.syncStatus === 'synced') return;

    try {
      const rowData = { ...record.data };
      if (!rowData['ID']) rowData['ID'] = record.id;
      if (!rowData['TIMESTAMP']) rowData['TIMESTAMP'] = new Date(record.timestamp).toLocaleString('es-CL');

      const response = await cloudApi.upsertRows(record.tableName, [rowData]);
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
