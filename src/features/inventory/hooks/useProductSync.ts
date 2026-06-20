/**
 * useProductSync - Hook para sincronización de productos
 * 
 * Usa useGenericSync como motor central para operaciones estándar.
 * Mantiene lógica especial para force sync con lotes IA (embeddings).
 * 
 * @deprecated Verificar si puede reemplazarse completamente por useGenericSync
 * con registryKey: 'products' en futuras versiones.
 */

import { useCallback } from 'react';
import { productRepository } from '../../../repositories/DexieProductRepository';
import { pushBatch } from '../../../services/cloud/BatchSyncService';
import { genericSyncEngine } from '../../../services/cloud/GenericSyncEngine';
import { useGenericSync } from '../../../hooks/useGenericSync';
import { getSettings } from '../../../services/settings';
import { logger } from '../../../services/logger';

const BATCH_SIZE_AI = 50; // Lotes pequeños para embeddings IA

export const useProductSync = (showFeedback: (type: 'success' | 'error', msg: string) => void) => {
  // Usar GenericSyncEngine para operaciones estándar
  const { push, pull, sync, isSyncing } = useGenericSync({
    registryKey: 'products',
    tableName: 'PRODUCTOS',
    onSuccess: (msg) => showFeedback('success', msg),
    onError: (msg) => showFeedback('error', msg),
  });

  // Sync productos pending (usa GenericSyncEngine via useGenericSync)
  const handleSyncToCloud = useCallback(async () => {
    await push();
  }, [push]);

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
    } catch (err: any) {
      logger.error('FORCE_SYNC', 'Force sync failed', err.message);
      showFeedback('error', err.message);
    }
  }, [showFeedback]);

  // Download desde la nube (force full refresh)
  const handleDownloadFromCloud = useCallback(async () => {
    await pull(true); // forceFullRefresh = true
  }, [pull]);

  // Sync proveedores (usa el mismo registry pero tabla diferente)
  const handleSyncProviders = useCallback(async () => {
    try {
      const result = await genericSyncEngine.sync('providers');
      if (result.success) {
        showFeedback('success', 'Políticas logísticas sincronizadas');
      } else {
        showFeedback('error', result.error || 'Error en sync');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
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
