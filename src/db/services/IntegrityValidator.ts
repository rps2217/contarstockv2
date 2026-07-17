/**
 * IntegrityValidator - Validador de Integridad Referencial
 *
 * Implementa validaciones de integridad de datos como las que tiene
 * un WMS profesional (SAP, Oracle).
 *
 * Features:
 * - Detección de registros huérfanos
 * - Validación de referencias
 * - Detección de duplicados
 * - Auto-reparación de problemas comunes
 */

import { db } from '../../db';
import { logger } from '@/services/logger';

// ============================================================================
// TIPOS
// ============================================================================

export interface IntegrityIssue {
  id: string;
  type: 'orphaned' | 'duplicate' | 'invalid_ref' | 'constraint';
  table: string;
  recordIds: string[];
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  autoFixAvailable: boolean;
  estimatedImpact?: string;
}

export interface IntegrityReport {
  timestamp: number;
  duration: number;
  totalIssues: number;
  issuesBySeverity: Record<string, number>;
  issuesByType: Record<string, number>;
  issues: IntegrityIssue[];
  metrics: IntegrityMetrics;
}

export interface IntegrityMetrics {
  totalRecords: number;
  tablesChecked: number;
  orphanedRecords: number;
  duplicateRecords: number;
  invalidReferences: number;
  validationErrors: number;
}

// ============================================================================
// VALIDADOR
// ============================================================================

class IntegrityValidatorClass {
  /**
   * Ejecutar validación completa de integridad
   */
  async validate(includeAutoFix = false): Promise<IntegrityReport> {
    const startTime = performance.now();
    const issues: IntegrityIssue[] = [];

    logger.info('IntegrityValidator', 'Starting full validation');

    // 1. Verificar sesiones huérfanas
    issues.push(...(await this.checkOrphanedScans()));

    // 2. Verificar duplicados en productos
    issues.push(...(await this.checkDuplicateProducts()));

    // 3. Verificar sesiones sin scans
    issues.push(...(await this.checkSessionsWithoutScans()));

    // 4. Verificar expirations sin barcode
    issues.push(...(await this.checkOrphanedExpirations()));

    // 5. Verificar audit logs huérfanos
    issues.push(...(await this.checkOrphanedAuditLogs()));

    // 6. Verificar sync queue corrupta
    issues.push(...(await this.checkCorruptedSyncQueue()));

    // Auto-fix si está habilitado
    if (includeAutoFix) {
      await this.autoFix(issues);
    }

    const duration = performance.now() - startTime;

    // Calcular métricas
    const metrics = this.calculateMetrics(issues);

    // Agrupar por severidad
    const issuesBySeverity = issues.reduce(
      (acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const issuesByType = issues.reduce(
      (acc, issue) => {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const report: IntegrityReport = {
      timestamp: Date.now(),
      duration,
      totalIssues: issues.length,
      issuesBySeverity,
      issuesByType,
      issues,
      metrics,
    };

    logger.info('IntegrityValidator', 'Validation completed', {
      totalIssues: issues.length,
      duration: `${duration.toFixed(2)}ms`,
    });

    return report;
  }

  /**
   * Verificar scans huérfanos (sin sesión válida)
   */
  private async checkOrphanedScans(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    try {
      const sessions = await db.sessions.toArray();
      const sessionIds = new Set(sessions.map(s => s.id));

      const scans = await db.scans.toArray();
      const orphaned = scans.filter(s => !sessionIds.has(s.sessionId));

      if (orphaned.length > 0) {
        issues.push({
          id: `orphan_scans_${Date.now()}`,
          type: 'orphaned',
          table: 'scans',
          recordIds: orphaned.map(s => s.id!),
          severity: orphaned.length > 100 ? 'critical' : orphaned.length > 10 ? 'error' : 'warning',
          description: `${orphaned.length} scans sin sesión válida`,
          autoFixAvailable: true,
          estimatedImpact: `Scans ocuparían ~${Math.round(orphaned.length * 0.5)}KB`,
        });
      }

      // Verificar scans sin barcode válido
      const invalidBarcodes = scans.filter(s => !s.barcode || s.barcode.trim() === '');
      if (invalidBarcodes.length > 0) {
        issues.push({
          id: `invalid_barcode_scans_${Date.now()}`,
          type: 'constraint',
          table: 'scans',
          recordIds: invalidBarcodes.map(s => s.id!),
          severity: 'error',
          description: `${invalidBarcodes.length} scans con barcode inválido`,
          autoFixAvailable: true,
        });
      }

      // Verificar scans sin cantidad
      const invalidQuantity = scans.filter(s => s.quantity === undefined || s.quantity < 0);
      if (invalidQuantity.length > 0) {
        issues.push({
          id: `invalid_quantity_scans_${Date.now()}`,
          type: 'constraint',
          table: 'scans',
          recordIds: invalidQuantity.map(s => s.id!),
          severity: 'error',
          description: `${invalidQuantity.length} scans sin cantidad válida`,
          autoFixAvailable: true,
        });
      }
    } catch (error) {
      logger.error('IntegrityValidator', 'Error checking orphaned scans', { error });
    }

    return issues;
  }

  /**
   * Verificar productos duplicados
   */
  private async checkDuplicateProducts(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    try {
      const products = await db.products.toArray();
      const barcodeCount = new Map<string, string[]>();

      // Agrupar por barcode
      for (const product of products) {
        if (product.barcode) {
          const existing = barcodeCount.get(product.barcode) || [];
          existing.push(product.barcode);
          barcodeCount.set(product.barcode, existing);
        }
      }

      // Encontrar duplicados
      const duplicates: string[] = [];
      for (const [barcode, instances] of barcodeCount) {
        if (instances.length > 1) {
          duplicates.push(barcode);
        }
      }

      if (duplicates.length > 0) {
        issues.push({
          id: `duplicate_products_${Date.now()}`,
          type: 'duplicate',
          table: 'products',
          recordIds: duplicates,
          severity:
            duplicates.length > 50 ? 'critical' : duplicates.length > 10 ? 'error' : 'warning',
          description: `${duplicates.length} barcodes con productos duplicados`,
          autoFixAvailable: false, // Requiere intervención manual
          estimatedImpact: ' puede causar conteos incorrectos',
        });
      }
    } catch (error) {
      logger.error('IntegrityValidator', 'Error checking duplicates', { error });
    }

    return issues;
  }

  /**
   * Verificar sesiones sin scans
   */
  private async checkSessionsWithoutScans(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    try {
      const sessions = await db.sessions.toArray();
      const completedSessions = sessions.filter(s => s.status === 'completed');

      for (const session of completedSessions) {
        const scans = await db.scans.where('sessionId').equals(session.id).count();

        if (scans === 0) {
          issues.push({
            id: `empty_session_${session.id}`,
            type: 'invalid_ref',
            table: 'sessions',
            recordIds: [session.id],
            severity: 'warning',
            description: `Sesión ${session.id} marcada como completada pero sin scans`,
            autoFixAvailable: false,
            estimatedImpact: 'Sesión incompleta',
          });
        }
      }
    } catch (error) {
      logger.error('IntegrityValidator', 'Error checking empty sessions', { error });
    }

    return issues;
  }

  /**
   * Verificar expirations sin barcode
   */
  private async checkOrphanedExpirations(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    try {
      const expirations = await db.expirations.toArray();
      const invalidExpirations = expirations.filter(e => !e.barcode || e.barcode.trim() === '');

      if (invalidExpirations.length > 0) {
        issues.push({
          id: `orphan_expirations_${Date.now()}`,
          type: 'orphaned',
          table: 'expirations',
          recordIds: invalidExpirations.map(e => e.id!.toString()),
          severity: invalidExpirations.length > 50 ? 'error' : 'warning',
          description: `${invalidExpirations.length} vencimientos sin barcode`,
          autoFixAvailable: true,
        });
      }
    } catch (error) {
      logger.error('IntegrityValidator', 'Error checking expirations', { error });
    }

    return issues;
  }

  /**
   * Verificar audit logs con referencias inválidas
   */
  private async checkOrphanedAuditLogs(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    try {
      const auditLogs = await db.audit_logs.toArray();
      const sessions = await db.sessions.toArray();
      const validRecordIds = new Set(sessions.map(s => s.id));

      const orphanedLogs = auditLogs.filter(
        log => log.tableName === 'sessions' && !validRecordIds.has(log.recordId)
      );

      if (orphanedLogs.length > 0) {
        issues.push({
          id: `orphan_audit_${Date.now()}`,
          type: 'orphaned',
          table: 'audit_logs',
          recordIds: orphanedLogs.map(l => l.id!.toString()),
          severity: 'info',
          description: `${orphanedLogs.length} logs de auditoría para sesiones eliminadas`,
          autoFixAvailable: false, // Mantener para auditoría histórica
        });
      }
    } catch (error) {
      logger.error('IntegrityValidator', 'Error checking audit logs', { error });
    }

    return issues;
  }

  /**
   * Verificar cola de sincronización corrupta
   */
  private async checkCorruptedSyncQueue(): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    try {
      const queue = await db.syncQueue.toArray();

      // Verificar operaciones con demasiados reintentos
      const failedOps = queue.filter(q => q.retries >= 5);
      if (failedOps.length > 0) {
        issues.push({
          id: `failed_sync_${Date.now()}`,
          type: 'constraint',
          table: 'syncQueue',
          recordIds: failedOps.map(q => q.id!.toString()),
          severity: failedOps.length > 20 ? 'critical' : failedOps.length > 5 ? 'error' : 'warning',
          description: `${failedOps.length} operaciones de sync fallidas después de 5+ intentos`,
          autoFixAvailable: true,
          estimatedImpact: 'Datos no sincronizados',
        });
      }

      // Verificar operaciones sin datos
      const invalidOps = queue.filter(q => !q.data || !q.tableName);
      if (invalidOps.length > 0) {
        issues.push({
          id: `invalid_sync_${Date.now()}`,
          type: 'constraint',
          table: 'syncQueue',
          recordIds: invalidOps.map(q => q.id!.toString()),
          severity: 'error',
          description: `${invalidOps.length} operaciones de sync con datos inválidos`,
          autoFixAvailable: true,
        });
      }
    } catch (error) {
      logger.error('IntegrityValidator', 'Error checking sync queue', { error });
    }

    return issues;
  }

  /**
   * Auto-reparar problemas automáticamente solucionables
   */
  private async autoFix(issues: IntegrityIssue[]): Promise<void> {
    const fixable = issues.filter(i => i.autoFixAvailable);

    for (const issue of fixable) {
      try {
        switch (issue.type) {
          case 'orphaned':
            if (issue.table === 'scans') {
              await db.scans.bulkDelete(issue.recordIds as any[]);
              logger.info('IntegrityValidator', `Deleted orphaned scans`, {
                count: issue.recordIds.length,
              });
            }
            break;

          case 'constraint':
            if (issue.table === 'scans') {
              // Eliminar scans con barcode inválido
              if (issue.description.includes('barcode')) {
                await db.scans.bulkDelete(issue.recordIds as any[]);
              }
              // Eliminar scans con cantidad inválida
              if (issue.description.includes('cantidad')) {
                await db.scans.bulkDelete(issue.recordIds as any[]);
              }
            }
            if (issue.table === 'syncQueue' && issue.description.includes('inválidos')) {
              await db.syncQueue.bulkDelete(issue.recordIds as any[]);
            }
            break;
        }
      } catch (error) {
        logger.error('IntegrityValidator', `Failed to auto-fix issue`, { issue, error });
      }
    }
  }

  /**
   * Calcular métricas generales
   */
  private calculateMetrics(issues: IntegrityIssue[]): IntegrityMetrics {
    const tablesChecked = [
      'scans',
      'sessions',
      'products',
      'expirations',
      'syncQueue',
      'audit_logs',
    ];
    let totalRecords = 0;

    // Contar registros
    tablesChecked.forEach(async table => {
      try {
        totalRecords += await db.table(table).count();
      } catch {
        // Tabla puede no existir
      }
    });

    return {
      totalRecords,
      tablesChecked: tablesChecked.length,
      orphanedRecords: issues
        .filter(i => i.type === 'orphaned')
        .reduce((sum, i) => sum + i.recordIds.length, 0),
      duplicateRecords: issues.filter(i => i.type === 'duplicate').length,
      invalidReferences: issues.filter(i => i.type === 'invalid_ref').length,
      validationErrors: issues.filter(i => i.type === 'constraint').length,
    };
  }

  /**
   * Obtener estado resumido de integridad
   */
  async getQuickStatus(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: number;
    lastCheck: number | null;
  }> {
    const lastCheckRecord = await db.settings.get('integrity_last_check');

    try {
      const report = await this.validate(false);

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      const criticalCount = report.issuesBySeverity['critical'] || 0;
      const errorCount = report.issuesBySeverity['error'] || 0;
      const warningCount = report.issuesBySeverity['warning'] || 0;

      if (criticalCount > 0 || errorCount > 10) {
        status = 'critical';
      } else if (errorCount > 0 || warningCount > 10) {
        status = 'warning';
      }

      // Guardar timestamp
      await db.settings.put({
        key: 'integrity_last_check',
        value: Date.now(),
      });

      return {
        status,
        issues: report.totalIssues,
        lastCheck: report.timestamp,
      };
    } catch (error) {
      logger.error('IntegrityValidator', 'Quick status check failed', { error });
      return {
        status: 'critical',
        issues: -1,
        lastCheck: lastCheckRecord?.value || null,
      };
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const IntegrityValidator = new IntegrityValidatorClass();
export default IntegrityValidator;
