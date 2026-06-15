/**
 * CONSTANTES CENTRALIZADAS DE TABLAS
 * 
 * Problema original: Nombres de tablas inconsistentes dispersos por el código.
 * 'VENCIMIENTOS' vs 'EXPIRY' vs 'inventoryRegistryTableName'
 * 
 * Solución: Un único archivo con todas las constantes de tablas.
 */

// ========================
// TABLAS SUPABASE (Remoto)
// ========================
export const SUPABASE_TABLES = {
  // Tablas principales
  PRODUCTS: 'PRODUCTOS',
  SESSIONS: 'SESSIONS',
  SCANS: 'CONTEOS',
  
  // Tablas dinámicas
  DYNAMIC_DATA: 'DYNAMIC_DATA',
  EXPIRY: 'EXPIRY',
  INVENTORY_REGISTRY: 'INVENTORY_REGISTRY',
  
  // Tablas legacy/mapeadas
  VENCIMIENTOS: 'VENCIMIENTOS',
  RECEPCION_BULTOS: 'RECEPCION_BULTOS',
  RECEP_CLOUD: 'RECEP_CLOUD',
  
  // Tablas de configuración
  SETTINGS: 'SETTINGS',
  PROVIDERS: 'PROVEEDORES',
  CUSTOMERS: 'CUSTOMERS',
  EXPECTED_ORDERS: 'EXPECTED_ORDERS',
} as const;

// ========================
// TABLAS INDEXEDDB (Local)
// ========================
export const DB_TABLES = {
  PRODUCTS: 'products',
  SESSIONS: 'sessions',
  SCANS: 'scans',
  PROVIDERS: 'providers',
  CUSTOMERS: 'customers',
  EXPECTED_ORDERS: 'expectedOrders',
  DYNAMIC_DATA: 'dynamic_data',
  SETTINGS: 'settings',
  LOGS: 'logs',
  SYNC_LOGS: 'sync_logs',
  LOCATIONS: 'locations',
  VISUAL_GUIDES: 'visualGuides',
  ERP_SESSIONS: 'erpSessions',
  MESSAGE_TEMPLATES: 'messageTemplates',
  BLIND_SCANS: 'blindScans',
  BLIND_MANIFESTS: 'blindManifests',
} as const;

// ========================
// MAPPINGS DE COLUMNAS
// ========================
export const COLUMN_MAPPINGS = {
  products: {
    barcode: 'barcode',
    name: 'name',
    supplier: 'supplier',
    supplierRut: 'supplierRut',
    category: 'category',
    price: 'price',
  },
  sessions: {
    id: 'id',
    status: 'status',
    createdAt: 'createdAt',
    erpOrder: 'erpOrder',
    logisticsLabel: 'logisticsLabel',
    sessionType: 'sessionType',
    syncStatus: 'syncStatus',
  },
  scans: {
    id: 'id',
    sessionId: 'sessionId',
    barcode: 'barcode',
    quantity: 'quantity',
    timestamp: 'timestamp',
    synced: 'synced',
    syncStatus: 'syncStatus',
  },
} as const;

// ========================
// STATUS CONSTANTS
// ========================
export const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCED: 'synced',
  ERROR: 'error',
  PENDING_DELETE: 'pending_delete',
} as const;

export const SESSION_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
} as const;

// ========================
// TIPOS COMUNES
// ========================
export type SupabaseTableName = typeof SUPABASE_TABLES[keyof typeof SUPABASE_TABLES];
export type DbTableName = typeof DB_TABLES[keyof typeof DB_TABLES];
export type SyncStatus = typeof SYNC_STATUS[keyof typeof SYNC_STATUS];
export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS];