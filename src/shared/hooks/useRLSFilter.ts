"use client";
/**
 * useRLSFilter - Hook para aplicar Row-Level Security en componentes
 * 
 * Uso típico:
 * const { filteredData, isFiltered } = useRLSFilter(products, 'products');
 */

import { useMemo } from 'react';
import { useRLS, applyRLSFilters } from '@/stores/useRowLevelSecurityStore';

/**
 * Hook para filtrar datos según RLS
 */
export function useRLSFilter<T>(
  data: T[] | undefined,
  tableName: string
): {
  filteredData: T[];
  isFiltered: boolean;
  originalCount: number;
  filteredCount: number;
} {
  const store = useRLS();
  
  return useMemo(() => {
    if (!data) {
      return {
        filteredData: [],
        isFiltered: false,
        originalCount: 0,
        filteredCount: 0,
      };
    }
    
    const originalCount = data.length;
    const filteredData = store.filter(data, tableName);
    const filteredCount = filteredData.length;
    
    return {
      filteredData,
      isFiltered: filteredCount !== originalCount,
      originalCount,
      filteredCount,
    };
  }, [data, tableName, store]);
}

/**
 * Hook para verificar acceso a una ubicación
 */
export function useWarehouseAccess() {
  const store = useRLS();
  
  return {
    /** Lista de almacenes disponibles */
    warehouses: store.availableWarehouses,
    
    /** Almacén activo actual */
    activeWarehouse: store.activeWarehouse,
    
    /** Establecer almacén activo */
    setWarehouse: store.setActiveWarehouse,
    
    /** Agregar nuevo almacén */
    addWarehouse: store.addWarehouse,
    
    /** Remover almacén */
    removeWarehouse: store.removeWarehouse,
    
    /** Verificar si tiene acceso a un almacén específico */
    hasAccess: (warehouse: string) => {
      // Admin tiene acceso a todos
      if (store.isAdmin) return true;
      return store.availableWarehouses.includes(warehouse);
    },
    
    /** Verificar si está filtrando por almacén */
    isFiltering: store.context.currentWarehouse !== undefined,
  };
}

/**
 * Componente para envolver contenido que requiere acceso
 */
export function WarehouseGate({
  children,
  requiredWarehouse,
  fallback = null,
}: {
  children: React.ReactNode;
  requiredWarehouse: string;
  fallback?: React.ReactNode;
}) {
  const { hasAccess } = useWarehouseAccess();
  
  if (!hasAccess(requiredWarehouse)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

/**
 * Hook para el selector de almacén en la UI
 */
export function useWarehouseSelector() {
  const store = useRLS();
  
  return {
    /** Todos los almacenes disponibles */
    options: store.availableWarehouses.map(w => ({
      value: w,
      label: w,
    })),
    
    /** Almacén actualmente seleccionado */
    selected: store.activeWarehouse,
    
    /** Seleccionar almacén */
    select: store.setActiveWarehouse,
    
    /** Limpiar selección (ver todo) */
    clear: () => store.setActiveWarehouse(null),
    
    /** Si el usuario puede cambiar de almacén */
    canChange: store.context.role !== 'viewer',
  };
}
