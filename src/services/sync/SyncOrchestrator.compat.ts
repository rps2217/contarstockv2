/**
 * SyncOrchestrator - Wrapper de compatibilidad para UnifiedSyncEngine
 *
 * Este archivo proporciona compatibilidad con código existente que usa SyncOrchestrator.
 * Internamente delega al UnifiedSyncEngine, ofreciendo la misma interfaz.
 *
 * @deprecated Usar directamente UnifiedSyncEngine para código nuevo
 * @module sync/SyncOrchestrator
 */

import { 
  unifiedSyncEngine, 
  syncRegistry,
  type SyncResult,
  type SyncState,
} from './unified';
import { logger } from '../logger';
import { getPendingUploadGroups } from './UploadGroupBuilder';
import type { UploadGroup } from './UploadGroupBuilder';
import { telemetry } from '../analytics/telemetryService';

// Tipos heredados para compatibilidad
export type { SyncResult } from './unified';

export interface SyncStatus {
  isUploading: boolean;
  pendingCount: number;
  lastSyncTime?: number;
  currentState: SyncState;
}

export const CATALOG_TABLES = [
  'products',
  'sessions',
  'scans',
  'providers',
  'expiry',
  'events',
  'productProviders',
  'customers',
  'messageTemplates',
];

export const registryToSync = CATALOG_TABLES;

// ============================================================================
// SYNC ORCHESTRATOR
// ============================================================================

class SyncOrchestratorImpl {
  /**
   * Sincronización completa (catálogos + batches)
   */
  async syncAll(): Promise<SyncResult> {
    logger.info('SYNC_ORCH', 'Starting full sync');
    telemetry.track('SYNC', 'FULL_SYNC_START');
    
    try {
      const result = await unifiedSyncEngine.syncAll();
      
      telemetry.track('SYNC', 'FULL_SYNC_COMPLETE', {
        success: result.success,
        uploaded: result.uploaded,
        downloaded: result.downloaded,
      });
      
      return result;
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      logger.error('SYNC_ORCH', 'Full sync failed', err);
      telemetry.track('ERROR', 'FULL_SYNC_FAILED', { error: err });
      throw error;
    }
  }

  /**
   * Sincroniza solo catálogos
   */
  async syncCatalogs(): Promise<SyncResult> {
    logger.info('SYNC_ORCH', 'Starting catalog sync');
    telemetry.track('SYNC', 'CATALOG_SYNC_START');
    
    try {
      const result = await unifiedSyncEngine.syncCatalogs();
      
      telemetry.track('SYNC', 'CATALOG_SYNC_COMPLETE', {
        success: result.success,
        uploaded: result.uploaded,
        downloaded: result.downloaded,
      });
      
      return result;
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      logger.error('SYNC_ORCH', 'Catalog sync failed', err);
      telemetry.track('ERROR', 'CATALOG_SYNC_FAILED', { error: err });
      throw error;
    }
  }

  /**
   * Sincroniza solo batches
   */
  async syncBatches(): Promise<SyncResult> {
    logger.info('SYNC_ORCH', 'Starting batch sync');
    
    try {
      const result = await unifiedSyncEngine.syncBatches();
      return result;
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      logger.error('SYNC_ORCH', 'Batch sync failed', err);
      throw error;
    }
  }

  /**
   * Obtiene grupos de subida pendientes
   */
  async getUploadGroups(): Promise<UploadGroup[]> {
    return getPendingUploadGroups();
  }

  /**
   * Obtiene el conteo de pendientes global
   */
  async getPendingCount(): Promise<number> {
    return unifiedSyncEngine.getQueueSize();
  }

  /**
   * Obtiene el estado actual
   */
  async getStatus(): Promise<SyncStatus> {
    const stats = await unifiedSyncEngine.getStats();
    return {
      isUploading: stats.currentState === 'syncing_batches' || stats.currentState === 'syncing_catalogs',
      pendingCount: stats.pendingItems,
      lastSyncTime: stats.lastSyncAt ?? undefined,
      currentState: stats.currentState,
    };
  }

  /**
   * Encola un cambio para sincronización
   */
  async enqueueChange(tableName: string, recordId: string, operation: 'create' | 'update' | 'delete', data: Record<string, unknown>): Promise<number> {
    return unifiedSyncEngine.enqueue({
      tableName,
      recordId,
      operation,
      data,
      priority: 'normal',
    });
  }

  /**
   * Procesa la cola de sincronización
   */
  async processQueue(): Promise<{ processed: number; failed: number; remaining: number }> {
    return unifiedSyncEngine.processQueue();
  }

  /**
   * Inicia sync en tiempo real
   */
  startRealtimeSync(): void {
    unifiedSyncEngine.startRealtimeSync();
  }

  /**
   * Detiene sync en tiempo real
   */
  stopRealtimeSync(): void {
    unifiedSyncEngine.stopRealtimeSync();
  }

  /**
   * Agrega listener de eventos
   */
  addListener(listener: (event: { type: string; [key: string]: unknown }) => void): () => void {
    return unifiedSyncEngine.addListener((payload) => {
      listener({ ...payload } as { type: string; [key: string]: unknown });
    });
  }
}

// Singleton
export const syncOrchestrator = new SyncOrchestratorImpl();

// Funciones exportadas para compatibilidad
export const syncAll = syncOrchestrator.syncAll.bind(syncOrchestrator);
export const syncCatalogsOnly = syncOrchestrator.syncCatalogs.bind(syncOrchestrator);
export const syncBatchesOnly = syncOrchestrator.syncBatches.bind(syncOrchestrator);
export const getPendingGroups = syncOrchestrator.getUploadGroups.bind(syncOrchestrator);
export const enqueueChange = syncOrchestrator.enqueueChange.bind(syncOrchestrator);
export const processQueue = syncOrchestrator.processQueue.bind(syncOrchestrator);
export const getSyncStatus = syncOrchestrator.getStatus.bind(syncOrchestrator);

export default SyncOrchestratorImpl;