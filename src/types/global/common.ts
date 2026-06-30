/**
 * Global Types - Tipos globales para toda la aplicación
 * 
 * Este archivo centraliza los tipos más comunes para evitar el uso de 'any'
 */

// Estado de sincronización
export type SyncStatus = 'pending' | 'synced' | 'error' | 'pending_delete';

// Tema de la aplicación
export type AppTheme = 'dark' | 'light' | 'high-contrast' | 'gray' | 'night';
export type Theme = AppTheme;

// Resultado genérico de operación
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// Tipo para datos con timestamp
export interface Timestamped {
  createdAt?: number;
  updatedAt?: number;
  timestamp?: number;
}

// Tipo para entidades sincronizables
export interface SyncedEntity extends Timestamped {
  id: string;
  syncStatus: SyncStatus;
  lastSyncTimestamp?: number;
}

// Tipo para respuestas de Supabase
export interface SupabaseResponse<T = any> {
  data: T | null;
  error: SupabaseError | null;
  count?: number;
}

export interface SupabaseError {
  message: string;
  status?: number;
  code?: string;
}

// Tipo para opciones de paginación
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

// Tipo para resultados paginados
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Tipo para configuraciones de tabla
export interface TableConfig {
  localTable: string;
  remoteTable: string;
  primaryKey: string;
  filterField?: string;
  filterValue?: string;
}

// Callbacks genéricos
export type VoidCallback = () => void;
export type AsyncCallback<T = void> = (...args: any[]) => Promise<T>;
export type EventCallback<T = any> = (event: T) => void;

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// Producto básico
export interface BasicProduct {
  barcode: string;
  name: string;
  sku?: string;
  category?: string;
  supplier?: string;
  price?: number;
}

// Scan básico
export interface BasicScan {
  id: string;
  barcode: string;
  scannedQty: number;
  locationId?: string;
  sessionId?: string;
  scannedBy?: string;
  expectedQty?: number;
}

// Session básica
export interface BasicSession {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  createdBy?: string;
  erpOrder?: string;
  totalScans?: number;
  totalQuantity?: number;
}
