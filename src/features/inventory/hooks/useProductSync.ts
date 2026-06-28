/**
 * useProductSync - Hook para sincronización de productos
 * 
 * Usa useSync (hook unificado) para operaciones estándar.
 * Mantiene lógica especial para force sync con lotes IA (embeddings).
 * 
 * @deprecated Usar useSync de @/shared/hooks para operaciones genéricas
 * y genericSyncEngine directamente para sync de tablas específicas.
 */

import { useCallback } from 'react';
import { productRepository } from '../../../repositories/DexieProductRepository';
import { pushBatch } from '../../../services/cloud/BatchSyncService';
import { genericSyncEngine } from '../../../services/cloud/GenericSyncEngine';
import { useSync } from '@/shared/hooks';
import { getSettings } from '../../../services/settings';
import { logger } from '../../../services/logger';

const BATCH_SIZE_AI = 50; // Lotes pequeños para embeddings IA

export const useProductSync = (showFeedback: (type: 'success' | 'error', msg: string) => void) => {
  // Usar useSync para operaciones estándar (migrado desde useGenericSync)
  const { triggerSync, isSyncing, lastError } = useSync({
    mode: 'manual',
    autoRetry: false,
    onSuccess: (result) => {
      const pushed = result.catalogSync?.products || 0;
      if (pushed > 0) {
        showFeedback('success', `${pushed} productos sincronizados`);
      }
    },
    onError: (error) => {
      showFeedback('error', error.message);
    }
  });

  // Sync productos (usa useSync)
  const handleSyncToCloud = useCallback(async () => {
    const result = await triggerSync();
    if (result && !result.success && result.errors?.length) {
      showFeedback('error', result.errors[0]);
    }
  }, [triggerSync]);

  // Force sync todos los productos (usa lotes pequeños para embeddings IA)
  // NOTA: Esta lógica es específica para embeddings y no puede usar GenericSyncEngine
  const handleForceSyncToCloud = useCallback(async () => {
    const allProds = await productRepository.getLimited(5000); 
    if (allProds.length === 0) {
      showFeedback('error', 'No hay productos locales para subir');
      return;
    }
    
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
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      logger.error('FORCE_SYNC', 'Force sync failed', errorMsg);
      showFeedback('error', errorMsg);
    }
  }, [showFeedback]);

  // Download desde la nube (usa genericSyncEngine directamente)
  const handleDownloadFromCloud = useCallback(async () => {
    try {
      const result = await genericSyncEngine.pullRemoteChanges('products');
      const total = result.added + result.updated;
      showFeedback('success', `${total} productos descargados`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      showFeedback('error', errorMsg);
    }
  }, []);

  // Sync proveedores (usa genericSyncEngine directamente)
  const handleSyncProviders = useCallback(async () => {
    try {
      const result = await genericSyncEngine.sync('providers');
      if (result.success) {
        showFeedback('success', 'Políticas logísticas sincronizadas');
      } else {
        showFeedback('error', result.error || 'Error en sync');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      showFeedback('error', errorMsg);
    }
  }, [showFeedback]);

  return {
    isSyncing,
    handleSyncToCloud,
    handleForceSyncToCloud,
    handleDownloadFromCloud,
    handleSyncProviders
  };
};
