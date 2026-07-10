/**
 * Sync Types - Tipos para el módulo de sincronización
 * 
 * Este archivo centraliza TODOS los tipos relacionados con sincronización.
 * Usa SyncStatus desde ./common.ts
 */

// Importar para usar localmente
import type { SyncStatus } from './common';

// Re-export para uso global
export type { SyncStatus };

// Resultado de sincronización
export interface SyncResult {
  success: boolean;
  pushRes?: PushResult;
  pullRes?: PullResult;
  error?: string;
}

export interface PushResult {
  success: number;
  failed: number;
  errors?: string[];
}

export interface PullResult {
  added: number;
  updated: number;
  skipped: number;
}

// Log de sincronización
export interface SyncLogEntry {
  table: string;
  status: 'syncing' | 'success' | 'error';
  msg: string;
  timestamp?: number;
}

// Item en cola de sincronización
export interface SyncQueueItem {
  id: string;
  key: string;
  localTable: string;
  remoteTable: string;
  primaryKey: string;
  status: SyncStatus;
  timestamp: number;
  displayName: string;
  rawData: Record<string, unknown>;
}

// Estadísticas de tabla
export interface TableStats {
  total: number;
  pending: number;
}

// Configuración de tabla para sync
export interface SyncTableConfig {
  localTable: string;
  remoteTable: string;
  primaryKey: string;
  filterField?: string;
  filterValue?: string;
}

// Incidente de sincronización
export interface SyncIncident {
  table: string;
  error: string;
  time?: number;
}

// Tipos de tab en el centro de sincronización
export type SyncTabType = 'queue' | 'tables' | 'incidents' | 'audit';

// Estado del store de sincronización
export interface SyncState {
  incidents: SyncIncident[];
  lastSyncTime: number | null;
  isSupabaseConnected: boolean;
  syncError: string | null;
  conflicts: number;
}
