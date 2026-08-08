/**
 * useProvidersSync - Hook para sincronización de proveedores
 * 
 * Usa genericSyncEngine directamente para sync de proveedores.
 * 
 * @deprecated Usar useSync de @/shared/hooks para sincronización genérica
 * y genericSyncEngine para operaciones específicas.
 */

import { useCallback, useState } from 'react';
import { genericSyncEngine } from '../../../services/cloud/GenericSyncEngine';

export const useProvidersSync = (
  tableName: string, 
  loadProviders: () => Promise<void>
) => {
  // Estado de sincronización
  const [isSyncing, setIsSyncing] = useState(false);

  // Push proveedores pending a la nube
  const handleSyncToCloud = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await genericSyncEngine.pushIncremental('providers');
      setIsSyncing(false);
      return result;
    } catch (error) {
      setIsSyncing(false);
      throw error;
    }
  }, []);

  // Download proveedores desde la nube (force full refresh)
  const handleDownloadFromCloud = useCallback(async () => {
    setIsSyncing(true);
    try {
      // Force full refresh para proveedores
      const result = await genericSyncEngine.pullRemoteChanges('providers');
      // Recargar la lista después de descargar
      await loadProviders();
      setIsSyncing(false);
      return result;
    } catch (error) {
      setIsSyncing(false);
      throw error;
    }
  }, [loadProviders]);

  return {
    isSyncing,
    handleSyncToCloud,
    handleDownloadFromCloud
  };
};
