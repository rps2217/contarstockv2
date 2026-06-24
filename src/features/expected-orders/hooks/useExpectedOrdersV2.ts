/**
 * useExpectedOrdersV2.ts - Hook centralizado para el módulo de Órdenes Esperadas v2
 * 
 * Arquitectura simplificada - Siguiendo patrón useSuppliers/useInventory
 */

import { useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/stores';
import { ExpectedOrder } from '@/types';
import { useExpectedOrders } from './useExpectedOrders';
import { 
  calculateOrderStats, 
  orderMatchesSearch, 
  sortOrders,
  OrderSortField,
  OrderSortOrder,
  OrderStats
} from '../domain/expectedOrdersDomain';

// ============================================================================
// TIPOS
// ============================================================================

export interface ExpectedOrderFilters {
  searchQuery: string;
  sortField: OrderSortField;
  sortOrder: OrderSortOrder;
}

export interface UseExpectedOrdersReturn {
  // Estado
  filteredOrders: ExpectedOrder[];
  allOrders: ExpectedOrder[];
  stats: OrderStats;
  filters: ExpectedOrderFilters;
  isLoading: boolean;
  isSyncing: boolean;
  
  // UI State
  ui: {
    activeStep: 'list' | 'import';
    selectedOrder: ExpectedOrder | null;
    isDetailModalOpen: boolean;
  };
  
  // Acciones
  actions: {
    setSearchQuery: (query: string) => void;
    setSortField: (field: OrderSortField) => void;
    setSortOrder: (order: OrderSortOrder) => void;
    selectOrder: (order: ExpectedOrder | null) => void;
    openDetail: (order: ExpectedOrder) => void;
    closeDetail: () => void;
    deleteOrder: (id: string) => Promise<void>;
    syncOrders: () => Promise<void>;
    downloadFromCloud: () => Promise<void>;
    setActiveStep: (step: 'list' | 'import') => void;
  };
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export const useExpectedOrdersV2 = (): UseExpectedOrdersReturn => {
  const settings = useAppStore(state => state.settings);
  const theme = (settings?.theme as 'dark' | 'light' | 'high-contrast') || 'dark';

  // Estado local de filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<OrderSortField>('importedAt');
  const [sortOrder, setSortOrder] = useState<OrderSortOrder>('desc');
  
  // UI State
  const [selectedOrder, setSelectedOrder] = useState<ExpectedOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Hook existente
  const expectedOrders = useExpectedOrders();
  const { state, actions } = expectedOrders;

  // Estadísticas
  const stats = useMemo(() => {
    return calculateOrderStats(state.savedOrders);
  }, [state.savedOrders]);

  // Órdenes filtradas y ordenadas
  const filteredOrders = useMemo(() => {
    let orders = state.savedOrders;

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      orders = orders.filter(o => orderMatchesSearch(o, searchQuery));
    }

    // Ordenar
    orders = sortOrders(orders, sortField, sortOrder);

    return orders;
  }, [state.savedOrders, searchQuery, sortField, sortOrder]);

  // Acciones
  const selectOrder = useCallback((order: ExpectedOrder | null) => {
    setSelectedOrder(order);
  }, []);

  const openDetail = useCallback((order: ExpectedOrder) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedOrder(null);
  }, []);

  const deleteOrder = useCallback(async (id: string) => {
    await actions.deleteOrder(id);
    if (selectedOrder?.id === id) {
      closeDetail();
    }
  }, [actions.deleteOrder, selectedOrder, closeDetail]);

  const syncOrders = useCallback(async () => {
    await actions.syncAllToCloud();
  }, [actions.syncAllToCloud]);

  const downloadFromCloud = useCallback(async () => {
    await actions.downloadFromCloud();
  }, [actions.downloadFromCloud]);

  const handleSetActiveStep = useCallback((step: 'list' | 'import') => {
    actions.setActiveStep(step);
  }, [actions.setActiveStep]);

  return {
    filteredOrders,
    allOrders: state.savedOrders,
    stats,
    filters: {
      searchQuery,
      sortField,
      sortOrder
    },
    isLoading: state.savedOrders.length === 0 && !state.isSyncing,
    isSyncing: state.isSyncing,
    ui: {
      activeStep: state.activeStep,
      selectedOrder,
      isDetailModalOpen
    },
    actions: {
      setSearchQuery,
      setSortField,
      setSortOrder,
      selectOrder,
      openDetail,
      closeDetail,
      deleteOrder,
      syncOrders,
      downloadFromCloud,
      setActiveStep: handleSetActiveStep
    }
  };
};

// Re-exportar tipos útiles
export type { OrderStats };
