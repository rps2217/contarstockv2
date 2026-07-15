import { useState, useEffect } from 'react'
import { logger } from '@/services/logger';
;
import { InitializationService, InitStep } from '@/services/initializationService';
import { initPersistence } from '@/services/backupService';

// ✅ Integrity Service - Solo en desarrollo
import { integrityService } from '@/services/IntegrityService';

// ✅ Push Notifications Service
import { pushNotificationService } from '@/services/PushNotificationService';

// Verificar si es modo desarrollo
const IS_DEV = import.meta.env.DEV;

export const useAppInit = () => {
  const [bootState, setBootState] = useState<'initializing' | 'ready'>('initializing');
  const [initStep, setInitStep] = useState<InitStep>('idle');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    initPersistence();
    const authStatus = localStorage.getItem('logicount_auth') === 'true';
    setIsAuthenticated(authStatus);

    if (authStatus) {
      InitializationService.run((step) => {
        setInitStep(step);
        if (step === 'ready') setBootState('ready');
      });

      // ✅ Ejecutar verificación de integridad SOLO en desarrollo
      if (IS_DEV) {
        runIntegrityCheckInBackground();
      }

      // ✅ Iniciar verificaciones periódicas de salud y notificaciones push
      pushNotificationService.startPeriodicChecks();
    } else {
      setBootState('ready');
    }

    // Cleanup al desmontar
    return () => {
      pushNotificationService.stopPeriodicChecks();
    };
  }, []);

  const handleLoginSuccess = () => setIsAuthenticated(true);

  return {
    bootState,
    initStep,
    isAuthenticated,
    handleLoginSuccess
  };
};

/**
 * ✅ Ejecuta verificación de integridad en segundo plano
 * No bloquea la UI, solo registra métricas
 * SOLO SE EJECUTA EN MODO DESARROLLO
 */
async function runIntegrityCheckInBackground(): Promise<void> {
  try {
    const result = await integrityService.runAllChecks({ maxSamples: 5 });

    // Registrar métricas en HealthService
    if (!result.passed && result.criticalIssues > 0) {
      console.warn('[IntegrityCheck] Problemas críticos encontrados:', result.criticalIssues);
    }

    // Auto-fix solo problemas menores automáticamente
    if (result.warningIssues > 0 && result.criticalIssues === 0) {
      await integrityService.autoFix();
    }
  } catch (error) {
    console.error('[IntegrityCheck] Error en verificación:', error);
  }
}
