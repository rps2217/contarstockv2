/**
 * Counting Components v2 - Exports
 *
 * Componentes refactorizados siguiendo la arquitectura Lego.
 */

// Header & Grid
export { CountingHeader } from './CountingHeader';
export { CountingEmptyState } from './CountingEmptyState';
export { CountingItemRow, CountingItemRowCompact, type CountedItem } from './CountingItemRow';
export { CountingGrid, QuickAdd } from './CountingGrid';

// Modales
export { CountingOptionsModal, CountingOptionsModalLegacy } from './CountingOptionsModal';
export { CountingFinishModal, CountingFinishModalLegacy } from './CountingFinishModal';

// Nuevos componentes
export { CountingMetricsBar, CountingMetricsCompact } from './CountingMetricsBar';
export { DiscrepancyReport } from './DiscrepancyReport';
export { CountingHistory, type CountingHistoryItem } from './CountingHistory';
