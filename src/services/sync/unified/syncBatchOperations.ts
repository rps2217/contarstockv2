/**
 * Sync Batch Operations
 * Lógica de operaciones batch con Supabase incluyendo retry inteligente
 */

import { supabase } from '@/lib/supabase';
import { syncMetricsService } from './SyncMetricsService';
import { syncRegistry } from './registry';
import { formatError, extractColumnNameFromError } from './syncHelpers';
import type { SyncResult } from './types';

/** Helper para registrar métricas de sync */
export function recordBatchMetric(params: {
  tableName: string;
  duration: number;
  success: boolean;
  recordsAffected: number;
  error?: string;
}): void {
  try {
    syncMetricsService.recordMetric({
      operation: 'batch_push',
      tableName: params.tableName,
      duration: params.duration,
      success: params.success,
      recordsAffected: params.recordsAffected,
      error: params.error,
      timestamp: Date.now(),
    });
  } catch {
    // Ignore metrics errors
  }
}

/** Helper para registrar métricas de sync general */
export function recordSyncMetric(params: {
  operation: string;
  tableName: string;
  duration: number;
  success: boolean;
  recordsAffected: number;
  error?: string;
}): void {
  try {
    syncMetricsService.recordMetric({
      operation: params.operation,
      tableName: params.tableName,
      duration: params.duration,
      success: params.success,
      recordsAffected: params.recordsAffected,
      error: params.error,
      timestamp: Date.now(),
    });
  } catch {
    // Ignore metrics errors
  }
}

/**
 * Ejecuta un upsert batch con reintento inteligente para columnas faltantes
 */
export async function executeBatchUpsert(
  tableName: string,
  rows: Record<string, unknown>[],
  options: {
    mapToRemote?: (row: Record<string, unknown>) => Record<string, unknown>;
    primaryKey?: string;
    startTime?: number;
  } = {}
): Promise<SyncResult> {
  const { mapToRemote, primaryKey = 'id', startTime = performance.now() } = options;

  const meta = syncRegistry[tableName];
  if (!meta) return { success: false, errors: ['Unknown table'] };

  // Sanitizar filas (remover campos de sync)
  const sanitizeRow = (row: Record<string, unknown>): Record<string, unknown> => {
    const remote = mapToRemote ? mapToRemote(row) : row;
    const clean: Record<string, unknown> = {};
    Object.entries(remote).forEach(([k, v]) => {
      if (!['syncStatus', 'syncError', 'nextRetry', 'retryCount'].includes(k)) {
        clean[k] = v;
      }
    });
    return clean;
  };

  const sanitizedRows = rows.map(sanitizeRow);
  let currentRows = sanitizedRows;
  let attempts = 0;
  const maxAttempts = 12;

  while (attempts < maxAttempts) {
    try {
      const { error, count } = await supabase
        .from(meta.remoteTable)
        .upsert(currentRows, { onConflict: primaryKey });

      if (error) {
        const errMsg = error.message || '';
        const missingCol = extractColumnNameFromError(errMsg);

        if (missingCol && errMsg.includes('column')) {
          // Remover columna faltante y reintentar
          currentRows = currentRows.map(row => {
            const r = { ...row };
            delete r[missingCol];
            return r;
          });
          attempts++;
          continue;
        }

        recordBatchMetric({
          tableName,
          duration: performance.now() - startTime,
          success: false,
          recordsAffected: rows.length,
          error: errMsg,
        });
        return { success: false, errors: [errMsg] };
      }

      recordBatchMetric({
        tableName,
        duration: performance.now() - startTime,
        success: true,
        recordsAffected: count || rows.length,
      });
      return { success: true, uploaded: count || rows.length };
    } catch (error: unknown) {
      recordBatchMetric({
        tableName,
        duration: performance.now() - startTime,
        success: false,
        recordsAffected: rows.length,
        error: formatError(error),
      });
      return { success: false, errors: [formatError(error)] };
    }
  }

  recordBatchMetric({
    tableName,
    duration: performance.now() - startTime,
    success: false,
    recordsAffected: rows.length,
    error: 'Max retries exceeded',
  });
  return { success: false, errors: ['Max retries exceeded'] };
}

/**
 * Ejecuta push single (un solo registro)
 */
export async function executeSingleUpsert(
  tableName: string,
  data: Record<string, unknown>
): Promise<SyncResult> {
  const meta = syncRegistry[tableName];
  if (!meta) return { success: false, errors: ['Unknown table'] };

  try {
    const remote = meta.mapToRemote ? meta.mapToRemote(data) : data;
    const sanitized: Record<string, unknown> = {};
    Object.entries(remote).forEach(([k, v]) => {
      if (!['syncStatus', 'syncError', 'nextRetry', 'retryCount'].includes(k)) {
        sanitized[k] = v;
      }
    });

    if (sanitized.id !== undefined) {
      delete sanitized.id;
    }

    const { error } = await supabase.from(meta.remoteTable).upsert(sanitized);

    if (error) {
      return { success: false, errors: [error.message] };
    }

    return { success: true, uploaded: 1 };
  } catch (error: unknown) {
    return { success: false, errors: [formatError(error)] };
  }
}

/**
 * Wrapper para ejecutar operación offline-safe
 */
export function createOfflineSafeExecutor<T>(
  operation: () => Promise<T>,
  errorResult: T
): () => Promise<T> {
  return async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return errorResult;
    }
    return operation();
  };
}
