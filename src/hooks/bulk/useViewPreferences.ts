/**
 * useViewPreferences - Hook para persistencia de preferencias de vista
 * 
 * Funcionalidades:
 * - Guardar/cargar preferencias en IndexedDB
 * - Vista compacta
 * - Ordenamiento por columna
 * - Paneles expandibles
 */

import { useState, useCallback, useEffect } from 'react'
import { logger } from '@/services/logger';
;
import { db } from '@/db';

export interface ViewPreferences {
  module: string;
  compactView: boolean;
  sortBy: 'date' | 'name' | 'status';
  sortOrder: 'asc' | 'desc';
  expandedPanels: Record<string, boolean>;
  lastUpdated: number;
}

const DEFAULT_PREFERENCES: Omit<ViewPreferences, 'module'> = {
  compactView: false,
  sortBy: 'date',
  sortOrder: 'desc',
  expandedPanels: {},
  lastUpdated: Date.now()
};

export interface UseViewPreferencesReturn {
  preferences: ViewPreferences;
  toggleCompactView: () => void;
  setSortBy: (sortBy: ViewPreferences['sortBy']) => void;
  toggleSortOrder: () => void;
  togglePanel: (panelId: string) => void;
  savePreferences: (updates: Partial<ViewPreferences>) => void;
  isPanelExpanded: (panelId: string) => boolean;
}

/**
 * Hook para gestionar preferencias de vista con persistencia
 */
export function useViewPreferences(module: string): UseViewPreferencesReturn {
  const [preferences, setPreferences] = useState<ViewPreferences>(() => ({
    ...DEFAULT_PREFERENCES,
    module
  }));

  // Cargar preferencias al iniciar
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const stored = await db.viewPreferences.get(module);
        if (stored) {
          setPreferences({
            ...DEFAULT_PREFERENCES,
            ...stored,
            lastUpdated: stored.lastUpdated || Date.now()
          });
        }
      } catch (e) {
        logger.error('useViewPreferences', 'Error loading preferences', e instanceof Error ? e.message : String(e));
      }
    };
    loadPreferences();
  }, [module]);

  // Guardar preferencias
  const savePreferences = useCallback(async (updates: Partial<ViewPreferences>) => {
    const newPrefs = {
      ...preferences,
      ...updates,
      module,
      lastUpdated: Date.now()
    };
    setPreferences(newPrefs);
    
    try {
      await db.viewPreferences.put(newPrefs);
    } catch (e) {
      logger.error('useViewPreferences', 'Error saving preferences', e instanceof Error ? e.message : String(e));
    }
  }, [preferences, module]);

  // Acciones de preferencias
  const toggleCompactView = useCallback(() => {
    savePreferences({ compactView: !preferences.compactView });
  }, [preferences.compactView, savePreferences]);

  const setSortBy = useCallback((sortBy: ViewPreferences['sortBy']) => {
    savePreferences({ sortBy });
  }, [savePreferences]);

  const toggleSortOrder = useCallback(() => {
    savePreferences({ sortOrder: preferences.sortOrder === 'asc' ? 'desc' : 'asc' });
  }, [preferences.sortOrder, savePreferences]);

  const togglePanel = useCallback((panelId: string) => {
    savePreferences({
      expandedPanels: {
        ...preferences.expandedPanels,
        [panelId]: !preferences.expandedPanels[panelId]
      }
    });
  }, [preferences.expandedPanels, savePreferences]);

  return {
    preferences,
    toggleCompactView,
    setSortBy,
    toggleSortOrder,
    togglePanel,
    savePreferences,
    isPanelExpanded: (panelId: string) => preferences.expandedPanels[panelId] ?? true
  };
}

export default useViewPreferences;
