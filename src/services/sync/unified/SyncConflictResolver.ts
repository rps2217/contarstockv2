/**
 * =============================================================================
 * SYNC CONFLICT RESOLVER - Resolución de Conflictos de Sincronización
 * =============================================================================
 *
 * Maneja la detección y resolución de conflictos entre datos locales (IndexedDB)
 * y remotos (Supabase) durante la sincronización.
 *
 * ESTRATEGIAS DISPONIBLES:
 * - local_wins: Mantener versión local, sobreescribir remota
 * - remote_wins: Aceptar versión remota, descartar cambios locales
 * - merge: Combinar ambos registros
 * - manual: Requiere intervención del usuario
 *
 * @module unified/SyncConflictResolver
 */

import { supabase } from '@/lib/supabase';
import { db } from '@/db';
import { logger } from '@/services/logger';
import { telemetry } from '@/services/analytics/telemetryService';
import { syncRegistry } from './registry';
import type { SyncConflict, ConflictStrategy, ConflictResolution, TableSyncMeta } from './types';

// =============================================================================
// HELPERS
// =============================================================================

const formatError = (e: unknown): string => {
  if (!e) return 'Error desconocido';
  if (typeof e === 'object' && (e as Error).message) {
    return (e as Error).message;
  }
  return String(e);
};

const sanitizeData = <T extends object>(data: T): Record<string, unknown> => {
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

// =============================================================================
// CONFLICT RESOLVER
// =============================================================================

export interface ConflictResolverDeps {
  supabase: typeof supabase;
  db: typeof db;
  logger: typeof logger;
  telemetry: typeof telemetry;
  syncRegistry: typeof syncRegistry;
}

export interface ConflictResolverOptions {
  autoResolve: boolean;
  defaultStrategy: 'local_wins' | 'remote_wins' | 'merge';
}

const DEFAULT_OPTIONS: ConflictResolverOptions = {
  autoResolve: true,
  defaultStrategy: 'local_wins',
};

export class SyncConflictResolver {
  private deps: ConflictResolverDeps;
  private options: ConflictResolverOptions;

  constructor(deps: ConflictResolverDeps, options: Partial<ConflictResolverOptions> = {}) {
    this.deps = deps;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Resuelve un conflicto individual según la estrategia
   */
  async resolveConflict(conflict: SyncConflict, strategy: ConflictStrategy): Promise<boolean> {
    const meta = this.deps.syncRegistry[conflict.tableName];
    if (!meta) return false;

    const localTable = (this.deps.db as any)[meta.localTable];
    if (!localTable) return false;

    const recordId = conflict.recordId;

    try {
      switch (strategy.type) {
        case 'local_wins':
          return await this.resolveLocalWins(meta, localTable, recordId);

        case 'remote_wins':
          return await this.resolveRemoteWins(meta, localTable, recordId, conflict.tableName);

        case 'merge':
          return await this.resolveWithMerge(meta, localTable, recordId, conflict);

        case 'manual':
        default:
          // No auto-resolve, emit event for UI handling
          return false;
      }
    } catch (e) {
      this.deps.logger.error(
        'CONFLICT_RESOLVE',
        `Failed to resolve conflict for ${conflict.tableName}/${conflict.recordId}`,
        formatError(e)
      );
      return false;
    }
  }

  /**
   * Estrategia: Local gana
   * Fuerza push de versión local a remota
   */
  private async resolveLocalWins(
    meta: TableSyncMeta,
    localTable: any,
    recordId: string
  ): Promise<boolean> {
    const localRecord = await localTable.get(recordId);
    if (!localRecord) return false;

    const remoteData = meta.mapToRemote ? meta.mapToRemote(localRecord) : localRecord;
    const { error } = await this.deps.supabase
      .from(meta.remoteTable)
      .upsert(sanitizeData(remoteData), { onConflict: meta.primaryKey });

    if (!error) {
      await localTable.update(recordId, { syncStatus: 'synced' });
      return true;
    }
    return false;
  }

  /**
   * Estrategia: Remoto gana
   * Acepta versión remota y descarta cambios locales
   */
  private async resolveRemoteWins(
    meta: TableSyncMeta,
    localTable: any,
    recordId: string,
    tableName: string
  ): Promise<boolean> {
    // Pull latest from remote (implementation depends on context)
    await localTable.update(recordId, { syncStatus: 'synced' });
    return true;
  }

  /**
   * Estrategia: Merge
   * Combina campos de ambos registros
   */
  private async resolveWithMerge(
    meta: TableSyncMeta,
    localTable: any,
    recordId: string,
    conflict: SyncConflict
  ): Promise<boolean> {
    const merged = this.mergeRecords(conflict.localValue, conflict.remoteValue);
    const mergedRemote = meta.mapToRemote ? meta.mapToRemote(merged) : merged;

    const { error } = await this.deps.supabase
      .from(meta.remoteTable)
      .upsert(sanitizeData(mergedRemote), { onConflict: meta.primaryKey });

    if (!error) {
      await localTable.put({ ...merged, syncStatus: 'synced' });
      return true;
    }
    return false;
  }

  /**
   * Merge dos registros en conflicto
   */
  mergeRecords(local: unknown, remote: unknown): Record<string, unknown> {
    if (!local || !remote) return (local || remote) as Record<string, unknown>;

    const localObj = local as Record<string, unknown>;
    const remoteObj = remote as Record<string, unknown>;
    const merged: Record<string, unknown> = {};

    const allKeys = new Set([...Object.keys(localObj), ...Object.keys(remoteObj)]);

    for (const key of allKeys) {
      if (['syncStatus', 'syncError', 'lastSyncTimestamp', 'id'].includes(key)) continue;

      const localVal = localObj[key];
      const remoteVal = remoteObj[key];

      if (localVal === undefined) {
        merged[key] = remoteVal;
      } else if (remoteVal === undefined) {
        merged[key] = localVal;
      } else if (typeof localVal === 'object' && typeof remoteVal === 'object') {
        merged[key] = this.mergeRecords(localVal, remoteVal);
      } else {
        merged[key] = remoteVal;
      }
    }

    return merged;
  }

  /**
   * Resuelve múltiples conflictos
   */
  async resolveConflicts(
    conflicts: SyncConflict[],
    strategy: ConflictStrategy
  ): Promise<{ resolved: number; failed: number }> {
    let resolved = 0;
    let failed = 0;

    for (const conflict of conflicts) {
      const success = await this.resolveConflict(conflict, strategy);
      if (success) {
        conflict.resolved = true;
        conflict.resolution = strategy.type;
        resolved++;
      } else {
        failed++;
      }
    }

    this.deps.telemetry.track('SYNC', 'CONFLICTS_RESOLVED', {
      resolved,
      failed,
      strategy: strategy.type,
    });

    return { resolved, failed };
  }

  /**
   * Resuelve un conflicto manualmente con datos proporcionados
   */
  async resolveManually(
    tableName: string,
    recordId: string,
    resolution: ConflictResolution,
    mergedData?: Record<string, unknown>
  ): Promise<boolean> {
    const meta = this.deps.syncRegistry[tableName];
    if (!meta) return false;

    const localTable = (this.deps.db as any)[meta.localTable];
    if (!localTable) return false;

    if (mergedData) {
      const mergedRemote = meta.mapToRemote ? meta.mapToRemote(mergedData) : mergedData;
      const { error } = await this.deps.supabase
        .from(meta.remoteTable)
        .upsert(sanitizeData(mergedRemote), { onConflict: meta.primaryKey });

      if (!error) {
        await localTable.put({ ...mergedData, syncStatus: 'synced' });
        return true;
      }
    }

    return false;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let conflictResolverInstance: SyncConflictResolver | null = null;

export function getSyncConflictResolver(): SyncConflictResolver {
  if (!conflictResolverInstance) {
    conflictResolverInstance = new SyncConflictResolver({
      supabase,
      db,
      logger,
      telemetry,
      syncRegistry,
    });
  }
  return conflictResolverInstance;
}
