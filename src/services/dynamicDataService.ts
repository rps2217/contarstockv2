import { db, DynamicRecord } from '../db';
import { firebaseSyncService } from './firebaseSyncService';
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

    // 1. Si el registro aún no se ha sincronizado (está pendiente), simplemente lo borramos localmente
    if (record.syncStatus === 'pending') {
      await db.dynamic_data.delete(id);
      return;
    }

    // 2. Marcamos como 'pending_delete' para que el sync manager lo borre de la nube cuando haya internet
    await db.dynamic_data.update(id, { syncStatus: 'pending_delete', timestamp: Date.now() });

    // 3. Intentar borrado inmediato en segundo plano
    this.processDeletion(id).catch(() => {});
  },

  async processDeletion(id: string) {
    const record = await db.dynamic_data.get(id);
    if (!record || record.syncStatus !== 'pending_delete') return;

    try {
      const settings = (await import('./settings')).getSettings();
      const config = settings.cloudConfig;
      
      // Intentar identificar el ID remoto
      const remoteId = record.data['id'] || record.data['ID'] || record.id;
      
      await firebaseSyncService.deleteRemote(record.tableName, String(remoteId));
      
      // Si el borrado en la nube fue exitoso, borramos el registro local definitivamente
      await db.dynamic_data.delete(id);
    } catch (error: any) {
      logger.error('DYNAMIC_DATA', `Background deletion failed for ${id}, will retry later`, error.message);
      // No borramos localmente, se queda como 'pending_delete' para el próximo ciclo de sync
    }
  },

  async syncRecord(id: string) {
    const record = await db.dynamic_data.get(id);
    if (!record || record.syncStatus === 'synced') return;

    try {
      const rowData = { ...record.data };
      const settings = (await import('./settings')).getSettings();
      const config = settings.cloudConfig;
      
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
      if (!rowData['id']) rowData['id'] = record.id;
      if (!rowData[tsCol]) rowData[tsCol] = new Date(record.timestamp).toISOString();

      const response = await firebaseSyncService.pushBatch(record.tableName, [rowData]);
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
    const allPending = await db.dynamic_data
      .where('syncStatus')
      .anyOf(['pending', 'pending_delete', 'error'])
      .toArray();

    if (allPending.length === 0) return;

    // Separar por tipo de acción
    const toUpsert = allPending.filter(r => r.syncStatus === 'pending' || r.syncStatus === 'error');
    const toDelete = allPending.filter(r => r.syncStatus === 'pending_delete');

    // Procesar eliminaciones primero
    for (const record of toDelete) {
      await this.processDeletion(record.id).catch(() => {});
    }

    if (toUpsert.length === 0) return;

    // Agrupar por tabla para batching (Upserts)
    const groups: Record<string, DynamicRecord[]> = {};
    for (const record of toUpsert) {
      if (!groups[record.tableName]) groups[record.tableName] = [];
      groups[record.tableName].push(record);
    }

    const settings = (await import('./settings')).getSettings();
    const config = settings.cloudConfig;

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
          if (!rowData['id']) rowData['id'] = record.id;
          if (!rowData[tsCol]) rowData[tsCol] = new Date(record.timestamp).toISOString();
          
          return rowData;
        });

        const response = await firebaseSyncService.pushBatch(tableName, rowsToUpsert);
        
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

// Forced GitHub sync
