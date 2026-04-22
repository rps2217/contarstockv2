import { db, DynamicRecord } from '../db';
import { supabaseSyncService } from './supabaseSyncService';
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
      .anyOf(['pending', 'error', 'pending_delete']); // Incluir eliminaciones pendientes
    
    if (tableNameFilter) {
      query = db.dynamic_data
        .where('[tableName+syncStatus]')
        .anyOf([
          [tableNameFilter, 'pending'], 
          [tableNameFilter, 'error'],
          [tableNameFilter, 'pending_delete']
        ]);
    }

    const allPendingRecords = await query.toArray();

    // Filtrar registros que están esperando su próximo reintento
    const now = Date.now();
    const pendingRecords = allPendingRecords.filter(r => !r.nextRetry || r.nextRetry <= now);

    if (pendingRecords.length === 0) {
      return { success: 0, failed: 0 };
    }

    // Separar eliminaciones de inserciones/actualizaciones
    const toDelete = pendingRecords.filter(r => r.syncStatus === 'pending_delete');
    const toUpsert = pendingRecords.filter(r => r.syncStatus !== 'pending_delete');

    let totalSuccess = 0;
    let totalFailed = 0;

    // 1. Procesar Eliminaciones
    if (toDelete.length > 0) {
      if (onProgress) onProgress(`Procesando ${toDelete.length} eliminaciones...`);
      for (const record of toDelete) {
        try {
          const remoteId = record.data['id'] || record.data['ID'] || record.id;
          await supabaseSyncService.deleteRemote(record.tableName, String(remoteId));
          await db.dynamic_data.delete(record.id);
          totalSuccess++;
        } catch (e: any) {
          logger.error('DYNAMIC_SYNC', `Error al eliminar remoto ${record.id}`, e.message);
          totalFailed++;
        }
      }
    }

    if (toUpsert.length === 0) return { success: totalSuccess, failed: totalFailed };

    // 2. Procesar Inserciones/Actualizaciones (Agrupar por tabla)
    const groups: Record<string, DynamicRecord[]> = {};
    for (const record of toUpsert) {
      if (!groups[record.tableName]) {
        groups[record.tableName] = [];
      }
      groups[record.tableName].push(record);
    }

    const settings = getSettings();

    for (const [tableName, records] of Object.entries(groups)) {
      if (onProgress) onProgress(`Sincronizando ${records.length} registros de ${tableName}...`);
      
      // BATCHING: Dividir en lotes de 200 registros para evitar payload muy grande y errores 429
      const BATCH_SIZE = 200;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batchRecords = records.slice(i, i + BATCH_SIZE);
        
        try {
          // Preparar las filas para el envío
          const config = settings.cloudConfig;
          let idCol = 'ID';
          let tsCol = 'TIMESTAMP';

          if (config?.mappings) {
            if (tableName === config.inventoryRegistryTableName || tableName === config.expiryTableName) {
              idCol = config.mappings.expiry?.id || 'ID';
              tsCol = config.mappings.expiry?.timestamp || 'TIMESTAMP';
            } else if (tableName === config.eventsTableName || tableName === 'EVENTOS') {
              idCol = config.mappings.events?.id || 'ID';
              tsCol = config.mappings.events?.timestamp || 'TIMESTAMP';
            } else if (tableName === config.productsTableName) {
              idCol = config.mappings.products?.id || 'ID';
            } else if (tableName === config.countsTableName) {
              idCol = config.mappings.counts?.id || 'ID';
              tsCol = config.mappings.counts?.timestamp || 'TIMESTAMP';
            }
          }

          const rows = batchRecords.map(r => {
            const row: Record<string, any> = { ...r.data };
            
            // Asegurar que el ID y el Timestamp se incluyan siempre
            row['id'] = r.id; // Supabase standard
            row['TIMESTAMP'] = new Date(r.timestamp).toISOString();
            
            // Si hay mapeo, asegurar que las columnas mapeadas también tengan los valores
            if (config?.mappings) {
                if (idCol !== 'ID' && idCol !== 'id') row[idCol] = r.id;
                if (tsCol !== 'TIMESTAMP') row[tsCol] = row['TIMESTAMP'];
            }
            
            return row;
          });

          const result = await supabaseSyncService.pushBatch(tableName, rows);

          if (result.success) {
            const ids = batchRecords.map(r => r.id);
            await db.dynamic_data.where('id').anyOf(ids).modify({ 
              syncStatus: 'synced',
              syncError: undefined,
              retryCount: 0,
              nextRetry: undefined
            });
            totalSuccess += batchRecords.length;
            if (onProgress) onProgress(`✓ ${tableName}: ${batchRecords.length} sincronizados (Lote ${Math.floor(i/BATCH_SIZE)+1}).`);
          } else {
            throw new Error(result.error || 'Error desconocido en el servidor');
          }
        } catch (error: any) {
          totalFailed += batchRecords.length;
          logger.error('DYNAMIC_SYNC_FAIL', `Error sincronizando lote de ${tableName}: ${error.message}`);
          
          // EXPONENTIAL BACKOFF
          const ids = batchRecords.map(r => r.id);
          await db.transaction('rw', db.dynamic_data, async () => {
            for (const record of batchRecords) {
              const retryCount = (record.retryCount || 0) + 1;
              // Esperar 2s, 4s, 8s, 16s... máximo 5 minutos (300000 ms)
              const backoffMs = Math.min(300000, Math.pow(2, retryCount) * 1000);
              
              await db.dynamic_data.update(record.id, {
                syncStatus: 'error',
                syncError: error.message,
                retryCount,
                nextRetry: Date.now() + backoffMs
              });
            }
          });
          
          if (onProgress) onProgress(`✗ ${tableName}: Falló la sincronización del lote.`);
          
          // Si estamos filtrando por una tabla específica, lanzamos el error para que el llamador lo maneje
          if (tableNameFilter) {
            throw error;
          }
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
    
    const result = await supabaseSyncService.pullBatch(tableName);
    if (!result.success || !result.rows) {
      throw new Error(result.error || 'No se pudieron recuperar los datos de la nube');
    }

    const remoteRows = result.rows;
    let added = 0;
    let updated = 0;

    const settings = getSettings();
    const config = settings.cloudConfig;
    
    // Determinar qué mapeo usar según la tabla
    let idColumn = 'ID';
    if (config?.mappings) {
      if (tableName === config.inventoryRegistryTableName) idColumn = config.mappings.expiry?.id || 'ID';
      else if (tableName === config.eventsTableName) idColumn = config.mappings.events?.id || 'ID';
      else if (tableName === config.productsTableName) idColumn = config.mappings.products?.id || 'ID';
      else if (tableName === config.countsTableName) idColumn = config.mappings.counts?.id || 'ID';
    }

    if (onProgress) onProgress(`Procesando ${remoteRows.length} registros...`);

    // Procesar en lotes para no bloquear la UI
    const batchSize = 100;
    for (let i = 0; i < remoteRows.length; i += batchSize) {
      const batch = remoteRows.slice(i, i + batchSize);
      
      await db.transaction('rw', db.dynamic_data, async () => {
        const recordsToPut: DynamicRecord[] = [];
        
        for (const rawRow of batch) {
          // NORMALIZACIÓN DE LLAVES (Protocolo de Resiliencia)
          // Esto asegura que exp["SKU"] funcione aunque en el Excel diga "Sku " o "sku"
          const remoteRow: Record<string, any> = {};
          Object.keys(rawRow).forEach(k => {
            const normalizedKey = k.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "_");
            remoteRow[normalizedKey] = rawRow[k];
          });

          // Intentar obtener el ID usando el mapeo o fallbacks
          const remoteId = String(remoteRow[idColumn] || remoteRow['ID'] || remoteRow['ID_REGISTRO'] || remoteRow['CLAVE_UNICA'] || '');
          if (!remoteId) continue;

          const localRecord = await db.dynamic_data.get(remoteId);

          if (localRecord) {
            const remoteTimestamp = remoteRow['TIMESTAMP'] || remoteRow['FECHA_INGRESO'] || remoteRow['FECHA'] 
              ? new Date(remoteRow['TIMESTAMP'] || remoteRow['FECHA_INGRESO'] || remoteRow['FECHA']).getTime() 
              : 0;
            
            // Si el registro local ya está sincronizado, o si el remoto es más reciente que nuestra edición local pendiente
            if (localRecord.syncStatus === 'synced' || remoteTimestamp > localRecord.timestamp) {
              const newData = { ...localRecord.data, ...remoteRow };
              recordsToPut.push({
                id: remoteId,
                tableName: tableName,
                data: newData,
                timestamp: remoteTimestamp || Date.now(),
                syncStatus: 'synced',
                retryCount: 0,
                nextRetry: 0
              });
              updated++;
            }
          } else {
            const remoteTimestamp = remoteRow['TIMESTAMP'] || remoteRow['FECHA_INGRESO'] || remoteRow['FECHA']
              ? new Date(remoteRow['TIMESTAMP'] || remoteRow['FECHA_INGRESO'] || remoteRow['FECHA']).getTime() 
              : Date.now();
              
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
   * Reinicia los contadores de reintento (útil cuando vuelve la conexión)
   */
  async resetRetries(): Promise<void> {
    const recordsToReset = await db.dynamic_data
      .where('syncStatus')
      .anyOf(['pending', 'error'])
      .toArray();
      
    if (recordsToReset.length > 0) {
      const ids = recordsToReset.map(r => r.id);
      await db.dynamic_data.where('id').anyOf(ids).modify({
        retryCount: 0,
        nextRetry: 0
      });
    }
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

// Forced GitHub sync
