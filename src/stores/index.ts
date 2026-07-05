/**
 * Domain Stores - Exportaciones centralizadas
 * 
 * Usa este archivo para importar stores en lugar de rutas relativas.
 * 
 * @example
 * import { useSyncStore, useToastStore } from '@/stores';
 */

// App Core Stores
export { useSyncStore } from '@/store/useSyncStore';
export { useToastStore, type ToastType } from '@/store/useToastStore';
export { useTaskStore } from '@/store/useTaskStore';
export { useExpiryStore, type ExpiryItem, type ExpiryStatus, type ExpiryPreferences } from '@/store/useExpiryStore';
export { useAppStore } from '@/store/mainAppStore';

// Feature Stores
export { useUIStore, selectActiveView, selectIsSidebarOpen, selectGlobalSearch } from '@/features/app/store';
export { useSettingsStore } from '@/features/settings/store';

// Arquitectura Stores (Sistema)
export { usePermissionStore, type Permission, type UserRole, type Role, ROLE_LABELS } from '@/store/usePermissionStore';
export { useConflictStore, type ConflictRecord, type ConflictResolution } from '@/store/useConflictStore';
export { useAuditStore, type AuditLog, type AuditAction, type AuditSeverity, auditCreate, auditUpdate, auditDelete, auditError, auditSync } from '@/store/useAuditStore';
export { useUndoRedoStore, type UndoableAction, type ActionType, useUndoRedo, createProductAction, createInventoryAction, createScanAction } from '@/store/useUndoRedoStore';
