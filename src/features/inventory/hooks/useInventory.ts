/**
 * useInventory.ts - Hook centralizado para el módulo de Inventario
 * 
 * Arquitectura simplificada - Siguiendo patrón useEvents/useExpiry
 */

import { useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/stores';
import { Product } from '@/types';
import { ProductWithPolicy } from '@/features/product/types';
import { useProductDatabase } from './useProductDatabase';
import { useProductsStats } from './useProductsStats';
import { 
  calculateProductStats, 
  productMatchesSearch, 
  filterByPolicy,
  sortProducts,
  ProductPolicyStatus,
  ProductStats 
} from '../domain/productsDomain';

// ============================================================================
// TIPOS
// ============================================================================

export interface InventoryFilters {
  searchQuery: string;
  selectedPolicy: ProductPolicyStatus | 'all';
  sortField: 'name' | 'barcode' | 'category' | 'stock' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
}

export interface InventoryStats {
  total: number;
  byPolicy: {
    EXCHANGE: number;
    LOSS: number;
    NO_INFO: number;
  };
  lowStock: number;
  missingPolicy: number;
  pendingChanges: number;
}

export interface UseInventoryReturn {
  // Estado
  filteredProducts: Product[];
  allProducts: Product[];
  stats: InventoryStats;
  filters: InventoryFilters;
  isLoading: boolean;
  isSyncing: boolean;
  selectedIds: Set<string>;
  
  // Acciones
  actions: {
    setSearchQuery: (query: string) => void;
    setSelectedPolicy: (policy: ProductPolicyStatus | 'all') => void;
    setSortField: (field: InventoryFilters['sortField']) => void;
    setSortOrder: (order: 'asc' | 'desc') => void;
    toggleSelection: (barcode: string) => void;
    selectAll: () => void;
    clearSelection: () => void;
    deleteProduct: (barcode: string) => Promise<void>;
    bulkDelete: (barcodes: string[]) => Promise<void>;
    syncProducts: () => Promise<void>;
    openCreate: () => void;
    openEdit: (product: Product | null) => void;
    openDetail: (product: Product) => void;
    closeDetail: () => void;
  };
  
  // UI State
  ui: {
    isCreateModalOpen: boolean;
    isEditModalOpen: boolean;
    isDetailModalOpen: boolean;
    editingProduct: Product | null;
    selectedProduct: Product | null;
  };
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export const useInventory = (): UseInventoryReturn => {
  const settings = useAppStore(state => state.settings);
  const theme = (settings?.theme as 'dark' | 'light' | 'high-contrast') || 'dark';

  // Estado local de UI
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<ProductPolicyStatus | 'all'>('all');
  const [sortField, setSortField] = useState<InventoryFilters['sortField']>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Hook de base de datos existente
  const database = useProductDatabase();
  const { state } = database;

  // Hook de estadísticas
  const { stats: productStats } = useProductsStats({
    products: state.products,
    pendingChangesCount: state.pendingChangesCount
  });

  // Productos filtrados y ordenados
  const filteredProducts = useMemo(() => {
    let products = state.products;

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      products = products.filter(p => productMatchesSearch(p, searchQuery));
    }

    // Filtrar por política
    if (selectedPolicy !== 'all') {
      products = filterByPolicy(products, selectedPolicy);
    }

    // Ordenar
    products = sortProducts(products, sortField, sortOrder);

    return products;
  }, [state.products, searchQuery, selectedPolicy, sortField, sortOrder]);

  // Acciones
  const toggleSelection = useCallback((barcode: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(barcode)) {
        newSet.delete(barcode);
      } else {
        newSet.add(barcode);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredProducts.map(p => p.barcode)));
  }, [filteredProducts]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const deleteProduct = useCallback(async (barcode: string) => {
    await database.actions.handleDelete(barcode);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(barcode);
      return newSet;
    });
  }, [database.actions.handleDelete]);

  const bulkDelete = useCallback(async (barcodes: string[]) => {
    for (const barcode of barcodes) {
      await database.actions.handleDelete(barcode);
    }
    setSelectedIds(new Set());
  }, [database.actions.handleDelete]);

  const syncProducts = useCallback(async () => {
    await database.actions.handleSyncToCloud();
  }, [database.actions.handleSyncToCloud]);

  const openCreate = useCallback(() => {
    setEditingProduct(null);
    setIsCreateModalOpen(true);
  }, []);

  const openEdit = useCallback((product: Product | null) => {
    if (product === null) {
      // Cerrar modal de edición
      setEditingProduct(null);
      setIsEditModalOpen(false);
    } else {
      // Abrir modal de edición
      setEditingProduct(product);
      setIsEditModalOpen(true);
    }
  }, []);

  const openDetail = useCallback((product: Product) => {
    setSelectedProduct(product);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  // Transformar estadísticas al formato esperado
  const stats: InventoryStats = useMemo(() => ({
    total: productStats.total,
    byPolicy: {
      EXCHANGE: productStats.byPolicy[ProductPolicyStatus.EXCHANGE],
      LOSS: productStats.byPolicy[ProductPolicyStatus.LOSS],
      NO_INFO: productStats.byPolicy[ProductPolicyStatus.NO_INFO],
    },
    lowStock: productStats.lowStock,
    missingPolicy: productStats.missingPolicy,
    pendingChanges: productStats.pendingChanges
  }), [productStats]);

  return {
    filteredProducts,
    allProducts: state.products,
    stats,
    filters: {
      searchQuery,
      selectedPolicy,
      sortField,
      sortOrder
    },
    isLoading: state.products.length === 0 && !state.isSyncing,
    isSyncing: state.isSyncing,
    selectedIds,
    actions: {
      setSearchQuery,
      setSelectedPolicy,
      setSortField,
      setSortOrder,
      toggleSelection,
      selectAll,
      clearSelection,
      deleteProduct,
      bulkDelete,
      syncProducts,
      openCreate,
      openEdit,
      openDetail,
      closeDetail
    },
    ui: {
      isCreateModalOpen,
      isEditModalOpen,
      isDetailModalOpen: !!selectedProduct,
      editingProduct,
      selectedProduct
    }
  };
};

// Re-exportar tipos útiles
export type { ProductStats };
