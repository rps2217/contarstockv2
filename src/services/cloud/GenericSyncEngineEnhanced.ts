/**
 * =============================================================================
 * GENERIC SYNC ENGINE ENHANCED - Extensión con Retry y Métricas
 * =============================================================================
 * 
 * Esta versión extiende GenericSyncEngine con:
 * - Retry automático con backoff exponencial
 * - Circuit breaker para proteger contra fallos en cascada
 * - Métricas de sync (duración, éxito, conflictos)
 * 
 * @module GenericSyncEngineEnhanced
 */

import { supabaseSyncService } from '../supabaseSyncService';
import { syncRegistry } from './syncRegistry';
import { db } from '../../db';
import { logger } from '../logger';
import { telemetry } from '../telemetryService';
import { useSyncStore } from '@/stores';
import { 
  getConfiguredStrategy, 
  applyStrategy 
} from './ConflictResolution';
import { withSyncRetry, withCircuitBreaker, type RetryResult } from '@/lib/retry';

export interface SyncMetrics {
  lastSyncAt: number;
  lastSyncDuration: number;
  recordsPushed: number;
  recordsPulled: number;
  conflictsResolved: number;
  errors: string[];
  attempts: number;
}

export interface EnhancedSyncResult {
  success: boolean;
  error?: string;
  metrics?: SyncMetrics;
  pullRes?: { added: number; updated: number };
  pushRes?: { success: number; failed: number };
}

/**
 * Versión mejorada del sync engine con retry y métricas
 */
export class EnhancedSyncEngine {
  private metrics: Record<string, SyncMetrics> = {};

  /**
   * Sync completo con retry y métricas
   */
  async sync(registryKey: string): Promise<EnhancedSyncResult> {
    const startTime = Date.now();
    const meta = syncRegistry[registryKey];
    
    if (!meta) {
      return { success: false, error: `Registry key ${registryKey} not found` };
    }

    try {
      // Inicializar métricas
      this.initMetrics(registryKey);

      // 1. Pull con retry
      const pullRes = await this.pullWithRetry(registryKey, meta);

      // 2. Push con retry
      const pushRes = await this.pushWithRetry(registryKey, meta);

      // Actualizar métricas
      this.updateMetrics(registryKey, {
        lastSyncAt: Date.now(),
        lastSyncDuration: Date.now() - startTime,
        recordsPulled: pullRes.added + pullRes.updated,
        recordsPushed: pushRes.success,
        attempts: 1
      });

      logger.info('EnhancedSync', `Sync completed for ${registryKey}`, {
        pulled: pullRes.added + pullRes.updated,
        pushed: pushRes.success,
        duration: Date.now() - startTime
      });

      return {
        success: true,
        pullRes,
        pushRes,
        metrics: this.getMetrics(registryKey) ?? undefined
      };

    } catch (error: any) {
      logger.error('EnhancedSync', `Sync failed for ${registryKey}`, error.message);
      this.trackError(registryKey, error.message);
      
      return {
        success: false,
        error: error.message,
        metrics: this.getMetrics(registryKey) ?? undefined
      };
    }
  }

  /**
   * Pull con retry automático
   */
  private async pullWithRetry(
    registryKey: string,
    meta: any
  ): Promise<{ added: number; updated: number }> {
    const lastSyncKey = `lastSync_${meta.remoteTable}`;
    let lastSyncDate: string | undefined;
    
    try {
      const setting = await db.settings.get(lastSyncKey);
      if (setting?.value) lastSyncDate = setting.value;
    } catch { /* ignore */ }

    // Retry con circuit breaker
    const result = await withCircuitBreaker(
      async () => {
        const res = await supabaseSyncService.pullBatch(meta.remoteTable, lastSyncDate);
        if (!res.success) {
          throw new Error(res.error || 'Pull failed');
        }
        return res;
      },
      `pull_${registryKey}`,
      { maxRetries: 3, failureThreshold: 5 }
    );

    if (!result.success) {
      telemetry.track('ERROR', 'SYNC_PULL_FAILED', { registryKey, error: result.error?.message });
      return { added: 0, updated: 0 };
    }

    return this.processPullResult(registryKey, meta, result.data!.rows || [], lastSyncDate);
  }

  /**
   * Push con retry automático
   */
  private async pushWithRetry(
    registryKey: string,
    meta: any
  ): Promise<{ success: number; failed: number }> {
    const localTable = (db as any)[meta.localTable];
    if (!localTable) return { success: 0, failed: 0 };

    // Obtener items pendientes
    let dirtyItems: any[] = [];
    if (meta.filterField === 'tableName' && meta.filterValue) {
      const pending = await localTable
        .where('[tableName+syncStatus]')
        .equals([meta.filterValue, 'pending'])
        .toArray();
      dirtyItems = pending;
    } else {
      dirtyItems = await localTable.where('syncStatus').equals('pending').toArray();
    }

    if (dirtyItems.length === 0) {
      return { success: 0, failed: 0 };
    }

    let totalSuccess = 0;
    let totalFailed = 0;
    const BATCH_SIZE = 100;

    for (let i = 0; i < dirtyItems.length; i += BATCH_SIZE) {
      const chunk = dirtyItems.slice(i, i + BATCH_SIZE);
      const rows = meta.mapToRemote 
        ? chunk.map(meta.mapToRemote) 
        : chunk.map((item: any) => ({ ...item, id: item[meta.primaryKey] || item.id }));

      // Retry con backoff exponencial
      const result = await withSyncRetry(
        async () => {
          const res = await supabaseSyncService.pushBatch(meta.remoteTable, rows);
          if (!res.success) {
            throw new Error(res.error || 'Push failed');
          }
          return res;
        },
        { tableName: meta.remoteTable, operation: 'push', maxRetries: 3 }
      );

      if (result.success) {
        // Marcar como synced
        await db.transaction('rw', localTable, async () => {
          for (const item of chunk) {
            const id = item[meta.primaryKey] || item.id;
            await localTable.update(id, { 
              syncStatus: 'synced',
              lastSyncTimestamp: Date.now()
            });
          }
        });
        totalSuccess += chunk.length;
      } else {
        totalFailed += chunk.length;
        telemetry.track('ERROR', 'SYNC_PUSH_FAILED', { 
          registryKey, 
          error: result.error?.message,
          attempts: result.attempts
        });
      }
    }

    return { success: totalSuccess, failed: totalFailed };
  }

  /**
   * Procesa resultado del pull
   */
  private async processPullResult(
    registryKey: string,
    meta: any,
    remoteRows: any[],
    lastSyncDate: string | undefined
  ): Promise<{ added: number; updated: number }> {
    const localTable = (db as any)[meta.localTable];
    if (!localTable) return { added: 0, updated: 0 };

    let added = 0;
    let updated = 0;
    let conflictsResolved = 0;
    let maxRemoteTime = 0;

    await db.transaction('rw', localTable, async () => {
      const remoteIds = new Set<string>();

      for (const row of remoteRows) {
        const mapped = meta.mapToLocal ? meta.mapToLocal(row) : row;
        const id = mapped[meta.primaryKey] || mapped.id;
        remoteIds.add(String(id));

        const existing = await localTable.get(id);
        const rawRemoteTime = row.updated_at || row.timestamp || 0;
        const remoteTime = rawRemoteTime ? new Date(rawRemoteTime as string | number).getTime() : 0;
        if (remoteTime > maxRemoteTime) maxRemoteTime = remoteTime;

        if (existing) {
          const rawLocalTime = existing.updatedAt || existing.timestamp || 0;
          const localTime = rawLocalTime ? new Date(rawLocalTime).getTime() : 0;

          if (existing.syncStatus === 'pending' || existing.syncStatus === 'error') {
            // Conflicto
            const strategy = getConfiguredStrategy();
            const resolution = applyStrategy(strategy, 
              { data: existing, timestamp: localTime },
              { data: mapped, timestamp: remoteTime }
            );

            if (!resolution.resolved) {
              // Manual - registrar
              useSyncStore.getState().addConflict();
              logger.warn('SYNC_CONFLICT', `Conflicto manual para ${id}`);
            } else if (!resolution.useLocal) {
              await localTable.update(id, { ...resolution.resolvedData, syncStatus: 'synced' });
              updated++;
            }
            conflictsResolved++;
          } else if (remoteTime > localTime) {
            await localTable.update(id, { ...mapped, syncStatus: 'synced' });
            updated++;
          }
        } else {
          await localTable.add({ ...mapped, syncStatus: 'synced' });
          added++;
        }
      }
    });

    // Guardar timestamp de última sync
    if (maxRemoteTime > 0) {
      try {
        await db.settings.put({ 
          key: `lastSync_${meta.remoteTable}`, 
          value: new Date(maxRemoteTime).toISOString() 
        });
      } catch { /* ignore */ }
    }

    // Actualizar métricas de conflictos
    if (conflictsResolved > 0) {
      const currentMetrics = this.getMetrics(registryKey);
      if (currentMetrics) {
        this.updateMetrics(registryKey, {
          conflictsResolved: (currentMetrics.conflictsResolved || 0) + conflictsResolved
        });
      }
    }

    return { added, updated };
  }

  /**
   * Inicializa métricas para una tabla
   */
  private initMetrics(registryKey: string): void {
    if (!this.metrics[registryKey]) {
      this.metrics[registryKey] = {
        lastSyncAt: 0,
        lastSyncDuration: 0,
        recordsPushed: 0,
        recordsPulled: 0,
        conflictsResolved: 0,
        errors: [],
        attempts: 0
      };
    }
  }

  /**
   * Obtiene métricas
   */
  getMetrics(registryKey: string): SyncMetrics | null {
    return this.metrics[registryKey] || null;
  }

  /**
   * Actualiza métricas
   */
  private updateMetrics(registryKey: string, updates: Partial<SyncMetrics>): void {
    if (!this.metrics[registryKey]) {
      this.initMetrics(registryKey);
    }
    this.metrics[registryKey] = { ...this.metrics[registryKey], ...updates };
  }

  /**
   * Registra un error
   */
  private trackError(registryKey: string, error: string): void {
    this.initMetrics(registryKey);
    this.metrics[registryKey].errors = [
      ...this.metrics[registryKey].errors.slice(-9),
      error
    ];
    telemetry.track('ERROR', 'SYNC_ERROR', { registryKey, error });
  }

  /**
   * Limpia métricas antiguas
   */
  clearMetrics(registryKey?: string): void {
    if (registryKey) {
      delete this.metrics[registryKey];
    } else {
      this.metrics = {};
    }
  }
}

// Singleton
export const enhancedSyncEngine = new EnhancedSyncEngine();
