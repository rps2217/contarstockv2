import { useState } from 'react';
import { toast } from 'sonner';
import { syncProvidersToCloud } from '../../../services/cloudSync';
import { ProviderRepository } from '../../../repositories/ProviderRepository';

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
      await syncProvidersToCloud(allProviders);
      toast.dismiss(toastId);
      toast.success('Proveedores respaldados exitosamente.');
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error('Error al subir: ' + e.message);
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
