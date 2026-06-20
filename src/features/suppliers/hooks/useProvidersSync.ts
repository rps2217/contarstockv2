/**
 * @deprecated Usar useGenericSync con registryKey: 'providers'
 * 
 * useProvidersSync - Hook para sincronización de proveedores
 * 
 * Migrado a GenericSyncEngine.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { genericSyncEngine } from '../../../services/cloud/GenericSyncEngine';
import { ProviderRepository } from '../../../repositories/ProviderRepository';
import { logger } from '../../../services/logger';

const BATCH_SIZE = 50;

export const useProvidersSync = (
  tableName: string, 
  loadProviders: () => Promise<void>
) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncToCloud = async () => {
    const toastId = toast.loading('Subiendo proveedores a la nube...');
    setIsSyncing(true);
    try {
      const allProviders = await ProviderRepository.getAll();
      if (allProviders.length === 0) {
        toast.dismiss(toastId);
        toast.info('No hay proveedores para sincronizar.');
        return;
      }

      // Usar GenericSyncEngine para sync incremental (solo pending)
      const result = await genericSyncEngine.pushIncremental('providers');
      
      toast.dismiss(toastId);
      if (result.success > 0) {
        toast.success(`${result.success} proveedores sincronizados.`);
      } else if (result.failed > 0) {
        toast.error(`${result.failed} proveedores fallaron.`);
      } else {
        toast.info('No hay proveedores pendientes.');
      }
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error('Error al subir: ' + e.message);
      logger.error('PROVIDERS_SYNC', 'Sync to cloud failed', e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadFromCloud = async () => {
    const toastId = toast.loading('Forzando descarga completa de políticas desde la nube...');
    setIsSyncing(true);
    try {
      const { useSyncStore } = await import('../../../store/useSyncStore');
      useSyncStore.getState().setTableSyncTime(tableName, 0);
      
      const { importProvidersFromCloud } = await import('../../../services/syncManager');
      const count = await importProvidersFromCloud();
      toast.dismiss(toastId);
      if (count > 0) {
        toast.success(`${count} proveedores actualizados desde la nube.`);
        await loadProviders();
      } else {
        toast.info('No se encontraron proveedores o no hay cambios.');
      }
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error('Error al descargar: ' + e.message);
      console.error("Error downloading providers:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isSyncing,
    handleSyncToCloud,
    handleDownloadFromCloud
  };
};
