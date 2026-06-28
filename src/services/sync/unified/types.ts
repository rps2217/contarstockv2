/**
 * =============================================================================
 * UNIFIED SYNC TYPES - Fuente Única de Verdad para Sincronización
 * =============================================================================
 * 
 * Este archivo define TODOS los tipos relacionados con sincronización.
 * Centraliza: SyncResult, SyncStatus, QueuedSyncItem, SyncState, etc.
 * 
 * @module unified/types
 */

// =============================================================================
// TIPOS BASE
// =============================================================================

/**
 * Estado de sincronización de un registro
 */
export type SyncStatus = 'pending' | 'synced' | 'error' | 'pending_delete';

/**
 * Fila genérica de Supabase/Base de datos
 */
export type SupabaseRow = Record<string, unknown>;

/**
 * Resultado de una operación de sincronización
 */
export interface SyncResult {
  success: boolean;
  uploaded?: number;
  downloaded?: number;
  deleted?: number;
  conflicts?: number;
  errors?: string[];
  /** Timestamp de la última sincronización exitosa */
  lastSyncAt?: number;
}

/**
 * Resultado detallado de sincronización por tabla
 */
export interface TableSyncResult {
  tableName: string;
  added: number;
  updated: number;
  deleted: number;
  errors: string[];
  duration: number;
}

// =============================================================================
// ESTADOS FSM
// =============================================================================

/**
 * Estados posibles del motor de sincronización
 */
export type SyncState = 
  | 'idle'
  | 'syncing_catalogs'
  | 'syncing_batches'
  | 'checking_conflicts'
  | 'resolving_conflicts'
  | 'error'
  | 'offline';

/**
 * Eventos que pueden disparar transiciones de estado
 */
export type SyncEvent =
  | 'SYNC_CATALOGS'
  | 'SYNC_BATCHES'
  | 'SYNC_ALL'
  | 'CHECK_CONFLICTS'
  | 'RESOLVE_CONFLICTS'
  | 'ERROR'
  | 'OFFLINE'
  | 'RESET';

// =============================================================================
// COLA OFFLINE
// =============================================================================

/**
 * Ítem en la cola de sincronización offline
 */
export interface QueuedSyncItem {
  id?: number;
  tableName: string;
  operation: 'create' | 'update' | 'delete';
  recordId: string;
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
  lastError?: string;
  priority: 'high' | 'normal' | 'low';
}

/**
 * Resultado del procesamiento de la cola
 */
export interface QueueProcessResult {
  processed: number;
  failed: number;
  remaining: number;
  /** Lista de IDs procesados exitosamente */
  processedIds: number[];
  /** Lista de errores por ID */
  errors: Record<number, string>;
}

// =============================================================================
// CONFLICTOS
// =============================================================================

/**
 * Resolución de conflicto disponible
 */
export type ConflictResolution = 'local_wins' | 'remote_wins' | 'manual' | 'merge';

/**
 * Estrategia de resolución de conflictos
 */
export interface ConflictStrategy {
  type: ConflictResolution;
  fieldRules?: Record<string, ConflictResolution>;
  autoResolve?: boolean;
}

/**
 * Conflicto detectado durante sincronización
 */
export interface SyncConflict {
  tableName: string;
  recordId: string;
  localValue: unknown;
  remoteValue: unknown;
  field: string;
  detectedAt: number;
  resolved?: boolean;
  resolution?: ConflictResolution;
}

// =============================================================================
// ESTADÍSTICAS Y METRICAS
// =============================================================================

/**
 * Estadísticas de sincronización
 */
export interface SyncStats {
  lastSyncAt: number | null;
  lastSyncDuration: number;
  totalSynced: number;
  totalErrors: number;
  pendingItems: number;
  isOnline: boolean;
  currentState: SyncState;
}

/**
 * Métricas de rendimiento de sincronización
 */
export interface SyncMetrics {
  avgPushTime: number;
  avgPullTime: number;
  avgConflictResolutionTime: number;
  totalBatches: number;
  successRate: number;
}

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

/**
 * Opciones de configuración del motor de sync
 */
export interface SyncEngineConfig {
  /** Tamaño de batch para operaciones */
  batchSize: number;
  /** Número máximo de reintentos */
  maxRetries: number;
  /** Delay base para reintentos (ms) */
  baseDelayMs: number;
  /** Delay máximo para reintentos (ms) */
  maxDelayMs: number;
  /** Habilitar sync en tiempo real */
  enableRealtime: boolean;
  /** Habilitar resolución automática de conflictos */
  autoResolveConflicts: boolean;
  /** Tablas a sincronizar */
  tables: string[];
}

/**
 * Valores por defecto de configuración
 */
export const DEFAULT_SYNC_CONFIG: Required<SyncEngineConfig> = {
  batchSize: 100,
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  enableRealtime: true,
  autoResolveConflicts: false,
  tables: ['products', 'sessions', 'scans', 'providers', 'expiry', 'events'],
};

// =============================================================================
// REGISTRY DE TABLAS
// =============================================================================

/**
 * Metadatos de sincronización por tabla
 */
export interface TableSyncMeta {
  /** Nombre de tabla en IndexedDB (Dexie) */
  localTable: string;
  /** Nombre de tabla en Supabase (PostgreSQL) */
  remoteTable: string;
  /** Clave primaria para actualizaciones/eliminaciones */
  primaryKey: string;
  /** Campo para filtrar en tablas dinámicas (dynamic_data) */
  filterField?: string;
  /** Valor del filtro para tablas dinámicas */
  filterValue?: string;
  /** Indica si es tabla dinámica */
  isDynamic?: boolean;
  /** Indica si la tabla es opcional */
  optional?: boolean;
  /** Función para transformar registro local → remoto */
  mapToRemote?: (local: unknown) => SupabaseRow;
  /** Función para transformar registro remoto → local */
  mapToLocal?: (remote: SupabaseRow) => unknown;
}

// =============================================================================
// EVENTOS
// =============================================================================

/**
 * Tipos de eventos de sincronización
 */
export type SyncEventType = 
  | 'sync_start'
  | 'sync_complete'
  | 'sync_error'
  | 'item_added'
  | 'item_removed'
  | 'item_retry'
  | 'item_failed'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'state_change';

/**
 * Payload de evento de sincronización
 */
export interface SyncEventPayload {
  type: SyncEventType;
  tableName?: string;
  recordId?: string;
  state?: SyncState;
  conflict?: SyncConflict;
  error?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Listener de eventos de sincronización
 */
export type SyncEventListener = (event: SyncEventPayload) => void;