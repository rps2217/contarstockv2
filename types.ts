

export interface Product {
  barcode: string;      // Mapped from: CODIGO
  name: string;         // Mapped from: DESCRIPCION
  category: string;     // Mapped from: MUNDO
  supplier?: string;    // Mapped from: PROVEEDOR
  supplierRut?: string; // Mapped from: RUT PROVEEDOR
  price?: number;
  syncStatus?: 'synced' | 'add' | 'edit'; // Delta Sync Status
}

export interface CountingSession {
  id: string;
  erpOrder: string;
  logisticsLabel: string;
  createdAt: number;
  status: 'active' | 'completed' | 'draft'; // Added 'draft' for Reception Mode
  totalUnits?: number;
  totalSKUs?: number;
  lastSyncTimestamp?: number; // New: Tracks when this session was uploaded
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

export type ViewState = 'dashboard' | 'counting' | 'database' | 'reports' | 'settings' | 'consolidated' | 'conciliator' | 'reception';

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
  ttsEnabled: boolean; // NEW: Text to Speech enabled
  ttsMode: 'product' | 'count'; // NEW: Voice Mode (Read Name vs Count Streak)
  confirmDelete: boolean;
  appSheetConfig?: AppSheetConfig;
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

// --- CONCILIATOR / DETECTIVE TYPES ---

export interface ExpectedOrder {
  id: string;
  internalId: string; // The "Mystery Number" from the Excel
  items: { barcode: string; name: string; expectedQty: number }[];
  totalExpectedUnits: number;
  totalExpectedSKUs: number;
  importedAt: number;
}

export interface MatchResult {
  expectedOrder: ExpectedOrder;
  matchScore: number; // 0-100%
  status: 'exact' | 'partial' | 'mismatch';
  details: {
    barcode: string;
    name: string;
    physicalQty: number;
    expectedQty: number;
    difference: number; // physical - expected
  }[];
}

// --- FILE SYSTEM TYPES ---

export interface FileNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: FileNode[];
  content?: string;
  parent?: FileNode;
}
