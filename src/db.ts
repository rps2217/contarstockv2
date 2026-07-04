import { Dexie } from 'dexie';
import type { Table } from 'dexie';
import { Product, CountingSession, ScanRecord, ExpectedOrder, VisualGuide, ErpOrderSession, Provider, Customer, MessageTemplate } from './types';
import { DbMigrator } from './db/migrations/DbMigrator';

export interface SystemLog {
  id?: number;
  level: 'info' | 'warn' | 'error' | 'success';
  module: string;
  message: string;
  details?: any;
  timestamp: number;
}

export interface KVSettings {
  key: string;
  value: any;
}

export interface LocationEntry {
  id?: number;
  name: string;
  lastUsed: number;
}

export interface DynamicRecord {
  id: string;
  tableName: string;
  data: Record<string, any>;
  timestamp: number;
  syncStatus: 'synced' | 'pending' | 'error' | 'pending_delete';
  syncError?: string;
  retryCount?: number;
  nextRetry?: number;
}

export interface SyncLog {
  id?: number;
  timestamp: number;
  action: string;
  tableName: string;
  payload: any;
  response?: any;
  status: 'success' | 'error';
  errorMessage?: string;
}

// Audit Log - Registro de cambios para trazabilidad (estilo AppSheet)
export interface AuditLogEntry {
  id?: number;
  tableName: string;      // 'events', 'sessions', 'products', etc.
  recordId: string;      // ID del registro afectado
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  fieldName?: string;    // Campo específico modificado (opcional)
  oldValue?: string;     // Valor anterior (JSON stringified)
  newValue?: string;     // Valor nuevo (JSON stringified)
  userId?: string;       // ID del usuario
  deviceInfo?: string;   // Info del dispositivo
  timestamp: number;
  synced: boolean;        // Si ya fue sincronizado a la nube
  syncStatus?: 'synced' | 'pending' | 'error';  // Estado de sincronización
}

export interface ProductProvider {
  id?: number;
  productBarcode: string;
  providerRut: string;
  isPrimary: boolean;
  hasExchange?: boolean | null;
  withdrawalDays?: number | null;
  exchangePolicy?: string | null;
  mundo?: string;
  marca?: string;
  createdAt?: number;
  updatedAt?: number;
  syncStatus?: 'synced' | 'pending' | 'error';  // Estado de sincronización
}

// View Preferences - Para persistir preferencias de vista por módulo
export interface ViewPreferences {
  module: string;
  compactView: boolean;
  sortBy: 'date' | 'name' | 'status';
  sortOrder: 'asc' | 'desc';
  expandedPanels: Record<string, boolean>;
  lastUpdated: number;
}

// Bulk History - Registro de acciones masivas para undo/history
export interface BulkHistoryEntry {
  id: string;
  module: string;
  action: string;
  actionLabel: string;
  itemCount: number;
  itemIds: string[];
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  timestamp: number;
  undone: boolean;
  canUndo: boolean;
  undoTimeout: number;
}

export class LogiCountDB extends Dexie {
  products!: Table<Product>;
  sessions!: Table<CountingSession>;
  scans!: Table<ScanRecord>;
  expectedOrders!: Table<ExpectedOrder>;
  logs!: Table<SystemLog>;
  sync_logs!: Table<SyncLog>;
  settings!: Table<KVSettings>;
  locations!: Table<LocationEntry>;
  visualGuides!: Table<VisualGuide>;
  erpSessions!: Table<ErpOrderSession>;
  providers!: Table<Provider>;
  customers!: Table<Customer>;
  messageTemplates!: Table<MessageTemplate>;
  dynamic_data!: Table<DynamicRecord>;
  productProviders!: Table<ProductProvider>;
  blindScans!: Table<{
    id?: number;
    batchId: string;
    barcode: string;
    quantity: number;
    timestamp: number;
    location?: string;
  }>;
  blindManifests!: Table<{
    id?: number;
    batchId: string;
    barcode: string;
    name?: string;
    expectedQty: number;
    loc?: string;
  }>;
  syncQueue!: Table<{
    id?: number;
    tableName: string;
    operation: 'create' | 'update' | 'delete';
    recordId: string;
    data: Record<string, unknown>;
    timestamp: number;
    retries: number;
    lastError?: string;
    priority: 'high' | 'normal' | 'low';
  }>;
  audit_logs!: Table<AuditLogEntry>;
  viewPreferences!: Table<ViewPreferences>;
  bulkHistory!: Table<BulkHistoryEntry>;
  syncMetrics!: Table<{
    id?: number;
    timestamp: number;
    operation: string;
    tableName: string;
    duration: number;
    success: boolean;
    recordsAffected: number;
    error?: string;
    metadata?: Record<string, unknown>;
  }>;

  constructor() {
    super('LogiCountDB');
    DbMigrator.runMigrations(this);
  }
}

export const db = new LogiCountDB();
export const massiveDb = db; // Shortcut for transition

