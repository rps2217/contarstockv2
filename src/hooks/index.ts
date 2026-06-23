/**
 * Global Hooks - Exports centralizados
 *
 * WARNING: Esta es una colección de hooks globales.
 * Para nuevos proyectos, preferir:
 *   - modules/{module}/hooks/ para hooks específicos de módulo
 *   - shared/hooks/ para hooks reutilizables
 *
 * Hooks que deberían migrar:
 *   - useAudit → modules/sync/hooks/
 *   - useGenericSync → infrastructure/sync/hooks/
 *   - useExpiryWatcher → modules/expiry/hooks/
 *   - useConflictResolution → infrastructure/sync/hooks/
 */

// App lifecycle
export { useAppInit } from './useAppInit';
export { useAutoSession } from './useAutoSession';
export { useAutoLock } from './useAutoLock';

// Sync
export { useAutoSync } from './useAutoSync';
export { useGenericSync } from './useGenericSync';
export { useSyncQueue } from './useSyncQueue';
export { useScheduledSync } from './useScheduledSync';
export { useRealtimeSync } from './useRealtimeSync';
export { useAudit } from './useAudit';

// Network
export { useNetworkStatus } from './useNetworkStatus';

// Validation
export { useFormValidation } from './useFormValidation';

// Performance
export { useDebounce, useThrottle, useMediaQuery, useIntersectionObserver, useVirtualScroll } from './usePerformanceOptimizations';

// Module-specific (consider moving to module hooks/)
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
