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

    // 1. Borrado local INMEDIATO (Optimistic UI)
    await db.dynamic_data.delete(id);

    // 2. Borrado en la nube en SEGUNDO PLANO
    (async () => {
      try {
        const settings = (await import('./settings')).getSettings();
        const config = settings.appSheetConfig;
        
        const idCol = config?.mappings?.events?.id || 'ID';
        const remoteId = record.data[idCol] || record.data['ID'] || record.data['id'] || record.data['CLAVE_UNICA'] || record.data['uniqueKey'];
        
        if (remoteId) {
          await cloudApi.deleteRow(record.tableName, remoteId);
        }
      } catch (error: any) {
        logger.error('DYNAMIC_DATA', `Background deletion sync failed for record ${id}`, error.message);
      }
    })();
  },

  async syncRecord(id: string) {
    const record = await db.dynamic_data.get(id);
    if (!record || record.syncStatus === 'synced') return;

    try {
      const rowData = { ...record.data };
      const settings = (await import('./settings')).getSettings();
      const config = settings.appSheetConfig;
      
      let idCol = 'ID';
      let tsCol = 'TIMESTAMP';

      if (config?.mappings) {
        if (record.tableName === config.inventoryRegistryTableName || record.tableName === config.expiryTableName) {
          idCol = config.mappings.expiry?.id || 'ID';
          tsCol = config.mappings.expiry?.timestamp || 'TIMESTAMP';
        } else if (record.tableName === config.eventsTableName) {
          idCol = config.mappings.events?.id || 'ID';
          tsCol = config.mappings.events?.timestamp || 'TIMESTAMP';
        } else if (record.tableName === config.productsTableName) {
          idCol = config.mappings.products?.id || 'ID';
        } else if (record.tableName === config.countsTableName) {
          idCol = config.mappings.counts?.id || 'ID';
          tsCol = config.mappings.counts?.timestamp || 'TIMESTAMP';
        }
      }

      if (!rowData[idCol]) rowData[idCol] = record.id;
      if (!rowData[tsCol]) rowData[tsCol] = new Date(record.timestamp).toLocaleString('es-CL');

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
    if (pending.length === 0) return;

    // Agrupar por tabla para batching
    const groups: Record<string, DynamicRecord[]> = {};
    for (const record of pending) {
      if (!groups[record.tableName]) groups[record.tableName] = [];
      groups[record.tableName].push(record);
    }

    const settings = (await import('./settings')).getSettings();
    const config = settings.appSheetConfig;

    for (const [tableName, records] of Object.entries(groups)) {
      try {
        const rowsToUpsert = records.map(record => {
          const rowData = { ...record.data };
          let idCol = 'ID';
          let tsCol = 'TIMESTAMP';

          if (config?.mappings) {
            if (tableName === config.inventoryRegistryTableName) {
              idCol = config.mappings.expiry?.id || 'ID';
              tsCol = config.mappings.expiry?.timestamp || 'TIMESTAMP';
            } else if (tableName === config.eventsTableName) {
              idCol = config.mappings.events?.id || 'ID';
              tsCol = config.mappings.events?.timestamp || 'TIMESTAMP';
            } else if (tableName === config.productsTableName) {
              idCol = config.mappings.products?.id || 'ID';
            } else if (tableName === config.countsTableName) {
              idCol = config.mappings.counts?.id || 'ID';
              tsCol = config.mappings.counts?.timestamp || 'TIMESTAMP';
            }
          }

          if (!rowData[idCol]) rowData[idCol] = record.id;
          if (!rowData[tsCol]) rowData[tsCol] = new Date(record.timestamp).toLocaleString('es-CL');
          
          return rowData;
        });

        const response = await cloudApi.upsertRows(tableName, rowsToUpsert);
        
        if (response.success) {
          const ids = records.map(r => r.id);
          await db.dynamic_data.where('id').anyOf(ids).modify({ syncStatus: 'synced' });
        } else {
          // Si falla el batch, intentamos uno por uno para no bloquear todo
          for (const record of records) {
            await this.syncRecord(record.id).catch(() => {});
          }
        }
      } catch (error: any) {
        logger.error('DYNAMIC_DATA', `Batch sync failed for table ${tableName}`, error.message);
      }
    }
  }
};
