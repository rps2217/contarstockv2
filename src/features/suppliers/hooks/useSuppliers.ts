/**
 * useSuppliers.ts - Hook centralizado para el módulo de Proveedores
 * 
 * Arquitectura simplificada - Siguiendo patrón useInventory/useEvents
 */

import { useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/stores';
import { Provider } from '@/types';
import { useProvidersDatabase } from './useProvidersDatabase';
import { useProvidersQuery } from './useProvidersQuery';
import { 
  calculateProviderStats, 
  providerMatchesSearch, 
  filterByExchangeStatus,
  sortProviders,
  ProviderFilter,
  ProviderStatus,
  ProviderStats 
} from '../domain/suppliersDomain';

// ============================================================================
// TIPOS
// ============================================================================

export interface SupplierFilters {
  searchQuery: string;
  selectedFilter: ProviderFilter;
  sortField: 'name' | 'rut' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface UseSuppliersReturn {
  // Estado
  filteredSuppliers: Provider[];
  allSuppliers: Provider[];
  stats: ProviderStats;
  filters: SupplierFilters;
  isLoading: boolean;
  isSyncing: boolean;
  selectedIds: Set<string>;
  
  // Acciones
  actions: {
    setSearchQuery: (query: string) => void;
    setSelectedFilter: (filter: ProviderFilter) => void;
    setSortField: (field: SupplierFilters['sortField']) => void;
    setSortOrder: (order: 'asc' | 'desc') => void;
    toggleSelection: (rut: string) => void;
    selectAll: () => void;
    clearSelection: () => void;
    deleteSupplier: (rut: string) => Promise<void>;
    bulkDelete: (ruts: string[]) => Promise<void>;
    syncSuppliers: () => Promise<void>;
    openCreate: () => void;
    openEdit: (provider: Provider | null) => void;
    openDetail: (provider: Provider) => void;
    closeDetail: () => void;
    openProducts: (provider: Provider) => void;
    closeProducts: () => void;
  };
  
  // UI State
  ui: {
    isCreateModalOpen: boolean;
    isEditModalOpen: boolean;
    isDetailModalOpen: boolean;
    isProductsModalOpen: boolean;
    editingProvider: Provider | null;
    selectedProvider: Provider | null;
    selectedProviderForProducts: Provider | null;
  };
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export const useSuppliers = (): UseSuppliersReturn => {
  const settings = useAppStore(state => state.settings);
  const theme = (settings?.theme as 'dark' | 'light' | 'high-contrast') || 'dark';
  const tableName = settings?.cloudConfig?.providersTableName || 'PROVEEDORES';

  // Estado local de UI
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<ProviderFilter>(ProviderFilter.ALL);
  const [sortField, setSortField] = useState<SupplierFilters['sortField']>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [selectedProviderForProducts, setSelectedProviderForProducts] = useState<Provider | null>(null);

  // Hook de base de datos existente
  const database = useProvidersDatabase(tableName);
  const { state, actions } = database;

  // Hook de query para recargar datos
  const queryModule = useProvidersQuery();

  // Estadísticas
  const stats = useMemo(() => {
    return calculateProviderStats(state.filteredProviders, 0);
  }, [state.filteredProviders]);

  // Proveedores filtrados y ordenados
  const filteredSuppliers = useMemo(() => {
    let suppliers = state.filteredProviders;

    // Filtrar por búsqueda adicional
    if (searchQuery.trim()) {
      suppliers = suppliers.filter(p => providerMatchesSearch(p, searchQuery));
    }

    // Filtrar por estado de canje
    if (selectedFilter !== ProviderFilter.ALL) {
      suppliers = filterByExchangeStatus(suppliers, selectedFilter);
    }

    // Ordenar
    suppliers = sortProviders(suppliers, sortField, sortOrder);

    return suppliers;
  }, [state.filteredProviders, searchQuery, selectedFilter, sortField, sortOrder]);

  // Acciones
  const toggleSelection = useCallback((rut: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rut)) {
        newSet.delete(rut);
      } else {
        newSet.add(rut);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredSuppliers.map(p => p.rut)));
  }, [filteredSuppliers]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const deleteSupplier = useCallback(async (rut: string) => {
    await actions.handleDelete(rut);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(rut);
      return newSet;
    });
  }, [actions.handleDelete]);

  const bulkDelete = useCallback(async (ruts: string[]) => {
    for (const rut of ruts) {
      await actions.handleDelete(rut);
    }
    setSelectedIds(new Set());
  }, [actions.handleDelete]);

  const syncSuppliers = useCallback(async () => {
    await actions.handleSyncToCloud();
  }, [actions.handleSyncToCloud]);

  const openCreate = useCallback(() => {
    actions.handleOpenAdd();
  }, [actions.handleOpenAdd]);

  const openEdit = useCallback((provider: Provider | null) => {
    if (provider === null) {
      actions.handleCloseForm();
    } else {
      actions.handleEdit(provider);
    }
  }, [actions.handleEdit, actions.handleCloseForm]);

  const openDetail = useCallback((provider: Provider) => {
    setSelectedProvider(provider);
    setIsDetailModalOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedProvider(null);
  }, []);

  const openProducts = useCallback((provider: Provider) => {
    setSelectedProviderForProducts(provider);
    setIsProductsModalOpen(true);
  }, []);

  const closeProducts = useCallback(() => {
    setIsProductsModalOpen(false);
    setSelectedProviderForProducts(null);
  }, []);

  return {
    filteredSuppliers,
    allSuppliers: state.filteredProviders,
    stats,
    filters: {
      searchQuery,
      selectedFilter,
      sortField,
      sortOrder
    },
    isLoading: state.filteredProviders.length === 0 && !state.isSyncing,
    isSyncing: state.isSyncing,
    selectedIds,
    actions: {
      setSearchQuery,
      setSelectedFilter,
      setSortField,
      setSortOrder,
      toggleSelection,
      selectAll,
      clearSelection,
      deleteSupplier,
      bulkDelete,
      syncSuppliers,
      openCreate,
      openEdit,
      openDetail,
      closeDetail,
      openProducts,
      closeProducts
    },
    ui: {
      isCreateModalOpen: state.isFormOpen,
      isEditModalOpen: state.isFormOpen && !!state.editingProvider,
      isDetailModalOpen,
      isProductsModalOpen,
      editingProvider: state.editingProvider || null,
      selectedProvider,
      selectedProviderForProducts
    }
  };
};

// Re-exportar tipos útiles
export type { ProviderStats };
