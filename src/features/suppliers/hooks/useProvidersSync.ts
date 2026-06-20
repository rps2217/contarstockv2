/**
 * useProvidersSync - Hook para sincronización de proveedores
 * 
 * Usa useGenericSync como motor central.
 */

import { useCallback } from 'react';
import { useGenericSync } from '../../../hooks/useGenericSync';

export const useProvidersSync = (
  tableName: string, 
  loadProviders: () => Promise<void>
) => {
  // Usar GenericSyncEngine via useGenericSync
  const { push, pull, isSyncing } = useGenericSync({
    registryKey: 'providers',
    tableName: tableName || 'PROVEEDORES',
  });

  // Push proveedores pending a la nube
  const handleSyncToCloud = useCallback(async () => {
    const result = await push();
    return result;
  }, [push]);

  // Download proveedores desde la nube (force full refresh)
  const handleDownloadFromCloud = useCallback(async () => {
    // Force full refresh para proveedores
    await pull(true);
    // Recargar la lista después de descargar
    await loadProviders();
  }, [pull, loadProviders]);

  return {
    isSyncing,
    handleSyncToCloud,
    handleDownloadFromCloud
  };
};
