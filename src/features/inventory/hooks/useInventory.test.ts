/**
 * useInventory.test.ts - Tests para el hook useInventory
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Mock de zustand stores
vi.mock('@/stores', () => ({
  useAppStore: vi.fn(() => ({
    settings: { theme: 'dark' }
  }))
}));

// Mock de hooks de base de datos
vi.mock('./useProductDatabase', () => ({
  useProductDatabase: vi.fn(() => ({
    state: {
      products: [
        { barcode: '001', name: 'Producto A', stock: 10, syncStatus: 'synced' },
        { barcode: '002', name: 'Producto B', stock: 5, syncStatus: 'synced' },
        { barcode: '003', name: 'Producto C', stock: 0, syncStatus: 'synced' },
        { barcode: '004', name: 'D Test', stock: 15, syncStatus: 'synced' },
      ],
      pendingChangesCount: 0,
      isSyncing: false,
      isDownloading: false,
      isVectorizing: false,
      vectorProgress: 0,
      storageUsage: null,
      brainStatus: 'idle'
    },
    actions: {
      handleDelete: vi.fn().mockResolvedValue(undefined),
      handleSyncToCloud: vi.fn().mockResolvedValue(undefined)
    }
  }))
}));

// Mock de framer-motion para evitar errores de renderizado
vi.mock('framer-motion', () => ({
  motion: {
    div: function MockDiv({ children, ...props }: any) {
      return React.createElement('div', props, children);
    },
  },
  AnimatePresence: function MockAnimatePresence({ children }: any) {
    return children;
  }
}));

describe('useInventory', () => {
  // Importar después de los mocks
  let useInventory: typeof import('./useInventory').useInventory;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('./useInventory');
    useInventory = module.useInventory;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Estado inicial', () => {
    it('debe inicializar con estado correcto', () => {
      const { result } = renderHook(() => useInventory());
      
      expect(result.current.allProducts).toHaveLength(4);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.selectedIds.size).toBe(0);
    });

    it('debe tener filtros inicializados correctamente', () => {
      const { result } = renderHook(() => useInventory());
      
      expect(result.current.filters.searchQuery).toBe('');
      expect(result.current.filters.selectedPolicy).toBe('all');
      expect(result.current.filters.sortField).toBe('name');
      expect(result.current.filters.sortOrder).toBe('asc');
    });
  });

  describe('Búsqueda', () => {
    it('debe filtrar productos por búsqueda', () => {
      const { result } = renderHook(() => useInventory());
      
      act(() => {
        result.current.actions.setSearchQuery('Producto');
      });
      
      expect(result.current.filteredProducts.length).toBe(3);
      
      act(() => {
        result.current.actions.setSearchQuery('A');
      });
      
      expect(result.current.filteredProducts.length).toBe(1);
      expect(result.current.filteredProducts[0].name).toBe('Producto A');
    });

    it('debe devolver todos los productos con búsqueda vacía', () => {
      const { result } = renderHook(() => useInventory());
      
      act(() => {
        result.current.actions.setSearchQuery('Producto');
      });
      
      expect(result.current.filteredProducts.length).toBe(3);
      
      act(() => {
        result.current.actions.setSearchQuery('');
      });
      
      expect(result.current.filteredProducts.length).toBe(4);
    });

    it('debe limpiar búsqueda', () => {
      const { result } = renderHook(() => useInventory());
      
      act(() => {
        result.current.actions.setSearchQuery('zzz_notexist');
      });
      
      expect(result.current.filteredProducts.length).toBe(0);
      
      act(() => {
        result.current.actions.setSearchQuery('');
      });
      
      expect(result.current.filteredProducts.length).toBe(4);
    });
  });

  describe('Selección', () => {
    it('debe agregar producto a selección', () => {
      const { result } = renderHook(() => useInventory());
      
      act(() => {
        result.current.actions.toggleSelection('001');
      });
      
      expect(result.current.selectedIds.has('001')).toBe(true);
    });

    it('debe remover producto de selección', () => {
      const { result } = renderHook(() => useInventory());
      
      act(() => {
        result.current.actions.toggleSelection('001');
      });
      
      expect(result.current.selectedIds.has('001')).toBe(true);
      
      act(() => {
        result.current.actions.toggleSelection('001');
      });
      
      expect(result.current.selectedIds.has('001')).toBe(false);
    });

    it('debe seleccionar todos los productos', () => {
      const { result } = renderHook(() => useInventory());
      
      act(() => {
        result.current.actions.selectAll();
      });
      
      expect(result.current.selectedIds.size).toBe(4);
    });

    it('debe limpiar selección', () => {
      const { result } = renderHook(() => useInventory());
      
      act(() => {
        result.current.actions.selectAll();
      });
      
      expect(result.current.selectedIds.size).toBe(4);
      
      act(() => {
        result.current.actions.clearSelection();
      });
      
      expect(result.current.selectedIds.size).toBe(0);
    });
  });

  describe('UI Modals', () => {
    it('debe abrir modal de crear', () => {
      const { result } = renderHook(() => useInventory());
      
      expect(result.current.ui.isCreateModalOpen).toBe(false);
      
      act(() => {
        result.current.actions.openCreate();
      });
      
      expect(result.current.ui.isCreateModalOpen).toBe(true);
    });

    it('debe abrir modal de editar', () => {
      const { result } = renderHook(() => useInventory());
      const product = { barcode: '001', name: 'Producto A', category: 'GENERAL' };
      
      expect(result.current.ui.isEditModalOpen).toBe(false);
      
      act(() => {
        result.current.actions.openEdit(product);
      });
      
      expect(result.current.ui.isEditModalOpen).toBe(true);
      expect(result.current.ui.editingProduct).toEqual(product);
    });

    it('debe cerrar modal de editar', () => {
      const { result } = renderHook(() => useInventory());
      const product = { barcode: '001', name: 'Producto A', category: 'GENERAL' };
      
      act(() => {
        result.current.actions.openEdit(product);
      });
      
      expect(result.current.ui.isEditModalOpen).toBe(true);
      
      act(() => {
        result.current.actions.openEdit(null);
      });
      
      expect(result.current.ui.isEditModalOpen).toBe(false);
    });

    it('debe abrir detalle de producto', () => {
      const { result } = renderHook(() => useInventory());
      const product = { barcode: '001', name: 'Producto A', category: 'GENERAL' };
      
      expect(result.current.ui.isDetailModalOpen).toBe(false);
      
      act(() => {
        result.current.actions.openDetail(product);
      });
      
      expect(result.current.ui.isDetailModalOpen).toBe(true);
      expect(result.current.ui.selectedProduct).toEqual(product);
    });

    it('debe cerrar detalle de producto', () => {
      const { result } = renderHook(() => useInventory());
      const product = { barcode: '001', name: 'Producto A', category: 'GENERAL' };
      
      act(() => {
        result.current.actions.openDetail(product);
      });
      
      expect(result.current.ui.isDetailModalOpen).toBe(true);
      
      act(() => {
        result.current.actions.closeDetail();
      });
      
      expect(result.current.ui.isDetailModalOpen).toBe(false);
    });
  });

  describe('Ordenamiento', () => {
    it('debe cambiar campo de ordenamiento', () => {
      const { result } = renderHook(() => useInventory());
      
      act(() => {
        result.current.actions.setSortField('barcode');
      });
      
      expect(result.current.filters.sortField).toBe('barcode');
    });

    it('debe cambiar dirección de ordenamiento', () => {
      const { result } = renderHook(() => useInventory());
      
      expect(result.current.filters.sortOrder).toBe('asc');
      
      act(() => {
        result.current.actions.setSortOrder('desc');
      });
      
      expect(result.current.filters.sortOrder).toBe('desc');
    });

    it('debe ordenar productos por nombre ascendente', () => {
      const { result } = renderHook(() => useInventory());
      
      act(() => {
        result.current.actions.setSortField('name');
        result.current.actions.setSortOrder('asc');
      });
      
      const products = result.current.filteredProducts;
      expect(products[0].name).toBe('D Test'); // Empieza con D
      expect(products[3].name).toBe('Producto C');
    });
  });

  describe('Estadísticas', () => {
    it('debe calcular estadísticas correctamente', () => {
      const { result } = renderHook(() => useInventory());
      
      expect(result.current.stats.total).toBe(4);
      expect(result.current.stats.pendingChanges).toBe(0);
    });
  });
});
