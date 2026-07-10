/**
 * Conflict Resolution Service
 * 
 * Servicio para resolver conflictos de sincronización.
 * Proporciona estrategias para manejar conflictos de datos.
 * 
 * Estrategias disponibles:
 * - LOCAL_WINS: Mantener datos locales
 * - REMOTE_WINS: Usar datos del servidor
 * - MANUAL: Requiere intervención del usuario
 * - MERGE: Combinar datos intelligently
 */

import { db } from '@/db';
import { logger } from '@/services/logger';

export type ConflictStrategy = 'LOCAL_WINS' | 'REMOTE_WINS' | 'MANUAL' | 'MERGE';

export interface ConflictRecord {
  id: string;
  tableName: string;
  recordId: string;
  localData: Record<string, unknown>;
  remoteData: Record<string, unknown>;
  conflictFields: string[];
  timestamp: number;
}

export interface ResolutionResult {
  success: boolean;
  resolvedData?: Record<string, unknown>;
  strategy: ConflictStrategy;
  mergedFields?: string[];
}

/**
 * Resolver conflictos usando estrategia especificada
 */
export const conflictResolver = {
  
  /**
   * Resolver conflicto usando estrategia
   */
  async resolve(
    conflict: ConflictRecord,
    strategy: ConflictStrategy
  ): Promise<ResolutionResult> {
    try {
      switch (strategy) {
        case 'LOCAL_WINS':
          return this.localWins(conflict);
        case 'REMOTE_WINS':
          return this.remoteWins(conflict);
        case 'MANUAL':
          return this.manualResolution(conflict);
        case 'MERGE':
          return this.mergeData(conflict);
        default:
          throw new Error(`Unknown strategy: ${strategy}`);
      }
    } catch (error) {
      logger.error('CONFLICT_RESOLUTION', String(error));
      return { success: false, strategy };
    }
  },

  /**
   * Estrategia: Local wins
   */
  localWins(conflict: ConflictRecord): ResolutionResult {
    return {
      success: true,
      resolvedData: conflict.localData,
      strategy: 'LOCAL_WINS',
    };
  },

  /**
   * Estrategia: Remote wins
   */
  remoteWins(conflict: ConflictRecord): ResolutionResult {
    return {
      success: true,
      resolvedData: conflict.remoteData,
      strategy: 'REMOTE_WINS',
    };
  },

  /**
   * Estrategia: Manual (retorna ambos para decisión del usuario)
   */
  manualResolution(conflict: ConflictRecord): ResolutionResult {
    return {
      success: true,
      resolvedData: {
        local: conflict.localData,
        remote: conflict.remoteData,
        _manual: true,
      },
      strategy: 'MANUAL',
    };
  },

  /**
   * Estrategia: Merge inteligente
   * - Toma remote para campos de solo lectura
   * - Mantiene local para campos editables por usuario
   */
  mergeData(conflict: ConflictRecord): ResolutionResult {
    const merged = { ...conflict.remoteData };
    const mergedFields: string[] = [];

    // Copiar campos locales que tienen prioridad
    for (const [key, localValue] of Object.entries(conflict.localData)) {
      if (localValue !== undefined && localValue !== null) {
        merged[key] = localValue;
        mergedFields.push(key);
      }
    }

    // Mantener metadata de resolución
    merged._conflictResolved = true;
    merged._conflictTimestamp = conflict.timestamp;
    merged._conflictFields = conflict.conflictFields;

    return {
      success: true,
      resolvedData: merged,
      strategy: 'MERGE',
      mergedFields,
    };
  },

  /**
   * Obtener estrategia por defecto según tipo de tabla
   */
  getDefaultStrategy(tableName: string): ConflictStrategy {
    // Tablas de catálogo: remote wins (son datos maestra)
    const catalogTables = ['products', 'categories', 'providers', 'customers'];
    if (catalogTables.includes(tableName)) {
      return 'REMOTE_WINS';
    }

    // Tablas de trabajo: merge
    const workTables = ['sessions', 'session_items', 'expected_orders'];
    if (workTables.includes(tableName)) {
      return 'MERGE';
    }

    // Por defecto: local wins (para no perder trabajo)
    return 'LOCAL_WINS';
  },

  /**
   * Detectar campos en conflicto
   */
  detectConflictFields(
    localData: Record<string, unknown>,
    remoteData: Record<string, unknown>
  ): string[] {
    const fields: string[] = [];
    const allKeys = new Set([
      ...Object.keys(localData),
      ...Object.keys(remoteData),
    ]);

    for (const key of allKeys) {
      // Ignorar campos de sistema
      if (key.startsWith('_')) continue;

      const localVal = JSON.stringify(localData[key]);
      const remoteVal = JSON.stringify(remoteData[key]);

      if (localVal !== remoteVal) {
        fields.push(key);
      }
    }

    return fields;
  },
};

/**
 * Service standalone para uso fuera de hooks
 */
export const conflictResolutionService = conflictResolver;

export default conflictResolver;