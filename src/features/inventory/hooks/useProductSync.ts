/**
 * @deprecated Usar useGenericSync con registryKey: 'products'
 * 
 * useProductSync - Hook para sincronización de productos
 * 
 * Migrado parcialmente a GenericSyncEngine.
 * handleForceSyncToCloud aún usa lógica legacy para lotes de 50 (embeddings IA).
 */

import { useState, useCallback } from 'react';
import { productRepository } from '../../../repositories/DexieProductRepository';
import { genericSyncEngine } from '../../../services/cloud/GenericSyncEngine';
import { pushBatch } from '../../../services/cloud/BatchSyncService';
import { importProductsFromCloud, importProvidersFromCloud } from '../../../services/syncManager';
import { useAppStore } from '@/stores';
import { getSettings } from '../../../services/settings';
import { logger } from '../../../services/logger';

const BATCH_SIZE_AI = 50; // Lotes pequeños para embeddings IA

export const useProductSync = (showFeedback: (type: 'success' | 'error', msg: string) => void) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Sync productos pending (usa GenericSyncEngine)
  const handleSyncToCloud = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await genericSyncEngine.pushIncremental('products');
      if (result.success > 0) {
        showFeedback('success', `${result.success} productos sincronizados`);
      } else if (result.failed > 0) {
        showFeedback('error', `${result.failed} productos fallaron`);
      } else {
        showFeedback('success', 'No hay productos pendientes');
      }
    } catch (err: any) {
      logger.error('PRODUCT_SYNC', 'Sync to cloud failed', err.message);
      showFeedback('error', err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [showFeedback]);

  // Force sync todos los productos (usa lotes pequeños para embeddings IA)
  const handleForceSyncToCloud = useCallback(async () => {
    const allProds = await productRepository.getLimited(5000); 
    if (allProds.length === 0) {
      showFeedback('error', 'No hay productos locales para subir');
      return;
    }
    
    setIsSyncing(true);
    try {
      const config = getSettings().cloudConfig;
      const tableName = config?.productsTableName || 'PRODUCTOS';
      const totalBatches = Math.ceil(allProds.length / BATCH_SIZE_AI);
      
      let successCount = 0;
      for (let i = 0; i < totalBatches; i++) {
        const batch = allProds.slice(i * BATCH_SIZE_AI, (i + 1) * BATCH_SIZE_AI);
        const rows = batch.map(p => ({
          barcode: p.barcode,
          name: p.name,
          category: p.category || 'GENERAL',
          supplierRut: p.supplierRut || null,
          supplier: p.supplier || '',
          price: Number(p.price) || 0,
          units_per_box: Number(p.unitsPerBox) || 1,
          updated_at: new Date().toISOString()
        }));

        logger.info('FORCE_SYNC', `Subiendo lote ${i+1}/${totalBatches}...`);
        const result = await pushBatch(tableName, rows);
        
        if (result.success) {
          successCount += batch.length;
        } else {
          throw new Error(result.error || `Error en lote ${i+1}`);
        }
      }

      showFeedback('success', `${successCount} productos subidos a la nube`);
    } catch (err: any) {
      logger.error('FORCE_SYNC', 'Force sync failed', err.message);
      showFeedback('error', err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [showFeedback]);

  // Download desde la nube
  const handleDownloadFromCloud = useCallback(async () => {
    setIsDownloading(true);
    try {
      const { useSyncStore } = await import('../../../store/useSyncStore');
      const settings = useAppStore.getState().settings;
      useSyncStore.getState().setTableSyncTime(settings.cloudConfig.productsTableName || 'PRODUCTOS', 0);
      useSyncStore.getState().setTableSyncTime(settings.cloudConfig.providersTableName || 'PROVEEDORES', 0);
      const count = await importProductsFromCloud();
      showFeedback('success', `${count} productos y políticas actualizados`);
    } catch (err: any) {
      showFeedback('error', err.message === 'Failed to fetch' ? 'Error de red en descarga Cloud' : 'Error en descarga Cloud');
    } finally {
      setIsDownloading(false);
    }
  }, [showFeedback]);

  // Sync proveedores
  const handleSyncProviders = useCallback(async () => {
    setIsDownloading(true);
    try {
      const count = await importProvidersFromCloud();
      showFeedback('success', `${count} políticas logísticas actualizadas`);
    } catch (err: any) {
      showFeedback('error', 'Error al sincronizar políticas');
    } finally {
      setIsDownloading(false);
    }
  }, [showFeedback]);

  return {
    isSyncing,
    isDownloading,
    handleSyncToCloud,
    handleForceSyncToCloud,
    handleDownloadFromCloud,
    handleSyncProviders
  };
};
