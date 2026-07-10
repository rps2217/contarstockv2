/**
 * Constantes para el módulo de Reports
 */

// Colores para estados de sesión
export const SESSION_STATUS_COLORS = {
  active: 'bg-blue-500',
  completed: 'bg-green-500',
  draft: 'bg-gray-400',
  error: 'bg-red-500',
  pending: 'bg-yellow-500',
} as const;

// Colores para tipos de sesión
export const SESSION_TYPE_COLORS = {
  standard: 'bg-indigo-500',
  hammer: 'bg-orange-500',
  reception: 'bg-teal-500',
} as const;

// Labels para tipos de sesión
export const SESSION_TYPE_LABELS = {
  all: 'Todos',
  standard: 'Conteo',
  hammer: 'Martillo',
  reception: 'Recepción',
} as const;

// Labels para estados de sesión
export const SESSION_STATUS_LABELS = {
  active: 'Activo',
  completed: 'Completado',
  draft: 'Borrador',
  error: 'Error',
  pending: 'Pendiente',
} as const;

// Límites de paginación
export const PAGINATION_LIMITS = {
  default: 50,
  min: 10,
  max: 200,
  step: 10,
} as const;

// Estados de sincronización
export const SYNC_STATUS = {
  synced: 'synced',
  pending: 'pending',
  error: 'error',
  uploading: 'uploading',
} as const;

// Columnas por defecto para reportes
export const DEFAULT_REPORT_COLUMNS = [
  { key: 'barcode', label: 'SKU', width: 120 },
  { key: 'name', label: 'Producto', width: 200 },
  { key: 'supplier', label: 'Proveedor', width: 150 },
  { key: 'location', label: 'Ubicación', width: 100 },
  { key: 'totalQuantity', label: 'Cantidad', width: 80 },
  { key: 'expectedQty', label: 'Esperada', width: 80 },
  { key: 'discrepancy', label: 'Diferencia', width: 80 },
  { key: 'lastTimestamp', label: 'Último', width: 120 },
] as const;
