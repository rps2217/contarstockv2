/**
 * DatabaseHealthService - Sistema de diagnóstico de salud de la base de datos
 *
 * Proporciona:
 * - Verificación de integridad de datos
 * - Detección de inconsistencias
 * - Métricas de uso y performance
 * - Alertas de problemas potenciales
 * - Sugerencias de optimización
 */

import { db } from '../../db';
import { logger } from '@/services/logger';

// ============================================================================
// TIPOS
// ============================================================================

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  checks: HealthCheck[];
  overallScore: number; // 0-100
  timestamp: number;
  recommendations: Recommendation[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'critical';
  message: string;
  details?: any;
  duration: number; // ms
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  estimatedImpact?: string;
}

export interface TableStats {
  tableName: string;
  recordCount: number;
  sizeEstimate: number; // bytes
  lastOperation: number | null;
  indexCount: number;
  hasUnusedIndexes: boolean;
}

export interface QueryMetrics {
  tableName: string;
  operation: string;
  avgDuration: number;
  p50: number;
  p95: number;
  p99: number;
  totalOperations: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const HEALTH_THRESHOLDS = {
  maxRecordsPerTable: 100000,
  maxTotalRecords: 500000,
  minFreeSpace: 50 * 1024 * 1024, // 50MB
  maxQueryTime: 100, // ms
  maxOrphanedRecords: 100,
  maxSyncQueueSize: 1000,
};

// ============================================================================
// SERVICE
// ============================================================================

class DatabaseHealthServiceClass {
  private lastHealthCheck: HealthCheckResult | null = null;
  private queryMetrics: Map<string, QueryMetrics> = new Map();

  /**
   * Ejecutar todos los checks de salud
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = performance.now();
    const checks: HealthCheck[] = [];

    // Ejecutar checks en paralelo
    const [
      integrityCheck,
      syncQueueCheck,
      orphanedRecordsCheck,
      indexCheck,
      storageCheck,
      schemaCheck,
    ] = await Promise.all([
      this.checkDataIntegrity(),
      this.checkSyncQueue(),
      this.checkOrphanedRecords(),
      this.checkIndexes(),
      this.checkStorage(),
      this.checkSchema(),
    ]);

    checks.push(
      integrityCheck,
      syncQueueCheck,
      orphanedRecordsCheck,
      indexCheck,
      storageCheck,
      schemaCheck
    );

    // Calcular score general
    const passCount = checks.filter(c => c.status === 'pass').length;
    const failCount = checks.filter(c => c.status === 'fail').length;
    const warnCount = checks.filter(c => c.status === 'warning').length;
    const overallScore = Math.round(
      (passCount * 100 + warnCount * 50 + failCount * 0) / checks.length
    );

    // Generar recomendaciones
    const recommendations = this.generateRecommendations(checks);

    // Determinar status general
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (failCount > 0 || overallScore < 50) {
      status = 'critical';
    } else if (warnCount > 0 || overallScore < 80) {
      status = 'warning';
    }

    const result: HealthCheckResult = {
      status,
      checks,
      overallScore,
      timestamp: Date.now(),
      recommendations,
    };

    this.lastHealthCheck = result;
    return result;
  }

  /**
   * Check: Integridad de datos
   */
  private async checkDataIntegrity(): Promise<HealthCheck> {
    const startTime = performance.now();
    const issues: string[] = [];

    try {
      // Verificar productos sin barcode válido
      const invalidProducts = await db.products
        .filter(p => !p.barcode || p.barcode.trim() === '')
        .count();

      if (invalidProducts > 0) {
        issues.push(`${invalidProducts} productos con barcode inválido`);
      }

      // Verificar sesiones sin ID
      const invalidSessions = await db.sessions.filter(s => !s.id).count();

      if (invalidSessions > 0) {
        issues.push(`${invalidSessions} sesiones sin ID`);
      }

      // Verificar scans huérfanos (scans sin sesión)
      const sessions = await db.sessions.toArray();
      const sessionIds = new Set(sessions.map(s => s.id));

      const allScans = await db.scans.toArray();
      const orphanedScans = allScans.filter(s => !sessionIds.has(s.sessionId));

      if (orphanedScans.length > HEALTH_THRESHOLDS.maxOrphanedRecords) {
        issues.push(`${orphanedScans.length} scans sin sesión válida`);
      }

      // Verificar registros duplicados
      const duplicateBarcodes = await this.findDuplicateBarcodes();
      if (duplicateBarcodes > 0) {
        issues.push(`${duplicateBarcodes} barcodes duplicados en productos`);
      }

      const duration = performance.now() - startTime;

      if (issues.length === 0) {
        return {
          name: 'Integridad de Datos',
          status: 'pass',
          message: 'Todos los datos están íntegros',
          duration,
        };
      }

      return {
        name: 'Integridad de Datos',
        status: issues.length > 5 ? 'fail' : 'warning',
        message: issues.slice(0, 3).join(', '),
        details: { issues },
        duration,
      };
    } catch (error) {
      return {
        name: 'Integridad de Datos',
        status: 'fail',
        message: `Error al verificar: ${(error as Error).message}`,
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Check: Cola de sincronización
   */
  private async checkSyncQueue(): Promise<HealthCheck> {
    const startTime = performance.now();

    try {
      const pendingCount = await db.syncQueue.count();
      const errorCount = await db.syncQueue.filter(q => q.retries >= 3).count();

      const duration = performance.now() - startTime;

      if (pendingCount === 0) {
        return {
          name: 'Cola de Sincronización',
          status: 'pass',
          message: 'Cola vacía, todo sincronizado',
          duration,
        };
      }

      if (errorCount > pendingCount * 0.5) {
        return {
          name: 'Cola de Sincronización',
          status: 'fail',
          message: `${errorCount} operaciones fallidas de ${pendingCount} pendientes`,
          details: { pendingCount, errorCount },
          duration,
        };
      }

      if (pendingCount > HEALTH_THRESHOLDS.maxSyncQueueSize) {
        return {
          name: 'Cola de Sincronización',
          status: 'warning',
          message: `Cola muy grande: ${pendingCount} operaciones pendientes`,
          details: { pendingCount },
          duration,
        };
      }

      return {
        name: 'Cola de Sincronización',
        status: 'warning',
        message: `${pendingCount} operaciones pendientes`,
        details: { pendingCount, errorCount },
        duration,
      };
    } catch (error) {
      return {
        name: 'Cola de Sincronización',
        status: 'fail',
        message: `Error: ${(error as Error).message}`,
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Check: Registros huérfanos
   */
  private async checkOrphanedRecords(): Promise<HealthCheck> {
    const startTime = performance.now();

    try {
      const orphans: Record<string, number> = {};

      // Scans sin sesión
      const sessions = await db.sessions.toArray();
      const sessionIds = new Set(sessions.map(s => s.id));

      const scans = await db.scans.toArray();
      const orphanScans = scans.filter(s => !sessionIds.has(s.sessionId));
      if (orphanScans.length > 0) {
        orphans.scans = orphanScans.length;
      }

      // Eventos sin sync huérfanos (si aplica)
      const events = await db.events.toArray();
      const orphanEvents = events.filter(e => !e.frcNumber);
      if (orphanEvents.length > 0) {
        orphans.events = orphanEvents.length;
      }

      const duration = performance.now() - startTime;

      const totalOrphans = Object.values(orphans).reduce((a, b) => a + b, 0);

      if (totalOrphans === 0) {
        return {
          name: 'Registros Huérfanos',
          status: 'pass',
          message: 'No hay registros huérfanos',
          duration,
        };
      }

      return {
        name: 'Registros Huérfanos',
        status: totalOrphans > 100 ? 'fail' : 'warning',
        message: `${totalOrphans} registros sin relación válida`,
        details: orphans,
        duration,
      };
    } catch (error) {
      return {
        name: 'Registros Huérfanos',
        status: 'fail',
        message: `Error: ${(error as Error).message}`,
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Check: Índices
   */
  private async checkIndexes(): Promise<HealthCheck> {
    const startTime = performance.now();

    try {
      // Obtener stats de syncMetrics
      const recentMetrics = await db.syncMetrics
        .orderBy('timestamp')
        .reverse()
        .limit(1000)
        .toArray();

      const slowQueries = recentMetrics.filter(m => m.duration > HEALTH_THRESHOLDS.maxQueryTime);

      const duration = performance.now() - startTime;

      if (slowQueries.length === 0) {
        return {
          name: 'Rendimiento de Consultas',
          status: 'pass',
          message: 'Todas las consultas dentro del umbral',
          details: { avgDuration: this.calculateAvg(slowQueries) },
          duration,
        };
      }

      const slowPercentage = (slowQueries.length / recentMetrics.length) * 100;

      return {
        name: 'Rendimiento de Consultas',
        status: slowPercentage > 20 ? 'fail' : 'warning',
        message: `${slowQueries.length} consultas lentas (${slowPercentage.toFixed(1)}%)`,
        details: {
          slowQueries: slowQueries.length,
          totalQueries: recentMetrics.length,
          slowPercentage: slowPercentage.toFixed(1),
        },
        duration,
      };
    } catch (error) {
      return {
        name: 'Rendimiento de Consultas',
        status: 'warning',
        message: `No se pudo verificar: ${(error as Error).message}`,
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Check: Almacenamiento
   */
  private async checkStorage(): Promise<HealthCheck> {
    const startTime = performance.now();

    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();

        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const usedPercent = quota > 0 ? (used / quota) * 100 : 0;

        const duration = performance.now() - startTime;

        if (usedPercent > 90) {
          return {
            name: 'Almacenamiento',
            status: 'critical',
            message: `Uso crítico: ${usedPercent.toFixed(1)}% del espacio disponible`,
            details: {
              used: this.formatBytes(used),
              quota: this.formatBytes(quota),
              usedPercent: usedPercent.toFixed(1),
            },
            duration,
          };
        }

        if (usedPercent > 75) {
          return {
            name: 'Almacenamiento',
            status: 'warning',
            message: `Espacio bajo: ${usedPercent.toFixed(1)}% usado`,
            details: { usedPercent: usedPercent.toFixed(1) },
            duration,
          };
        }

        return {
          name: 'Almacenamiento',
          status: 'pass',
          message: `${usedPercent.toFixed(1)}% del espacio usado`,
          details: {
            used: this.formatBytes(used),
            quota: this.formatBytes(quota),
          },
          duration,
        };
      }

      return {
        name: 'Almacenamiento',
        status: 'warning',
        message: 'No se puede verificar espacio de almacenamiento',
        duration: performance.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Almacenamiento',
        status: 'warning',
        message: `Error al verificar: ${(error as Error).message}`,
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Check: Schema
   */
  private async checkSchema(): Promise<HealthCheck> {
    const startTime = performance.now();

    try {
      // Verificar que todas las tablas esperadas existen
      const tables = db.tables.map(t => t.name);
      const expectedTables = [
        'products',
        'sessions',
        'scans',
        'expectedOrders',
        'logs',
        'syncQueue',
        'settings',
        'locations',
        'events',
        'audit_logs',
      ];

      const missingTables = expectedTables.filter(t => !tables.includes(t));
      const duration = performance.now() - startTime;

      if (missingTables.length > 0) {
        return {
          name: 'Schema de Base de Datos',
          status: 'fail',
          message: `Tablas faltantes: ${missingTables.join(', ')}`,
          details: { missingTables },
          duration,
        };
      }

      return {
        name: 'Schema de Base de Datos',
        status: 'pass',
        message: `Schema válido con ${tables.length} tablas`,
        details: { tableCount: tables.length },
        duration,
      };
    } catch (error) {
      return {
        name: 'Schema de Base de Datos',
        status: 'fail',
        message: `Error: ${(error as Error).message}`,
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Generar recomendaciones basadas en los checks
   */
  private generateRecommendations(checks: HealthCheck[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const check of checks) {
      if (check.status === 'fail') {
        recommendations.push({
          priority: 'high',
          title: `Problema en ${check.name}`,
          description: check.message,
          action: 'Revisar los detalles del check y tomar acción correctiva',
          estimatedImpact: 'Alto - Puede afectar la funcionalidad',
        });
      } else if (check.status === 'warning') {
        recommendations.push({
          priority: 'medium',
          title: `Advertencia en ${check.name}`,
          description: check.message,
          action: 'Monitorear y tomar acción si persiste',
          estimatedImpact: 'Medio - Puede degradar performance',
        });
      }
    }

    // Recomendaciones generales
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        title: 'Base de datos saludable',
        description: 'No se requieren acciones correctivas',
        action: 'Continuar con el monitoreo regular',
        estimatedImpact: 'Ninguno',
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Obtener estadísticas de una tabla
   */
  async getTableStats(tableName: string): Promise<TableStats | null> {
    try {
      const table = db.table(tableName);
      const count = await table.count();

      // Estimar tamaño (aproximado)
      const sample = await table.limit(10).toArray();
      const avgRecordSize = sample.length > 0 ? JSON.stringify(sample).length / sample.length : 100;
      const sizeEstimate = count * avgRecordSize;

      // Obtener última operación
      const lastRecord = await table
        .orderBy('timestamp' in sample[0] ? 'timestamp' : Object.keys(sample[0])[0])
        .last();

      return {
        tableName,
        recordCount: count,
        sizeEstimate,
        lastOperation: (lastRecord as any)?.timestamp || null,
        indexCount: table.schema.indexes?.length || 0,
        hasUnusedIndexes: false, // Por implementar análisis
      };
    } catch (error) {
      logger.error('DatabaseHealthService', 'Error getting table stats', { tableName, error });
      return null;
    }
  }

  /**
   * Obtener estadísticas de todas las tablas
   */
  async getAllTableStats(): Promise<TableStats[]> {
    const stats: TableStats[] = [];

    for (const table of db.tables) {
      const tableStats = await this.getTableStats(table.name);
      if (tableStats) {
        stats.push(tableStats);
      }
    }

    return stats.sort((a, b) => b.recordCount - a.recordCount);
  }

  /**
   * Encontrar barcodes duplicados
   */
  private async findDuplicateBarcodes(): Promise<number> {
    const products = await db.products.toArray();
    const barcodeCount = new Map<string, number>();

    for (const product of products) {
      if (product.barcode) {
        barcodeCount.set(product.barcode, (barcodeCount.get(product.barcode) || 0) + 1);
      }
    }

    return Array.from(barcodeCount.values()).filter(c => c > 1).length;
  }

  /**
   * Calcular promedio
   */
  private calculateAvg(values: { duration: number }[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v.duration, 0) / values.length;
  }

  /**
   * Formatear bytes
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Obtener último resultado de health check
   */
  getLastHealthCheck(): HealthCheckResult | null {
    return this.lastHealthCheck;
  }

  /**
   * Registrar métrica de query
   */
  recordQueryMetric(tableName: string, operation: string, duration: number): void {
    const key = `${tableName}:${operation}`;
    const existing = this.queryMetrics.get(key);

    if (existing) {
      existing.totalOperations++;
      existing.avgDuration =
        (existing.avgDuration * (existing.totalOperations - 1) + duration) /
        existing.totalOperations;

      // Actualizar percentiles (simplificado)
      existing.p50 = existing.avgDuration * 0.9;
      existing.p95 = existing.avgDuration * 1.5;
      existing.p99 = existing.avgDuration * 2;
    } else {
      this.queryMetrics.set(key, {
        tableName,
        operation,
        avgDuration: duration,
        p50: duration * 0.9,
        p95: duration * 1.5,
        p99: duration * 2,
        totalOperations: 1,
      });
    }
  }

  /**
   * Obtener métricas de queries
   */
  getQueryMetrics(): QueryMetrics[] {
    return Array.from(this.queryMetrics.values());
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const DatabaseHealthService = new DatabaseHealthServiceClass();
export default DatabaseHealthService;
