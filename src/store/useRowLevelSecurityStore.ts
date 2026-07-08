"use client";
/**
 * useRowLevelSecurityStore - Seguridad a Nivel de Filas (RLS)
 * 
 * Implementación inspirada en AppSheet Security Filters.
 * Permite filtrar datos dinámicamente según el contexto del usuario.
 * 
 * Casos de uso:
 * - Técnicos solo ven productos de su almacén/ubicación
 * - Supervisores ven datos de sus secciones
 * - Vendedores ven solo sus clientes
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserRole } from './usePermissionStore';

// =============================================================================
// TIPOS
// =============================================================================

export type ScopeType = 'global' | 'warehouse' | 'section' | 'user';

/**
 * Define un filtro de seguridad para una tabla específica
 */
export interface RowFilter<T = any> {
  /** Tabla a filtrar */
  table: string;
  /** Tipo de alcance */
  scopeType: ScopeType;
  /** ID del alcance (warehouse_id, section_id, user_id) */
  scopeId?: string;
  /** Expresión de filtro - recibe el registro y retorna si es visible */
  filterFn: (record: T, context: SecurityContext) => boolean;
  /** Descripción legible del filtro */
  description: string;
}

/**
 * Contexto de seguridad para evaluar filtros
 */
export interface SecurityContext {
  userId: string;
  role: UserRole;
  /** Ubicación/almacén actual */
  currentWarehouse?: string;
  /** Sección actual */
  currentSection?: string;
  /** Permisos adicionales */
  permissions?: string[];
  /** Metadatos adicionales */
  metadata?: Record<string, any>;
}

/**
 * Configuración de RLS para una tabla
 */
export interface TableRLSConfig {
  tableName: string;
  /** Campo de la tabla que contiene el warehouse/location */
  locationField?: string;
  /** Campo que contiene el usuario propietario */
  ownerField?: string;
  /** Campo que contiene la sección */
  sectionField?: string;
  /** Si es true, admins ven todo */
  adminBypass?: boolean;
  /** Campos requeridos para el filtro */
  requiredFields?: string[];
}

// =============================================================================
// CONFIGURACIÓN DE TABLAS
// =============================================================================

export const TABLE_RLS_CONFIGS: Record<string, TableRLSConfig> = {
  products: {
    tableName: 'products',
    locationField: 'location',
    adminBypass: true,
  },
  sessions: {
    tableName: 'sessions',
    locationField: 'location',
    ownerField: 'operatorId',
    adminBypass: true,
  },
  scans: {
    tableName: 'scans',
    locationField: 'location',
    ownerField: 'operatorId',
    adminBypass: true,
  },
  customers: {
    tableName: 'customers',
    ownerField: 'assignedTo',
    adminBypass: true,
  },
  providers: {
    tableName: 'providers',
    adminBypass: true,
  },
  expirations: {
    tableName: 'expirations',
    locationField: 'location',
    adminBypass: true,
  },
};

// =============================================================================
// STORE
// =============================================================================

interface RowLevelSecurityState {
  /** Contexto actual del usuario */
  context: SecurityContext;
  
  /** Configuraciones de RLS por tabla */
  tableConfigs: Record<string, TableRLSConfig>;
  
  /** Lista de ubicaciones/almacenes disponibles para el usuario */
  availableWarehouses: string[];
  
  /** Ubicación activa actual */
  activeWarehouse: string | null;
  
  /** Si el bypass de admin está activo */
  adminBypassEnabled: boolean;
  
  // Acciones
  setContext: (context: Partial<SecurityContext>) => void;
  setActiveWarehouse: (warehouse: string | null) => void;
  addWarehouse: (warehouse: string) => void;
  removeWarehouse: (warehouse: string) => void;
  updateTableConfig: (table: string, config: Partial<TableRLSConfig>) => void;
  enableAdminBypass: (enabled: boolean) => void;
  resetContext: () => void;
}

const defaultContext: SecurityContext = {
  userId: 'default',
  role: 'viewer',
  currentWarehouse: undefined,
  currentSection: undefined,
};

export const useRowLevelSecurityStore = create<RowLevelSecurityState>()(
  persist(
    (set, get) => ({
      context: defaultContext,
      tableConfigs: TABLE_RLS_CONFIGS,
      availableWarehouses: [],
      activeWarehouse: null,
      adminBypassEnabled: true,

      setContext: (newContext) => set((state) => ({
        context: { ...state.context, ...newContext }
      })),

      setActiveWarehouse: (warehouse) => set((state) => ({
        activeWarehouse: warehouse,
        context: {
          ...state.context,
          currentWarehouse: warehouse || undefined,
        }
      })),

      addWarehouse: (warehouse) => set((state) => ({
        availableWarehouses: state.availableWarehouses.includes(warehouse)
          ? state.availableWarehouses
          : [...state.availableWarehouses, warehouse]
      })),

      removeWarehouse: (warehouse) => set((state) => ({
        availableWarehouses: state.availableWarehouses.filter(w => w !== warehouse),
        activeWarehouse: state.activeWarehouse === warehouse ? null : state.activeWarehouse,
      })),

      updateTableConfig: (table, config) => set((state) => ({
        tableConfigs: {
          ...state.tableConfigs,
          [table]: { ...state.tableConfigs[table], ...config }
        }
      })),

      enableAdminBypass: (enabled) => set({ adminBypassEnabled: enabled }),

      resetContext: () => set({
        context: defaultContext,
        activeWarehouse: null,
      }),
    }),
    {
      name: 'rls-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeWarehouse: state.activeWarehouse,
        availableWarehouses: state.availableWarehouses,
        adminBypassEnabled: state.adminBypassEnabled,
      }),
    }
  )
);

// =============================================================================
// HELPERS Y UTILIDADES
// =============================================================================

/**
 * Verifica si el usuario actual es admin (bypass)
 */
export const isAdminBypass = (role: UserRole, enabled: boolean): boolean => {
  return enabled && (role === 'admin');
};

/**
 * Obtiene el filtro de seguridad para una tabla
 */
export const getTableFilter = <T>(
  tableName: string,
  context: SecurityContext,
  configs: Record<string, TableRLSConfig>,
  adminBypass: boolean
): ((record: T) => boolean) | null => {
  const config = configs[tableName];
  
  if (!config) return null;
  
  // Admin bypass
  if (adminBypass && config.adminBypass && context.role === 'admin') {
    return null; // null = sin filtro
  }
  
  // Filtro por ubicación
  const locationField = config.locationField;
  if (locationField && context.currentWarehouse) {
    return (record: T) => {
      const typedRecord = record as Record<string, any>;
      return typedRecord[locationField] === context.currentWarehouse;
    };
  }
  
  // Filtro por propietario
  const ownerField = config.ownerField;
  if (ownerField && context.userId !== 'default') {
    return (record: T) => {
      const typedRecord = record as Record<string, any>;
      return typedRecord[ownerField] === context.userId;
    };
  }
  
  return null; // Sin filtro
};

/**
 * Aplica filtros RLS a un array de registros
 */
export function applyRLSFilters<T>(
  records: T[],
  tableName: string,
  context: SecurityContext,
  configs: Record<string, TableRLSConfig>,
  adminBypass: boolean
): T[] {
  const filterFn = getTableFilter(tableName, context, configs, adminBypass);
  
  if (!filterFn) return records;
  
  return records.filter(filterFn);
}

/**
 * Hook para usar RLS en un componente
 */
export const useRLS = () => {
  const store = useRowLevelSecurityStore();
  
  return {
    ...store,
    
    /** Verifica si el usuario actual tiene bypass de admin */
    isAdmin: isAdminBypass(store.context.role, store.adminBypassEnabled),
    
    /** Filtra registros según la configuración RLS */
    filter: <T>(records: T[], tableName: string): T[] => {
      return applyRLSFilters(
        records,
        tableName,
        store.context,
        store.tableConfigs,
        store.adminBypassEnabled
      );
    },
    
    /** Obtiene el filtro activo para una tabla */
    getFilter: <T>(tableName: string) => {
      return getTableFilter(
        tableName,
        store.context,
        store.tableConfigs,
        store.adminBypassEnabled
      );
    },
  };
};

// =============================================================================
// SELECTORS
// =============================================================================

export const selectIsRLSEnabled = (state: RowLevelSecurityState) => 
  state.context.role !== 'admin' || !state.adminBypassEnabled;

export const selectCurrentLocation = (state: RowLevelSecurityState) => 
  state.context.currentWarehouse;

export const selectCanAccessTable = (state: RowLevelSecurityState, tableName: string) => {
  const config = state.tableConfigs[tableName];
  if (!config) return true;
  
  // Admin ve todo
  if (state.adminBypassEnabled && state.context.role === 'admin') return true;
  
  return true;
};
