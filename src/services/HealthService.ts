/**
 * =============================================================================
 * HealthService - Sistema de monitoreo y métricas de salud
 * =============================================================================
 * 
 * Características:
 * - Health checks de componentes
 * - Métricas de uso
 * - Alertas proactivas
 * - Estadísticas de sincronización
 * - Monitoreo de rendimiento
 * 
 * @since 2026-07-07
 */

import { db } from '@/db';
import { logger } from '@/services/logger';
import { integrityService } from './IntegrityService';

// =============================================================================
// TIPOS
// =============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  message: string;
  duration?: number;
  timestamp: number;
}

export interface HealthReport {
  overall: HealthStatus;
  checks: HealthCheck[];
  timestamp: number;
  uptime: number;
}

export interface SystemMetrics {
  // Métricas de base de datos
  totalProducts: number;
  totalSessions: number;
  totalScans: number;
  totalExpirations: number;
  pendingSyncs: number;
  
  // Métricas de rendimiento
  dbSize?: number;
  indexedDBSize?: number;
  
  // Métricas de uso
  scansToday: number;
  sessionsActive: number;
  expiringThisWeek: number;
  expiringThisMonth: number;
  expiredCount: number;
  
  // Métricas de sincronización
  syncSuccessRate: number;
  lastSyncAt?: number;
  pendingOperations: number;
  failedOperations: number;
  
  // ✅ Timestamp para historial
  timestamp: number;
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
  source?: string;
}

// =============================================================================
// SERVICIO
// =============================================================================

export class HealthService {
  private static instance: HealthService;
  private startTime: number;
  private alerts: Alert[] = [];
  private metricsHistory: SystemMetrics[] = [];
  private readonly MAX_ALERTS = 100;
  private readonly METRICS_HISTORY_SIZE = 100;

  private constructor() {
    this.startTime = Date.now();
    
    // Cargar alertas guardadas
    this.loadAlerts();
    
    // Guardar métricas periódicamente
    this.startMetricsCollection();
  }

  static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  // ==========================================================================
  // HEALTH CHECKS
  // ==========================================================================

  /**
   * Ejecuta todos los health checks
   */
  async getHealthReport(): Promise<HealthReport> {
    const checks: HealthCheck[] = [];
    
    // 1. Verificar IndexedDB
    checks.push(await this.checkIndexedDB());
    
    // 2. Verificar sincronización
    checks.push(await this.checkSyncStatus());
    
    // 3. Verificar vencimientos críticos
    checks.push(await this.checkExpiryHealth());
    
    // 4. Verificar espacio de almacenamiento
    checks.push(await this.checkStorage());
    
    // 5. Verificar cola de sincronización
    checks.push(await this.checkSyncQueue());

    // Determinar estado general
    const overall = this.calculateOverallStatus(checks);

    return {
      overall,
      checks,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
    };
  }

  private async checkIndexedDB(): Promise<HealthCheck> {
    const start = Date.now();
    
    try {
      await db.products.count();
      await db.sessions.count();
      
      return {
        name: 'IndexedDB',
        status: 'healthy',
        message: 'Base de datos accesible',
        duration: Date.now() - start,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        name: 'IndexedDB',
        status: 'unhealthy',
        message: `Error: ${String(error)}`,
        duration: Date.now() - start,
        timestamp: Date.now(),
      };
    }
  }

  private async checkSyncStatus(): Promise<HealthCheck> {
    try {
      const queue = await db.syncQueue.toArray();
      const failedOps = queue.filter(q => q.retries >= 3).length;
      
      if (failedOps > 10) {
        return {
          name: 'Sincronización',
          status: 'unhealthy',
          message: `${failedOps} operaciones fallidas`,
          timestamp: Date.now(),
        };
      } else if (failedOps > 0) {
        return {
          name: 'Sincronización',
          status: 'degraded',
          message: `${failedOps} operaciones con errores`,
          timestamp: Date.now(),
        };
      }
      
      return {
        name: 'Sincronización',
        status: 'healthy',
        message: 'Sin errores de sincronización',
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        name: 'Sincronización',
        status: 'degraded',
        message: `Error al verificar: ${String(error)}`,
        timestamp: Date.now(),
      };
    }
  }

  private async checkExpiryHealth(): Promise<HealthCheck> {
    try {
      const expirations = await db.table('expirations').toArray();
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      let criticalCount = 0;
      let expiredCount = 0;
      
      for (const exp of expirations) {
        const expiryDate = new Date(exp.yyyy, exp.mm - 1, 1);
        const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysLeft < 0) expiredCount++;
        else if (daysLeft <= 7) criticalCount++;
      }
      
      if (expiredCount > 0 || criticalCount > 0) {
        return {
          name: 'Vencimientos',
          status: expiredCount > 0 ? 'unhealthy' : 'degraded',
          message: `${expiredCount} vencidos, ${criticalCount} por vencer esta semana`,
          timestamp: Date.now(),
        };
      }
      
      return {
        name: 'Vencimientos',
        status: 'healthy',
        message: 'Sin vencimientos críticos',
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        name: 'Vencimientos',
        status: 'degraded',
        message: `Error: ${String(error)}`,
        timestamp: Date.now(),
      };
    }
  }

  private async checkStorage(): Promise<HealthCheck> {
    try {
      // Estimar tamaño usando navigator.storage
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
        const quotaMB = ((estimate.quota || 0) / (1024 * 1024)).toFixed(2);
        const usagePercent = estimate.quota ? Math.round((estimate.usage! / estimate.quota) * 100) : 0;
        
        if (usagePercent > 90) {
          return {
            name: 'Almacenamiento',
            status: 'unhealthy',
            message: `${usedMB}MB / ${quotaMB}MB (${usagePercent}%) - CRÍTICO`,
            timestamp: Date.now(),
          };
        } else if (usagePercent > 75) {
          return {
            name: 'Almacenamiento',
            status: 'degraded',
            message: `${usedMB}MB / ${quotaMB}MB (${usagePercent}%)`,
            timestamp: Date.now(),
          };
        }
        
        return {
          name: 'Almacenamiento',
          status: 'healthy',
          message: `${usedMB}MB / ${quotaMB}MB`,
          timestamp: Date.now(),
        };
      }
      
      return {
        name: 'Almacenamiento',
        status: 'healthy',
        message: 'No disponible para verificar',
        timestamp: Date.now(),
      };
    } catch {
      return {
        name: 'Almacenamiento',
        status: 'degraded',
        message: 'Error al verificar',
        timestamp: Date.now(),
      };
    }
  }

  private async checkSyncQueue(): Promise<HealthCheck> {
    try {
      const queue = await db.syncQueue.toArray();
      const pendingOps = queue.filter(q => q.retries < 3);
      
      if (pendingOps.length > 100) {
        return {
          name: 'Cola de Sync',
          status: 'degraded',
          message: `${pendingOps.length} operaciones pendientes`,
          timestamp: Date.now(),
        };
      }
      
      return {
        name: 'Cola de Sync',
        status: 'healthy',
        message: `${pendingOps.length} operaciones pendientes`,
        timestamp: Date.now(),
      };
    } catch {
      return {
        name: 'Cola de Sync',
        status: 'degraded',
        message: 'Error al verificar cola',
        timestamp: Date.now(),
      };
    }
  }

  private calculateOverallStatus(checks: HealthCheck[]): HealthStatus {
    if (checks.some(c => c.status === 'unhealthy')) {
      return 'unhealthy';
    }
    if (checks.some(c => c.status === 'degraded')) {
      return 'degraded';
    }
    return 'healthy';
  }

  // ==========================================================================
  // MÉTRICAS
  // ==========================================================================

  /**
   * Obtiene métricas actuales del sistema
   */
  async getMetrics(): Promise<SystemMetrics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    try {
      const [
        totalProducts,
        totalSessions,
        totalScans,
        totalExpirations,
        scans,
        sessions,
        expirations,
        syncQueue,
      ] = await Promise.all([
        db.products.count(),
        db.sessions.count(),
        db.scans.count(),
        db.table('expirations').count(),
        db.scans.toArray(),
        db.sessions.toArray(),
        db.table('expirations').toArray(),
        db.syncQueue.toArray(),
      ]);

      // Scans de hoy
      const scansToday = scans.filter(s => s.timestamp >= todayStart).length;
      
      // Sesiones activas
      const sessionsActive = sessions.filter(s => s.status === 'active').length;
      
      // Vencimientos
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      let expiringThisWeek = 0;
      let expiringThisMonth = 0;
      let expiredCount = 0;
      
      for (const exp of expirations) {
        const expiryDate = new Date(exp.yyyy, exp.mm - 1, 1);
        const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysLeft < 0) expiredCount++;
        else if (daysLeft <= 7) expiringThisWeek++;
        if (daysLeft <= 30) expiringThisMonth++;
      }
      
      // Métricas de sincronización
      const pendingOps = syncQueue.filter(q => q.retries < 3);
      const failedOps = syncQueue.filter(q => q.retries >= 3);
      
      // Calcular tasa de éxito
      const totalOps = syncQueue.length;
      const successRate = totalOps > 0 
        ? Math.round(((totalOps - failedOps.length) / totalOps) * 100) 
        : 100;

      // Obtener última sync exitosa
      const syncLogs = await db.sync_logs
        .orderBy('timestamp')
        .reverse()
        .limit(100)
        .toArray();
      
      const lastSuccess = syncLogs.find(l => l.status === 'success');
      
      return {
        totalProducts,
        totalSessions,
        totalScans,
        totalExpirations,
        pendingSyncs: pendingOps.length,
        scansToday,
        sessionsActive,
        expiringThisWeek,
        expiringThisMonth,
        expiredCount,
        syncSuccessRate: successRate,
        lastSyncAt: lastSuccess?.timestamp,
        pendingOperations: pendingOps.length,
        failedOperations: failedOps.length,
        // ✅ Timestamp para historial
        timestamp: Date.now(),
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('HealthService', 'Failed to get metrics', error.message);
      throw error;
    }
  }

  /**
   * Obtiene historial de métricas
   */
  getMetricsHistory(): SystemMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Registra métricas en el historial
   */
  private async recordMetrics(): Promise<void> {
    try {
      const metrics = await this.getMetrics();
      this.metricsHistory.push(metrics);
      
      // Limitar tamaño del historial
      if (this.metricsHistory.length > this.METRICS_HISTORY_SIZE) {
        this.metricsHistory.shift();
      }
      
      // Generar alertas basadas en métricas
      this.generateAlerts(metrics);
    } catch (error) {
      logger.error('HealthService', 'Failed to record metrics', String(error));
    }
  }

  private startMetricsCollection(): void {
    // Registrar métricas cada 5 minutos
    setInterval(() => {
      this.recordMetrics();
    }, 5 * 60 * 1000);
    
    // Registro inicial
    this.recordMetrics();
  }

  // ==========================================================================
  // ALERTAS
  // ==========================================================================

  /**
   * Genera alertas basadas en métricas
   */
  private generateAlerts(metrics: SystemMetrics): void {
    // Alerta por vencimientos próximos
    if (metrics.expiringThisWeek > 10) {
      this.addAlert({
        type: 'warning',
        title: 'Muchos vencimientos próximos',
        message: `${metrics.expiringThisWeek} productos vencen esta semana`,
        source: 'HealthService',
      });
    }
    
    // Alerta por vencimientos críticos
    if (metrics.expiredCount > 0) {
      this.addAlert({
        type: 'critical',
        title: 'Productos vencidos',
        message: `${metrics.expiredCount} productos ya están vencidos`,
        source: 'HealthService',
      });
    }
    
    // Alerta por sync fallido
    if (metrics.failedOperations > 5) {
      this.addAlert({
        type: 'warning',
        title: 'Sincronización con problemas',
        message: `${metrics.failedOperations} operaciones de sync fallidas`,
        source: 'HealthService',
      });
    }
    
    // Alerta por baja tasa de éxito
    if (metrics.syncSuccessRate < 80) {
      this.addAlert({
        type: 'warning',
        title: 'Tasa de sincronización baja',
        message: `Tasa de éxito: ${metrics.syncSuccessRate}%`,
        source: 'HealthService',
      });
    }
  }

  /**
   * Agrega una alerta
   */
  addAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const newAlert: Alert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      acknowledged: false,
    };
    
    this.alerts.unshift(newAlert);
    
    // Limitar número de alertas
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts.pop();
    }
    
    // Guardar en localStorage
    this.saveAlerts();
    
    logger.info('HealthService', `Alert added: ${alert.title}`);
  }

  /**
   * Obtiene alertas no leídas
   */
  getUnacknowledgedAlerts(): Alert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Obtiene todas las alertas
   */
  getAlerts(): Alert[] {
    return [...this.alerts];
  }

  /**
   * Confirma una alerta
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.saveAlerts();
    }
  }

  /**
   * Confirma todas las alertas
   */
  acknowledgeAllAlerts(): void {
    this.alerts.forEach(a => a.acknowledged = true);
    this.saveAlerts();
  }

  /**
   * Limpia alertas antiguas
   */
  clearOldAlerts(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
    this.saveAlerts();
  }

  private saveAlerts(): void {
    try {
      localStorage.setItem('health_alerts', JSON.stringify(this.alerts));
    } catch {
      // Ignore storage errors
    }
  }

  private loadAlerts(): void {
    try {
      const stored = localStorage.getItem('health_alerts');
      if (stored) {
        this.alerts = JSON.parse(stored);
      }
    } catch {
      this.alerts = [];
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Obtiene el uptime formateado
   */
  getUptime(): string {
    const ms = Date.now() - this.startTime;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Formatea el reporte de salud
   */
  formatHealthReport(report: HealthReport): string {
    const statusIcon = report.overall === 'healthy' ? '✅' 
      : report.overall === 'degraded' ? '⚠️' 
      : '❌';
    
    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('                    SALUD DEL SISTEMA');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`${statusIcon} Estado: ${report.overall.toUpperCase()}`);
    lines.push(`⏱️  Uptime: ${this.getUptime()}`);
    lines.push(`🕐 Última verificación: ${new Date(report.timestamp).toLocaleTimeString()}`);
    lines.push('');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('COMPONENTES');
    lines.push('───────────────────────────────────────────────────────────────');
    
    for (const check of report.checks) {
      const icon = check.status === 'healthy' ? '✅' 
        : check.status === 'degraded' ? '⚠️' 
        : '❌';
      lines.push(`${icon} ${check.name}: ${check.message}`);
    }
    
    lines.push('');
    
    return lines.join('\n');
  }
}

// Instancia singleton
export const healthService = HealthService.getInstance();

// Hook para usar en componentes
export const useHealthService = () => healthService;
