import { useState, useCallback } from 'react';

// Lego Hooks
import { useProductSync } from './useProductSync';
import { useStorageStatus } from './useStorageStatus';
import { useProductMutations } from './useProductMutations';
import { useProductQuery } from './useProductQuery';

/**
 * Hook centralizado (Façade) para base de datos de productos.
 * Compuesto por submódulos (Lego blocks) para mejorar mantenibilidad.
 *
 * NOTA: AI features han sido removidas para reducir bundle size.
 */
export const useProductDatabase = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [policyFilter, setPolicyFilter] = useState<'all' | 'exchange' | 'loss' | 'no_info'>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showFeedback = useCallback((type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  }, []);

  // Composability: Sub-módulos inyectados
  const syncModule = useProductSync(showFeedback);
  const storageUsage = useStorageStatus();
  const mutations = useProductMutations(showFeedback);
  const queries = useProductQuery(searchQuery, policyFilter);

  return {
    state: {
      products: queries.products,
      pendingChangesCount: queries.pendingChangesCount,
      missingVectorsCount: 0,
      trainedPercent: 0,
      backedUpPercent: queries.stats?.backedUpPercent || 0,
      isSyncing: syncModule.isSyncing,
      isDownloading: false,
      isVectorizing: false,
      vectorProgress: 0,
      storageUsage,
      feedback,
      searchQuery,
      policyFilter,
      brainStatus: 'disabled' as const,
    },
    actions: {
      setSearchQuery,
      setPolicyFilter,
      handleDelete: mutations.handleDelete,
      handleDeleteAll: mutations.handleDeleteAll,
      handleSyncToCloud: syncModule.handleSyncToCloud,
      handleForceSyncToCloud: syncModule.handleForceSyncToCloud,
      handleDownloadFromCloud: syncModule.handleDownloadFromCloud,
      handleSyncProviders: syncModule.handleSyncProviders,
      handleVectorize: async () => {},
      handleInitializeBrain: async () => {},
      showFeedback,
    },
  };
};
