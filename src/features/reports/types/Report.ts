/**
 * Tipos para el módulo de Reports
 */

// Tipos de sesión
export type SessionType = 'all' | 'standard' | 'hammer' | 'reception';

// Tipo para filtros de reportes
export interface ReportFilters {
  searchQuery: string;
  filterType: SessionType;
  dateRange?: { start: string | null; end: string | null };
}

// Tipo para métricas de consolidación
export interface ConsolidationMetrics {
  totalItems: number;
  totalQuantity: number;
  uniqueProducts: number;
  discrepancies: number;
  avgQuantityPerItem: number;
}

// Tipo para datos de sesión
export interface SessionData {
  id: string;
  erpOrder: string;
  logisticsLabel: string;
  createdAt: number;
  status: 'active' | 'completed' | 'draft';
  sessionType: 'standard' | 'hammer' | 'reception';
  totalUnits: number;
  totalSKUs: number;
  photoUrl?: string;
  lastSyncTimestamp?: number;
}

// Tipo para item de consolidación en vivo
export interface LiveConsolidatedItem {
  id: string;
  barcode: string;
  name: string;
  supplier: string;
  location: string;
  totalQuantity: number;
  expectedQty?: number;
  discrepancy: number;
  lastTimestamp: number;
  sessions: string[];
  batch?: string;
  mm?: number;
  yyyy?: number;
}

// Estado del store de reportes
export interface ReportsState {
  sessions: SessionData[];
  liveConsolidated: LiveConsolidatedItem[];
  filters: ReportFilters;
  isLoading: boolean;
  isPulling: boolean;
  selectedSessionId: string | null;
}

// Acciones del store de reportes
export interface ReportsActions {
  pullCloudData: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFilterType: (type: SessionType) => void;
  setSelectedSession: (id: string | null) => void;
  deleteSession: (id: string) => Promise<void>;
  refreshLiveData: () => Promise<void>;
}
