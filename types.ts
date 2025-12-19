
export interface Product {
  barcode: string;      // Mapped from: CODIGO
  name: string;         // Mapped from: DESCRIPCION
  category: string;     // Mapped from: MUNDO
  supplier?: string;    // Mapped from: PROVEEDOR
  supplierRut?: string; // Mapped from: RUT PROVEEDOR
  price?: number;
  syncStatus?: 'synced' | 'add' | 'edit'; // Delta Sync Status
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
  
  // Guided Mode / Reception Verified
  isVerifiedMode?: boolean;
  expectedItems?: ExpectedItem[];

  // Audit / Detective Fields
  auditStatus?: 'verified' | 'warning' | 'failed' | 'pending';
  auditScore?: number; // 0-100
  auditTimestamp?: number;
}

export interface ScanRecord {
  id: string;
  sessionId: string;
  barcode: string;
  timestamp: number;
  quantity: number;
  mm?: number;   // Expiration Month
  yyyy?: number; // Expiration Year
  synced?: number; // 0 = Pending, 1 = Synced (New for Delta Sync)
  isIncident?: boolean; // New: Marks if item has FRC (Fecha/Rotura/Caducidad)
}

export interface ConsolidatedItem {
  barcode: string;
  productName: string;
  totalQuantity: number;
  scans: number;
  mm?: number;
  yyyy?: number;
  isIncident?: boolean; // Aggregate flag
}

export type ViewState = 'dashboard' | 'counting' | 'database' | 'reports' | 'settings' | 'consolidated' | 'conciliator' | 'reception' | 'sync';

export type Theme = 'light' | 'dark' | 'contrast' | 'warm' | 'navy';

export interface AppSheetConfig {
  appId: string;
  accessKey: string;
  countsTableName: string;   // Table for Transactional Data (Counts)
  productsTableName: string; // Table for Master Data (Products)
  receptionTableName?: string; // New: Table for Reception Logs
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
  lowPerformanceMode: boolean; // NEW: High efficiency mode for low-end devices
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
