/**
 * useEventDatabase - Hook orquestador para gestión de eventos
 * 
 * Este hook composita los hooks de consultas, mutaciones y filtros
 * para proporcionar una API unificada para la gestión de eventos.
 * 
 * @module features/events/hooks
 */

import { useAppStore } from '@/stores';
import { useEventQueries } from './useEventQueries';
import { useEventFilters } from './useEventFilters';
import { useEventMutations } from './useEventMutations';

export interface EventPreferences {
  compactView: boolean;
  showPriorityAssistant: boolean;
}

/**
 * Hook principal que orquesta todos los sub-hooks de eventos
 */
export const useEventDatabase = () => {
  const { settings } = useAppStore();
  const tableName = settings?.cloudConfig?.eventsTableName || 'EVENTOS';

  // Compositar hooks
  const queries = useEventQueries();
  const filters = useEventFilters({ baseProcessedData: queries.processedEvents });
  const mutations = useEventMutations({ 
    tableName, 
    baseProcessedData: queries.processedEvents 
  });

  return {
    // Estado de consultas
    isSyncing: queries.isSyncing,
    localEvents: queries.localEvents,
    allProducts: queries.allProducts,
    tableName,
    productMap: queries.productMap,
    
    // Estado de filtros
    searchQuery: filters.searchQuery,
    selectedEvents: filters.selectedEvents,
    selectedIds: filters.selectedIds,
    dateRange: filters.dateRange,
    preferences: filters.preferences,
    
    // Datos procesados y filtrados
    processedEvents: filters.processedEvents,
    pendingEvents: filters.pendingEvents,
    destinedEvents: filters.destinedEvents,
    adjustedEvents: filters.adjustedEvents,
    
    // Stats
    totalCount: filters.totalCount,
    filteredCount: filters.filteredCount,
    pendingCount: filters.pendingCount,
    destinedCount: filters.destinedCount,
    adjustedCount: filters.adjustedCount,
    eventTypes: filters.eventTypes,
    pendingOperations: 0,
    
    // Acciones de filtros
    actions: {
      setSearchQuery: filters.setSearchQuery,
      setSelectedEvents: filters.setSelectedEvents,
      setSelectedIds: filters.setSelectedIds,
      setDateRange: filters.setDateRange,
      handleRemoveItem: mutations.handleRemoveItem,
      handleBulkRemove: mutations.handleBulkRemove,
      handleAddItem: mutations.handleAddItem,
      handleUpdatePreferences: filters.setPreferences,
      clearLocalData: filters.clearLocalData,
      updateEventBulkFieldsMany: mutations.updateBulkFields,
      clearSelection: filters.clearSelection,
      updateEvent: mutations.handleUpdateItem,
      createEvent: mutations.handleAddItem,
      setPendingOperations: () => {},
      deleteEvent: mutations.handleDeleteItem,
      updateEventStatus: mutations.handleUpdateStatus,
      handleToggleSelect: filters.handleToggleSelect,
      handleSelectAll: filters.handleSelectAll,
      updateEventDestino: mutations.handleUpdateDestino,
      togglePreference: filters.togglePreference,
      handleFullRefresh: () => {
        localStorage.removeItem(`last_sync_${tableName}`);
        window.location.reload();
      },
      handleBulkImport: mutations.handleBulkImport,
      handleClearAllEvents: mutations.handleClearAll,
    }
  };
};
