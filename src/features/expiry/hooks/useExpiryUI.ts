import { useState } from 'react';
import { useExpiryDatabase } from './useExpiryDatabase';
import { handlePrintExpirations, handlePrintLabels } from '../utils/expiryUtils';
import { useManagementUI } from '../../../shared/hooks/useManagementUI';

export const useExpiryUI = () => {
  const { state, actions: dbActions } = useExpiryDatabase();
  const [editingItem, setEditingItem] = useState<any>(null);
  const [detailItem, setDetailItem] = useState<any>(null);
  
  const management = useManagementUI({
    featureName: 'Vencimientos',
    capturePath: '/expiry/capture',
    dbState: state,
    dbActions,
    onPrintSelected: (items) => handlePrintExpirations(items),
    onPrintLabels: (items) => handlePrintLabels(items)
  });

  const handleClearFilters = () => {
    dbActions.setSearchQuery('');
    dbActions.setSelectedStatuses([]);
    dbActions.setSelectedCategories([]);
    dbActions.setSelectedCanje('all');
    dbActions.setActionPeriod('all');
    dbActions.setCustomDateRange({ start: null, end: null });
    dbActions.setCreationDateRange({ start: null, end: null });
  };

  return {
    ui: {
      ...management.ui,
      editingItem,
      detailItem,
      activeFiltersCount: state.selectedStatuses.length + 
                         state.selectedCategories.length + 
                         (state.selectedCanje !== 'all' ? 1 : 0) + 
                         (state.actionPeriod !== 'all' ? 1 : 0) + 
                         (state.customDateRange.start || state.customDateRange.end ? 1 : 0) + 
                         (state.creationDateRange?.start || state.creationDateRange?.end ? 1 : 0)
    },
    actions: {
      ...management.actions,
      handleClearFilters,
      setEditingItem,
      setDetailItem,
      handleOpenDetail: (item: any) => setDetailItem(item),
      handleEdit: (item: any) => setEditingItem(item),
      confirmBulkRemove: () => management.actions.confirmBulkRemove(dbActions.handleBulkRemove),
      confirmRemoveItem: (item: any) => management.actions.confirmRemoveItem(item, dbActions.handleRemoveItem),
      handleSelectAllVisible: () => management.actions.handleSelectAllVisible(state.processedScans),
      handlePrintSelected: management.actions.handlePrintSelectedAction,
      handlePrintLabelsBulk: management.actions.handlePrintLabelsAction,
      handleSendEmailBulk: () => management.actions.setIsEmailModalOpen(true)
    },
    db: {
      state,
      actions: dbActions
    }
  };
};
