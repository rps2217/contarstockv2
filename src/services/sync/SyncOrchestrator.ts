/**
 * SyncOrchestrator - Orquestador central de sincronización
 * 
 * PROPÓSITO:
 * Unifica los dos motores de sincronización bajo una interfaz coherente:
 * 
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                      SyncOrchestrator                            │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                                                                  │
 * │   ┌───────────────────────┐    ┌───────────────────────────┐   │
 * │   │   GenericSyncEngine   │    │      BatchUploader        │   │
 * │   │                       │    │                           │   │
 * │   │  • Catálogos          │    │  • Datos operativos       │   │
 * │   │  • Productos          │    │  • Inventario (INVENTARIO)│   │
 * │   │  • Proveedores        │    │  • Recepciones (RECEPCION) │   │
 * │   │  • Clientes           │    │                           │   │
 * │   │  • Sesiones           │    │                           │   │
 * │   │  • Scans              │    │                           │   │
 * │   │  • Eventos            │    │                           │   │
 * │   │  • Vencimientos       │    │                           │   │
 * │   └───────────────────────┘    └───────────────────────────┘   │
 * │                                                                  │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * USO:
 * 
 * import { syncOrchestrator } from '@/services/sync/SyncOrchestrator';
 * 
 * // Sincronizar solo catálogos
 * await syncOrchestrator.syncCatalogs();
 * 
 * // Sincronizar catálogos + operativos
 * await syncOrchestrator.syncAll();
 * 
 * // Subir datos operativos específicos
 * const group = await syncOrchestrator.getUploadGroups();
 * await syncOrchestrator.uploadGroup(group[0]);
 * 
 * // Obtener conteo global de pendientes
 * const pending = await syncOrchestrator.getPendingCount();
 */

import { genericSyncEngine } from '../cloud/GenericSyncEngine';
import type { SyncResult as CommonSyncResult } from '../types/common';
import { 
  getPendingUploadGroups, 
  filterGroupsByType,
  sortGroupsByPriority,
  getUploadBatchSize
} from './UploadGroupBuilder';
import { 
  performBatchUpload, 
  resetUploadLock,
  getBatchSize,
  isUploadInProgress,
} from './BatchUploader';
import { 
  getGlobalPendingCount 
} from './Reconciliation';
import { 
  importProductsFromCloud, 
  importProvidersFromCloud, 
  syncCatalogs as syncCatalogsImporter,
  importCustomersAndTemplatesFromCloud 
} from './CatalogImporter';
import { logger } from '../logger';
import { erpService } from '../erpService';
import { ExpectedOrderRepository } from '@/repositories/ExpectedOrderRepository';
import type { UploadGroup } from './UploadGroupBuilder';

// Sistema de errores mejorado
import { SyncError } from '@/lib/errors';
import { getCircuitBreaker } from '@/lib/errors/circuitBreaker';
import { withRetry } from '@/lib/errors/retry';

// ============================================================================
// TIPOS EXPORTADOS
// ============================================================================

// Extended SyncResult for orchestrator - uses base from types/common.ts
export type SyncResult = CommonSyncResult & {
  catalogSync?: {
    products?: number;
    providers?: number;
    sessions?: number;
    scans?: number;
  };
  batchSync?: {
    groups: number;
    uploaded: number;
  };
  ordersDownloaded?: number;
};

// Extended SyncStatus for orchestrator - local interface
export interface SyncStatus {
  isUploading: boolean;
  pendingCount: number;
  lastSyncTime?: number;
}

// ============================================================================
// REGISTRY PARA SYNC DE CATÁLOGOS
// ============================================================================

/**
 * Tablas a sincronizar como catálogos
 */
export const CATALOG_TABLES = [
  'sessions', 
  'scans', 
  'products', 
  'providers', 
  'customers', 
  'messageTemplates', 
  'emailTemplates', 
  'expiry', 
  'events'
] as const;

/**
 * Alias para compatibilidad
 */
export const registryToSync = CATALOG_TABLES;

// ============================================================================
// ORQUESTADOR
// ============================================================================

class SyncOrchestrator {
  private _lastSyncTime?: number;

  /**
   * Tiempo del último sync completado exitosamente
   */
  get lastSyncTime(): number | undefined {
    return this._lastSyncTime;
  }

  /**
   * Sincroniza TODOS los datos (catálogos + operativos)
   * Este es el método principal para uso general
   */
  async syncAll(onProgress?: (msg: string) => void): Promise<SyncResult> {
    const errors: string[] = [];
    
    try {
      // 1. Sincronizar catálogos (GenericSyncEngine)
      if (onProgress) onProgress('Sincronizando catálogos...');
      
      let catalogSync: SyncResult['catalogSync'] = {};
      
      for (const key of CATALOG_TABLES) {
        try {
          const res = await genericSyncEngine.sync(key);
          if (res.success) {
            if (key === 'products') {
              catalogSync.products = (res.pullRes?.added || 0) + (res.pullRes?.updated || 0);
            } else if (key === 'providers') {
              catalogSync.providers = (res.pullRes?.added || 0) + (res.pullRes?.updated || 0);
            } else if (key === 'sessions') {
              catalogSync.sessions = (res.pullRes?.added || 0) + (res.pullRes?.updated || 0);
            } else if (key === 'scans') {
              catalogSync.scans = (res.pullRes?.added || 0) + (res.pullRes?.updated || 0);
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.includes('Table not found') && !msg.includes('does not exist')) {
            errors.push(`${key}: ${msg}`);
          }
        }
      }

      // 2. Sincronizar datos operativos (BatchUploader)
      if (onProgress) onProgress('Sincronizando datos operativos...');
      
      let batchSync: SyncResult['batchSync'] = { groups: 0, uploaded: 0 };
      const pendingGroups = await getPendingUploadGroups();
      
      if (pendingGroups.length > 0) {
        batchSync.groups = pendingGroups.length;
        
        for (const group of pendingGroups) {
          try {
            await performBatchUpload(group);
            batchSync.uploaded++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`batch(${group.erpOrder}): ${msg}`);
          }
        }
      }

      // 3. Descargar órdenes pendientes del ERP (Detective IA)
      if (onProgress) onProgress('Descargando órdenes del ERP...');
      
      let ordersDownloaded = 0;
      const manifests = await erpService.downloadAllPendingManifests();
      
      for (const manifest of manifests) {
        const existing = await ExpectedOrderRepository.getById(manifest.id);
        if (!existing) {
          const items = manifest.items?.map((p: any) => ({
            barcode: p.barcode,
            name: p.name,
            expectedQty: p.qty
          })) || [];

          await ExpectedOrderRepository.save({
            id: manifest.id,
            internalId: manifest.id,
            items,
            totalExpectedUnits: items.reduce((acc, i) => acc + i.expectedQty, 0),
            totalExpectedSKUs: items.length,
            importedAt: Date.now()
          });
          ordersDownloaded++;
        }
      }

      this._lastSyncTime = Date.now();
      
      return {
        success: errors.length === 0,
        catalogSync,
        batchSync,
        ordersDownloaded,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      return { success: false, errors };
    }
  }

  /**
   * Sincroniza solo catálogos (productos, proveedores, etc.)
   */
  async syncCatalogs(onProgress?: (msg: string) => void): Promise<SyncResult> {
    const errors: string[] = [];
    
    try {
      for (const key of CATALOG_TABLES) {
        try {
          await genericSyncEngine.sync(key);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.includes('Table not found') && !msg.includes('does not exist')) {
            errors.push(`${key}: ${msg}`);
          }
        }
      }

      this._lastSyncTime = Date.now();
      
      return {
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, errors: [msg] };
    }
  }

  /**
   * Sincroniza solo datos operativos (inventario, recepciones)
   */
  async syncBatches(onProgress?: (msg: string) => void): Promise<SyncResult> {
    try {
      const groups = await getPendingUploadGroups();
      let uploaded = 0;
      
      for (const group of groups) {
        await performBatchUpload(group, onProgress);
        uploaded++;
      }

      this._lastSyncTime = Date.now();
      
      return {
        success: true,
        batchSync: { groups: groups.length, uploaded }
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { success: false, errors: [msg] };
    }
  }

  /**
   * Obtiene grupos pendientes de upload
   */
  async getUploadGroups(): Promise<UploadGroup[]> {
    return getPendingUploadGroups();
  }

  /**
   * Obtiene grupos filtrados por tipo
   */
  async getUploadGroupsByType(type: UploadGroup['type']): Promise<UploadGroup[]> {
    const groups = await getPendingUploadGroups();
    return filterGroupsByType(groups, type);
  }

  /**
   * Sube un grupo específico
   */
  async uploadGroup(group: UploadGroup, onProgress?: (msg: string) => void): Promise<void> {
    await performBatchUpload(group, onProgress);
  }

  /**
   * Obtiene conteo total de elementos pendientes
   */
  async getPendingCount(): Promise<number> {
    return getGlobalPendingCount();
  }

  /**
   * Obtiene estado actual del sync
   */
  getStatus(): SyncStatus {
    return {
      isUploading: isUploadInProgress(),
      pendingCount: 0, // Se actualiza asíncronamente
      lastSyncTime: this._lastSyncTime
    };
  }

  /**
   * Resetea el lock de sincronización
   */
  resetLock(): void {
    resetUploadLock();
    logger.info('SYNC_ORCHESTRATOR', 'Lock reseteado');
  }

  /**
   * Obtiene el tamaño de batch configurado
   */
  getBatchSize(): number {
    return getBatchSize();
  }

  /**
   * Importa catálogos iniciales (para inicialización)
   */
  async importInitialData(): Promise<{ products: number; providers: number }> {
    try {
      const [products, providers] = await Promise.all([
        importProductsFromCloud(),
        importProvidersFromCloud()
      ]);
      
      // Importar también clientes y plantillas
      await importCustomersAndTemplatesFromCloud();
      
      return { products, providers };
    } catch (error) {
      logger.error('SYNC_ORCHESTRATOR', 'Error en importación inicial', error);
      throw error;
    }
  }
}

// Export singleton
export const syncOrchestrator = new SyncOrchestrator();

// Export aliases para compatibilidad
export const syncAll = syncOrchestrator.syncAll.bind(syncOrchestrator);
export const syncCatalogsOnly = syncOrchestrator.syncCatalogs.bind(syncOrchestrator);
export const syncBatchesOnly = syncOrchestrator.syncBatches.bind(syncOrchestrator);
export const getPendingGroups = syncOrchestrator.getUploadGroups.bind(syncOrchestrator);
export const uploadBatch = syncOrchestrator.uploadGroup.bind(syncOrchestrator);
export const resetSyncLock = syncOrchestrator.resetLock.bind(syncOrchestrator);
