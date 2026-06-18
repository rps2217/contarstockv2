/**
 * Session Types - Tipos para sesiones de conteo
 */

// ============================================
// SESSION TYPES
// ============================================

export type SessionType = 'standard' | 'hammer' | 'reception';
export type SessionStatus = 'pending' | 'in_progress' | 'completed' | 'paused' | 'cancelled';

export interface SessionMetrics {
  totalScans: number;
  uniqueProducts: number;
  totalUnits: number;
  scannedAt: number[];
}

export interface SessionLocation {
  warehouse?: string;
  zone?: string;
  aisle?: string;
}

export interface LabelPhoto {
  base64: string;
  mimeType: string;
}

export interface CountingSession {
  id: string;
  erpOrder: string;
  logisticsLabel: string;
  sessionType: SessionType;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  
  // Contadores
  totalUnits: number;
  totalSKUs: number;
  
  // Ubicacion
  warehouse?: string;
  zone?: string;
  
  // Foto
  labelPhoto?: string;
  photoUrl?: string;
  
  // Metadatos
  metadata?: Record<string, unknown>;
  
  // Timestamps
  startedAt?: number;
  completedAt?: number;
  lastSyncTimestamp?: number;
  
  // Sync
  syncStatus?: 'synced' | 'pending' | 'error';
  
  // Metrics
  metrics?: SessionMetrics;
}

// ============================================
// SESSION FILTERS
// ============================================

export interface SessionFilters {
  search?: string;
  type?: SessionType;
  status?: SessionStatus;
  dateFrom?: number;
  dateTo?: number;
  syncStatus?: 'synced' | 'pending' | 'error';
}

export interface SessionSort {
  field: 'createdAt' | 'updatedAt' | 'totalUnits' | 'erpOrder';
  direction: 'asc' | 'desc';
}

// ============================================
// SESSION FORM
// ============================================

export interface CreateSessionForm {
  erpOrder: string;
  logisticsLabel: string;
  sessionType: SessionType;
  warehouse?: string;
  zone?: string;
}

export interface UpdateSessionForm {
  logisticsLabel?: string;
  status?: SessionStatus;
  warehouse?: string;
  zone?: string;
  labelPhoto?: string;
}
