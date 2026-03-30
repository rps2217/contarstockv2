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
        
        if (record.tableName === config?.inventoryRegistryTableName) {
          const uKey = record.data.CLAVE_UNICA || record.data.uniqueKey || record.data.claveUnica;
          if (uKey) {
            await cloudApi.removeExpiration(uKey);
          }
        } else {
          const idCol = config?.mappings?.events?.id || 'ID';
          const remoteId = record.data[idCol] || record.data['ID'] || record.data['id'];
          if (remoteId) {
            await cloudApi.deleteRow(record.tableName, remoteId);
          }
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
        if (record.tableName === config.inventoryRegistryTableName) {
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

      // PROTOCOLO DE ENLACE DIRECTO PARA VENCIMIENTOS
      if (record.tableName === config?.inventoryRegistryTableName) {
        const getVal = (keys: string[]) => {
          for (const k of keys) {
            if (rowData[k] !== undefined) return rowData[k];
          }
          return undefined;
        };

        const gasPayload = {
          id: getVal([idCol, 'ID_REGISTRO', 'ID', 'id']),
          barcode: getVal(['COD_BARRAS', 'SKU', 'barcode']),
          productName: getVal(['DESCRIPCION_PROD', 'DESCRIPTOR', 'productName']),
          mm: getVal(['MM', 'mm']),
          yyyy: getVal(['YYYY', 'yyyy']),
          quantity: getVal(['CANTIDAD', 'quantity']),
          event: getVal(['EVENTO', 'event']) || 'VENCIMIENTOS',
          claveUnica: getVal(['CLAVE_UNICA', 'uniqueKey', 'claveUnica']),
          location: getVal(['UBICACION', 'BOD.', 'location']) || 'MANUAL',
          destino: getVal(['DESTINO', 'destino']) || '',
          traspaso: getVal(['DOCTRASINTER', 'TRASPASO', 'traspaso']) || '',
          observaciones: getVal(['OBSERVACIONES', 'OBS', 'observaciones']) || '',
          fechaCC: getVal(['FECHA_CC', 'FECHACC', 'fechaCC']) || ''
        };

        const response = await cloudApi.addExpiration(gasPayload);
        if (response.success) {
          await db.dynamic_data.update(id, { syncStatus: 'synced' });
          return;
        } else {
          await db.dynamic_data.update(id, { syncStatus: 'error', syncError: response.error });
          return;
        }
      }

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
