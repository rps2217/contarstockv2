/**
 * Common Service Types - Tipos compartidos entre servicios
 */

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
}

/**
 * Estado de sincronización de un registro
 */
export type SyncStatus = 'pending' | 'synced' | 'error' | 'pending_delete';

/**
 * Ítem pendiente de sincronización
 */
export interface PendingSyncItem {
  id: string;
  table: string;
  status: SyncStatus;
  timestamp: number;
  data?: Record<string, unknown>;
  retryCount?: number;
}

/**
 * ServiceError está definido en utilityTypes.ts
 * @see ./utilityTypes.ts
 */
