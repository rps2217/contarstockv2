import { logger } from '@/services/logger';
/**
 * =============================================================================
 * PushNotificationService - Notificaciones push para alertas de salud
 * =============================================================================
 * 
 * Características:
 * - Solicitar permiso del navegador
 * - Enviar notificaciones push cuando hay alertas críticas
 * - Mostrar notificación in-app como fallback
 * - Gestión de preferencias del usuario
 * 
 * @since 2026-07-07
 */

import { toast } from 'sonner';
import { healthService } from './HealthService';
import { integrityService } from './IntegrityService';

// =============================================================================
// TIPOS
// =============================================================================

export interface PushNotificationConfig {
  /** Habilitar notificaciones push del navegador */
  browserPush: boolean;
  /** Habilitar notificaciones in-app */
  inAppNotifications: boolean;
  /** Tipos de alertas a notificar */
  alertTypes: {
    expiryAlerts: boolean;
    syncAlerts: boolean;
    integrityAlerts: boolean;
  };
  /** Frecuencia de verificación (en minutos) */
  checkInterval: number;
}

export interface HealthAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  source: string;
  timestamp: number;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const STORAGE_KEY = 'push_notification_config';
const DEFAULT_CONFIG: PushNotificationConfig = {
  browserPush: false,
  inAppNotifications: true,
  alertTypes: {
    expiryAlerts: true,
    syncAlerts: true,
    integrityAlerts: false, // Deshabilitado por defecto - generar ruido en producción
  },
  checkInterval: 60, // Cada 60 minutos
};

// =============================================================================
// SERVICIO
// =============================================================================

export class PushNotificationService {
  private static instance: PushNotificationService;
  private config: PushNotificationConfig;
  private checkIntervalId: ReturnType<typeof setInterval> | null = null;
  isSupported: boolean;

  private constructor() {
    this.config = this.loadConfig();
    this.isSupported = this.checkBrowserSupport();
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  getIsSupported(): boolean {
    return this.isSupported;
  }

  // ==========================================================================
  // CONFIGURACIÓN
  // ==========================================================================

  /**
   * Obtiene la configuración actual
   */
  getConfig(): PushNotificationConfig {
    return { ...this.config };
  }

  /**
   * Actualiza la configuración
   */
  updateConfig(updates: Partial<PushNotificationConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    
    // Reiniciar el intervalo de verificación si cambió
    if (updates.checkInterval !== undefined) {
      this.restartCheckInterval();
    }
  }

  private loadConfig(): PushNotificationConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
        // Deshabilitar alertas de integridad en producción (generan ruido)
        // El IntegrityService ya solo se ejecuta en desarrollo
        config.alertTypes.integrityAlerts = false;
        return config;
      }
    } catch {
      // Ignore errors
    }
    return { ...DEFAULT_CONFIG };
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // Ignore errors
    }
  }

  // ==========================================================================
  // PERMISOS DEL NAVEGADOR
  // ==========================================================================

  /**
   * Verifica si el navegador soporta notificaciones push
   */
  private checkBrowserSupport(): boolean {
    return 'Notification' in window;
  }

  /**
   * Obtiene el estado actual del permiso
   */
  getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (!this.isSupported) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Solicita permiso para notificaciones push
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Este navegador no soporta notificaciones push');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      
      if (granted) {
        this.config.browserPush = true;
        this.saveConfig();
      }
      
      return granted;
    } catch (err: unknown) {
      logger.error('PushNotification', 'Error al solicitar permiso de notificaciones', err instanceof Error ? err.message : String(err));
      return false;
    }
  }

  // ==========================================================================
  // ENVÍO DE NOTIFICACIONES
  // ==========================================================================

  /**
   * Envía una notificación push
   */
  async sendNotification(alert: HealthAlert): Promise<void> {
    // Verificar si debemos notificar este tipo de alerta
    if (!this.shouldNotify(alert)) {
      return;
    }

    // Notificación in-app (siempre disponible)
    if (this.config.inAppNotifications) {
      this.sendInAppNotification(alert);
    }

    // Notificación push del navegador (si está habilitada y permitida)
    if (this.config.browserPush && this.getPermissionStatus() === 'granted') {
      this.sendBrowserNotification(alert);
    }
  }

  /**
   * Determina si debemos notificar esta alerta
   */
  private shouldNotify(alert: HealthAlert): boolean {
    if (alert.source === 'HealthService') {
      return this.config.alertTypes.expiryAlerts || this.config.alertTypes.syncAlerts;
    }
    if (alert.source === 'IntegrityService') {
      return this.config.alertTypes.integrityAlerts;
    }
    return true;
  }

  /**
   * Envía notificación in-app usando Sonner
   */
  private sendInAppNotification(alert: HealthAlert): void {
    const icon = alert.type === 'critical' ? '🚨' 
      : alert.type === 'warning' ? '⚠️' 
      : 'ℹ️';

    if (alert.type === 'critical') {
      toast.error(
        <div className="flex flex-col">
          <span className="font-bold">{icon} {alert.title}</span>
          <span className="text-xs opacity-80">{alert.message}</span>
        </div>,
        {
          duration: 10000,
          action: {
            label: 'Ver',
            onClick: () => {
              // Aquí se podría abrir el dashboard de salud
              window.dispatchEvent(new CustomEvent('open-health-dashboard'));
            },
          },
        }
      );
    } else if (alert.type === 'warning') {
      toast.warning(
        <div className="flex flex-col">
          <span className="font-bold">{icon} {alert.title}</span>
          <span className="text-xs opacity-80">{alert.message}</span>
        </div>,
        {
          duration: 8000,
        }
      );
    } else {
      toast.info(
        <div className="flex flex-col">
          <span className="font-bold">{icon} {alert.title}</span>
          <span className="text-xs opacity-80">{alert.message}</span>
        </div>,
        {
          duration: 5000,
        }
      );
    }
  }

  /**
   * Envía notificación push del navegador
   */
  private sendBrowserNotification(alert: HealthAlert): void {
    if (!this.isSupported || Notification.permission !== 'granted') {
      return;
    }

    const icon = alert.type === 'critical' ? '🚨' 
      : alert.type === 'warning' ? '⚠️' 
      : 'ℹ️';

    try {
      const notification = new Notification(`${icon} ContarStock - ${alert.title}`, {
        body: alert.message,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: alert.id,
        requireInteraction: alert.type === 'critical',
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        // Disparar evento para abrir el dashboard de salud
        window.dispatchEvent(new CustomEvent('open-health-dashboard'));
      };

      // Auto-cerrar después de 10 segundos si no es crítica
      if (alert.type !== 'critical') {
        setTimeout(() => notification.close(), 10000);
      }
    } catch (err: unknown) {
      logger.error('PushNotification', 'Error al enviar notificación push', err instanceof Error ? err.message : String(err));
    }
  }

  // ==========================================================================
  // ALERTAS PREDEFINIDAS
  // ==========================================================================

  /**
   * Notifica sobre vencimientos próximos
   */
  async notifyExpiryAlerts(expiringThisWeek: number, expiredCount: number): Promise<void> {
    if (expiredCount > 0) {
      await this.sendNotification({
        id: crypto.randomUUID(),
        type: 'critical',
        title: 'Productos Vencidos',
        message: `${expiredCount} productos ya están vencidos`,
        source: 'HealthService',
        timestamp: Date.now(),
      });
    } else if (expiringThisWeek > 5) {
      await this.sendNotification({
        id: crypto.randomUUID(),
        type: 'warning',
        title: 'Vencimientos Próximos',
        message: `${expiringThisWeek} productos vencen esta semana`,
        source: 'HealthService',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Notifica sobre problemas de sincronización
   */
  async notifySyncAlerts(failedOperations: number, successRate: number): Promise<void> {
    if (failedOperations > 5) {
      await this.sendNotification({
        id: crypto.randomUUID(),
        type: 'critical',
        title: 'Sincronización con Errores',
        message: `${failedOperations} operaciones de sync fallidas`,
        source: 'HealthService',
        timestamp: Date.now(),
      });
    } else if (successRate < 80) {
      await this.sendNotification({
        id: crypto.randomUUID(),
        type: 'warning',
        title: 'Tasa de Sincronización Baja',
        message: `Tasa de éxito: ${successRate}%`,
        source: 'HealthService',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Notifica sobre problemas de integridad
   */
  async notifyIntegrityAlerts(criticalIssues: number, warningIssues: number): Promise<void> {
    if (criticalIssues > 0) {
      await this.sendNotification({
        id: crypto.randomUUID(),
        type: 'critical',
        title: 'Problemas de Integridad',
        message: `${criticalIssues} problemas críticos encontrados`,
        source: 'IntegrityService',
        timestamp: Date.now(),
      });
    } else if (warningIssues > 10) {
      await this.sendNotification({
        id: crypto.randomUUID(),
        type: 'warning',
        title: 'Datos por Limpiar',
        message: `${warningIssues} advertencias de integridad`,
        source: 'IntegrityService',
        timestamp: Date.now(),
      });
    }
  }

  // ==========================================================================
  // VERIFICACIÓN PERIÓDICA
  // ==========================================================================

  /**
   * Inicia la verificación periódica
   */
  startPeriodicChecks(): void {
    if (this.checkIntervalId) {
      return; // Ya está corriendo
    }

    const intervalMs = this.config.checkInterval * 60 * 1000;
    
    this.checkIntervalId = setInterval(async () => {
      await this.runHealthCheck();
    }, intervalMs);

    // Ejecutar una vez al inicio
    this.runHealthCheck();
  }

  /**
   * Detiene la verificación periódica
   */
  stopPeriodicChecks(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  /**
   * Reinicia el intervalo de verificación
   */
  private restartCheckInterval(): void {
    this.stopPeriodicChecks();
    this.startPeriodicChecks();
  }

  /**
   * Ejecuta una verificación de salud y envía alertas
   */
  private async runHealthCheck(): Promise<void> {
    try {
      // Verificar integridad
      if (this.config.alertTypes.integrityAlerts) {
        const integrityResult = await integrityService.runAllChecks({ maxSamples: 5 });
        if (!integrityResult.passed) {
          await this.notifyIntegrityAlerts(
            integrityResult.criticalIssues,
            integrityResult.warningIssues
          );
        }
      }

      // Verificar métricas de salud
      if (this.config.alertTypes.expiryAlerts || this.config.alertTypes.syncAlerts) {
        const metrics = await healthService.getMetrics();
        
        if (this.config.alertTypes.expiryAlerts) {
          await this.notifyExpiryAlerts(metrics.expiringThisWeek, metrics.expiredCount);
        }
        
        if (this.config.alertTypes.syncAlerts) {
          await this.notifySyncAlerts(metrics.failedOperations, metrics.syncSuccessRate);
        }
      }
    } catch (error) {
      console.error('Error en verificación periódica:', error);
    }
  }
}

// Instancia singleton
export const pushNotificationService = PushNotificationService.getInstance();

// Hook para usar en componentes
export const usePushNotifications = () => {
  const requestPermission = () => pushNotificationService.requestPermission();
  const getConfig = () => pushNotificationService.getConfig();
  const updateConfig = (config: Partial<PushNotificationConfig>) => 
    pushNotificationService.updateConfig(config);
  const getPermissionStatus = () => pushNotificationService.getPermissionStatus();

  return {
    requestPermission,
    getConfig,
    updateConfig,
    getPermissionStatus,
    isSupported: pushNotificationService.isSupported,
  };
};
