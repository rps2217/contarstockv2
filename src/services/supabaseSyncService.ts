import { supabase } from '../lib/supabase';
import { logger } from './logger';

// Tipo para filas de Supabase
type SupabaseRow = Record<string, unknown>;

// Interfaz para repositorios locales
interface LocalTableRepository {
  get?: (id: string) => Promise<SupabaseRow | undefined>;
  put?: (row: SupabaseRow, tableName?: string) => Promise<void>;
  save?: (row: SupabaseRow, tableName?: string) => Promise<void>;
  delete?: (id: string, tableName?: string) => Promise<void>;
}

const lastOfflineLogTime: Record<string, number> = {};
const LOG_THROTTLE_MS = 60000;

const logNetworkOffline = (tableName: string) => {
  if (!lastOfflineLogTime[tableName] || Date.now() - lastOfflineLogTime[tableName] > LOG_THROTTLE_MS) {
    logger.info('SYNC', `Network unavailable for ${tableName}. Operating offline.`);
    lastOfflineLogTime[tableName] = Date.now();
  }
};

export const supabaseSyncService = {
  /**
   * Starts a real-time sync for a specific table.
   */
  startSync(tableName: string, localTable: LocalTableRepository) {
    if (!navigator.onLine) return () => {};
    const channel = supabase
      .channel(tableName)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newRow = payload.new as SupabaseRow;
          // MULTI-USER CONCURRENCY FIX
          if (localTable.get) {
             const existing = await localTable.get(newRow.id as string);
             if (existing && (existing.synced === 0 || existing.syncStatus === 'pending' || existing.syncStatus === 'pending_delete')) {
                return; // Preservar cambios locales
             }
          }
          if (localTable.put) {
            await localTable.put(newRow, tableName);
          } else if (localTable.save) {
            await localTable.save(newRow, tableName);
          }
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as SupabaseRow;
          await localTable.delete?.(oldRow.id as string, tableName);
        }
        logger.info('SYNC_REALTIME', `Supabase sync: ${tableName} updated`);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Starts a real-time sync for a specific table with a filter.
   */
  startFilteredSync(tableName: string, localTable: LocalTableRepository, field: string, value: unknown) {
    if (!navigator.onLine) return () => {};
    const channel = supabase
      .channel(`${tableName}_${field}_${String(value)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `${field}=eq.${value}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newRow = payload.new as SupabaseRow;
            // MULTI-USER CONCURRENCY FIX
            if (localTable.get) {
               const existing = await localTable.get(newRow.id as string);
               if (existing && (existing.synced === 0 || existing.syncStatus === 'pending' || existing.syncStatus === 'pending_delete')) {
                  return; // Preservar cambios locales
               }
            }
            if (localTable.put) {
                await localTable.put(newRow, tableName);
            } else {
                await localTable.save?.(newRow);
            }
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as SupabaseRow;
            await localTable.delete?.(oldRow.id as string, tableName);
          }
          logger.info('SYNC_REALTIME_FILTERED', `Supabase filtered sync: ${tableName} updated`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Pushes a local change to Supabase with automatic column-error recovery.
   */
  async pushChange(tableName: string, id: string, data: SupabaseRow) {
    return this.pushBatch(tableName, [{ ...data, id }]);
  },

  /**
   * Formats error objects for readable output.
   */
  formatError(e: unknown): string {
    if (!e) return 'Error desconocido';
    if (typeof e === 'object' && (e as Error).message) {
      return (e as Error).message;
    }
    return String(e);
  },

  /**
   * Extract key/column fields from database error messages.
   * Supports both quoted format from PostgreSQL driver and plain table.column format.
   */
  extractColumnNameFromError(errMsg: string): string | null {
    if (!errMsg) return null;
    const matchWithQuotes = errMsg.match(/column\s+['"](.*?)['"]/i) || 
                            errMsg.match(/['"](.*?)['"]\s+column/i);
    if (matchWithQuotes) return matchWithQuotes[1];
    
    const matchPlainTableCol = errMsg.match(/column\s+[\w_]+\.([\w_]+)\s+does\s+not/i);
    if (matchPlainTableCol) return matchPlainTableCol[1];

    const matchPlainCol = errMsg.match(/column\s+([\w_]+)\s+does\s+not/i);
    if (matchPlainCol) return matchPlainCol[1];

    return null;
  },

  /**
   * Pushes a batch of changes to Supabase with automatic column-error recovery.
   */
  async pushBatch(tableName: string, rows: any[]) {
    if (!navigator.onLine) {
        return { success: false, error: 'Offline', isOffline: true };
    }
    if (!rows.length) return { success: true, rows_written: 0 };
    
    // Lista de campos prohibidos conocidos o nulos que a veces causan ruido
    const forbiddenFields = new Set(['syncStatus', 'syncError', 'nextRetry', 'retryCount']);
    
    let currentRows = rows.map(row => {
      const sanitized = this.sanitizeData(row);
      // Eliminar campos de control local
      Object.keys(sanitized).forEach(k => {
        if (forbiddenFields.has(k)) delete sanitized[k];
      });
      return sanitized;
    });

    let primaryKey = 'id';
    if (tableName === 'PROVEEDORES') {
      const firstRow = currentRows[0];
      if (firstRow) {
        if ('rut' in firstRow && firstRow.rut) {
          primaryKey = 'rut';
        } else if ('tax_id' in firstRow && firstRow.tax_id) {
          primaryKey = 'tax_id';
        } else if ('id' in firstRow && firstRow.id) {
          primaryKey = 'id';
        } else {
          primaryKey = 'rut';
        }
      } else {
        primaryKey = 'rut';
      }
    }
    if (tableName === 'VENCIMIENTOS') primaryKey = 'unique_key';

    const maxRetries = 12; // Un poco más para esquemas complejos
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        const { error } = await supabase.from(tableName).upsert(currentRows, {
          onConflict: primaryKey
        });

        if (error) {
          const errMsg = error.message || '';
          
          // 1. Detectar error de columna inexistente
          // Soporta: "column 'name' of", "the 'name' column", "'name' column does not exist", "Could not find the 'name' column"
          if (errMsg.includes("column") && (errMsg.includes("not find") || errMsg.includes("does not exist") || errMsg.includes("unknown"))) {
            const missingColumn = this.extractColumnNameFromError(errMsg);

            if (missingColumn) {
              // Reducimos nivel de log a info interna para no asustar al usuario
              logger.info('SYNC_RESILIENCE', `Ajustando esquema: Tabla ${tableName} no tiene columna '${missingColumn}'.`);
              currentRows = currentRows.map(row => {
                const newRow = { ...row };
                delete newRow[missingColumn];
                return newRow;
              });
              attempts++;
              continue; // Reintentar con el nuevo set de columnas
            }
          }

          // 2. Detectar error de tabla inexistente (404)
          if ((errMsg.includes("not find") && errMsg.includes("table")) || errMsg.includes("does not exist")) {
            logger.info('SYNC', `[Resilience] La tabla ${tableName} no existe en Supabase. Omitiendo sincronización.`);
            return { success: false, error: `Table '${tableName}' not found`, isMissing: true };
          }

          throw error;
        }

        return { success: true, rows_written: rows.length };
      } catch (e: any) {
        const errMsg = (e as Error).message || '';
        
        // Si es un error de columna y no fue atrapado arriba
        if (errMsg.includes("column") && (errMsg.includes("not find") || errMsg.includes("does not exist") || errMsg.includes("unknown"))) {
           const missingCol = this.extractColumnNameFromError(errMsg);
           if (missingCol && attempts < maxRetries) {
              logger.info('SYNC_RESILIENCE', `Ajustando esquema (catch): Tabla ${tableName} no tiene columna '${missingCol}'.`);
              currentRows = currentRows.map(row => {
                const newRow = { ...row };
                delete newRow[missingCol];
                return newRow;
              });
              attempts++;
              continue;
           }
        }

        const fullErrMsg = (e as Error).message || (e.toString ? e.toString() : '');
        if (fullErrMsg.includes('Failed to fetch') || fullErrMsg.includes('NetworkError') || fullErrMsg.includes('net::ERR')) {
          logNetworkOffline(tableName);
          return { success: false, error: 'Offline', isOffline: true };
        }

        if (attempts >= maxRetries - 1) {
          logger.error(`SYNC_BATCH_PUSH_FAIL: ${tableName} (Tras ${attempts} reintentos)`, e);
          return { success: false, error: this.formatError(e) };
        }
        
        // Error genérico: esperar un poco y reintentar si no es un error de esquema
        await new Promise(r => setTimeout(r, 500));
        attempts++;
      }
    }
    return { success: false, error: 'Maximo de reintentos de limpieza de columnas alcanzado' };
  },

  /**
   * Removes undefined fields from object for Supabase/PostgreSQL compatibility.
   */
  sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    const result = { ...data };
    
    Object.keys(result).forEach(key => {
      if (result[key] === undefined) {
        delete result[key];
      } else if (result[key] !== null && typeof result[key] === 'object' && !Array.isArray(result[key])) {
        result[key] = this.sanitizeData(result[key]);
      }
    });
    
    return result;
  },

  async deleteRemote(tableName: string, id: string) {
    if (!navigator.onLine) {
        return { success: false, error: 'Offline', isOffline: true };
    }
    const filters = [`id.eq.${id}`, `tax_id.eq.${id}`, `unique_key.eq.${id}`];
    let attempts = 0;
    let currentFilters = [...filters];

    while (attempts < filters.length) {
      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .or(currentFilters.join(','));
        
        if (error) {
           const errMsg = error.message || '';
           if (errMsg.includes("column") && (errMsg.includes("not find") || errMsg.includes("does not exist"))) {
              const missingCol = this.extractColumnNameFromError(errMsg);
              
              if (missingCol) {
                // Eliminar el filtro que causa problemas
                currentFilters = currentFilters.filter(f => !f.startsWith(`${missingCol}.`));
                if (currentFilters.length === 0) break;
                attempts++;
                continue;
              }
           }
           throw error;
        }
        return;
      } catch (e: any) {
        if (attempts >= filters.length - 1) {
          logger.error(`SYNC_DELETE_FAIL: ${tableName}`, e);
          throw e;
        }
        attempts++;
      }
    }
  },

  async clearTable(tableName: string) {
    if (!navigator.onLine) return { success: false, error: 'Offline', isOffline: true };
    try {
      // In Supabase/Postgrest, a delete without a filter matching everything clears the table
      // We use a filter that is always true for all records to bypass protection
      const { error } = await supabase
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Dummy filter to allow bulk delete
        .or('id.neq.0,ID.neq.0,timestamp.neq.0'); 
      
      if (error) {
        // Fallback for tables where 'id' might not be the primary key or doesn't exist
        const { error: error2 } = await supabase.from(tableName).delete().filter('id', 'not.is', null);
        if (error2) throw error2;
      }
      return { success: true };
    } catch (e) {
      logger.error(`CLEAR_TABLE_FAIL: ${tableName}`, e);
      throw e;
    }
  },

  async query(tableName: string, field: string, value: any) {
    if (!navigator.onLine) return { success: false, data: null, error: 'Offline', isOffline: true };
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq(field, value);
      
      if (error) {
        const errMsg = error.message || '';
        if (errMsg.includes("not find") && errMsg.includes("table")) {
          logger.info('SYNC', `Tabla ${tableName} no encontrada en Supabase. Omitiendo consulta.`);
          return { success: false, rows: [], error: 'Table not found', isMissing: true };
        }
        throw error;
      }
      return { success: true, rows: data || [] };
    } catch (e) {
      logger.error(`SYNC_QUERY_FAIL: ${tableName}`, e);
      return { success: false, rows: [], error: this.formatError(e) };
    }
  },

  async pullBatch(tableName: string, lastSyncDate?: string, timestampColumn: string = 'updated_at') {
    if (!navigator.onLine) {
        return { success: false, rows: [], error: 'Offline', isOffline: true };
    }
    const fetchWithPagination = async (useLimit: boolean, fromDate?: string) => {
      let allData: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from(tableName)
          .select('*');
          
        if (fromDate) {
          query = query.gte(timestampColumn, fromDate);
        }
        
        const { data, error } = await query.range(from, from + step - 1);
        
        if (error) {
           const errMsg = error.message || '';
           if (errMsg.includes("not find") && errMsg.includes("table")) {
              // Soft fail for missing tables
              return { isMissing: true, error: errMsg };
           }
           throw error;
        }
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += step;
          if (data.length < step) {
            hasMore = false; // Última página
          }
        } else {
          hasMore = false;
        }
      }
      return allData;
    };

    try {
      try {
        const result = await fetchWithPagination(true, lastSyncDate);
        if (typeof result === 'object' && 'isMissing' in result) {
           logger.info('SYNC', `Tabla ${tableName} no encontrada en Supabase. Omitiendo descarga.`);
           return { success: false, rows: [], error: 'Table not found', isMissing: true };
        }
        return { success: true, rows: result as any[] };
      } catch (e: any) {
        // Fallback: Si falla el filtrado por fecha, intentar traer todo sin filtro de forma segura
        if (lastSyncDate) {
            logger.warn('SYNC', `Incremental sync failed for ${tableName}, falling back to full sync. Reason: ${(e as Error).message}`);
            const data = await fetchWithPagination(true);
            if (typeof data === 'object' && 'isMissing' in data) {
               return { success: false, rows: [], error: 'Table not found', isMissing: true };
            }
            return { success: true, rows: data as any[] };
        } else {
            throw e;
        }
      }
    } catch (e: any) {
      const errMsg = (e as Error).message || (e.toString ? e.toString() : '');
      
      // Handle network errors gracefully
      if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('net::ERR')) {
          // Record it as info instead of error to avoid console spam / alert fatigue
          logNetworkOffline(tableName);
          return { success: false, rows: [], error: 'Cerrado por falta de red (offline)', isOffline: true };
      }

      if (errMsg.includes("not find") && errMsg.includes("table")) {
        logger.info('SYNC', `Tabla ${tableName} no encontrada en Supabase. Omitiendo descarga.`);
        return { success: false, rows: [], error: 'Table not found', isMissing: true };
      }
      logger.error(`SYNC_PULL_FAIL: ${tableName}`, e);
      return { success: false, rows: [], error: this.formatError(e) };
    }
  },

  async uploadPhoto(base64: string, path: string) {
    if (!navigator.onLine) return { success: false, url: null, error: 'Offline', isOffline: true };
    try {
      // Supabase Storage requiere un balde (bucket). Usaremos 'photos' por defecto.
      const bucketName = 'photos';
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      
      // Convertir base64 a Buffer/Blob (Vite/Browser compatible)
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' });

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(path, blob, {
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(path);

      return { success: true, fileUrl: publicUrl };
    } catch (e) {
      logger.error('PHOTO_UPLOAD_FAIL', e);
      return { success: false, error: this.formatError(e) };
    }
  }
};
