/**
 * useScheduledSync - Hook para sincronización automática periódica
 * 
 * Implementa sincronización configurable que funciona en background
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSyncStore } from '@/stores';
import { useNetworkStatus } from './useNetworkStatus';

export interface ScheduledSyncConfig {
  // Habilitar sincronización programada
  enabled: boolean;
  // Intervalo en minutos (5, 15, 30, 60)
  intervalMinutes: number;
  // Solo sincronizar con WiFi
  wifiOnly: boolean;
  // Sincronizar en background incluso cuando la app no está activa
  runInBackground: boolean;
  // Silencioso (no mostrar notificaciones)
  silent: boolean;
}

const DEFAULT_CONFIG: ScheduledSyncConfig = {
  enabled: false,
  intervalMinutes: 15,
  wifiOnly: false,
  runInBackground: false,
  silent: false,
};

interface UseScheduledSyncOptions {
  // Configuración
  config: ScheduledSyncConfig;
  // Función para ejecutar la sincronización
  onSync: () => Promise<void>;
  // Callback cuando se sincroniza exitosamente
  onSyncSuccess?: () => void;
  // Callback cuando hay error
  onSyncError?: (error: Error) => void;
}

export const useScheduledSync = (options: UseScheduledSyncOptions) => {
  const { config, onSync, onSyncSuccess, onSyncError } = options;
  
  const isOnline = useNetworkStatus();
  const isSyncing = useSyncStore(state => state.isSyncing);
  
  const [lastScheduledSync, setLastScheduledSync] = useState<Date | null>(null);
  const [nextScheduledSync, setNextScheduledSync] = useState<Date | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundRef = useRef<number | null>(null);

  // Verificar si debe sincronizar
  const shouldSync = useCallback((): boolean => {
    if (!config.enabled) return false;
    if (!isOnline) return false;
    if (isSyncing) return false;
    
    // Verificar WiFi si está configurado
    if (config.wifiOnly) {
      const connection = (navigator as any).connection || (navigator as any).mozConnection;
      if (connection) {
        const isWifi = connection.type === 'wifi' || connection.type === '2g' || connection.type === '3g' || connection.type === '4g';
        if (!isWifi && !connection.saveData) return false;
      }
    }
    
    return true;
  }, [config.enabled, config.wifiOnly, isOnline, isSyncing]);

  // Ejecutar sincronización
  const runSync = useCallback(async () => {
    if (!shouldSync()) return;
    
    setIsRunning(true);
    try {
      await onSync();
      setLastScheduledSync(new Date());
      onSyncSuccess?.();
    } catch (error) {
      onSyncError?.(error as Error);
    } finally {
      setIsRunning(false);
    }
  }, [shouldSync, onSync, onSyncSuccess, onSyncError]);

  // Calcular próxima sincronización
  const calculateNextSync = useCallback(() => {
    if (!config.enabled) return null;
    const next = new Date();
    next.setMinutes(next.getMinutes() + config.intervalMinutes);
    return next;
  }, [config.enabled, config.intervalMinutes]);

  // Efecto para el intervalo
  useEffect(() => {
    if (!config.enabled) {
      const timeoutId = setTimeout(() => {
        setNextScheduledSync(null);
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    const intervalMs = config.intervalMinutes * 60 * 1000;
    
    // Usar timeout para evitar setState sincrono
    const timeoutId = setTimeout(() => {
      // Calcular tiempo hasta la próxima sincronización
      setNextScheduledSync(calculateNextSync());
    }, 0);

    intervalRef.current = setInterval(() => {
      if (shouldSync()) {
        runSync();
        setNextScheduledSync(calculateNextSync());
      }
    }, intervalMs);

    return () => {
      clearTimeout(timeoutId);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [config.enabled, config.intervalMinutes, shouldSync, runSync, calculateNextSync]);

  // Efecto para sync en background (Page Visibility API)
  useEffect(() => {
    if (!config.runInBackground || !config.enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldSync()) {
        // Sync cuando la app vuelve a primer plano
        runSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [config.runInBackground, config.enabled, shouldSync, runSync]);

  // Efecto para sync antes de cerrar (beforeunload)
  useEffect(() => {
    if (!config.enabled) return;

    const handleBeforeUnload = () => {
      if (shouldSync() && !config.silent) {
        // Intentar sincronizar de forma asíncrona
        navigator.sendBeacon?.('/api/sync', JSON.stringify({ type: 'scheduled' }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [config.enabled, config.silent, shouldSync]);

  // Función para forzar sincronización
  const forceSync = useCallback(() => {
    return runSync();
  }, [runSync]);

  // Tiempo restante hasta la próxima sincronización
  const getTimeUntilNextSync = (): number | null => {
    if (!nextScheduledSync) return null;
    return Math.max(0, nextScheduledSync.getTime() - Date.now());
  };

  return {
    // Estado
    isEnabled: config.enabled,
    isRunning,
    shouldSync: shouldSync(),
    
    // Tiempos
    lastScheduledSync,
    nextScheduledSync,
    timeUntilNextSync: getTimeUntilNextSync(),
    
    // Configuración
    intervalMinutes: config.intervalMinutes,
    wifiOnly: config.wifiOnly,
    
    // Métodos
    forceSync,
  };
};

// Hook simple para persistir configuración
export const useSyncScheduleSettings = () => {
  const [config, setConfig] = useState<ScheduledSyncConfig>(DEFAULT_CONFIG);

  // Cargar del localStorage
  useEffect(() => {
    const saved = localStorage.getItem('scheduledSyncConfig');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch {
        // Usar default
      }
    }
  }, []);

  // Guardar cuando cambia
  const updateConfig = useCallback((updates: Partial<ScheduledSyncConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      localStorage.setItem('scheduledSyncConfig', JSON.stringify(newConfig));
      return newConfig;
    });
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem('scheduledSyncConfig');
  }, []);

  return {
    config,
    updateConfig,
    resetConfig,
    setEnabled: (enabled: boolean) => updateConfig({ enabled }),
    setInterval: (minutes: number) => updateConfig({ intervalMinutes: minutes }),
    setWifiOnly: (wifiOnly: boolean) => updateConfig({ wifiOnly }),
  };
};

export default useScheduledSync;
