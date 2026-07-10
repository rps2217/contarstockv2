/**
 * =============================================================================
 * SYNC REGISTRY - Registro Centralizado de Tablas
 * =============================================================================
 * 
 * Re-exporta y documenta el registro de tablas de sincronización.
 * Usado por UnifiedSyncEngine como fuente de configuración.
 * 
 * @module unified/registry
 */

// Re-exportar tipos del módulo unificado
export type { TableSyncMeta } from './types';

// Importar el registro original (compatibilidad)
import { syncRegistry as _originalRegistry, type TableSyncMeta as _TableSyncMeta } from '../../cloud/syncRegistry';

/**
 * Registro de tablas de sincronización
 * Cada entrada define cómo sincronizar entre IndexedDB local y Supabase remoto
 */
export const syncRegistry: Record<string, _TableSyncMeta> = _originalRegistry;

/**
 * Lista de tablas que se sincronizan en modo catálogo
 */
export const CATALOG_TABLES = [
  'products',
  'sessions', 
  'scans',
  'providers',
  'expiry',
  'events',
  'productProviders',
];

/**
 * Tablas que solo se suben (no se descargan)
 */
export const UPLOAD_ONLY_TABLES = [
  'auditLogs',
  'scans',
];

/**
 * Obtiene metadatos de sincronización para una tabla
 */
export function getTableMeta(tableName: string): _TableSyncMeta | undefined {
  return syncRegistry[tableName];
}

/**
 * Verifica si una tabla existe en el registry
 */
export function isRegistered(tableName: string): boolean {
  return tableName in syncRegistry;
}