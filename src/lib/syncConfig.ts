/**
 * syncConfig - Configuración centralizada para sincronización
 * 
 * Este archivo centraliza la configuración de tablas y endpoints de Supabase
 * para evitar duplicación entre hammerSync y useCountingSync.
 */

import { getSettings } from '@/services/settings';

// ============================================================================
// CONFIGURACIÓN DE TABLAS
// ============================================================================

export interface SyncTableConfig {
  counts: string;      // CONTEOS
  sessions: string;    // SESIONES_CONTEO
  products: string;    // PRODUCTOS
  orders: string;      // PEDIDOS
}

/**
 * Obtener configuración de tablas desde settings
 */
export const getSyncTableConfig = (): SyncTableConfig => {
  const config = getSettings().cloudConfig;
  
  return {
    counts: config?.countsTableName || 'CONTEOS',
    sessions: config?.sessionsTableName || 'SESIONES_CONTEO',
    products: config?.productsTableName || 'PRODUCTOS',
    orders: config?.ordersTableName || 'PEDIDOS',
  };
};

// ============================================================================
// CONSTANTES DE SYNC
// ============================================================================

export const SYNC_CONSTANTS = {
  // Prefijos de batch
  BATCH_PREFIX: 'HM-',
  
  // Estados de sync
  SYNC_STATUS: {
    PENDING: 'pending',
    SYNCED: 'synced',
    ERROR: 'error',
  } as const,
  
  // Tipos de sesión
  SESSION_TYPES: {
    STANDARD: 'standard',
    HAMMER: 'hammer',
    BLIND: 'blind',
  } as const,
  
  // Límites
  BATCH_SIZE: 100,  // Registros por batch en sincronización
  MAX_RETRY: 3,     // Intentos máximos de retry
  RETRY_DELAY: 1000, // Delay entre retries (ms)
  
  // Thresholds
  MANIFEST_AUTO_DISCARD_HOURS: 24, // Horas para auto-descartar manifests antiguos
  SESSION_EXPIRY_DAYS: 7,          // Días para expirar sesiones inactivas
};

// ============================================================================
// UTILIDADES DE SYNC
// ============================================================================

/**
 * Verificar si un sessionId es de modo ciego (Hammer)
 */
export const isBlindSessionId = (sessionId: string): boolean => {
  return sessionId.startsWith(SYNC_CONSTANTS.BATCH_PREFIX);
};

/**
 * Generar ID de batch único para modo ciego
 */
export const generateBatchId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${SYNC_CONSTANTS.BATCH_PREFIX}${timestamp}${random}`.toUpperCase();
};

/**
 * Formatear timestamp para logs
 */
export const formatSyncTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toISOString();
};

// ============================================================================
// HELPERS DE CONFIGURACIÓN
// ============================================================================

/**
 * Obtener tabla destino para un tipo de operación
 */
export const getTargetTable = (operation: 'counts' | 'sessions' | 'stock' | 'orders'): string => {
  const config = getSyncTableConfig();
  return config[operation];
};

/**
 * Verificar si la sincronización en la nube está habilitada
 */
export const isCloudSyncEnabled = (): boolean => {
  const settings = getSettings();
  const config = settings.cloudConfig;
  // Verificar que haya al menos una tabla configurada
  return !!(config?.countsTableName);
};

export default {
  getSyncTableConfig,
  getTargetTable,
  isBlindSessionId,
  generateBatchId,
  formatSyncTimestamp,
  isCloudSyncEnabled,
  SYNC_CONSTANTS,
};
