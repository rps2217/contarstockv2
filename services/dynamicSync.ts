import { db, DynamicRecord } from '../db';
import { cloudApi } from './cloud/apiClient';
import { getSettings } from './settings';
import { logger } from './logger';

export const dynamicSyncService = {
  /**
   * Sincroniza registros pendientes de la tabla dynamic_data.
   * Si se provee tableName, solo sincroniza esa tabla.
   */
  async syncAllPending(onProgress?: (msg: string) => void, tableNameFilter?: string): Promise<{ success: number; failed: number }> {
    let query = db.dynamic_data
      .where('syncStatus')
      .equals('pending');
    
    if (tableNameFilter) {
      // Dexie doesn't support multiple where clauses easily without compound indexes or filtering
      // Since we have [tableName+syncStatus] index, we can use it
      query = db.dynamic_data
        .where('[tableName+syncStatus]')
        .equals([tableNameFilter, 'pending']);
    }

    const pendingRecords = await query.toArray();

    if (pendingRecords.length === 0) {
      return { success: 0, failed: 0 };
    }

    // Agrupar por nombre de tabla
    const groups: Record<string, DynamicRecord[]> = {};
    for (const record of pendingRecords) {
      if (!groups[record.tableName]) {
        groups[record.tableName] = [];
      }
      groups[record.tableName].push(record);
    }

    let totalSuccess = 0;
    let totalFailed = 0;

    const settings = getSettings();
    const schemas = (settings.schema || {}) as Record<string, any>;

    for (const [tableName, records] of Object.entries(groups)) {
      if (onProgress) onProgress(`Sincronizando ${records.length} registros de ${tableName}...`);
      
      try {
        // Preparar las filas para el envío
        // Usamos el esquema para asegurar que las columnas coincidan con lo esperado en la nube
        // Si no hay esquema, enviamos la data tal cual
        const schema = Object.values(schemas).find((s: any) => s?.tableName === tableName);
        
        const rows = records.map(r => {
          const row: Record<string, any> = { ...r.data };
          
          // Asegurar que el ID y el Timestamp se incluyan si no están
          if (!row['ID']) row['ID'] = r.id;
          if (!row['TIMESTAMP']) row['TIMESTAMP'] = new Date(r.timestamp).toLocaleString('es-CL');
          
          return row;
        });

        const result = await cloudApi.upsertRows(tableName, rows);

        if (result.success) {
          const ids = records.map(r => r.id);
          await db.dynamic_data.where('id').anyOf(ids).modify({ 
            syncStatus: 'synced',
            syncError: undefined 
          });
          totalSuccess += records.length;
          if (onProgress) onProgress(`✓ ${tableName}: ${records.length} sincronizados.`);
        } else {
          throw new Error(result.error || 'Error desconocido en el servidor');
        }
      } catch (error: any) {
        totalFailed += records.length;
        logger.error('DYNAMIC_SYNC_FAIL', `Error sincronizando ${tableName}: ${error.message}`);
        
        const ids = records.map(r => r.id);
        await db.dynamic_data.where('id').anyOf(ids).modify({ 
          syncStatus: 'error',
          syncError: error.message 
        });
        
        if (onProgress) onProgress(`✗ ${tableName}: Falló la sincronización.`);
        
        // Si estamos filtrando por una tabla específica, lanzamos el error para que el llamador lo maneje
        if (tableNameFilter) {
          throw error;
        }
      }
    }

    return { success: totalSuccess, failed: totalFailed };
  },

  /**
   * Descarga datos de la nube y los fusiona con la base de datos local.
   */
  async pullSync(tableName: string, onProgress?: (msg: string) => void): Promise<{ added: number; updated: number }> {
    if (onProgress) onProgress(`Descargando datos de ${tableName}...`);
    
    const result = await cloudApi.fetchTable(tableName);
    if (!result.success || !result.rows) {
      throw new Error(result.error || 'No se pudieron recuperar los datos de la nube');
    }

    const remoteRows = result.rows;
    let added = 0;
    let updated = 0;

    if (onProgress) onProgress(`Procesando ${remoteRows.length} registros...`);

    // Procesar en lotes para no bloquear la UI
    const batchSize = 100; // Aumentamos el tamaño del lote
    for (let i = 0; i < remoteRows.length; i += batchSize) {
      const batch = remoteRows.slice(i, i + batchSize);
      
      await db.transaction('rw', db.dynamic_data, async () => {
        const recordsToPut: DynamicRecord[] = [];
        
        for (const remoteRow of batch) {
          const remoteId = String(remoteRow['ID'] || remoteRow['ID_REGISTRO'] || '');
          if (!remoteId) continue;

          const localRecord = await db.dynamic_data.get(remoteId);

          if (localRecord) {
            if (localRecord.syncStatus === 'synced') {
              const remoteTimestamp = remoteRow['TIMESTAMP'] ? new Date(remoteRow['TIMESTAMP']).getTime() : 0;
              
              if (remoteTimestamp > localRecord.timestamp) {
                const newData = { ...localRecord.data, ...remoteRow };
                recordsToPut.push({
                  id: remoteId,
                  tableName: tableName,
                  data: newData,
                  timestamp: remoteTimestamp || Date.now(),
                  syncStatus: 'synced'
                });
                updated++;
              }
            }
          } else {
            const remoteTimestamp = remoteRow['TIMESTAMP'] ? new Date(remoteRow['TIMESTAMP']).getTime() : Date.now();
            recordsToPut.push({
              id: remoteId,
              tableName: tableName,
              data: remoteRow,
              timestamp: remoteTimestamp,
              syncStatus: 'synced'
            });
            added++;
          }
        }
        
        if (recordsToPut.length > 0) {
          await db.dynamic_data.bulkPut(recordsToPut);
        }
      });

      if (onProgress) {
        const progress = Math.min(100, Math.round(((i + batch.length) / remoteRows.length) * 100));
        onProgress(`Procesando... ${progress}%`);
      }
    }

    return { added, updated };
  },

  /**
   * Obtiene estadísticas globales de sincronización.
   */
  async getSyncStats() {
    const pending = await db.dynamic_data.where('syncStatus').equals('pending').count();
    const errors = await db.dynamic_data.where('syncStatus').equals('error').count();
    const synced = await db.dynamic_data.where('syncStatus').equals('synced').count();
    
    return { pending, errors, synced };
  },

  /**
   * Reintenta sincronizar un registro específico.
   */
  async retrySingleRecord(id: string): Promise<void> {
    await db.dynamic_data.update(id, { syncStatus: 'pending', syncError: undefined });
  },

  /**
   * Reintenta sincronizar todos los registros que fallaron.
   */
  async retryAllErrors(onProgress?: (msg: string) => void): Promise<{ success: number; failed: number }> {
    const errorRecords = await db.dynamic_data.where('syncStatus').equals('error').toArray();
    
    if (errorRecords.length === 0) return { success: 0, failed: 0 };

    // Cambiar estado a pending para que syncAllPending los procese
    const ids = errorRecords.map(r => r.id);
    await db.dynamic_data.where('id').anyOf(ids).modify({ syncStatus: 'pending' });
    
    return this.syncAllPending(onProgress);
  }
};
