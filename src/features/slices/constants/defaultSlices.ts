/**
 * Default slices pre-configurados para el sistema
 */

import { AppSheetSlice } from '../types/Slice';

export const DEFAULT_SLICES: AppSheetSlice[] = [
  {
    id: 'sys-scans-error',
    name: 'Escaneos con Error de Servidor',
    description: 'Vistas de capturas de inventario locales retenidas por fallas o conflictos pendientes de forzar.',
    sourceTable: 'scans',
    filterField: 'syncStatus',
    filterOperator: 'equals',
    filterValue: 'error',
    selectedColumns: ['id', 'barcode', 'scannedQty', 'syncStatus', 'timestamp'],
    allowEdits: true,
    allowDeletes: true,
    isSystem: true
  },
  {
    id: 'sys-sessions-active',
    name: 'Sesiones de Inventario en Curso',
    description: 'Revisión ágil de las auditorías actualmente abiertas y operativas en los andenes o estanterías.',
    sourceTable: 'sessions',
    filterField: 'status',
    filterOperator: 'equals',
    filterValue: 'active',
    selectedColumns: ['id', 'name', 'status', 'createdBy', 'createdAt'],
    allowEdits: true,
    allowDeletes: false,
    isSystem: true
  },
  {
    id: 'sys-products-offline',
    name: 'Artículos Creados en Offline',
    description: 'Nuevos productos configurados de forma local que aún no han sido replicados al catálogo maestro.',
    sourceTable: 'products',
    filterField: 'syncStatus',
    filterOperator: 'equals',
    filterValue: 'pending',
    selectedColumns: ['barcode', 'name', 'sku', 'category', 'syncStatus'],
    allowEdits: true,
    allowDeletes: true,
    isSystem: true
  },
  {
    id: 'sys-vencimiento-alerta',
    name: 'Lotes Próximos a Vencer',
    description: 'Esquema de lotes y fechas de caducidad en alerta roja registrados en la tabla dinámica.',
    sourceTable: 'dynamic_data',
    filterField: 'tableName',
    filterOperator: 'equals',
    filterValue: 'expiry',
    selectedColumns: ['id', 'syncStatus', 'timestamp'],
    allowEdits: false,
    allowDeletes: true,
    isSystem: true
  }
];

// Campos disponibles por tabla
export const TABLE_FIELDS: Record<string, string[]> = {
  scans: ['id', 'barcode', 'name', 'scannedQty', 'syncStatus', 'timestamp', 'location', 'sessionId'],
  products: ['barcode', 'name', 'sku', 'category', 'supplier', 'price', 'syncStatus', 'createdAt'],
  sessions: ['id', 'name', 'erpOrder', 'status', 'createdBy', 'createdAt', 'completedAt', 'syncStatus'],
  providers: ['id', 'name', 'rut', 'syncStatus', 'createdAt'],
  customers: ['id', 'name', 'rut', 'phone', 'syncStatus', 'createdAt'],
  dynamic_data: ['id', 'barcode', 'name', 'tableName', 'syncStatus', 'timestamp', 'eventType'],
};

export const SLICE_STORAGE_KEY = 'logicount_appsheet_slices';
