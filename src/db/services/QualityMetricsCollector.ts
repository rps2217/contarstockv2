/**
 * QualityMetricsCollector - Recopilador de Métricas de Calidad
 *
 * Proporciona métricas de calidad de datos para dashboards y reportes:
 * - Métricas de conteo (exactitud, discrepancias)
 * - Métricas de sincronización (tasa de éxito, latencia)
 * - Métricas de datos (tasa de duplicados, errores de validación)
 * - Tendencias históricas
 */

import { db } from '../../db';
import { logger } from '@/services/logger';
import { TransactionalSyncQueue } from './TransactionalSyncQueue';
import { IntegrityValidator } from './IntegrityValidator';

// ============================================================================
// TIPOS
// ============================================================================

export interface QualityMetrics {
  timestamp: number;
  period: 'day' | 'week' | 'month' | 'all';
  counting: CountingMetrics;
  sync: SyncMetrics;
  data: DataQualityMetrics;
  summary: QualitySummary;
}

export interface CountingMetrics {
  totalSessions: number;
  completedSessions: number;
  inProgressSessions: number;
  draftSessions: number;
  averageAccuracy: number;
  discrepancyRate: number;
  totalScans: number;
  averageScansPerSession: number;
  bySessionType: Record<
    string,
    {
      count: number;
      completed: number;
      accuracy: number;
    }
  >;
}

export interface SyncMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: number;
  averageLatency: number;
  operationsByTable: Record<
    string,
    {
      total: number;
      success: number;
      failed: number;
    }
  >;
  pendingOperations: number;
  oldestPendingAge: number | null;
}

export interface DataQualityMetrics {
  totalRecords: number;
  orphanedRecords: number;
  duplicateRecords: number;
  validationErrors: number;
  orphanRate: number;
  duplicateRate: number;
  validationErrorRate: number;
  integrityScore: number;
}

export interface QualitySummary {
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: QualityIssue[];
  recommendations: string[];
}

export interface QualityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'counting' | 'sync' | 'data';
  title: string;
  description: string;
  affectedCount?: number;
}

export interface QualityTrend {
  timestamp: number;
  overallScore: number;
  accuracy: number;
  syncSuccessRate: number;
}

// ============================================================================
// SERVICE
// ============================================================================

class QualityMetricsCollectorClass {
  private readonly STORAGE_KEY = 'quality_metrics_history';
  private readonly MAX_HISTORY = 90; // 90 días de historial

  /**
   * Recopilar todas las métricas de calidad
   */
  async collect(period: 'day' | 'week' | 'month' | 'all' = 'day'): Promise<QualityMetrics> {
    const timestamp = Date.now();
    const cutoff = this.getCutoff(period);

    try {
      // Recopilar métricas en paralelo
      const [counting, sync, data] = await Promise.all([
        this.collectCountingMetrics(cutoff),
        this.collectSyncMetrics(cutoff),
        this.collectDataQualityMetrics(),
      ]);

      // Recopilar issues después
      const issues = await this.collectIssues(counting, sync, data);

      // Calcular resumen
      const summary = this.calculateSummary(counting, sync, data, issues);

      // Guardar en historial
      await this.saveToHistory({
        timestamp,
        overallScore: summary.overallScore,
        accuracy: counting.averageAccuracy,
        syncSuccessRate: sync.successRate,
      });

      return {
        timestamp,
        period,
        counting,
        sync,
        data,
        summary,
      };
    } catch (error) {
      logger.error('QualityMetricsCollector', 'Failed to collect metrics', { error });
      throw error;
    }
  }

  /**
   * Recopilar métricas de conteo
   */
  private async collectCountingMetrics(cutoff: number): Promise<CountingMetrics> {
    const sessions = await db.sessions.where('createdAt').aboveOrEqual(cutoff).toArray();

    const completed = sessions.filter(s => s.status === 'completed');
    const inProgress = sessions.filter(s => s.status === 'active');
    const draft = sessions.filter(s => s.status === 'draft');

    // Contar scans
    const sessionIds = sessions.map(s => s.id);
    const scans =
      sessionIds.length > 0 ? await db.scans.where('sessionId').anyOf(sessionIds).toArray() : [];

    // Calcular exactitud promedio (si hay carga teórica)
    let totalAccuracy = 0;
    let accuracyCount = 0;
    let totalDiscrepancies = 0;

    for (const session of completed) {
      if (session.expectedItems && session.expectedItems.length > 0) {
        const sessionScans = scans.filter(s => s.sessionId === session.id);
        const expectedMap = new Map(
          session.expectedItems.map(i => [i.barcode, i.expectedQty || 0])
        );

        let sessionDiscrepancies = 0;
        for (const scan of sessionScans) {
          const expected = expectedMap.get(scan.barcode) || 0;
          if (scan.quantity !== expected) {
            sessionDiscrepancies++;
          }
        }

        if (sessionScans.length > 0) {
          const accuracy =
            ((sessionScans.length - sessionDiscrepancies) / sessionScans.length) * 100;
          totalAccuracy += accuracy;
          accuracyCount++;
          totalDiscrepancies += sessionDiscrepancies;
        }
      }
    }

    const averageAccuracy = accuracyCount > 0 ? totalAccuracy / accuracyCount : 100;
    const totalScansCount = scans.length;
    const discrepancyRate = totalScansCount > 0 ? (totalDiscrepancies / totalScansCount) * 100 : 0;

    // Agrupar por tipo de sesión
    const bySessionType: CountingMetrics['bySessionType'] = {};
    for (const session of sessions) {
      const type = session.sessionType || 'unknown';
      if (!bySessionType[type]) {
        bySessionType[type] = { count: 0, completed: 0, accuracy: 0 };
      }
      bySessionType[type].count++;
      if (session.status === 'completed') {
        bySessionType[type].completed++;
      }
    }

    return {
      totalSessions: sessions.length,
      completedSessions: completed.length,
      inProgressSessions: inProgress.length,
      draftSessions: draft.length,
      averageAccuracy,
      discrepancyRate,
      totalScans: totalScansCount,
      averageScansPerSession: sessions.length > 0 ? totalScansCount / sessions.length : 0,
      bySessionType,
    };
  }

  /**
   * Recopilar métricas de sincronización
   */
  private async collectSyncMetrics(cutoff: number): Promise<SyncMetrics> {
    const stats = await TransactionalSyncQueue.getStats();
    const metrics = TransactionalSyncQueue.getMetrics();

    // Obtener logs de sync
    const syncLogs = await db.sync_logs.where('timestamp').aboveOrEqual(cutoff).toArray();

    // Agrupar por tabla
    const operationsByTable: SyncMetrics['operationsByTable'] = {};
    for (const log of syncLogs) {
      const table = log.tableName || 'unknown';
      if (!operationsByTable[table]) {
        operationsByTable[table] = { total: 0, success: 0, failed: 0 };
      }
      operationsByTable[table].total++;
      if (log.status === 'success') {
        operationsByTable[table].success++;
      } else {
        operationsByTable[table].failed++;
      }
    }

    // Encontrar operación más antigua pendiente
    const queue = await db.syncQueue.toArray();
    const pending = queue.filter(q => q.retries < 5);
    let oldestPendingAge: number | null = null;

    if (pending.length > 0) {
      const oldest = Math.min(...pending.map(p => p.timestamp));
      oldestPendingAge = Date.now() - oldest;
    }

    return {
      totalOperations: metrics.totalProcessed,
      successfulOperations: metrics.totalSucceeded,
      failedOperations: metrics.totalFailed,
      successRate:
        metrics.totalProcessed > 0 ? (metrics.totalSucceeded / metrics.totalProcessed) * 100 : 100,
      averageLatency: metrics.avgDuration,
      operationsByTable,
      pendingOperations: stats.pending,
      oldestPendingAge,
    };
  }

  /**
   * Recopilar métricas de calidad de datos
   */
  private async collectDataQualityMetrics(): Promise<DataQualityMetrics> {
    const integrity = await IntegrityValidator.validate(false);

    const tables = ['products', 'sessions', 'scans', 'expirations'];
    let totalRecords = 0;

    for (const table of tables) {
      try {
        totalRecords += await db.table(table).count();
      } catch {
        // Tabla puede no existir
      }
    }

    const orphanedRecords = integrity.metrics.orphanedRecords;
    const duplicateRecords = integrity.metrics.duplicateRecords;
    const validationErrors = integrity.metrics.validationErrors;

    return {
      totalRecords,
      orphanedRecords,
      duplicateRecords,
      validationErrors,
      orphanRate: totalRecords > 0 ? (orphanedRecords / totalRecords) * 100 : 0,
      duplicateRate: totalRecords > 0 ? (duplicateRecords / totalRecords) * 100 : 0,
      validationErrorRate: totalRecords > 0 ? (validationErrors / totalRecords) * 100 : 0,
      integrityScore: this.calculateIntegrityScore(integrity),
    };
  }

  /**
   * Recopilar problemas
   */
  private async collectIssues(
    counting: CountingMetrics,
    sync: SyncMetrics,
    data: DataQualityMetrics
  ): Promise<QualityIssue[]> {
    const issues: QualityIssue[] = [];

    // Problemas de conteo
    if (counting.discrepancyRate > 20) {
      issues.push({
        severity: 'high',
        category: 'counting',
        title: 'Alta tasa de discrepancias',
        description: `${counting.discrepancyRate.toFixed(1)}% de los scans tienen discrepancias con la carga teórica`,
        affectedCount: Math.round(counting.totalScans * (counting.discrepancyRate / 100)),
      });
    }

    if (counting.averageAccuracy < 80) {
      issues.push({
        severity: 'medium',
        category: 'counting',
        title: 'Exactitud baja',
        description: `La exactitud promedio es ${counting.averageAccuracy.toFixed(1)}%`,
        affectedCount: counting.completedSessions,
      });
    }

    // Problemas de sync
    if (sync.successRate < 90) {
      issues.push({
        severity: 'critical',
        category: 'sync',
        title: 'Tasa de éxito de sincronización baja',
        description: `Solo el ${sync.successRate.toFixed(1)}% de las operaciones se sincronizan correctamente`,
        affectedCount: sync.failedOperations,
      });
    }

    if (sync.pendingOperations > 50) {
      issues.push({
        severity: 'medium',
        category: 'sync',
        title: 'Muchas operaciones pendientes',
        description: `Hay ${sync.pendingOperations} operaciones pendientes de sincronización`,
      });
    }

    if (sync.oldestPendingAge && sync.oldestPendingAge > 24 * 60 * 60 * 1000) {
      issues.push({
        severity: 'high',
        category: 'sync',
        title: 'Operación pendiente muy antigua',
        description: `La operación más antigua lleva ${Math.round(sync.oldestPendingAge / (60 * 60 * 1000))} horas sin sincronizar`,
      });
    }

    // Problemas de datos
    if (data.orphanRate > 5) {
      issues.push({
        severity: 'high',
        category: 'data',
        title: 'Registros huérfanos',
        description: `${data.orphanedRecords} registros sin referencias válidas`,
        affectedCount: data.orphanedRecords,
      });
    }

    if (data.duplicateRate > 1) {
      issues.push({
        severity: 'medium',
        category: 'data',
        title: 'Registros duplicados',
        description: `${data.duplicateRecords} barcodes tienen duplicados`,
        affectedCount: data.duplicateRecords,
      });
    }

    return issues;
  }

  /**
   * Calcular resumen de calidad
   */
  private calculateSummary(
    counting: CountingMetrics,
    sync: SyncMetrics,
    data: DataQualityMetrics,
    issues: QualityIssue[]
  ): QualitySummary {
    // Calcular score general
    let score = 100;

    // Penalizar por exactitud
    score -= Math.max(0, (100 - counting.averageAccuracy) * 0.3);

    // Penalizar por tasa de éxito de sync
    score -= Math.max(0, (100 - sync.successRate) * 0.25);

    // Penalizar por problemas de datos
    score -= data.orphanRate * 2;
    score -= data.duplicateRate * 1;
    score -= data.validationErrorRate * 0.5;

    // Penalizar por issues
    for (const issue of issues) {
      if (issue.severity === 'critical') score -= 15;
      else if (issue.severity === 'high') score -= 10;
      else if (issue.severity === 'medium') score -= 5;
      else score -= 2;
    }

    score = Math.max(0, Math.min(100, score));

    // Determinar grade
    let grade: QualitySummary['grade'];
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    // Generar recomendaciones
    const recommendations: string[] = [];

    if (counting.discrepancyRate > 10) {
      recommendations.push('Revisar el proceso de conteo para reducir discrepancias');
    }

    if (sync.successRate < 95) {
      recommendations.push('Verificar la conexión a la nube y los permisos de la cuenta');
    }

    if (data.orphanRate > 0) {
      recommendations.push('Ejecutar la herramienta de integridad de datos');
    }

    if (sync.pendingOperations > 20) {
      recommendations.push('Procesar las operaciones de sincronización pendientes');
    }

    if (recommendations.length === 0 && issues.length === 0) {
      recommendations.push('Continuar monitoreando las métricas de calidad');
    }

    return {
      overallScore: score,
      grade,
      issues,
      recommendations,
    };
  }

  /**
   * Calcular score de integridad
   */
  private calculateIntegrityScore(integrity: any): number {
    let score = 100;
    score -= Math.min(30, integrity.metrics.orphanedRecords * 0.5);
    score -= Math.min(20, integrity.metrics.duplicateRecords * 2);
    score -= Math.min(50, integrity.metrics.validationErrors * 1);
    return Math.max(0, score);
  }

  /**
   * Obtener cutoff para periodo
   */
  private getCutoff(period: 'day' | 'week' | 'month' | 'all'): number {
    const now = Date.now();
    switch (period) {
      case 'day':
        return now - 24 * 60 * 60 * 1000;
      case 'week':
        return now - 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return now - 30 * 24 * 60 * 60 * 1000;
      case 'all':
        return 0;
    }
  }

  /**
   * Guardar en historial
   */
  private async saveToHistory(trend: QualityTrend): Promise<void> {
    try {
      const history = await this.getHistory();
      history.push(trend);

      // Mantener solo últimos MAX_HISTORY
      while (history.length > this.MAX_HISTORY) {
        history.shift();
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      logger.error('QualityMetricsCollector', 'Failed to save history', { error });
    }
  }

  /**
   * Obtener historial de tendencias
   */
  async getHistory(days = 30): Promise<QualityTrend[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const history: QualityTrend[] = JSON.parse(stored);
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

      return history.filter(h => h.timestamp >= cutoff);
    } catch {
      return [];
    }
  }

  /**
   * Obtener métricas resumidas para widgets
   */
  async getQuickMetrics(): Promise<{
    score: number;
    grade: string;
    trend: 'up' | 'down' | 'stable';
    lastUpdated: number;
  }> {
    const metrics = await this.collect('day');
    const history = await this.getHistory(7);

    // Calcular tendencia
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (history.length >= 2) {
      const recent = history.slice(-5);
      const older = recent.slice(0, Math.floor(recent.length / 2));
      const newer = recent.slice(Math.floor(recent.length / 2));

      const avgRecent = newer.reduce((sum, h) => sum + h.overallScore, 0) / newer.length;
      const avgOlder = older.reduce((sum, h) => sum + h.overallScore, 0) / older.length;

      if (avgRecent > avgOlder + 2) trend = 'up';
      else if (avgRecent < avgOlder - 2) trend = 'down';
    }

    return {
      score: metrics.summary.overallScore,
      grade: metrics.summary.grade,
      trend,
      lastUpdated: metrics.timestamp,
    };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const QualityMetricsCollector = new QualityMetricsCollectorClass();
export default QualityMetricsCollector;
