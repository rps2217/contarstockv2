import { useState, useCallback } from 'react';
import { Provider } from '../../../types';
import { useProvidersQuery } from './useProvidersQuery';
import { useProvidersMutations } from './useProvidersMutations';
import { useProvidersSync } from './useProvidersSync';

export const useProvidersDatabase = (tableName: string) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | undefined>(undefined);

  const queryModule = useProvidersQuery();
  const mutationModule = useProvidersMutations(queryModule.loadProviders);
  const syncModule = useProvidersSync(tableName, queryModule.loadProviders);

  const handleEdit = useCallback((provider: Provider) => {
    setEditingProvider(provider);
    setIsFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingProvider(undefined);
  }, []);

  const handleOpenAdd = useCallback(() => {
    setEditingProvider(undefined);
    setIsFormOpen(true);
  }, []);

  const handleSaveWrapper = async (provider: Provider) => {
    await mutationModule.handleSave(provider);
    handleCloseForm();
  };

  const handleClearFilters = useCallback(() => {
    queryModule.setSearch('');
    queryModule.setFilterMode('all');
    queryModule.setShowFilters(false);
  }, [queryModule.setSearch, queryModule.setFilterMode, queryModule.setShowFilters]);

  return {
    state: {
      search: queryModule.search,
      filterMode: queryModule.filterMode,
      showFilters: queryModule.showFilters,
      filteredProviders: queryModule.filteredProviders,
      activeFiltersCount: queryModule.activeFiltersCount,
      
      isFormOpen,
      editingProvider,
      isSyncing: syncModule.isSyncing,
    },
    actions: {
      setSearch: queryModule.setSearch,
      setFilterMode: queryModule.setFilterMode,
      setShowFilters: queryModule.setShowFilters,
      handleClearFilters,
      
      handleEdit,
      handleCloseForm,
      handleOpenAdd,
      
      handleDelete: mutationModule.handleDelete,
      handleSave: handleSaveWrapper,
      handleAutoFill: mutationModule.handleAutoFill,
      handleImportCSV: mutationModule.handleImportCSV,
      
      handleSyncToCloud: syncModule.handleSyncToCloud,
      handleDownloadFromCloud: syncModule.handleDownloadFromCloud
    }
  };
};
