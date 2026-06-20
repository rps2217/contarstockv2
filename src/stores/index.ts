/**
 * Domain Stores - Exportaciones centralizadas
 * 
 * Usa este archivo para importar stores en lugar de rutas relativas.
 * 
 * @example
 * import { useSyncStore, useToastStore } from '@/stores';
 */

// App Stores (en ../store/)
export { useSyncStore } from '../store/useSyncStore';
export { useToastStore, type ToastType } from '../store/useToastStore';
export { useTaskStore } from '../store/useTaskStore';
export { useExpiryStore, type ExpiryItem, type ExpiryStatus, type ExpiryPreferences } from '../store/useExpiryStore';
export { useAppStore } from '../store/mainAppStore';

// Feature Stores
export { useUIStore, selectActiveView, selectIsSidebarOpen, selectGlobalSearch } from '../features/app/store';
export { useSettingsStore } from '../features/settings/store';

// Selectors
