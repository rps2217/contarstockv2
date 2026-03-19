
export interface Product {
 barcode: string;
 name: string;
 category: string;
 supplier?: string;
 supplierRut?: string;
 price?: number;
 syncStatus?: 'synced' | 'add' | 'edit';
 unitsPerBox?: number;
 embedding?: number[]; 
}

export interface ExpectedItem {
 barcode: string;
 name: string;
 expectedQty: number;
 embedding?: number[]; 
}

export interface ExpectedOrder {
 id: string;
 internalId: string;
 items: ExpectedItem[];
 totalExpectedUnits: number;
 totalExpectedSKUs: number;
 importedAt: number;
}

export interface SyncJob {
 id?: number;
 status: 'pending' | 'processing' | 'failed' | 'completed';
 createdAt: number;
 retryCount: number;
 data?: any;
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
 sessionType: 'standard' | 'hammer'; 
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
 embedding?: number[];
}

export type ViewState = 'dashboard' | 'counting' | 'database' | 'reports' | 'settings' | 'reception' | 'sync' | 'massive' | 'documents' | 'visual-picking' | 'expiry';
export type Theme = 'light' | 'dark' | 'contrast' | 'warm' | 'navy' | 'oled';

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
export type ScannerStatus = 'idle' | 'manual' | 'busy' | 'expiring' | 'confirming' | 'error' | 'success';

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
 batchTrackingEnabled: boolean;
 appSheetConfig?: AppSheetConfig;
 mobileNavConfig?: ViewState[]; 
 thermalPrinter?: {
 enabled: boolean;
 type: 'usb' | 'bluetooth';
 deviceName?: string;
 };
}

export interface AppSheetConfig {
 appId: string;
 accessKey: string;
 countsTableName: string;
 consolidatedTableName: string;
 productsTableName: string;
 receptionTableName?: string;
 ordersTableName?: string; 
 gasWebAppUrl?: string; 
 spreadsheetId?: string;
}
