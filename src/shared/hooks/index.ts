/**
 * Shared Hooks - Índice de hooks compartidos
 * 
 * Hooks de productividad:
 * - useProductivity: Métricas de productividad en tiempo real
 * - useTurboMode: Modo turbo de conteo rápido
 * 
 * Hooks de sincronización:
 * - useSync: Hook unificado de sincronización
 */

export * from './useTheme';
export * from './useCloudCache';
export * from './useAsyncState';
export * from './useSoftDelete';
export * from './usePaginatedQuery';

// Productividad y conteo
export { useProductivity } from './useProductivity';
export type { ProductivityStats } from './useProductivity';

export { useTurboMode } from './useTurboMode';
export type { TurboState, UseTurboModeReturn } from './useTurboMode';

// Sincronización unificada
export { useSync, useAutoSyncLegacy, useManualSync, useScheduledSyncLegacy } from './useSync';
export type { UseSyncOptions, UseSyncReturn, SyncMode } from './useSync';

// Exportación de datos
export { useExport } from './useExport';
export type { ExportFormat, ExportColumn, UseExportOptions, UseExportReturn } from './useExport';
