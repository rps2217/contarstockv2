import { logger } from '@/services/logger';
/**
 * =============================================================================
 * CONFLICT RESOLUTION - Estrategias de Resolución de Conflictos
 * =============================================================================
 * 
 * Cuando un registro es modificado tanto localmente como en la nube de forma
 * independiente, ocurre un conflicto. Este módulo define estrategias para
 * resolverlos automáticamente o con intervención del usuario.
 * 
 * ESTRATEGIAS DISPONIBLES:
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  STRATEGY        │  DESCRIPCIÓN              │  CUÁNDO USAR           │
 * ├──────────────────┼───────────────────────────┼─────────────────────────│
 * │  client_wins     │  Local siempre gana       │  Trabajo offline       │
 * │  server_wins     │  Nube siempre gana        │  Nube como fuente      │
 * │  last_write_wins │  Timestamp más reciente    │  Uso general           │
 * │  manual          │  Usuario decide           │  Decisiones críticas   │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * FLUJO DE CONFLICTO:
 * 
 *   ┌──────────────┐         ┌──────────────┐
 *   │    LOCAL     │         │    REMOTE     │
 *   │  modified   │         │   modified    │
 *   └──────┬───────┘         └──────┬───────┘
 *          │                         │
 *          └─────────┬───────────────┘
 *                    ▼
 *           ┌──────────────┐
 *           │   CONFLICT   │
 *           │  DETECTED    │
 *           └──────┬───────┘
 *                  │
 *          ┌──────▼───────┐
 *          │  APPLY       │
 *          │  STRATEGY   │
 *          └──────┬───────┘
 *                 │
 *        ┌────────┼────────┐
 *        ▼        ▼        ▼
 *   client    last     manual
 *   _wins     _write   _wins
 *            _wins
 * 
 * @module ConflictResolution
 */

// =============================================================================
// TIPOS Y CONSTANTES
// =============================================================================

/**
 * Estrategias disponibles para resolver conflictos.
 */
export type ConflictStrategy = 
  | 'client_wins'   // Local siempre sobreescribe remoto
  | 'server_wins'   // Remoto siempre sobreescribe local
  | 'last_write_wins' // Timestamp más reciente gana
  | 'manual';        // Usuario decide en cada conflicto

/**
 * Resultado de resolver un conflicto.
 */
export interface ConflictResolution {
  /** Indica si el conflicto fue resuelto */
  resolved: boolean;
  /** Indica si se debe usar el valor local */
  useLocal: boolean;
  /** Indica si se debe usar el valor remoto */
  useRemote: boolean;
  /** Estrategia aplicada */
  strategy: ConflictStrategy;
  /** Razón de la decisión */
  reason: string;
  /** Datos resultantes */
  resolvedData?: Record<string, any>;
}

/**
 * Registro con timestamps para comparar.
 */
export interface TimestampedRecord {
  data: Record<string, any>;
  timestamp: number;
  syncStatus?: string;
}

/**
 *常量 de estrategias con labels para UI.
 */
export const CONFLICT_STRATEGIES: Record<ConflictStrategy, { label: string; description: string; icon: string }> = {
  client_wins: {
    label: 'Cliente Gana',
    description: 'Los cambios locales siempre se preservan, sobreescribiendo la nube',
    icon: '📱'
  },
  server_wins: {
    label: 'Servidor Gana',
    description: 'Los cambios en la nube siempre se preservan, sobreescribiendo local',
    icon: '☁️'
  },
  last_write_wins: {
    label: 'Último Gana',
    description: 'Se aplica el registro con timestamp más reciente',
    icon: '⏱️'
  },
  manual: {
    label: 'Manual',
    description: 'El usuario decide en cada conflicto',
    icon: '👤'
  }
};

/**
 * Clave en settings para guardar la estrategia.
 */
export const STRATEGY_SETTINGS_KEY = 'sync_conflict_strategy';

// =============================================================================
// HELPERS UTILITARIOS
// =============================================================================

/**
 * Obtiene el timestamp de un registro de forma segura.
 * Soporta diferentes formatos de fecha.
 */
const getRecordTimestamp = (record: any): number => {
  // Intentar diferentes campos de timestamp
  const timestampFields = [
    'updatedAt',
    'timestamp',
    'updated_at',
    'lastModified',
    'modifiedAt'
  ];

  for (const field of timestampFields) {
    const value = record[field];
    if (value !== undefined && value !== null) {
      if (typeof value === 'number') {
        return value > 1000000000000 ? value : value * 1000; // Unix seconds vs milliseconds
      }
      if (typeof value === 'string') {
        const parsed = new Date(value).getTime();
        if (!isNaN(parsed)) return parsed;
      }
    }
  }

  return 0;
};

/**
 * Deep merge de dos objetos, donde localOverride tiene prioridad.
 */
const mergeRecords = (remote: Record<string, any>, localOverride: Record<string, any>): Record<string, any> => {
  return {
    ...remote,
    ...localOverride,
    // Siempre preservar ciertos campos del remote
    id: remote.id || localOverride.id,
    // Preservar timestamp más reciente
    updatedAt: Math.max(
      getRecordTimestamp(remote),
      getRecordTimestamp(localOverride)
    )
  };
};

// =============================================================================
// ESTRATEGIAS DE RESOLUCIÓN
// =============================================================================

/**
 * CLIENT_WINS: Preserva cambios locales, descarta cambios remotos.
 * Útil cuando el usuario trabaja principalmente offline.
 */
export const resolveClientWins = (
  localRecord: TimestampedRecord,
  remoteRecord: TimestampedRecord
): ConflictResolution => {
  return {
    resolved: true,
    useLocal: true,
    useRemote: false,
    strategy: 'client_wins',
    reason: 'Estrategia "Cliente Gana": Se preservaron los cambios locales',
    resolvedData: localRecord.data
  };
};

/**
 * SERVER_WINS: Preserva cambios remotos, descarta cambios locales.
 * Útil cuando la nube es la fuente de verdad.
 */
export const resolveServerWins = (
  localRecord: TimestampedRecord,
  remoteRecord: TimestampedRecord
): ConflictResolution => {
  return {
    resolved: true,
    useLocal: false,
    useRemote: true,
    strategy: 'server_wins',
    reason: 'Estrategia "Servidor Gana": Se aplicaron los cambios de la nube',
    resolvedData: remoteRecord.data
  };
};

/**
 * LAST_WRITE_WINS: Aplica el registro con timestamp más reciente.
 * Útil para uso general, proporciona balance entre local y remoto.
 */
export const resolveLastWriteWins = (
  localRecord: TimestampedRecord,
  remoteRecord: TimestampedRecord
): ConflictResolution => {
  const localTime = getRecordTimestamp(localRecord.data);
  const remoteTime = getRecordTimestamp(remoteRecord.data);

  if (localTime >= remoteTime) {
    return {
      resolved: true,
      useLocal: true,
      useRemote: false,
      strategy: 'last_write_wins',
      reason: `Última modificación fue local (${new Date(localTime).toLocaleString()})`,
      resolvedData: localRecord.data
    };
  } else {
    return {
      resolved: true,
      useLocal: false,
      useRemote: true,
      strategy: 'last_write_wins',
      reason: `Última modificación fue remota (${new Date(remoteTime).toLocaleString()})`,
      resolvedData: remoteRecord.data
    };
  }
};

/**
 * MANUAL: Retorna que se necesita intervención del usuario.
 * El llamador debe presentar opciones al usuario.
 */
export const resolveManual = (
  localRecord: TimestampedRecord,
  remoteRecord: TimestampedRecord
): ConflictResolution => {
  return {
    resolved: false, // No resuelto automáticamente
    useLocal: false,
    useRemote: false,
    strategy: 'manual',
    reason: 'Conflicto requiere decisión del usuario',
    resolvedData: mergeRecords(remoteRecord.data, localRecord.data) // Merge como sugerencia
  };
};

// =============================================================================
// REGISTRY DE ESTRATEGIAS
// =============================================================================

/**
 * Factory para aplicar una estrategia específica.
 */
export const applyStrategy = (
  strategy: ConflictStrategy,
  localRecord: TimestampedRecord,
  remoteRecord: TimestampedRecord
): ConflictResolution => {
  switch (strategy) {
    case 'client_wins':
      return resolveClientWins(localRecord, remoteRecord);
    case 'server_wins':
      return resolveServerWins(localRecord, remoteRecord);
    case 'last_write_wins':
      return resolveLastWriteWins(localRecord, remoteRecord);
    case 'manual':
      return resolveManual(localRecord, remoteRecord);
    default:
      // Por defecto, usar last_write_wins
      return resolveLastWriteWins(localRecord, remoteRecord);
  }
};

/**
 * Resuelve conflictos para una lista de registros.
 * Retorna mapas de decisiones para procesamiento posterior.
 */
export interface ConflictBatchResult {
  /** IDs de registros que deben usar versión local */
  useLocalIds: Set<string>;
  /** IDs de registros que deben usar versión remota */
  useRemoteIds: Set<string>;
  /** IDs de conflictos que requieren decisión manual */
  manualIds: Set<string>;
  /** Conflictos detectados */
  conflicts: Array<{
    id: string;
    local: TimestampedRecord;
    remote: TimestampedRecord;
  }>;
}

/**
 * Procesa una lista de conflictos con una estrategia común.
 */
export const resolveConflictBatch = (
  conflicts: Array<{
    id: string;
    local: TimestampedRecord;
    remote: TimestampedRecord;
  }>,
  strategy: ConflictStrategy
): ConflictBatchResult => {
  const result: ConflictBatchResult = {
    useLocalIds: new Set(),
    useRemoteIds: new Set(),
    manualIds: new Set(),
    conflicts: []
  };

  for (const conflict of conflicts) {
    const resolution = applyStrategy(strategy, conflict.local, conflict.remote);

    if (!resolution.resolved) {
      result.manualIds.add(conflict.id);
      result.conflicts.push(conflict);
    } else if (resolution.useLocal) {
      result.useLocalIds.add(conflict.id);
    } else if (resolution.useRemote) {
      result.useRemoteIds.add(conflict.id);
    }
  }

  return result;
};

// =============================================================================
// UTILIDADES PARA SETTINGS
// =============================================================================

import { getSettings, saveSettings } from '../settings';

/**
 * Obtiene la estrategia configurada actualmente.
 */
export const getConfiguredStrategy = (): ConflictStrategy => {
  try {
    const settings = getSettings();
    const syncConfig = settings?.cloudConfig as any;
    return (syncConfig?.conflictStrategy as ConflictStrategy) || 'last_write_wins';
  } catch {
    return 'last_write_wins';
  }
};

/**
 * Configura la estrategia de resolución de conflictos.
 */
export const setConfiguredStrategy = async (strategy: ConflictStrategy): Promise<void> => {
  try {
    const settings = getSettings();
    const currentSyncConfig = settings?.cloudConfig as any || {};
    await saveSettings({
      ...settings,
      cloudConfig: {
        ...currentSyncConfig,
        conflictStrategy: strategy
      }
    });
  } catch (err: unknown) {
    logger.error('ConflictResolution', 'Failed to save conflict strategy', err instanceof Error ? err.message : String(err));
  }
};
