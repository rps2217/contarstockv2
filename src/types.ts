
export interface Provider {
  id?: string;
  rut: string;
  name: string;
  businessName?: string;
  phone?: string;
  email?: string;
  address?: string;
  deliveryTime?: number;
  exchangePolicy?: string;
  withdrawalDays?: number;
  hasExchange?: boolean;
  createdAt?: number;
  updatedAt?: number;
  syncStatus?: 'synced' | 'pending' | 'error' | 'pending_delete';
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: number;
  updatedAt: number;
  syncStatus?: 'synced' | 'pending' | 'error' | 'pending_delete';
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  syncStatus?: 'synced' | 'pending' | 'error' | 'pending_delete';
}

export interface Product {
  id?: string;
  barcode: string;
  name: string;
  category: string;
  supplier?: string;
  supplierRut?: string;
  price?: number;
  sku?: string;
  productType?: string;
  minStock?: number;
  stock?: number;
  withdrawalDays?: number;
  createdAt?: number;
  updatedAt?: number;
  syncStatus?: 'synced' | 'pending' | 'error' | 'pending_delete';
  unitsPerBox?: number;
  embedding?: number[]; 
  location?: string;
}

export interface ExpectedItem {
 barcode: string;
 name: string;
 expectedQty: number;
 quantity?: number;
 batch?: string;
 expiry?: string;
 embedding?: number[]; 
  location?: string;
}

export interface ExpectedOrder {
 id: string;
 internalId: string;
 items: ExpectedItem[];
 totalExpectedUnits: number;
 totalExpectedSKUs: number;
 importedAt: number;
 metadata?: {
   documentType?: string;
   date?: string;
   purchaseOrder?: string;
   orderNote?: string;
   internalGuide?: string;
 };
 /** @deprecated Used internally to track sync status */
 _syncedFromCloud?: boolean;
}

export interface AliasSuggestion {
 physicalBarcode: string;
 physicalName: string;
 expectedBarcode: string;
 expectedName: string;
 quantity: number;
 confidence: number; 
}

export interface MatchResult {
 expectedOrder: ExpectedOrder;
 matchScore: number;
 semanticAffinities: number; 
 status: 'exact' | 'partial' | 'mismatch';
 details: {
 barcode: string;
 name: string;
 physicalQty: number;
 expectedQty: number;
 difference: number;
 isSemanticMatch?: boolean;
 }[];
 potentialAliases: AliasSuggestion[];
}

export interface CountingSession {
 id: string;
 erpOrder: string;
 logisticsLabel: string;
 createdAt: number;
 status: 'active' | 'completed' | 'draft';
 sessionType: 'standard' | 'hammer' | 'reception'; 
 operatorId?: string;
 totalUnits?: number;
 totalSKUs?: number;
 lastSyncTimestamp?: number;
 isVerifiedMode?: boolean;
 expectedItems?: ExpectedItem[];
 auditStatus?: 'verified' | 'warning' | 'failed' | 'pending';
 auditScore?: number;
 auditTimestamp?: number;
 mm?: number;
 yyyy?: number;
 batch?: string;
 labelPhoto?: string;
 photoUrl?: string;
 isAutoLockEnabled?: boolean;
 syncStatus?: 'synced' | 'pending' | 'error' | 'pending_delete';
}

export interface ScanRecord {
 id: string;
 sessionId: string;
 barcode: string;
 batch?: string; 
 expiryDate?: string; 
 timestamp: number;
 quantity: number;
 logisticsLabel?: string;
 expectedQty?: number;
 location?: string;
 operatorId?: string; 
 mm?: number;
 yyyy?: number;
 synced?: number;
 isIncident?: boolean;
 frc?: string;
 syncStatus?: 'synced' | 'pending' | 'error' | 'pending_delete';
}

export interface ConsolidatedItem {
 barcode: string;
 productName: string;
 batch?: string; 
 expiryDate?: string; 
 totalQuantity: number;
 expectedQuantity?: number;
 difference?: number;
 scans: number;
 location?: string;
 mm?: number;
 yyyy?: number;
 isIncident?: boolean;
 frc?: string;
 embedding?: number[];
}

export type ViewState = 'dashboard' | 'counting' | 'database' | 'reports' | 'settings' | 'reception' | 'sync' | 'massive' | 'documents' | 'visual-picking' | 'expiry' | 'events' | 'providers' | 'customers' | 'compliance';
// ThemeName (re-exportado desde useTheme)
export type ThemeName = 'light' | 'dark' | 'high-contrast' | 'appsheet-dark';
export type Theme = ThemeName;

export interface VisualGuideItem {
  barcode: string;
  name: string;
  expectedQty: number;
  pickedQty: number;
  status: 'pending' | 'partial' | 'completed' | 'error';
}

export interface VisualGuide {
  id: string;
  guideNumber: string;
  erpOrderId: string;
  photoUrl?: string;
  items: VisualGuideItem[];
  createdAt: number;
  completedAt?: number;
  status: 'draft' | 'active' | 'completed';
  operatorId?: string;
}

export interface ErpOrderSession {
  id: string;
  erpOrderId: string;
  guides: VisualGuide[];
  status: 'active' | 'completed';
  createdAt: number;
}
// ScannerStatus mapeado a estados visuales UI
export type ScannerStatus = 'idle' | 'manual' | 'busy' | 'awaiting_pharma' | 'confirming' | 'error' | 'success';

export type TelemetryEventType = 'SCAN' | 'SYNC' | 'ERROR' | 'PERFORMANCE' | 'HARDWARE' | 'SESSION';

export interface TelemetryEvent {
  id: string;
  timestamp: number;
  type: TelemetryEventType;
  action: string;
  duration?: number;
  metadata?: Record<string, any>;
  operatorId?: string;
  batchId?: string;
  deviceInfo?: string;
}

export interface ModuleConfig {
  enabled: boolean;
  name: string;
  description?: string;
  icon?: string;
}

export interface AppSettings {
  theme: ThemeName;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  ttsEnabled: boolean; 
  batchTrackingEnabled: boolean;
  lowEndMode?: boolean;
  pharmacyName?: string;
  operatorId?: string;
  autoLockTimeout?: number; // en milisegundos
  withdrawalDaysDefault?: number; // Días por defecto si no hay proveedor
  cloudConfig?: CloudConfig;
  schema?: AppSchema;
  modules?: Record<string, ModuleConfig>; 
  mobileNavConfig?: ViewState[]; 
  defaultStartModule?: ViewState;
  captureSettings?: {
    cameraMirrorMode: boolean;
    keypadVibration: boolean;
    scannerSpeed: 'fast' | 'normal' | 'slow';
    scannerDelay: number;
  };
  thermalPrinter?: {
    enabled: boolean;
    type: 'usb' | 'bluetooth' | 'network';
    deviceName?: string;
    paperWidth?: number; // 58, 80, etc.
    margin?: number;
  };
}

export interface ExpiryMapping {
  id?: string;
  uniqueKey?: string;
  barcode: string;
  name?: string;
  productName: string;
  quantity: string;
  event: string;
  mm: string;
  yyyy: string;
  location: string;
  supplier?: string;
  supplierRut?: string;
  frc: string;
  erp: string;
  traspaso: string;
  destino: string;
  nguia?: string;
  observaciones: string;
  isAdjusted: string;
  batch?: string;
  timestamp?: string;
  fechaCC?: string;
}

export interface ProductMapping {
  id?: string;
  barcode: string;
  name: string;
  category: string;
  supplier?: string;
  supplierRut?: string;
  price?: string;
  unitsPerBox?: string;
}

export interface CountMapping {
  id?: string;
  uniqueKey?: string;
  barcode: string;
  quantity: string;
  timestamp: string;
  operatorId?: string;
  location?: string;
  batch?: string;
  expiry?: string;
}

export type ColumnDataType = 'string' | 'number' | 'date' | 'barcode' | 'boolean' | 'enum' | 'email' | 'url' | 'image' | 'timestamp';
export type ColumnRenderType = 'default' | 'grid' | 'list' | 'segmented';

// =============================================================================
// SYNC TYPES - Tipos centralizados para sincronización
// =============================================================================

export enum SyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  ERROR = 'error',
  PENDING_DELETE = 'pending_delete',
  CONFLICT = 'conflict',
}

export type UploadGroupType = 'inventory' | 'reception' | 'products' | 'orphans' | 'dynamic';

export interface UploadGroup {
  erpOrder: string;
  sessionCount: number;
  totalUnits: number;
  sessionIds: string[];
  logisticsLabels: string[];
  type: UploadGroupType;
  isHammer: boolean;
  tableName?: string;
}

export interface SyncResult {
  success: boolean;
  uploaded: number;
  failed: number;
  errors: string[];
  timestamp: number;
}

export interface SyncSummary {
  totalGroups: number;
  totalUploaded: number;
  totalFailed: number;
  duration: number;
  results: SyncResult[];
}

export interface TableSyncState {
  tableName: string;
  lastSyncTime: number | null;
  pendingCount: number;
  status: SyncStatus;
}

export interface SyncConflict {
  id: string;
  tableName: string;
  localData: Record<string, unknown>;
  remoteData: Record<string, unknown>;
  conflictType: 'version' | 'deleted' | 'modified';
  detectedAt: number;
}

// Helper functions for sync types
export const isSyncError = (status: SyncStatus): boolean => {
  return status === SyncStatus.ERROR || status === SyncStatus.PENDING_DELETE;
};

export const needsSync = (status: SyncStatus): boolean => {
  return status === SyncStatus.PENDING || status === SyncStatus.ERROR || status === SyncStatus.PENDING_DELETE;
};

export interface ColumnSchema {
  col: string;
  label: string;
  type: ColumnDataType;
  renderType?: ColumnRenderType;
  required?: boolean;
  editable?: boolean;
  visible?: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: string;
  placeholder?: string;
  hint?: string;
}

export interface TableSchema {
  tableName: string;
  columns: Record<string, ColumnSchema>;
}

export interface AppSchema {
  expiry: TableSchema;
  products: TableSchema;
  counts: TableSchema;
  events?: TableSchema;
  providers?: TableSchema;
}

export type CloudConfig = CloudStorageConfig;

export interface CloudStorageConfig {
  countsTableName: string;
  consolidatedTableName: string;
  inventoryRegistryTableName?: string;
  expiryTableName?: string;
  productsTableName: string;
  receptionTableName?: string;
  ordersTableName?: string; 
  providersTableName?: string;
  eventsTableName?: string;
  sessionsTableName?: string;
  columnMapping?: ExpiryMapping; // Keep for backward compatibility
  mappings?: {
    expiry: ExpiryMapping;
    products: ProductMapping;
    counts: CountMapping;
    events?: ExpiryMapping; 
  };
  schema?: AppSchema; // New dynamic schema
}

export interface BlindScan {
  id?: number;
  batchId: string;
  barcode: string;
  quantity: number;
  timestamp: number;
  location?: string;
}

export interface BlindManifest {
  id?: number;
  batchId: string;
  barcode: string;
  name?: string;
  expectedQty: number;
  loc?: string;
}

