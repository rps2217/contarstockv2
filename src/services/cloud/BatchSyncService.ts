/**
 * BatchSyncService - Operaciones batch con Supabase
 * 
 * Maneja push, pull, delete en lotes con recovery automático.
 */

import { supabase } from '../../lib/supabase';
import { logger } from '../logger';

// Tipos
type SupabaseRow = Record<string, unknown>;

/**
 * Formatea errores para salida legible
 */
export function formatError(e: unknown): string {
  if (!e) return 'Error desconocido';
  if (typeof e === 'object' && (e as Error).message) {
    return (e as Error).message;
  }
  return String(e);
}

/**
 * Extrae nombre de columna de mensajes de error
 */
export function extractColumnNameFromError(errMsg: string): string | null {
  if (!errMsg) return null;
  
  const matchWithQuotes = errMsg.match(/column\s+['"](.*?)['"]/i) || 
                          errMsg.match(/['"](.*?)['"]\s+column/i);
  if (matchWithQuotes) return matchWithQuotes[1];
  
  const matchPlainTableCol = errMsg.match(/column\s+[\w_]+\.([\w_]+)\s+does\s+not/i);
  if (matchPlainTableCol) return matchPlainTableCol[1];

  const matchPlainCol = errMsg.match(/column\s+([\w_]+)\s+does\s+not/i);
  if (matchPlainCol) return matchPlainCol[1];

  return null;
}

/**
 * Normaliza datos para Supabase
 */
export function sanitizeData<T extends object>(data: T): SupabaseRow {
  const result: SupabaseRow = {};
  
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    
    result[key] = value instanceof Date 
      ? value.toISOString() 
      : value instanceof Map || value instanceof Set
        ? JSON.parse(JSON.stringify(Array.from(value)))
        : typeof value === 'object' && value !== null
          ? sanitizeData(value as SupabaseRow)
          : value;
  });
  
  return result;
}

const lastOfflineLogTime: Record<string, number> = {};
const LOG_THROTTLE_MS = 60000;

const logNetworkOffline = (tableName: string) => {
  if (!lastOfflineLogTime[tableName] || Date.now() - lastOfflineLogTime[tableName] > LOG_THROTTLE_MS) {
    logger.info('SYNC', `Network unavailable for ${tableName}. Operating offline.`);
    lastOfflineLogTime[tableName] = Date.now();
  }
};

/**
 * Push de un cambio individual
 */
export async function pushChange(
  tableName: string, 
  id: string, 
  data: SupabaseRow
): Promise<{ success: boolean; error?: string; isOffline?: boolean }> {
  return pushBatch(tableName, [{ ...data, id }]);
}

/**
 * Push de un lote de cambios con recovery automático de columnas
 */
export async function pushBatch<T extends object>(
  tableName: string, 
  rows: T[]
): Promise<{ success: boolean; error?: string; isOffline?: boolean; rows_written?: number }> {
  if (!navigator.onLine) {
    return { success: false, error: 'Offline', isOffline: true };
  }
  if (!rows.length) return { success: true, rows_written: 0 };
  
  // Campos prohibidos que causan ruido
  const forbiddenFields = new Set(['syncStatus', 'syncError', 'nextRetry', 'retryCount']);
  
  let currentRows = rows.map(row => {
    const sanitized = sanitizeData(row);
    Object.keys(sanitized).forEach(k => {
      if (forbiddenFields.has(k)) delete sanitized[k];
    });
    return sanitized;
  });

  // Primary keys por tabla
  let primaryKey = 'id';
  if (tableName === 'PROVEEDORES') {
    const firstRow = currentRows[0];
    if (firstRow) {
      if ('rut' in firstRow && firstRow.rut) {
        primaryKey = 'rut';
      } else if ('tax_id' in firstRow && firstRow.tax_id) {
        primaryKey = 'tax_id';
      } else {
        primaryKey = 'rut';
      }
    } else {
      primaryKey = 'rut';
    }
  }
  if (tableName === 'VENCIMIENTOS') primaryKey = 'unique_key';

  const maxRetries = 12;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const { error } = await supabase.from(tableName).upsert(currentRows, {
        onConflict: primaryKey
      });

      if (error) {
        const errMsg = error.message || '';
        
        // Error de columna inexistente
        if (errMsg.includes("column") && (errMsg.includes("not find") || errMsg.includes("does not exist") || errMsg.includes("unknown"))) {
          const missingColumn = extractColumnNameFromError(errMsg);
          
          if (missingColumn) {
            logger.info('SYNC_RESILIENCE', `Ajustando esquema: Tabla ${tableName} no tiene columna '${missingColumn}'.`);
            currentRows = currentRows.map(row => {
              const newRow = { ...row };
              delete newRow[missingColumn];
              return newRow;
            });
            attempts++;
            continue;
          }
        }

        // Error de tabla inexistente
        if (errMsg.includes("not find") && errMsg.includes("table")) {
          logger.info('SYNC', `Tabla ${tableName} no existe en Supabase.`);
          return { success: false, error: 'Table not found' };
        }

        throw error;
      }
      
      return { success: true, rows_written: currentRows.length };
    } catch (err: unknown) {
      const errMsg = (err as Error).message || String(err);
      
      if (attempts >= maxRetries - 1) {
        logger.error(`SYNC_BATCH_FAIL: ${tableName}`, errMsg);
        return { success: false, error: formatError(err) };
      }
      
      // Reintentar errores de red
      if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
        await new Promise(r => setTimeout(r, 1000 * (attempts + 1)));
        attempts++;
        continue;
      }
      
      throw err;
    }
  }
  
  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Delete remoto con retry de filtros
 */
export async function deleteRemote(
  tableName: string, 
  id: string
): Promise<{ success: boolean; error?: string; isOffline?: boolean }> {
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
          const missingCol = extractColumnNameFromError(errMsg);
          
          if (missingCol) {
            currentFilters = currentFilters.filter(f => !f.startsWith(`${missingCol}.`));
            if (currentFilters.length === 0) break;
            attempts++;
            continue;
          }
        }
        throw error;
      }
      return { success: true };
    } catch (err: unknown) {
      if (attempts >= filters.length - 1) {
        logger.error(`SYNC_DELETE_FAIL: ${tableName}`, String(err));
        return { success: false, error: formatError(err) };
      }
      attempts++;
    }
  }
  
  return { success: true };
}

/**
 * Query simple a una tabla
 */
export async function queryTable(
  tableName: string, 
  field: string, 
  value: string | number
): Promise<{ success: boolean; rows?: SupabaseRow[]; error?: string; isOffline?: boolean; isMissing?: boolean }> {
  if (!navigator.onLine) return { success: false, error: 'Offline', isOffline: true };
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq(field, value);
    
    if (error) {
      const errMsg = error.message || '';
      if (errMsg.includes("not find") && errMsg.includes("table")) {
        logger.info('SYNC', `Tabla ${tableName} no encontrada en Supabase.`);
        return { success: false, rows: [], error: 'Table not found', isMissing: true };
      }
      throw error;
    }
    return { success: true, rows: data || [] };
  } catch (err: unknown) {
    logger.error(`SYNC_QUERY_FAIL: ${tableName}`, String(err));
    return { success: false, rows: [], error: formatError(err) };
  }
}

/**
 * Pull de lote con paginación
 */
export async function pullBatch(
  tableName: string, 
  lastSyncDate?: string, 
  timestampColumn: string = 'updated_at'
): Promise<{ success: boolean; rows?: SupabaseRow[]; error?: string; isOffline?: boolean; isMissing?: boolean }> {
  if (!navigator.onLine) {
    return { success: false, error: 'Offline', isOffline: true };
  }
  
  const fetchWithPagination = async (fromDate?: string) => {
    let allData: SupabaseRow[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase.from(tableName).select('*');
      
      if (fromDate) {
        query = query.gte(timestampColumn, fromDate);
      }
      
      const { data, error } = await query.range(from, from + step - 1);
      
      if (error) {
        const errMsg = error.message || '';
        if (errMsg.includes("not find") && errMsg.includes("table")) {
          return { isMissing: true, error: errMsg };
        }
        throw error;
      }
      
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += step;
        if (data.length < step) hasMore = false;
      } else {
        hasMore = false;
      }
    }
    return allData;
  };

  try {
    const result = await fetchWithPagination(lastSyncDate);
    if (typeof result === 'object' && 'isMissing' in result) {
      logger.info('SYNC', `Tabla ${tableName} no encontrada. Omitiendo descarga.`);
      return { success: false, rows: [], error: 'Table not found', isMissing: true };
    }
    return { success: true, rows: result as SupabaseRow[] };
  } catch (err: unknown) {
    const errMsg = (err as Error).message || String(err);
    
    if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('net::ERR')) {
      logNetworkOffline(tableName);
      return { success: false, rows: [], error: 'Offline', isOffline: true };
    }

    if (errMsg.includes("not find") && errMsg.includes("table")) {
      return { success: false, rows: [], error: 'Table not found', isMissing: true };
    }
    
    logger.error(`SYNC_PULL_FAIL: ${tableName}`, String(err));
    return { success: false, rows: [], error: formatError(err) };
  }
}

/**
 * Upload de foto a Supabase Storage
 */
export async function uploadPhoto(
  base64: string, 
  path: string
): Promise<{ success: boolean; fileUrl?: string; error?: string; isOffline?: boolean }> {
  if (!navigator.onLine) return { success: false, error: 'Offline', isOffline: true };
  
  try {
    const bucketName = 'photos';
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    
    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/jpeg' });

    const { error } = await supabase.storage
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
  } catch (err: unknown) {
    logger.error('PHOTO_UPLOAD_FAIL', String(err));
    return { success: false, error: formatError(err) };
  }
}

/**
 * Clear table (dangerous!)
 */
export async function clearTable(
  tableName: string
): Promise<{ success: boolean; error?: string; isOffline?: boolean }> {
  if (!navigator.onLine) return { success: false, error: 'Offline', isOffline: true };
  
  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .or('id.neq.0,ID.neq.0,timestamp.neq.0');
    
    if (error) {
      const { error: error2 } = await supabase.from(tableName).delete().filter('id', 'not.is', null);
      if (error2) throw error2;
    }
    return { success: true };
  } catch (err: unknown) {
    logger.error(`CLEAR_TABLE_FAIL: ${tableName}`, String(err));
    return { success: false, error: formatError(err) };
  }
}
