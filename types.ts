
export interface Product {
  barcode: string;
  name: string;
  category: string;
  supplier?: string;
  supplierRut?: string;
  price?: number;
  syncStatus?: 'synced' | 'add' | 'edit';
}

export interface ExpectedItem {
  barcode: string;
  name: string;
  expectedQty: number;
}

export interface CountingSession {
  id: string;
  erpOrder: string;
  logisticsLabel: string;
  createdAt: number;
  status: 'active' | 'completed' | 'draft';
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
  timestamp: number;
  quantity: number;
  mm?: number;
  yyyy?: number;
  synced?: number;
  isIncident?: boolean;
}

export interface ConsolidatedItem {
  barcode: string;
  productName: string;
  totalQuantity: number;
  scans: number;
  mm?: number;
  yyyy?: number;
  isIncident?: boolean;
}

export type ViewState = 'dashboard' | 'counting' | 'database' | 'reports' | 'settings' | 'consolidated' | 'conciliator' | 'reception' | 'sync';

export type Theme = 'light' | 'dark' | 'contrast' | 'warm' | 'navy' | 'oled';

// Fase 1: Estados del Escáner
export type ScannerStatus = 'idle' | 'manual' | 'camera' | 'expiring' | 'confirming' | 'error' | 'success' | 'product_form';

export interface AppSheetConfig {
  appId: string;
  accessKey: string;
  countsTableName: string;
  productsTableName: string;
  receptionTableName?: string;
}

export interface AppSettings {
  theme: Theme;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  ttsEnabled: boolean; 
  ttsMode: 'product' | 'count'; 
  speedometerEnabled: boolean; 
  controlTowerEnabled: boolean; 
  confirmDelete: boolean;
  autoRegisterUnknown: boolean; 
  lowPerformanceMode: boolean;
  appSheetConfig?: AppSheetConfig;
  mobileNavConfig?: ViewState[]; 
}

export interface SyncJob {
  id?: number;
  session: CountingSession;
  items: ConsolidatedItem[];
  createdAt: number;
  status: 'pending' | 'failed';
  retryCount: number;
  lastError?: string;
}

export interface ExpectedOrder {
  id: string;
  internalId: string; 
  items: { barcode: string; name: string; expectedQty: number }[];
  totalExpectedUnits: number;
  totalExpectedSKUs: number;
  importedAt: number;
}

export interface AliasSuggestion {
    physicalBarcode: string;
    physicalName: string;
    expectedBarcode: string;
    expectedName: string;
    quantity: number;
}

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

export interface FileNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: FileNode[];
  content?: string;
  parent?: FileNode;
}
