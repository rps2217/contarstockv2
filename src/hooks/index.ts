/**
 * Global Hooks - Exports centralizados
 *
 * WARNING: Esta es una colección de hooks globales.
 * Para nuevos proyectos, preferir:
 *   - features/{feature}/hooks/ para hooks específicos de módulo
 *   - shared/hooks/ para hooks reutilizables
 * 
 * Los hooks han sido reorganizados siguiendo la Arquitectura Lego:
 *   - features/sync/hooks/ - Hooks de sincronización y auditoría
 *   - features/expiry/hooks/ - Hooks de vencimiento
 *   - shared/hooks/ - Hooks compartidos reutilizables
 */

// ============================================================================
// App lifecycle
// ============================================================================
export { useAppInit } from './useAppInit';
export { useAutoSession } from './useAutoSession';
export { useAutoLock } from './useAutoLock';

// ============================================================================
// Sync (re-export desde features/sync/hooks/)
// ============================================================================
// Los hooks de sync están ahora en @/features/sync/hooks/
// Para compatibilidad, re-exportamos desde aquí
export { useAudit } from '@/features/sync/hooks';
export type { CreateAuditEntry, UseAuditReturn } from '@/features/sync/hooks/useAudit';
export { auditService } from '@/features/sync/hooks/useAudit';

// ⚠️ DEPRECATED hooks - No usar en código nuevo
// export { useGenericSync } from './useGenericSync'; 
// export { useSyncQueue } from './useSyncQueue';   

// ============================================================================
// Expiry (re-export desde features/expiry/hooks/)
// ============================================================================
export { useExpiryWatcher } from '@/features/expiry/hooks';

// ============================================================================
// Shared hooks (re-export desde shared/hooks/)
// ============================================================================
// Hooks de productividad y turbo mode
export { useProductivity, useTurboMode } from '@/shared/hooks';

// ============================================================================
// Network
// ============================================================================
export { useNetworkStatus } from './useNetworkStatus';

// ============================================================================
// Validation
// ============================================================================
export { useFormValidation } from './useFormValidation';

// ============================================================================
// Performance
// ============================================================================
export { 
  useDebounce, 
  useThrottle, 
  useMediaQuery, 
  useIntersectionObserver, 
  useVirtualScroll 
} from './usePerformanceOptimizations';

// ============================================================================
// Conflict Resolution (mover a services/sync/)
// ============================================================================
export { useConflictResolution } from './useConflictResolution';

// ============================================================================
// Scanner
// ============================================================================
export { useHIDScanner } from './useHIDScanner';
export { useOpticalEngine } from './useOpticalEngine';
export { useScannerEngine } from './useScannerEngine';

// ============================================================================
// Other
// ============================================================================
export { useGlobalSearch } from './useGlobalSearch';
export { useDeepLink } from './useDeepLink';
export { useFeedbackSystem } from './useFeedbackSystem';
export { useCaptureSession } from './useCaptureSession';
export { useAutoSync } from './useAutoSync';
export { useScheduledSync } from './useScheduledSync';
export { useRealtimeSync } from './useRealtimeSync';

// ============================================================================
// Bulk actions
// ============================================================================
export { useBulkActions } from './useBulkActions';
export { useBulkActionsAdvanced } from './useBulkActionsAdvanced';
