/**
 * DiscrepancyAlertService - Alertas en tiempo real para discrepancias
 *
 * Monitorea los escaneos y detecta cuando se exceden los umbrales
 * de discrepancia, enviando notificaciones multisensoriales:
 * - Visual: Toast/Banner con color según severidad
 * - Auditiva: Sonidos diferenciados
 * - Háptica: Vibración en móviles
 *
 * Niveles de alerta:
 * - info: Dentro de rango normal
 * - warning: Discrepancia moderada (10-25%)
 * - critical: Discrepancia alta (25-50%)
 * - error: Discrepancia extrema (>50%) o producto no esperado
 */

import { toast } from 'sonner';
import { logger } from '@/services/logger';

// ============================================================================
// TIPOS
// ============================================================================

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'error';

export interface AlertThreshold {
  /** Porcentaje para warning (default: 10%) */
  warningPercent: number;
  /** Porcentaje para critical (default: 25%) */
  criticalPercent: number;
  /** Porcentaje para error (default: 50%) */
  errorPercent: number;
}

export interface DiscrepancyAlert {
  id: string;
  barcode: string;
  productName: string;
  expectedQty: number;
  scannedQty: number;
  discrepancy: number;
  discrepancyPercent: number;
  severity: AlertSeverity;
  timestamp: number;
  acknowledged: boolean;
}

export interface DiscrepancyAlertConfig {
  enabled: boolean;
  thresholds: AlertThreshold;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  toastEnabled: boolean;
  /** Sound volume (0-1) */
  volume: number;
  /** Auto-acknowledge after X ms (0 = manual) */
  autoAcknowledgeMs: number;
  /** Max alerts to show (0 = unlimited) */
  maxAlerts: number;
}

export interface AlertHandler {
  onAlert: (alert: DiscrepancyAlert) => void;
  onAcknowledge: (alertId: string) => void;
  onClear: () => void;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_THRESHOLDS: AlertThreshold = {
  warningPercent: 10,
  criticalPercent: 25,
  errorPercent: 50,
};

const DEFAULT_CONFIG: DiscrepancyAlertConfig = {
  enabled: true,
  thresholds: DEFAULT_THRESHOLDS,
  soundEnabled: true,
  hapticEnabled: true,
  toastEnabled: true,
  volume: 0.7,
  autoAcknowledgeMs: 5000,
  maxAlerts: 10,
};

// ============================================================================
// SONIDOS
// ============================================================================

const SOUNDS = {
  success: 'data:audio/wav;base64,UklGRl...', // Beep corto
  warning: 'data:audio/wav;base64,UklGRl...', // Beep medio
  error: 'data:audio/wav;base64,UklGRl...', // Beep largo
};

class SoundPlayer {
  private audioContext: AudioContext | null = null;
  private volume = 0.7;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  play(type: 'success' | 'warning' | 'error'): void {
    if (!this.volume) return;

    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Configurar según tipo
      const configs = {
        success: { freq: 880, duration: 0.1, type: 'sine' as OscillatorType },
        warning: { freq: 660, duration: 0.2, type: 'triangle' as OscillatorType },
        error: { freq: 440, duration: 0.3, type: 'square' as OscillatorType },
      };

      const config = configs[type];

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(config.freq, ctx.currentTime);

      gainNode.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + config.duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + config.duration);
    } catch (error) {
      logger.warn('SoundPlayer', 'Audio play failed', { error });
    }
  }
}

const soundPlayer = new SoundPlayer();

// ============================================================================
// HAPTIC FEEDBACK
// ============================================================================

const playHaptic = (severity: AlertSeverity): void => {
  if (!('vibrate' in navigator)) return;

  const patterns = {
    info: [20],
    warning: [100],
    critical: [50, 50, 50],
    error: [100, 50, 100, 50, 100],
  };

  try {
    navigator.vibrate(patterns[severity]);
  } catch (error) {
    logger.warn('Haptic', 'Vibration failed', { error });
  }
};

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================

class DiscrepancyAlertServiceClass {
  private config: DiscrepancyAlertConfig;
  private alerts: Map<string, DiscrepancyAlert> = new Map();
  private handlers: Set<AlertHandler> = new Set();
  private alertCount = 0;

  constructor(config: Partial<DiscrepancyAlertConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    soundPlayer.setVolume(this.config.volume);
  }

  /**
   * Actualizar configuración
   */
  updateConfig(config: Partial<DiscrepancyAlertConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.volume !== undefined) {
      soundPlayer.setVolume(config.volume);
    }

    logger.debug('DiscrepancyAlert', 'Config updated', { config: this.config });
  }

  /**
   * Obtener configuración actual
   */
  getConfig(): DiscrepancyAlertConfig {
    return { ...this.config };
  }

  /**
   * Registrar handler para alertas
   */
  subscribe(handler: AlertHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Evaluar un escaneo y generar alerta si hay discrepancia
   */
  evaluateScan(params: {
    barcode: string;
    productName: string;
    expectedQty: number;
    scannedQty: number;
  }): DiscrepancyAlert | null {
    const { barcode, productName, expectedQty, scannedQty } = params;

    // Ignorar si está deshabilitado
    if (!this.config.enabled) return null;

    // Calcular discrepancia
    const discrepancy = scannedQty - expectedQty;
    const discrepancyPercent =
      expectedQty > 0 ? Math.abs((discrepancy / expectedQty) * 100) : scannedQty > 0 ? 100 : 0;

    // Determinar severidad
    let severity: AlertSeverity = 'info';

    if (expectedQty === 0 && scannedQty > 0) {
      // Producto no esperado
      severity = 'error';
    } else if (this.config.thresholds.errorPercent <= discrepancyPercent) {
      severity = 'error';
    } else if (this.config.thresholds.criticalPercent <= discrepancyPercent) {
      severity = 'critical';
    } else if (this.config.thresholds.warningPercent <= discrepancyPercent) {
      severity = 'warning';
    }

    // Ignorar si es info (dentro de rango normal)
    if (severity === 'info') return null;

    // Crear alerta
    const alert: DiscrepancyAlert = {
      id: crypto.randomUUID(),
      barcode,
      productName,
      expectedQty,
      scannedQty,
      discrepancy,
      discrepancyPercent: Math.round(discrepancyPercent),
      severity,
      timestamp: Date.now(),
      acknowledged: false,
    };

    // Guardar alerta
    this.alerts.set(alert.id, alert);
    this.alertCount++;

    // Limitar alertas guardadas
    if (this.alerts.size > this.config.maxAlerts * 2) {
      const toDelete = Array.from(this.alerts.keys()).slice(
        0,
        this.alerts.size - this.config.maxAlerts
      );
      toDelete.forEach(id => this.alerts.delete(id));
    }

    // Notificar handlers
    this.notifyHandlers(alert);

    // Ejecutar feedback multisensorial
    this.executeFeedback(alert);

    logger.info('DiscrepancyAlert', 'Alert triggered', {
      id: alert.id,
      severity,
      barcode,
      discrepancyPercent,
    });

    return alert;
  }

  /**
   * Evaluar múltiples escaneos de una vez
   */
  evaluateBatch(
    scans: Array<{
      barcode: string;
      productName: string;
      expectedQty: number;
      scannedQty: number;
    }>
  ): DiscrepancyAlert[] {
    const alerts: DiscrepancyAlert[] = [];

    for (const scan of scans) {
      const alert = this.evaluateScan(scan);
      if (alert) alerts.push(alert);
    }

    return alerts;
  }

  /**
   * Ejecutar feedback multisensorial
   */
  private executeFeedback(alert: DiscrepancyAlert): void {
    // 1. Sonido
    if (this.config.soundEnabled) {
      const soundMap: Record<AlertSeverity, 'success' | 'warning' | 'error'> = {
        info: 'success',
        warning: 'warning',
        critical: 'warning',
        error: 'error',
      };
      soundPlayer.play(soundMap[alert.severity]);
    }

    // 2. Haptic
    if (this.config.hapticEnabled) {
      playHaptic(alert.severity);
    }

    // 3. Toast
    if (this.config.toastEnabled) {
      this.showToast(alert);
    }

    // 4. Auto-acknowledge
    if (this.config.autoAcknowledgeMs > 0) {
      setTimeout(() => {
        this.acknowledgeAlert(alert.id);
      }, this.config.autoAcknowledgeMs);
    }
  }

  /**
   * Mostrar toast con la alerta
   */
  private showToast(alert: DiscrepancyAlert): void {
    const toastConfig = {
      id: alert.id,
      duration: this.config.autoAcknowledgeMs || 5000,
    };

    const messages = {
      warning: `⚠️ Discrepancia: ${alert.productName}`,
      critical: `🚨 Alerta: ${alert.productName}`,
      error:
        alert.expectedQty === 0
          ? `❌ Producto no esperado: ${alert.productName}`
          : `🔴 Discrepancia crítica: ${alert.productName}`,
    };

    const descriptions = {
      warning: `Esperado: ${alert.expectedQty}, Escaneado: ${alert.scannedQty} (${alert.discrepancyPercent}%)`,
      critical: `Diferencia: ${alert.discrepancy > 0 ? '+' : ''}${alert.discrepancy} unidades`,
      error:
        alert.expectedQty === 0
          ? `Cantidad: ${alert.scannedQty}`
          : `Diferencia: ${alert.discrepancy > 0 ? '+' : ''}${alert.discrepancy} unidades`,
    };

    toast.warning(messages[alert.severity], {
      description: descriptions[alert.severity],
      ...toastConfig,
    });
  }

  /**
   * Notificar handlers registrados
   */
  private notifyHandlers(alert: DiscrepancyAlert): void {
    this.handlers.forEach(handler => {
      try {
        handler.onAlert(alert);
      } catch (error) {
        logger.error('DiscrepancyAlert', 'Handler error', { error });
      }
    });
  }

  /**
   * Obtener todas las alertas
   */
  getAlerts(options?: {
    severity?: AlertSeverity;
    acknowledged?: boolean;
    limit?: number;
  }): DiscrepancyAlert[] {
    let result = Array.from(this.alerts.values());

    if (options?.severity) {
      result = result.filter(a => a.severity === options.severity);
    }

    if (options?.acknowledged !== undefined) {
      result = result.filter(a => a.acknowledged === options.acknowledged);
    }

    // Ordenar por severidad y tiempo
    const severityOrder: Record<AlertSeverity, number> = {
      error: 0,
      critical: 1,
      warning: 2,
      info: 3,
    };

    result.sort((a, b) => {
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return b.timestamp - a.timestamp;
    });

    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  /**
   * Obtener alerta por ID
   */
  getAlert(id: string): DiscrepancyAlert | undefined {
    return this.alerts.get(id);
  }

  /**
   * Reconocer/alAcknowledgear una alerta
   */
  acknowledgeAlert(id: string): boolean {
    const alert = this.alerts.get(id);
    if (!alert) return false;

    alert.acknowledged = true;

    // Notificar handlers
    this.handlers.forEach(handler => {
      try {
        handler.onAcknowledge(id);
      } catch (error) {
        logger.error('DiscrepancyAlert', 'Handler error', { error });
      }
    });

    return true;
  }

  /**
   * Reconocer todas las alertas
   */
  acknowledgeAll(): number {
    let count = 0;
    this.alerts.forEach(alert => {
      if (!alert.acknowledged) {
        alert.acknowledged = true;
        count++;
      }
    });

    if (count > 0) {
      this.handlers.forEach(handler => {
        try {
          handler.onClear();
        } catch (error) {
          logger.error('DiscrepancyAlert', 'Handler error', { error });
        }
      });
    }

    return count;
  }

  /**
   * Limpiar alertas antiguas
   */
  clearOld(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    let count = 0;

    this.alerts.forEach((alert, id) => {
      if (alert.timestamp < cutoff && alert.acknowledged) {
        this.alerts.delete(id);
        count++;
      }
    });

    return count;
  }

  /**
   * Limpiar todas las alertas
   */
  clear(): void {
    this.alerts.clear();
    this.handlers.forEach(handler => {
      try {
        handler.onClear();
      } catch (error) {
        logger.error('DiscrepancyAlert', 'Handler error', { error });
      }
    });
  }

  /**
   * Obtener estadísticas de alertas
   */
  getStats(): {
    total: number;
    unacknowledged: number;
    bySeverity: Record<AlertSeverity, number>;
    recentCount: number; // Últimas 24h
  } {
    const now = Date.now();
    const recentCutoff = now - 24 * 60 * 60 * 1000;

    const stats = {
      total: this.alerts.size,
      unacknowledged: 0,
      bySeverity: { info: 0, warning: 0, critical: 0, error: 0 } as Record<AlertSeverity, number>,
      recentCount: 0,
    };

    this.alerts.forEach(alert => {
      if (!alert.acknowledged) stats.unacknowledged++;
      stats.bySeverity[alert.severity]++;
      if (alert.timestamp > recentCutoff) stats.recentCount++;
    });

    return stats;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const DiscrepancyAlertService = new DiscrepancyAlertServiceClass();

export default DiscrepancyAlertService;
