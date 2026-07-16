/**
 * =============================================================================
 * useSyncHealthAlert - Hook para alertas de salud de sincronización
 * =============================================================================
 * 
 * Monitorea la salud del sistema de sincronización y muestra alertas
 * cuando el score de salud es bajo (< 70).
 * 
 * @module useSyncHealthAlert
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { syncMetrics, SyncHealth } from '@/services/cloud/SyncMetrics';
import { logger } from '@/services/logger';

const HEALTH_THRESHOLD = 70;
const CHECK_INTERVAL_MS = 60 * 1000; // 1 minuto

interface UseSyncHealthAlertReturn {
  health: SyncHealth | null;
  isHealthy: boolean;
  checkHealth: () => Promise<SyncHealth>;
}

export function useSyncHealthAlert(
  enabled = true,
  onUnhealthy?: (health: SyncHealth) => void
): UseSyncHealthAlertReturn {
  const [health, setHealth] = useState<SyncHealth | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastAlertTimeRef = useRef<number>(0);

  const checkHealth = useCallback(async (): Promise<SyncHealth> => {
    try {
      const healthData = syncMetrics.getHealth();
      setHealth(healthData);
      return healthData;
    } catch (e) {
      logger.error('SyncHealthAlert', 'Error checking sync health', { error: String(e) });
      return {
        isHealthy: false,
        score: 0,
        issues: ['Error al verificar salud del sync'],
        lastCheck: Date.now()
      };
    }
  }, []);

  const showAlert = useCallback((healthData: SyncHealth) => {
    // Solo mostrar alerta si ha pasado al menos 5 minutos desde la última
    const now = Date.now();
    if (now - lastAlertTimeRef.current < 5 * 60 * 1000) {
      return;
    }

    lastAlertTimeRef.current = now;

    // Determinar tipo de toast según severidad
    if (healthData.score < 30) {
      toast.error('⚠️ Sync en Estado Crítico', {
        description: `Score: ${healthData.score}/100. ${healthData.issues[0] || 'Revisar logs'}`,
        duration: 8000,
        action: {
          label: 'Ver',
          onClick: () => onUnhealthy?.(healthData)
        }
      });
    } else if (healthData.score < HEALTH_THRESHOLD) {
      toast.warning('🔔 Sync con Problemas', {
        description: `Score: ${healthData.score}/100. ${healthData.issues[0] || 'Revisar configuración'}`,
        duration: 6000,
        action: {
          label: 'Ver',
          onClick: () => onUnhealthy?.(healthData)
        }
      });
    }

    // Notificar callback
    onUnhealthy?.(healthData);
  }, [onUnhealthy]);

  useEffect(() => {
    if (!enabled) return;

    // Check inicial con timeout para evitar setState sincrono
    const timeoutId = setTimeout(() => {
      checkHealth()
        .then(healthData => {
          if (!healthData.isHealthy) {
            showAlert(healthData);
          }
        })
        .catch(err => {
          logger.error('SyncHealthAlert', 'Error checking health', { error: String(err) });
        });
    }, 0);

    // Configurar intervalo
    intervalRef.current = window.setInterval(() => {
      checkHealth()
        .then(healthData => {
          if (!healthData.isHealthy) {
            showAlert(healthData);
          }
        })
        .catch(err => {
          logger.error('SyncHealthAlert', 'Error in periodic health check', { error: String(err) });
        });
    }, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(timeoutId);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, checkHealth, showAlert]);

  return {
    health,
    isHealthy: health?.isHealthy ?? true,
    checkHealth
  };
}
