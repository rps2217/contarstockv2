/**
 * Constantes para el módulo de Sincronización
 */

// Colores para estados de sync
export const SYNC_STATUS_COLORS = {
  synced: 'bg-green-500',
  pending: 'bg-yellow-500',
  error: 'bg-red-500',
  never: 'bg-gray-400',
  syncing: 'bg-blue-500 animate-pulse',
} as const;

// Labels para estados de sync
export const SYNC_STATUS_LABELS = {
  synced: 'Sincronizado',
  pending: 'Pendiente',
  error: 'Error',
  never: 'Nunca',
  syncing: 'Sincronizando...',
} as const;

// Colores para tipos de operación
export const SYNC_TYPE_COLORS = {
  full: 'bg-purple-500',
  partial: 'bg-blue-500',
  realtime: 'bg-green-500',
} as const;

// Labels para tipos de operación
export const SYNC_TYPE_LABELS = {
  full: 'Sincronización Completa',
  partial: 'Sincronización Parcial',
  realtime: 'Tiempo Real',
} as const;

// Tablas por defecto para sincronización
export const DEFAULT_SYNC_TABLES = [
  { name: 'PRODUCTOS', displayName: 'Productos' },
  { name: 'PROVEEDORES', displayName: 'Proveedores' },
  { name: 'CONTEOS', displayName: 'Conteos (Martillo)' },
  { name: 'CONSOLIDADO', displayName: 'Consolidado' },
  { name: 'EVENTOS', displayName: 'Eventos' },
  { name: 'SESIONES_CONTEO', displayName: 'Sesiones de Conteo' },
  { name: 'VENCIMIENTOS', displayName: 'Vencimientos' },
  { name: 'RECEPCION_BULTOS', displayName: 'Recepción de Bultos' },
] as const;

// Configuración de sync por tabla
export const SYNC_TABLE_CONFIGS = {
  default: {
    batchSize: 100,
    retryAttempts: 3,
    retryDelay: 1000,
    enableRealtime: true,
  },
  large: {
    batchSize: 500,
    retryAttempts: 5,
    retryDelay: 2000,
    enableRealtime: false,
  },
  realtime: {
    batchSize: 10,
    retryAttempts: 1,
    retryDelay: 500,
    enableRealtime: true,
  },
} as const;

// Mensajes de sync
export const SYNC_MESSAGES = {
  start: 'Iniciando sincronización...',
  pullingProducts: 'Descargando productos desde la nube...',
  pullingProviders: 'Descargando proveedores...',
  pushingData: 'Subiendo datos locales...',
  complete: 'Sincronización completada',
  error: 'Error durante la sincronización',
  offline: 'Sin conexión a internet. Trabajando en modo offline.',
  noData: 'No hay datos para sincronizar',
} as const;

// Límites de sync
export const SYNC_LIMITS = {
  maxBatchSize: 1000,
  maxRetries: 10,
  maxConcurrentSyncs: 3,
  syncIntervalMs: 60000, // 1 minuto
  progressUpdateIntervalMs: 100,
} as const;
