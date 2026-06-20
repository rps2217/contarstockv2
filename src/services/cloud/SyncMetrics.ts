/**
 * =============================================================================
 * SYNC METRICS - Métricas y Monitoreo de Sincronización
 * =============================================================================
 * 
 * Proporciona métricas en tiempo real sobre el estado de sincronización:
 * - Latencia de sync
 * - Tasa de éxito/fallo
 * - Registros sincronizados por tabla
 * - Historial de operaciones
 * 
 * @module SyncMetrics
 */

import { db } from '../../db';
import { syncRegistry } from './syncRegistry';

// =============================================================================
// TIPOS
// =============================================================================

export interface SyncMetric {
  timestamp: number;
  table: string;
  operation: 'push' | 'pull' | 'sync';
  success: boolean;
  duration: number; // ms
  recordsAffected: number;
  error?: string;
}

export interface SyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalRecordsPushed: number;
  totalRecordsPulled: number;
  averageLatency: number;
  lastSyncTime: number | null;
  tables: Record<string, TableStats>;
}

export interface TableStats {
  syncCount: number;
  successCount: number;
  failCount: number;
  recordsPushed: number;
  recordsPulled: number;
  avgLatency: number;
}

export interface SyncHealth {
  isHealthy: boolean;
  score: number; // 0-100
  issues: string[];
  lastCheck: number;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const METRICS_RETENTION_DAYS = 7;
const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

// =============================================================================
// CLASE SYNC METRICS
// =============================================================================

class SyncMetricsService {
  private metrics: SyncMetric[] = [];
  private listeners: Array<(metric: SyncMetric) => void> = [];
  private initialized = false;

  /**
   * Inicializa el servicio cargando métricas históricas.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Limpiar métricas antiguas
      const cutoff = Date.now() - (METRICS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      await this.cleanupOldMetrics(cutoff);
      
      this.initialized = true;
    } catch (e) {
      console.error('Failed to init SyncMetrics:', e);
    }
  }

  /**
   * Registra una métrica de sincronización.
   */
  recordMetric(metric: Omit<SyncMetric, 'timestamp'>): void {
    const fullMetric: SyncMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.metrics.push(fullMetric);
    
    // Notificar listeners
    this.listeners.forEach(listener => {
      try {
        listener(fullMetric);
      } catch (e) {
        console.error('Metric listener error:', e);
      }
    });

    // Persistir en IndexedDB
    this.persistMetric(fullMetric).catch(console.error);
  }

  /**
   * Registra una operación de push.
   */
  recordPush(table: string, success: boolean, duration: number, records: number, error?: string): void {
    this.recordMetric({
      table,
      operation: 'push',
      success,
      duration,
      recordsAffected: records,
      error
    });
  }

  /**
   * Registra una operación de pull.
   */
  recordPull(table: string, success: boolean, duration: number, records: number, error?: string): void {
    this.recordMetric({
      table,
      operation: 'pull',
      success,
      duration,
      recordsAffected: records,
      error
    });
  }

  /**
   * Registra una operación de sync completo.
   */
  recordSync(table: string, success: boolean, duration: number, pushed: number, pulled: number, error?: string): void {
    this.recordMetric({
      table,
      operation: 'sync',
      success,
      duration,
      recordsAffected: pushed + pulled,
      error
    });
  }

  /**
   * Obtiene estadísticas agregadas.
   */
  getStats(): SyncStats {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 24 * 60 * 60 * 1000);

    const totalSyncs = recentMetrics.length;
    const successfulSyncs = recentMetrics.filter(m => m.success).length;
    const failedSyncs = totalSyncs - successfulSyncs;

    const totalRecordsPushed = recentMetrics
      .filter(m => m.operation === 'push' || m.operation === 'sync')
      .reduce((sum, m) => sum + m.recordsAffected, 0);

    const totalRecordsPulled = recentMetrics
      .filter(m => m.operation === 'pull' || m.operation === 'sync')
      .reduce((sum, m) => sum + m.recordsAffected, 0);

    const avgLatency = totalSyncs > 0
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalSyncs
      : 0;

    const lastSync = recentMetrics.sort((a, b) => b.timestamp - a.timestamp)[0];
    const lastSyncTime = lastSync?.timestamp || null;

    // Stats por tabla
    const tables: Record<string, TableStats> = {};
    const tableKeys = [...new Set(recentMetrics.map(m => m.table))];

    for (const table of tableKeys) {
      const tableMetrics = recentMetrics.filter(m => m.table === table);
      const tableSyncs = tableMetrics.length;
      const tableSuccess = tableMetrics.filter(m => m.success).length;

      tables[table] = {
        syncCount: tableSyncs,
        successCount: tableSuccess,
        failCount: tableSyncs - tableSuccess,
        recordsPushed: tableMetrics
          .filter(m => m.operation === 'push' || m.operation === 'sync')
          .reduce((sum, m) => sum + m.recordsAffected, 0),
        recordsPulled: tableMetrics
          .filter(m => m.operation === 'pull' || m.operation === 'sync')
          .reduce((sum, m) => sum + m.recordsAffected, 0),
        avgLatency: tableSyncs > 0
          ? tableMetrics.reduce((sum, m) => sum + m.duration, 0) / tableSyncs
          : 0
      };
    }

    return {
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      totalRecordsPushed,
      totalRecordsPulled,
      averageLatency: Math.round(avgLatency),
      lastSyncTime,
      tables
    };
  }

  /**
   * Evalúa la salud del sistema de sincronización.
   */
  getHealth(): SyncHealth {
    const stats = this.getStats();
    const issues: string[] = [];
    
    // Calcular score (0-100)
    let score = 100;

    // Penalizar fallos recientes
    const failureRate = stats.totalSyncs > 0 
      ? stats.failedSyncs / stats.totalSyncs 
      : 0;
    score -= failureRate * 50;

    // Penalizar latencia alta (> 5 segundos)
    if (stats.averageLatency > 5000) {
      score -= 20;
      issues.push(`Latencia alta: ${Math.round(stats.averageLatency / 1000)}s promedio`);
    }

    // Penalizar sync muy antiguos (> 30 minutos)
    if (stats.lastSyncTime && Date.now() - stats.lastSyncTime > 30 * 60 * 1000) {
      score -= 15;
      issues.push('Última sincronización hace más de 30 minutos');
    }

    // Penalizar tablas sin sync reciente
    for (const [table, tableStats] of Object.entries(stats.tables)) {
      if (tableStats.failCount > tableStats.successCount) {
        score -= 10;
        issues.push(`Tabla ${table}: más fallos que éxitos`);
      }
    }

    // Score mínimo 0
    score = Math.max(0, Math.min(100, Math.round(score)));

    return {
      isHealthy: score >= 70 && issues.length === 0,
      score,
      issues,
      lastCheck: Date.now()
    };
  }

  /**
   * Obtiene el historial de métricas.
   */
  getHistory(limit = 100): SyncMetric[] {
    return this.metrics
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Obtiene métricas de las últimas N horas.
   */
  getRecentMetrics(hours = 24): SyncMetric[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Suscribe a nuevas métricas.
   */
  subscribe(listener: (metric: SyncMetric) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Formatea duración para display.
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms / 60000)}m`;
  }

  /**
   * Formatea timestamp relativo.
   */
  static formatRelativeTime(timestamp: number | null): string {
    if (!timestamp) return 'Nunca';
    
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `Hace ${seconds}s`;
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)}h`;
    return `Hace ${Math.floor(seconds / 86400)}d`;
  }

  // =============================================================================
  // PERSISTENCIA
  // =============================================================================

  private async persistMetric(metric: SyncMetric): Promise<void> {
    try {
      await db.sync_logs.add({
        timestamp: metric.timestamp,
        action: `sync_${metric.operation}`,
        tableName: metric.table,
        payload: {
          success: metric.success,
          duration: metric.duration,
          recordsAffected: metric.recordsAffected
        },
        status: metric.success ? 'success' : 'error',
        errorMessage: metric.error
      });
    } catch (e) {
      console.error('Failed to persist metric:', e);
    }
  }

  private async cleanupOldMetrics(cutoff: number): Promise<void> {
    try {
      await db.sync_logs
        .where('timestamp')
        .below(cutoff)
        .delete();
    } catch (e) {
      console.error('Failed to cleanup old metrics:', e);
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const syncMetrics = new SyncMetricsService();
export { SyncMetricsService };
