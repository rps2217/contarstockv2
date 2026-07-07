/**
 * =============================================================================
 * useAutoSave - Hook para guardado automático de sesiones
 * =============================================================================
 * 
 * Características:
 * - Guardado automático cada X segundos
 * - Detección de cambios pendientes
 * - Persistencia en localStorage antes de cerrar
 * - Recuperación de datos si hay cierre inesperado
 * - Notificaciones de estado
 * 
 * @since 2026-07-07
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { logger } from '@/services/logger';

export interface AutoSaveConfig {
  /** Intervalo de guardado automático en ms (default: 30000 = 30s) */
  interval?: number;
  /** Clave de localStorage para persistencia */
  storageKey?: string;
  /** Habilitar/deshabilitar */
  enabled?: boolean;
  /** Mostrar toast de guardado */
  showToasts?: boolean;
}

export interface AutoSaveState {
  /** Si hay cambios pendientes de guardar */
  hasPendingChanges: boolean;
  /** Última vez que se guardó */
  lastSaveTime: Date | null;
  /** Si está guardando actualmente */
  isSaving: boolean;
  /** Número de cambios pendientes */
  pendingChangesCount: number;
}

export interface PendingData<T> {
  data: T;
  timestamp: number;
  sessionId: string;
}

const DEFAULT_INTERVAL = 30000; // 30 segundos
const STORAGE_PREFIX = 'autosave_';

/**
 * Hook para auto-guardado de datos de sesión
 * 
 * @example
 * ```tsx
 * const { hasPendingChanges, lastSaveTime, saveNow } = useAutoSave({
 *   interval: 30000,
 *   storageKey: 'counting_session',
 *   enabled: true,
 * });
 * 
 * // Datos a guardar
 * const sessionData = { items: countedItems, total: 150 };
 * 
 * // El hook maneja el guardado automático
 * useAutoSaveData(sessionData);
 * 
 * // Forzar guardado
 * const handleSave = async () => {
 *   await saveNow();
 * };
 * ```
 */
export function useAutoSave<T>(
  config: AutoSaveConfig = {}
): {
  state: AutoSaveState;
  saveData: (data: T, sessionId: string) => void;
  saveNow: () => Promise<void>;
  clearSavedData: () => void;
  getRecoveredData: () => PendingData<T> | null;
  markAsSaved: () => void;
} {
  const {
    interval = DEFAULT_INTERVAL,
    storageKey = 'default_session',
    enabled = true,
    showToasts = true,
  } = config;

  const [state, setState] = useState<AutoSaveState>({
    hasPendingChanges: false,
    lastSaveTime: null,
    isSaving: false,
    pendingChangesCount: 0,
  });

  // Refs para datos y control
  const pendingDataRef = useRef<PendingData<T> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedDataRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  const storageKeyFull = `${STORAGE_PREFIX}${storageKey}`;

  // ==========================================================================
  // FUNCIONES DE STORAGE
  // ==========================================================================

  /**
   * Guarda datos en localStorage
   */
  const saveToStorage = useCallback((data: PendingData<T>) => {
    try {
      localStorage.setItem(storageKeyFull, JSON.stringify(data));
      logger.info('AutoSave', `Data saved to localStorage: ${storageKey}`);
    } catch (error) {
      logger.error('AutoSave', 'Failed to save to localStorage', String(error));
    }
  }, [storageKeyFull]);

  /**
   * Carga datos desde localStorage
   */
  const loadFromStorage = useCallback((): PendingData<T> | null => {
    try {
      const stored = localStorage.getItem(storageKeyFull);
      if (stored) {
        return JSON.parse(stored) as PendingData<T>;
      }
    } catch (error) {
      logger.error('AutoSave', 'Failed to load from localStorage', String(error));
    }
    return null;
  }, [storageKeyFull]);

  /**
   * Elimina datos guardados
   */
  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(storageKeyFull);
      pendingDataRef.current = null;
      lastSavedDataRef.current = null;
      setState(prev => ({
        ...prev,
        hasPendingChanges: false,
        pendingChangesCount: 0,
      }));
      logger.info('AutoSave', `Cleared saved data: ${storageKey}`);
    } catch (error) {
      logger.error('AutoSave', 'Failed to clear localStorage', String(error));
    }
  }, [storageKeyFull]);

  /**
   * Obtiene datos recuperados (con validación de timestamp)
   */
  const getRecoveredData = useCallback((): PendingData<T> | null => {
    const data = loadFromStorage();
    if (!data) return null;

    // Verificar si los datos son recientes (menos de 24 horas)
    const MAX_AGE = 24 * 60 * 60 * 1000; // 24 horas
    if (Date.now() - data.timestamp > MAX_AGE) {
      // Datos muy antiguos, eliminar
      clearStorage();
      return null;
    }

    return data;
  }, [loadFromStorage, clearStorage]);

  // ==========================================================================
  // FUNCIONES DE GUARDADO
  // ==========================================================================

  /**
   * Guarda datos pendientes
   */
  const saveNow = useCallback(async () => {
    if (!enabled || !pendingDataRef.current || state.isSaving) return;

    setState(prev => ({ ...prev, isSaving: true }));

    try {
      // Guardar en localStorage como backup
      saveToStorage(pendingDataRef.current);
      
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          hasPendingChanges: false,
          lastSaveTime: new Date(),
          isSaving: false,
          pendingChangesCount: 0,
        }));

        if (showToasts) {
          toast.success('Sesión guardada automáticamente', {
            duration: 2000,
          });
        }

        logger.info('AutoSave', `Session saved: ${pendingDataRef.current.sessionId}`);
      }
    } catch (error) {
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, isSaving: false }));
        logger.error('AutoSave', 'Failed to save', String(error));
      }
    }
  }, [enabled, state.isSaving, saveToStorage, showToasts]);

  /**
   * Registra nuevos datos para guardar
   */
  const saveData = useCallback((data: T, sessionId: string) => {
    if (!enabled) return;

    const dataString = JSON.stringify(data);
    
    // Solo marcar como cambio si los datos son diferentes
    if (dataString === lastSavedDataRef.current) {
      return;
    }

    pendingDataRef.current = {
      data,
      timestamp: Date.now(),
      sessionId,
    };
    
    lastSavedDataRef.current = dataString;

    setState(prev => ({
      ...prev,
      hasPendingChanges: true,
      pendingChangesCount: prev.pendingChangesCount + 1,
    }));

    logger.debug('AutoSave', `Data queued for save: ${sessionId}`);
  }, [enabled]);

  /**
   * Marca los datos como guardados (sin hacer save)
   */
  const markAsSaved = useCallback(() => {
    if (pendingDataRef.current) {
      lastSavedDataRef.current = JSON.stringify(pendingDataRef.current.data);
      setState(prev => ({
        ...prev,
        hasPendingChanges: false,
        pendingChangesCount: 0,
      }));
    }
  }, []);

  // ==========================================================================
  // EFECTOS
  // ==========================================================================

  // Cleanup al desmontar
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Guardar datos pendientes antes de desmontar
      if (pendingDataRef.current && enabled) {
        saveToStorage(pendingDataRef.current);
        logger.info('AutoSave', 'Emergency save on unmount');
      }
    };
  }, [enabled, saveToStorage]);

  // Intervalo de guardado automático
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      if (pendingDataRef.current && state.hasPendingChanges) {
        saveNow();
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, saveNow, state.hasPendingChanges]);

  // Guardar antes de cerrar/recargar
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingDataRef.current && state.hasPendingChanges) {
        // Guardar en localStorage
        saveToStorage(pendingDataRef.current);
        
        // Mostrar mensaje del navegador
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro de salir?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, state.hasPendingChanges, saveToStorage]);

  // ==========================================================================
  // RETORNO
  // ==========================================================================

  return useMemo(() => ({
    state,
    saveData,
    saveNow,
    clearSavedData: clearStorage,
    getRecoveredData,
    markAsSaved,
  }), [state, saveData, saveNow, clearStorage, getRecoveredData, markAsSaved]);
}

/**
 * Hook para detectar cambios en datos y programarlos para guardar
 */
export function useAutoSaveData<T>(
  data: T,
  sessionId: string,
  config: AutoSaveConfig = {}
): { hasPendingChanges: boolean; lastSaveTime: Date | null } {
  const { state, saveData } = useAutoSave<T>(config);

  useEffect(() => {
    if (config.enabled !== false) {
      saveData(data, sessionId);
    }
  }, [data, sessionId, saveData, config.enabled]);

  return {
    hasPendingChanges: state.hasPendingChanges,
    lastSaveTime: state.lastSaveTime,
  };
}

/**
 * Hook para verificar si hay datos recuperables
 */
export function useAutoSaveRecovery<T>(
  storageKey: string
): { recoveredData: PendingData<T> | null; clearRecovery: () => void } {
  const [recoveredData, setRecoveredData] = useState<PendingData<T> | null>(null);
  
  useEffect(() => {
    const key = `${STORAGE_PREFIX}${storageKey}`;
    const stored = localStorage.getItem(key);
    
    if (stored) {
      try {
        const data = JSON.parse(stored) as PendingData<T>;
        // Verificar si es reciente
        const MAX_AGE = 24 * 60 * 60 * 1000;
        if (Date.now() - data.timestamp <= MAX_AGE) {
          setRecoveredData(data);
        } else {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  }, [storageKey]);

  const clearRecovery = useCallback(() => {
    const key = `${STORAGE_PREFIX}${storageKey}`;
    localStorage.removeItem(key);
    setRecoveredData(null);
  }, [storageKey]);

  return { recoveredData, clearRecovery };
}
