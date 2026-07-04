/**
 * Global Hooks - Exports centralizados
 *
 * WARNING: Esta es una colección de hooks globales.
 * Para nuevos proyectos, preferir:
 *   - modules/{module}/hooks/ para hooks específicos de módulo
 *   - shared/hooks/ para hooks reutilizables
 */

// App lifecycle
export { useAppInit } from './useAppInit';
export { useAutoSession } from './useAutoSession';
export { useAutoLock } from './useAutoLock';

// Sync - Usar @/shared/hooks/useSync en su lugar
export { useAutoSync } from './useAutoSync';
export { useScheduledSync } from './useScheduledSync';
export { useRealtimeSync } from './useRealtimeSync';
export { useAudit } from './useAudit';

// ⚠️ DEPRECATED - No usar en código nuevo
// export { useGenericSync } from './useGenericSync'; // Usar useSync de @/shared/hooks
// export { useSyncQueue } from './useSyncQueue';    // Usar useSync de @/shared/hooks

// Network
export { useNetworkStatus } from './useNetworkStatus';

// Validation
export { useFormValidation } from './useFormValidation';

// Performance
export { useDebounce, useThrottle, useMediaQuery, useIntersectionObserver, useVirtualScroll } from './usePerformanceOptimizations';

// Module-specific
export { useExpiryWatcher } from './useExpiryWatcher';
export { useConflictResolution } from './useConflictResolution';

// Other
export { useGlobalSearch } from './useGlobalSearch';
export { useHIDScanner } from './useHIDScanner';
export { useDeepLink } from './useDeepLink';
export { useFeedbackSystem } from './useFeedbackSystem';
export { useCaptureSession } from './useCaptureSession';
export { useOpticalEngine } from './useOpticalEngine';
export { useScannerEngine } from './useScannerEngine';

// Bulk actions
export { useBulkActions } from './useBulkActions';
export { useBulkActionsAdvanced } from './useBulkActionsAdvanced';
