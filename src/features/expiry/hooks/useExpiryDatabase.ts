
import { useCallback } from 'react';
import { useAppStore } from '@/stores';
import { useExpiryStore, ExpiryItem, ExpiryStatus, ExpiryPreferences } from '@/stores';

// Lego Hooks
import { useExpirySync } from './useExpirySync';
import { useExpiryMutations } from './useExpiryMutations';
import { useExpiryQuery } from './useExpiryQuery';

export type { ExpiryStatus, ExpiryPreferences, ExpiryItem };

export const useExpiryDatabase = () => {
  const { settings } = useAppStore();
  const expiryMapping = settings?.cloudConfig?.mappings?.expiry;
  const tableName = settings?.cloudConfig?.inventoryRegistryTableName || 
                    settings?.cloudConfig?.expiryTableName || 
                    'VENCIMIENTOS';
  
  const {
    preferences, setPreferences,
    searchQuery, setSearchQuery,
    selectedStatuses, setSelectedStatuses,
    selectedCategories, setSelectedCategories,
    selectedCanje, setSelectedCanje,
    actionPeriod, setActionPeriod,
    customDateRange, setCustomDateRange,
    creationDateRange, setCreationDateRange,
    selectedIds, setSelectedIds
  } = useExpiryStore();

  // Composable Modules
  const syncModule = useExpirySync(tableName);
  
  const queryModule = useExpiryQuery(
    tableName,
    settings,
    expiryMapping,
    searchQuery,
    selectedCategories,
    selectedCanje,
    actionPeriod,
    customDateRange,
    creationDateRange,
    selectedStatuses,
    preferences
  );

  const mutationModule = useExpiryMutations(
    tableName,
    queryModule.localItems, // using the raw items from query module to avoid another live query
    expiryMapping,
    setSelectedIds
  );

  const handleUpdatePreferences = useCallback((newPrefs: Partial<ExpiryPreferences>) => {
    setPreferences(newPrefs);
  }, [setPreferences]);

  const clearLocalData = useCallback(async () => {
    setSearchQuery('');
    setSelectedStatuses([]);
    setSelectedCategories([]);
    setSelectedCanje('all');
    setActionPeriod('all');
    setCustomDateRange({ start: null, end: null });
    setCreationDateRange({ start: null, end: null });
    setSelectedIds(new Set());
  }, [setSearchQuery, setSelectedStatuses, setSelectedCategories, setSelectedCanje, setActionPeriod, setCustomDateRange, setCreationDateRange, setSelectedIds]);

  return {
    state: {
      searchQuery,
      selectedStatuses,
      selectedCategories,
      selectedCanje,
      actionPeriod,
      customDateRange,
      creationDateRange,
      isSyncing: syncModule.isSyncing,
      selectedIds,
      allItems: queryModule.baseProcessedData,
      processedScans: queryModule.processedData,
      categories: queryModule.categories,
      stats: queryModule.stats,
      preferences
    },
    actions: {
      setSearchQuery,
      setSelectedStatuses,
      setSelectedCategories,
      setSelectedCanje,
      setActionPeriod,
      setCustomDateRange,
      setCreationDateRange,
      setSelectedIds,
      handleSyncExpirations: syncModule.handleSyncExpirations,
      handleRemoveItem: mutationModule.handleRemoveItem,
      handleBulkRemove: mutationModule.handleBulkRemove,
      handleAddItem: mutationModule.handleAddItem,
      handleUpdateItem: mutationModule.handleUpdateItem,
      handleUpdatePreferences,
      handleFullRefresh: syncModule.handleFullRefresh,
      clearLocalData
    }
  };
};

