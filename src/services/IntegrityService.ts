/**
 * =============================================================================
 * IntegrityService - Verificación de integridad de datos
 * =============================================================================
 * 
 * Características:
 * - Detección de registros duplicados
 * - Identificación de registros huérfanos
 * - Verificación de consistencia referencial
 * - Validación de rangos de fechas
 * - Reporte de problemas encontrados
 * 
 * @since 2026-07-07
 */

import { db } from '@/db';
import { logger } from '@/services/logger';
import { normalizeSku } from '@/services/utils';

// =============================================================================
// TIPOS
// =============================================================================

export type IssueSeverity = 'critical' | 'warning' | 'info';

export interface IntegrityIssue {
  id: string;
  severity: IssueSeverity;
  table: string;
  description: string;
  recordId?: string;
  count?: number;
  sampleRecords?: Record<string, unknown>[];
  suggestion?: string;
  timestamp: number;
}

export interface IntegrityCheckResult {
  passed: boolean;
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
  issues: IntegrityIssue[];
  checkedAt: number;
  duration: number;
}

export interface IntegrityCheckConfig {
  /** Verificar expirations */
  checkExpirations?: boolean;
  /** Verificar scans */
  checkScans?: boolean;
  /** Verificar productos */
  checkProducts?: boolean;
  /** Verificar sesiones */
  checkSessions?: boolean;
  /** Verificar sincronización */
  checkSyncQueue?: boolean;
  /** Máximo de registros a muestrear por problema */
  maxSamples?: number;
}

// =============================================================================
// SERVICIO
// =============================================================================

export class IntegrityService {
  private static instance: IntegrityService;
  
  private constructor() {}

  static getInstance(): IntegrityService {
    if (!IntegrityService.instance) {
      IntegrityService.instance = new IntegrityService();
    }
    return IntegrityService.instance;
  }

  /**
   * Ejecuta todas las verificaciones de integridad
   */
  async runAllChecks(config: IntegrityCheckConfig = {}): Promise<IntegrityCheckResult> {
    const startTime = Date.now();
    const issues: IntegrityIssue[] = [];

    logger.info('IntegrityService', 'Starting integrity checks');

    try {
      // Ejecutar checks en paralelo
      const checks = [
        config.checkExpirations !== false ? this.checkExpirations(config.maxSamples) : Promise.resolve([]),
        config.checkScans !== false ? this.checkScans(config.maxSamples) : Promise.resolve([]),
        config.checkProducts !== false ? this.checkProducts(config.maxSamples) : Promise.resolve([]),
        config.checkSessions !== false ? this.checkSessions(config.maxSamples) : Promise.resolve([]),
        config.checkSyncQueue !== false ? this.checkSyncQueue(config.maxSamples) : Promise.resolve([]),
      ];

      const results = await Promise.all(checks);
      
      for (const result of results) {
        issues.push(...result);
      }

      const criticalIssues = issues.filter(i => i.severity === 'critical').length;
      const warningIssues = issues.filter(i => i.severity === 'warning').length;
      const infoIssues = issues.filter(i => i.severity === 'info').length;

      const result: IntegrityCheckResult = {
        passed: criticalIssues === 0,
        totalIssues: issues.length,
        criticalIssues,
        warningIssues,
        infoIssues,
        issues,
        checkedAt: Date.now(),
        duration: Date.now() - startTime,
      };

      logger.info('IntegrityService', `Integrity check completed: ${issues.length} issues found`, {
        critical: criticalIssues,
        warning: warningIssues,
        info: infoIssues,
      });

      return result;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('IntegrityService', 'Integrity check failed', error.message);
      throw error;
    }
  }

  /**
   * Verifica la integridad de la tabla de expirations
   */
  async checkExpirations(maxSamples = 5): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    try {
      const expirations = await db.table('expirations').toArray();

      // 1. Verificar claveUnica duplicada
      const claveMap = new Map<string, typeof expirations>();
      for (const exp of expirations) {
        const clave = exp.claveUnica;
        if (!claveMap.has(clave)) {
          claveMap.set(clave, []);
        }
        claveMap.get(clave)!.push(exp);
      }

      for (const [clave, records] of claveMap) {
        if (records.length > 1) {
          issues.push({
            id: crypto.randomUUID(),
            severity: 'warning',
            table: 'expirations',
            description: `Clave única "${clave}" tiene ${records.length} duplicados`,
            count: records.length,
            sampleRecords: records.slice(0, maxSamples) as unknown as Record<string, unknown>[],
            suggestion: 'Considerar fusionar registros o eliminar duplicados',
            timestamp: Date.now(),
          });
        }
      }

      // 2. Verificar registros sin barcode
      const orphanExpirations = expirations.filter(
        e => !e.barcode || e.barcode.length < 4
      );

      if (orphanExpirations.length > 0) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'critical',
          table: 'expirations',
          description: `${orphanExpirations.length} vencimientos sin barcode válido`,
          count: orphanExpirations.length,
          sampleRecords: orphanExpirations.slice(0, maxSamples) as unknown as Record<string, unknown>[],
          suggestion: 'Revisar y eliminar o corregir registros sin barcode',
          timestamp: Date.now(),
        });
      }

      // 3. Verificar fechas fuera de rango (2024-2027)
      const invalidDates = expirations.filter(
        e => e.yyyy < 2024 || e.yyyy > 2027 || e.mm < 1 || e.mm > 12
      );

      if (invalidDates.length > 0) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'critical',
          table: 'expirations',
          description: `${invalidDates.length} vencimientos con fecha fuera del rango válido (2024-2027)`,
          count: invalidDates.length,
          sampleRecords: invalidDates.slice(0, maxSamples) as unknown as Record<string, unknown>[],
          suggestion: 'Corregir fechas de vencimiento',
          timestamp: Date.now(),
        });
      }

      // 4. Verificar status inconsistentes
      const now = new Date();
      for (const exp of expirations) {
        const expiryDate = new Date(exp.yyyy, exp.mm - 1, 1);
        const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let expectedStatus: string;
        if (daysLeft < 0) expectedStatus = 'expired';
        else if (daysLeft <= 30) expectedStatus = 'critical';
        else if (daysLeft <= 90) expectedStatus = 'warning';
        else expectedStatus = 'safe';

        if (exp.status !== expectedStatus) {
          issues.push({
            id: crypto.randomUUID(),
            severity: 'info',
            table: 'expirations',
            description: `Vencimiento "${exp.claveUnica}" tiene status "${exp.status}" pero debería ser "${expectedStatus}"`,
            recordId: exp.id as string,
            suggestion: 'El status puede actualizarse automáticamente',
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      logger.error('IntegrityService', 'checkExpirations failed', String(error));
    }

    return issues;
  }

  /**
   * Verifica la integridad de la tabla de scans
   */
  async checkScans(maxSamples = 5): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    try {
      const scans = await db.scans.toArray();

      // 1. Verificar scans sin sessionId
      const orphanScans = scans.filter(s => !s.sessionId);

      if (orphanScans.length > 0) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'critical',
          table: 'scans',
          description: `${orphanScans.length} scans sin session asociada`,
          count: orphanScans.length,
          sampleRecords: orphanScans.slice(0, maxSamples) as unknown as Record<string, unknown>[],
          suggestion: 'Asociar scans a sesiones o eliminar los huérfanos',
          timestamp: Date.now(),
        });
      }

      // 2. Verificar scans con barcode inválido
      const invalidBarcodeScans = scans.filter(
        s => !s.barcode || s.barcode.length < 4
      );

      if (invalidBarcodeScans.length > 0) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'warning',
          table: 'scans',
          description: `${invalidBarcodeScans.length} scans con barcode inválido`,
          count: invalidBarcodeScans.length,
          sampleRecords: invalidBarcodeScans.slice(0, maxSamples) as unknown as Record<string, unknown>[],
          suggestion: 'Revisar y corregir barcodes',
          timestamp: Date.now(),
        });
      }

      // 3. Verificar cantidad inválida
      const invalidQuantity = scans.filter(
        s => typeof s.quantity !== 'number' || s.quantity <= 0 || s.quantity > 99999
      );

      if (invalidQuantity.length > 0) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'critical',
          table: 'scans',
          description: `${invalidQuantity.length} scans con cantidad inválida`,
          count: invalidQuantity.length,
          sampleRecords: invalidQuantity.slice(0, maxSamples) as unknown as Record<string, unknown>[],
          suggestion: 'Corregir cantidades a valores válidos (1-99999)',
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      logger.error('IntegrityService', 'checkScans failed', String(error));
    }

    return issues;
  }

  /**
   * Verifica la integridad de la tabla de productos
   */
  async checkProducts(maxSamples = 5): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    try {
      const products = await db.products.toArray();

      // 1. Verificar productos sin nombre
      const unnamedProducts = products.filter(p => !p.name || p.name.trim().length < 2);

      if (unnamedProducts.length > 0) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'warning',
          table: 'products',
          description: `${unnamedProducts.length} productos sin nombre válido`,
          count: unnamedProducts.length,
          sampleRecords: unnamedProducts.slice(0, maxSamples) as unknown as Record<string, unknown>[],
          suggestion: 'Revisar y corregir nombres de productos',
          timestamp: Date.now(),
        });
      }

      // 2. Verificar barcode duplicado
      const barcodeMap = new Map<string, typeof products>();
      for (const product of products) {
        const barcode = normalizeSku(product.barcode || '');
        if (barcode) {
          if (!barcodeMap.has(barcode)) {
            barcodeMap.set(barcode, []);
          }
          barcodeMap.get(barcode)!.push(product);
        }
      }

      for (const [barcode, records] of barcodeMap) {
        if (records.length > 1) {
          issues.push({
            id: crypto.randomUUID(),
            severity: 'warning',
            table: 'products',
            description: `Barcode "${barcode}" tiene ${records.length} productos duplicados`,
            count: records.length,
            sampleRecords: records.slice(0, maxSamples) as unknown as Record<string, unknown>[],
            suggestion: 'Mantener un solo registro por barcode',
            timestamp: Date.now(),
          });
        }
      }

      // 3. Verificar precios inválidos
      const invalidPrices = products.filter(
        p => typeof p.price === 'number' && p.price < 0
      );

      if (invalidPrices.length > 0) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'warning',
          table: 'products',
          description: `${invalidPrices.length} productos con precio negativo`,
          count: invalidPrices.length,
          sampleRecords: invalidPrices.slice(0, maxSamples) as unknown as Record<string, unknown>[],
          suggestion: 'Corregir precios a valores positivos',
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      logger.error('IntegrityService', 'checkProducts failed', String(error));
    }

    return issues;
  }

  /**
   * Verifica la integridad de la tabla de sesiones
   */
  async checkSessions(maxSamples = 5): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    try {
      const sessions = await db.sessions.toArray();

      // 1. Verificar sesiones sin erpOrder
      const noOrderSessions = sessions.filter(s => !s.erpOrder);

      if (noOrderSessions.length > 0) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'info',
          table: 'sessions',
          description: `${noOrderSessions.length} sesiones sin orden ERP`,
          count: noOrderSessions.length,
          sampleRecords: noOrderSessions.slice(0, maxSamples) as unknown as Record<string, unknown>[],
          suggestion: 'Considerar asignar orden ERP a estas sesiones',
          timestamp: Date.now(),
        });
      }

      // 2. Verificar sesiones huérfanas (sin scans)
      for (const session of sessions) {
        const scans = await db.scans
          .where('sessionId')
          .equals(session.id)
          .count();
        
        if (scans === 0 && session.status === 'active') {
          issues.push({
            id: crypto.randomUUID(),
            severity: 'warning',
            table: 'sessions',
            description: `Sesión "${session.id}" está activa pero no tiene scans`,
            recordId: session.id,
            suggestion: 'Completar la sesión o marcarla como cancelada',
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      logger.error('IntegrityService', 'checkSessions failed', String(error));
    }

    return issues;
  }

  /**
   * Verifica la cola de sincronización
   */
  async checkSyncQueue(maxSamples = 5): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    try {
      const queue = await db.syncQueue.toArray();

      // 1. Verificar operaciones con muchos reintentos
      const failedOperations = queue.filter(q => q.retries >= 3);

      if (failedOperations.length > 0) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'warning',
          table: 'syncQueue',
          description: `${failedOperations.length} operaciones con 3+ reintentos fallidos`,
          count: failedOperations.length,
          sampleRecords: failedOperations.slice(0, maxSamples) as unknown as Record<string, unknown>[],
          suggestion: 'Revisar errores y решить si reintentar o eliminar',
          timestamp: Date.now(),
        });
      }

      // 2. Verificar operaciones pendientes por mucho tiempo
      const oldOperations = queue.filter(q => {
        const old = Date.now() - q.timestamp > 24 * 60 * 60 * 1000; // 24 horas
        return old && q.retries < 3;
      });

      if (oldOperations.length > 0) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'info',
          table: 'syncQueue',
          description: `${oldOperations.length} operaciones pendientes por más de 24 horas`,
          count: oldOperations.length,
          sampleRecords: oldOperations.slice(0, maxSamples) as unknown as Record<string, unknown>[],
          suggestion: 'Verificar conexión y reintentar sincronización',
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      logger.error('IntegrityService', 'checkSyncQueue failed', String(error));
    }

    return issues;
  }

  /**
   * Corrige automáticamente problemas que se puedan resolver
   */
  async autoFix(): Promise<{ fixed: number; errors: string[] }> {
    const result = { fixed: 0, errors: [] as string[] };

    try {
      // 1. Actualizar status de expirations
      const expirations = await db.table('expirations').toArray();
      const now = new Date();

      for (const exp of expirations) {
        const expiryDate = new Date(exp.yyyy, exp.mm - 1, 1);
        const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let newStatus: string;
        if (daysLeft < 0) newStatus = 'expired';
        else if (daysLeft <= 30) newStatus = 'critical';
        else if (daysLeft <= 90) newStatus = 'warning';
        else newStatus = 'safe';

        if (exp.status !== newStatus) {
          await db.table('expirations').update(exp.id as number, { status: newStatus });
          result.fixed++;
        }
      }

      logger.info('IntegrityService', `Auto-fix completed: ${result.fixed} issues fixed`);
    } catch (error) {
      result.errors.push(String(error));
      logger.error('IntegrityService', 'Auto-fix failed', String(error));
    }

    return result;
  }

  /**
   * Genera un reporte de integridad formateado
   */
  formatReport(result: IntegrityCheckResult): string {
    const lines: string[] = [];
    
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('                    REPORTE DE INTEGRIDAD');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`Fecha: ${new Date(result.checkedAt).toLocaleString()}`);
    lines.push(`Duración: ${result.duration}ms`);
    lines.push('');
    
    if (result.passed) {
      lines.push('✅ TODAS LAS VERIFICACIONES PASARON');
    } else {
      lines.push('❌ SE ENCONTRARON PROBLEMAS');
    }
    
    lines.push('');
    lines.push(`Total de problemas: ${result.totalIssues}`);
    lines.push(`  🔴 Críticos: ${result.criticalIssues}`);
    lines.push(`  🟡 Advertencias: ${result.warningIssues}`);
    lines.push(`  🔵 Informativos: ${result.infoIssues}`);
    lines.push('');
    
    if (result.issues.length > 0) {
      lines.push('───────────────────────────────────────────────────────────────');
      lines.push('DETALLE DE PROBLEMAS');
      lines.push('───────────────────────────────────────────────────────────────');
      
      for (const issue of result.issues) {
        const icon = issue.severity === 'critical' ? '🔴' 
          : issue.severity === 'warning' ? '🟡' : '🔵';
        
        lines.push('');
        lines.push(`${icon} [${issue.severity.toUpperCase()}] ${issue.table}`);
        lines.push(`   ${issue.description}`);
        if (issue.count) {
          lines.push(`   Cantidad: ${issue.count}`);
        }
        if (issue.suggestion) {
          lines.push(`   💡 Sugerencia: ${issue.suggestion}`);
        }
      }
    }
    
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    
    return lines.join('\n');
  }
}

// Instancia singleton
export const integrityService = IntegrityService.getInstance();

// Helper para usar en hooks
export const useIntegrityService = () => integrityService;
