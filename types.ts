
export interface Product {
  barcode: string;
  name: string;
  category: string;
  supplier?: string;
  supplierRut?: string;
  price?: number;
  syncStatus?: 'synced' | 'add' | 'edit';
  unitsPerBox?: number;
}

export interface ExpectedItem {
  barcode: string;
  name: string;
  expectedQty: number;
}

export interface ExpectedOrder {
  id: string;
  internalId: string;
  items: ExpectedItem[];
  totalExpectedUnits: number;
  totalExpectedSKUs: number;
  importedAt: number;
}

export interface CountingSession {
  id: string;
  erpOrder: string;
  logisticsLabel: string;
  createdAt: number;
  status: 'active' | 'completed' | 'draft';
  sessionType: 'standard' | 'hammer'; 
  totalUnits?: number;
  totalSKUs?: number;
  lastSyncTimestamp?: number;
  isVerifiedMode?: boolean;
  expectedItems?: ExpectedItem[];
  auditStatus?: 'verified' | 'warning' | 'failed' | 'pending';
  auditScore?: number;
  auditTimestamp?: number;
}

export interface ScanRecord {
  id: string;
  sessionId: string;
  barcode: string;
  batch?: string; // CAMPO CRÍTICO: Lote del medicamento
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
}

export interface ConsolidatedItem {
  barcode: string;
  productName: string;
  batch?: string; // Lote consolidado
  totalQuantity: number;
  expectedQuantity?: number;
  difference?: number;
  scans: number;
  location?: string;
  mm?: number;
  yyyy?: number;
  isIncident?: boolean;
}

export type ViewState = 'dashboard' | 'counting' | 'database' | 'reports' | 'settings' | 'consolidated' | 'reception' | 'sync' | 'conciliator';

export type Theme = 'light' | 'dark' | 'contrast' | 'warm' | 'navy' | 'oled';

export type ScannerStatus = 'idle' | 'manual' | 'camera' | 'expiring' | 'confirming' | 'error' | 'success' | 'product_form';

export interface AppSheetConfig {
  appId: string;
  accessKey: string;
  countsTableName: string;
  consolidatedTableName: string;
  productsTableName: string;
  receptionTableName?: string;
  ordersTableName?: string; 
  gasWebAppUrl?: string; 
}

export interface AppSettings {
  theme: Theme;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  ttsEnabled: boolean; 
  ttsMode: 'product' | 'count'; 
  speedometerEnabled: boolean; 
  confirmDelete: boolean;
  autoRegisterUnknown: boolean; 
  lowPerformanceMode: boolean;
  predictiveHintsEnabled: boolean; 
  continuousMode: boolean;        
  appSheetConfig?: AppSheetConfig;
  mobileNavConfig?: ViewState[]; 
}

// Added AliasSuggestion interface
export interface AliasSuggestion {
  physicalBarcode: string;
  physicalName: string;
  expectedBarcode: string;
  expectedName: string;
  quantity: number;
}

// Updated MatchResult to use AliasSuggestion
export interface MatchResult {
  expectedOrder: ExpectedOrder;
  matchScore: number;
  status: 'exact' | 'partial' | 'mismatch';
  details: {
    barcode: string;
    name: string;
    physicalQty: number;
    expectedQty: number;
    difference: number;
  }[];
  potentialAliases: AliasSuggestion[];
}

// Added SyncJob interface for database queue
export interface SyncJob {
  id?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  retryCount: number;
  sessionId?: string;
  payload?: any;
}
