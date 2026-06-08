
import { useState, useCallback } from 'react';

// Lego Hooks
import { useProductSync } from './useProductSync';
import { useProductAI } from './useProductAI';
import { useStorageStatus } from './useStorageStatus';
import { useProductMutations } from './useProductMutations';
import { useProductQuery } from './useProductQuery';

/**
 * Hook centralizado (Façade) para base de datos de productos.
 * Compuesto por submódulos (Lego blocks) para mejorar mantenibilidad.
 */
export const useProductDatabase = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [policyFilter, setPolicyFilter] = useState<'all' | 'exchange' | 'loss' | 'no_info'>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const showFeedback = useCallback((type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  }, []);

  // Composability: Sub-módulos inyectados
  const syncModule = useProductSync(showFeedback);
  const aiModule = useProductAI(showFeedback);
  const storageUsage = useStorageStatus();
  const mutations = useProductMutations(showFeedback);
  const queries = useProductQuery(searchQuery, policyFilter);

  return {
    state: { 
      products: queries.products, 
      pendingChangesCount: queries.pendingChangesCount, 
      missingVectorsCount: queries.stats?.missingVectors || 0,
      trainedPercent: queries.stats?.trainedPercent || 0,
      backedUpPercent: queries.stats?.backedUpPercent || 0,
      isSyncing: syncModule.isSyncing, 
      isDownloading: syncModule.isDownloading, 
      isVectorizing: aiModule.isVectorizing, 
      vectorProgress: aiModule.vectorProgress, 
      storageUsage, 
      feedback, 
      searchQuery,
      policyFilter,
      brainStatus: aiModule.brainStatus 
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
      handleVectorize: aiModule.handleVectorize, 
      handleInitializeBrain: aiModule.handleInitializeBrain,
      showFeedback 
    }
  };
};

