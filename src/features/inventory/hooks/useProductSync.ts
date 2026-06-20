import { useState, useCallback } from 'react';
import { productRepository } from '../../../repositories/DexieProductRepository';
import { syncProductsToCloud } from '../../../services/cloudSync';
import { importProductsFromCloud, importProvidersFromCloud } from '../../../services/syncManager';
import { useAppStore } from '@/stores';

export const useProductSync = (showFeedback: (type: 'success' | 'error', msg: string) => void) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleSyncToCloud = useCallback(async () => {
    const unsyncedProds = await productRepository.getPendingSync();
    if (unsyncedProds.length === 0) return;
    setIsSyncing(true);
    try {
      await syncProductsToCloud(unsyncedProds);
      showFeedback('success', 'Catálogo sincronizado');
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [showFeedback]);

  const handleForceSyncToCloud = useCallback(async () => {
    const allProds = await productRepository.getLimited(5000); 
    if (allProds.length === 0) {
      showFeedback('error', 'No hay productos locales para subir');
      return;
    }
    setIsSyncing(true);
    try {
      await syncProductsToCloud(allProds);
      showFeedback('success', 'Catálogo completo subido a la nube');
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [showFeedback]);

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
