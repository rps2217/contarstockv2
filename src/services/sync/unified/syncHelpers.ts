/**
 * =============================================================================
 * SYNC HELPERS - Utilidades para sincronización
 * =============================================================================
 *
 * Funciones auxiliares para:
 * - Formateo de errores
 * - Extracción de metadata
 * - Sanitización de datos
 *
 * @module unified/syncHelpers
 */

import { telemetry } from '@/services/analytics/telemetryService';

/**
 * Formatea errores para salida legible
 */
export const formatError = (e: unknown): string => {
  if (!e) return 'Error desconocido';
  if (typeof e === 'object' && 'message' in e) {
    return (e as Error).message;
  }
  return String(e);
};

/**
 * Extrae nombre de columna de mensajes de error de Supabase
 */
export const extractColumnNameFromError = (errMsg: string): string | null => {
  if (!errMsg) return null;
  const match =
    errMsg.match(/column\s+['"](.*?)['"]/i) || errMsg.match(/column\s+([\w_]+)\s+does\s+not/i);
  return match ? match[1] : null;
};

/**
 * Normaliza datos para Supabase (sanitización)
 */
export const sanitizeData = <T extends object>(data: T): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    result[key] =
      value instanceof Date
        ? value.toISOString()
        : typeof value === 'object' && value !== null
          ? JSON.parse(JSON.stringify(value))
          : value;
  });
  return result;
};

/**
 * Registra métrica de sincronización
 */
export const recordSyncMetric = (
  operation: string,
  tableName: string,
  duration: number,
  success: boolean,
  recordsAffected: number,
  error?: string
) => {
  try {
    telemetry.track('SYNC', operation, {
      table: tableName,
      duration: Math.round(duration),
      success,
      records: recordsAffected,
      error: error || null,
    });
  } catch {
    // Silently fail telemetry
  }
};
