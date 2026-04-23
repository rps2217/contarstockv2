import { supabase } from '../lib/supabase';
import { logger } from './logger';

export const supabaseSyncService = {
  /**
   * Starts a real-time sync for a specific table.
   */
  startSync(tableName: string, localTable: any) {
    const channel = supabase
      .channel(tableName)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          if (localTable.put) {
            await localTable.put(payload.new, tableName);
          } else if (localTable.save) {
            await localTable.save(payload.new, tableName);
          }
        } else if (payload.eventType === 'DELETE') {
          await localTable.delete(payload.old.id, tableName);
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
  startFilteredSync(tableName: string, localTable: any, field: string, value: any) {
    const channel = supabase
      .channel(`${tableName}_${field}_${value}`)
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
            if (localTable.put) {
                await localTable.put(payload.new, tableName);
            } else {
                await localTable.save(payload.new);
            }
          } else if (payload.eventType === 'DELETE') {
            await localTable.delete(payload.old.id, tableName);
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
   * Pushes a local change to Supabase.
   */
  async pushChange(tableName: string, id: string, data: any) {
    try {
      const sanitized = this.sanitizeData(data);
      // Supabase upsert requires the ID to be part of the object
      const { error } = await supabase
        .from(tableName)
        .upsert({ ...sanitized, id });
      
      if (error) throw error;
    } catch (e) {
      logger.error(`SYNC_PUSH_FAIL: ${tableName}`, e);
      throw e;
    }
  },

  /**
   * Formats error objects for readable output.
   */
  formatError(e: any): string {
    if (!e) return 'Error desconocido';
    if (typeof e === 'string') return e;
    if (e.message) return e.message;
    if (e.details) return e.details;
    if (e.hint) return `${e.message || ''} (Hint: ${e.hint})`;
    try {
      return JSON.stringify(e);
    } catch (err) {
      return String(e);
    }
  },

  /**
   * Pushes a batch of changes to Supabase with automatic column-error recovery.
   */
  async pushBatch(tableName: string, rows: any[]) {
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
    if (tableName === 'PROVEEDORES') primaryKey = 'rut';

    const maxRetries = 10;
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        const { error } = await supabase.from(tableName).upsert(currentRows, {
          onConflict: primaryKey
        });

        if (error) {
          // Detectar error de columna inexistente
          if (error.message && error.message.includes("column") && error.message.includes("not find")) {
            const match = error.message.match(/column '(.*?)' of/);
            const missingColumn = match ? match[1] : null;

            if (missingColumn) {
              console.warn(`[Resilience] Tabla ${tableName} no tiene columna '${missingColumn}'. Reintentando sin ella...`);
              currentRows = currentRows.map(row => {
                const newRow = { ...row };
                delete newRow[missingColumn];
                return newRow;
              });
              attempts++;
              continue; // Reintentar con el nuevo set de columnas
            }
          }
          throw error;
        }

        return { success: true, rows_written: rows.length };
      } catch (e: any) {
        if (attempts >= maxRetries - 1) {
          logger.error(`SYNC_BATCH_PUSH_FAIL: ${tableName} (Tras ${attempts} reintentos)`, e);
          return { success: false, error: this.formatError(e) };
        }
        attempts++;
        // Si no detectamos la columna específica o es otro error, fallamos
        return { success: false, error: this.formatError(e) };
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
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .or(`id.eq.${id},ID.eq.${id},claveUnica.eq.${id}`);
      
      if (error) throw error;
    } catch (e) {
      logger.error(`SYNC_DELETE_FAIL: ${tableName}`, e);
      throw e;
    }
  },

  async clearTable(tableName: string) {
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
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq(field, value);
      
      if (error) throw error;
      return { success: true, rows: data || [] };
    } catch (e) {
      logger.error(`SYNC_QUERY_FAIL: ${tableName}`, e);
      return { success: false, rows: [], error: this.formatError(e) };
    }
  },

  async pullBatch(tableName: string) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*');
      
      if (error) throw error;
      return { success: true, rows: data || [] };
    } catch (e) {
      logger.error(`SYNC_PULL_FAIL: ${tableName}`, e);
      return { success: false, rows: [], error: this.formatError(e) };
    }
  },

  async uploadPhoto(base64: string, path: string) {
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
