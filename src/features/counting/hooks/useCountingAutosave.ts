/**
 * useCountingAutosave - Hook para persistencia automática
 *
 * Responsabilidad:
 * - Auto-save cada 30 segundos
 * - Recovery de sesiones anteriores
 * - Beforeunload handler
 * - Cleanup al desmontar
 *
 * Parte del plan de refactor del orquestador.
 * @see REFACTOR_ORCHESTRATOR.md
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import type { ConsolidatedItem } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

export interface CountingSessionSnapshot {
  sessionId: string;
  items: ConsolidatedItem[];
  currentLocation: string;
  multiplier: number;
  timestamp: number;
}

export interface UseCountingAutosaveResult {
  // Estado de auto-save
  hasPendingChanges: boolean;
  lastSaveTime: number | null;
  isSaving: boolean;

  // Acciones
  saveData: (snapshot: CountingSessionSnapshot, sessionId: string) => void;
  saveNow: () => void;
  clearSavedData: () => void;

  // Recovery
  recoveredData: CountingSessionSnapshot | null;
  clearRecovery: () => void;

  // Beforeunload
  registerBeforeunload: () => void;
  unregisterBeforeunload: () => void;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_INTERVAL = 30000; // 30 segundos
const STORAGE_PREFIX = 'counting_session_';

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook para auto-guardado de sesiones de conteo
 *
 * @example
 * ```tsx
 * function CountingPage() {
 *   const {
 *     hasPendingChanges,
 *     saveData,
 *     saveNow,
 *     recoveredData,
 *     clearRecovery,
 *   } = useCountingAutosave(sessionId);
 *
 *   // Guardar cuando cambian los items
 *   useEffect(() => {
 *     saveData({ sessionId, items, location, multiplier }, sessionId);
 *   }, [items, location, multiplier]);
 * }
 * ```
 */
export function useCountingAutosave(
  sessionId: string | undefined,
  options: {
    interval?: number;
    storageKey?: string;
    enabled?: boolean;
    showToasts?: boolean;
  } = {}
): UseCountingAutosaveResult {
  const {
    interval = DEFAULT_INTERVAL,
    storageKey = sessionId ? `${STORAGE_PREFIX}${sessionId}` : STORAGE_PREFIX,
    enabled = !!sessionId,
    showToasts = false,
  } = options;

  // =========================================================================
  // ESTADO
  // =========================================================================

  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recoveredData, setRecoveredData] = useState<CountingSessionSnapshot | null>(null);

  // Refs para evitar closures stale
  const lastSnapshotRef = useRef<CountingSessionSnapshot | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beforeunloadRef = useRef<((e: BeforeUnloadEvent) => void) | null>(null);

  // =========================================================================
  // PERSISTENCIA INTERNA
  // =========================================================================

  const saveToStorage = useCallback(
    (snapshot: CountingSessionSnapshot) => {
      try {
        setIsSaving(true);
        localStorage.setItem(storageKey, JSON.stringify(snapshot));
        setLastSaveTime(Date.now());
        setHasPendingChanges(false);
      } catch {
        if (showToasts) {
          toast.error('Error al guardar sesión');
        }
      } finally {
        setIsSaving(false);
      }
    },
    [storageKey, showToasts]
  );

  const clearSavedDataInternal = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      lastSnapshotRef.current = null;
      setHasPendingChanges(false);
      setLastSaveTime(null);
    } catch {
      // Silent fail
    }
  }, [storageKey]);

  // =========================================================================
  // RECOVERY - Cargar datos al montar
  // =========================================================================

  useEffect(() => {
    if (!enabled) return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored) as CountingSessionSnapshot;
        // Verificar que sea para la misma sesión
        if (data.sessionId === sessionId) {
          setRecoveredData(data);
          if (showToasts) {
            toast.info('📦 Sesión anterior recuperada', {
              duration: 5000,
              action: {
                label: 'Descartar',
                onClick: () => {
                  clearSavedDataInternal();
                  toast.success('Datos descartados');
                },
              },
            });
          }
        }
      }
    } catch {
      // Silent fail
    }
  }, [enabled, sessionId, storageKey, showToasts, clearSavedDataInternal]);

  // =========================================================================
  // INTERVALO DE AUTO-SAVE
  // =========================================================================

  useEffect(() => {
    if (!enabled || !sessionId) return;

    intervalRef.current = setInterval(() => {
      if (hasPendingChanges && lastSnapshotRef.current) {
        saveToStorage(lastSnapshotRef.current);
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, sessionId, interval, hasPendingChanges, saveToStorage]);

  // =========================================================================
  // ACCIONES
  // =========================================================================

  const saveData = useCallback(
    (snapshot: CountingSessionSnapshot, sid: string) => {
      // Verificar que sea para la sesión actual
      if (sid !== sessionId) return;

      lastSnapshotRef.current = snapshot;
      setHasPendingChanges(true);
    },
    [sessionId]
  );

  const saveNow = useCallback(() => {
    if (lastSnapshotRef.current) {
      saveToStorage(lastSnapshotRef.current);
    }
  }, [saveToStorage]);

  const clearSavedData = clearSavedDataInternal;

  // =========================================================================
  // RECOVERY
  // =========================================================================

  const clearRecovery = useCallback(() => {
    setRecoveredData(null);
    clearSavedDataInternal();
  }, [clearSavedDataInternal]);

  // =========================================================================
  // BEFOREUNLOAD
  // =========================================================================

  const registerBeforeunload = useCallback(() => {
    if (beforeunloadRef.current) return;

    beforeunloadRef.current = (e: BeforeUnloadEvent) => {
      if (hasPendingChanges) {
        // Intentar guardar antes de salir
        if (lastSnapshotRef.current) {
          saveToStorage(lastSnapshotRef.current);
        }

        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro de salir?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', beforeunloadRef.current);
  }, [hasPendingChanges, saveToStorage]);

  const unregisterBeforeunload = useCallback(() => {
    if (beforeunloadRef.current) {
      window.removeEventListener('beforeunload', beforeunloadRef.current);
      beforeunloadRef.current = null;
    }
  }, []);

  // =========================================================================
  // CLEANUP AL DESMONTAR
  // =========================================================================

  useEffect(() => {
    return () => {
      // Limpiar al desmontar
      if (hasPendingChanges && sessionId) {
        saveNow();
      }

      // Limpiar datos de sesión si coincidían
      if (recoveredData && sessionId === recoveredData.sessionId) {
        clearSavedDataInternal();
      }

      // Desregistrar beforeunload
      unregisterBeforeunload();

      // Limpiar intervalo
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    hasPendingChanges,
    sessionId,
    recoveredData,
    saveNow,
    clearSavedDataInternal,
    unregisterBeforeunload,
  ]);

  // =========================================================================
  // RETORNO
  // =========================================================================

  return {
    hasPendingChanges,
    lastSaveTime,
    isSaving,
    saveData,
    saveNow,
    clearSavedData,
    recoveredData,
    clearRecovery,
    registerBeforeunload,
    unregisterBeforeunload,
  };
}

export default useCountingAutosave;
