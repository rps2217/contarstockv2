/**
 * CountingValidationService - Validaciones en tiempo real para el módulo de conteo
 *
 * Proporciona:
 * - Validación de productos esperados vs escaneados
 * - Detección de productos no esperados
 * - Alertas de cantidad anormal
 * - Detección de duplicados
 * - Clasificación de severidad de discrepancias
 */

import { logger } from '@/services/logger';

// ============================================================================
// TIPOS
// ============================================================================

export type ValidationSeverity = 'ok' | 'warning' | 'critical' | 'error';

export interface ValidationResult {
  isValid: boolean;
  severity: ValidationSeverity;
  message: string;
  details?: Record<string, any>;
}

export interface ExpectedItemValidation {
  sku: string;
  name: string;
  expectedQuantity: number;
  scannedQuantity: number;
  discrepancy: number;
  discrepancyPercent: number;
  severity: ValidationSeverity;
  status: 'pending' | 'partial' | 'complete' | 'over' | 'missing';
  isExpected: boolean;
  lastScannedAt?: number;
}

export interface CountingValidationSummary {
  totalItems: number;
  expectedItems: number;
  unexpectedItems: number;
  completeItems: number;
  partialItems: number;
  missingItems: number;
  overCountedItems: number;

  // Discrepancias
  totalDiscrepancy: number;
  criticalDiscrepancies: number;
  warningDiscrepancies: number;

  // Progreso
  progressPercent: number;
  itemsPerMinute: number;
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const DEFAULT_CONFIG = {
  // Umbrales de severidad (porcentaje de variación)
  warningThreshold: 10, // 10% de variación = warning
  criticalThreshold: 25, // 25% de variación = critical

  // Umbrales absolutos (para productos con cantidad 0 esperada)
  zeroExpectedThreshold: 5, // Máximo 5 items "no esperados" sin alerta
  overCountThreshold: 3, // Si se cuenta más de 3x lo esperado = error

  // Detección de duplicados
  duplicateWindowMs: 30000, // 30 segundos para considerar duplicado
};

// ============================================================================
// SERVICIO
// ============================================================================

class CountingValidationServiceClass {
  private config: typeof DEFAULT_CONFIG;
  private recentScans: Map<string, number> = new Map();

  constructor(config?: Partial<typeof DEFAULT_CONFIG>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validar un escaneo contra los items esperados
   */
  validateScan(
    barcode: string,
    scannedQuantity: number,
    expectedItems: Map<string, { name: string; expectedQuantity: number }>
  ): ValidationResult {
    const expectedItem = expectedItems.get(barcode);

    if (!expectedItem) {
      // Producto NO esperado
      return {
        isValid: true, // Permitimos escanear, pero alertamos
        severity: 'warning',
        message: `Producto no esperado: ${barcode}`,
        details: { barcode, isExpected: false },
      };
    }

    const { name, expectedQuantity } = expectedItem;
    const discrepancy = scannedQuantity - expectedQuantity;
    const discrepancyPercent =
      expectedQuantity > 0 ? Math.abs(discrepancy / expectedQuantity) * 100 : 100;

    // Determinar severidad
    let severity: ValidationSeverity = 'ok';
    if (discrepancyPercent >= this.config.criticalThreshold) {
      severity = 'critical';
    } else if (discrepancyPercent >= this.config.warningThreshold) {
      severity = 'warning';
    }

    // Caso especial: mucho más de lo esperado
    if (
      expectedQuantity > 0 &&
      scannedQuantity > expectedQuantity * this.config.overCountThreshold
    ) {
      severity = 'error';
    }

    // Caso especial: cantidad cero esperada pero se escaneó algo
    if (expectedQuantity === 0 && scannedQuantity > 0) {
      severity = 'warning';
    }

    return {
      isValid: true,
      severity,
      message: this.getSeverityMessage(severity, name, expectedQuantity, scannedQuantity),
      details: {
        barcode,
        name,
        expectedQuantity,
        scannedQuantity,
        discrepancy,
        discrepancyPercent,
      },
    };
  }

  /**
   * Generar mensaje según severidad
   */
  private getSeverityMessage(
    severity: ValidationSeverity,
    name: string,
    expected: number,
    scanned: number
  ): string {
    const diff = scanned - expected;

    switch (severity) {
      case 'ok':
        return `${name}: ✓ Correcto (${scanned}/${expected})`;
      case 'warning':
        return `${name}: ⚠️ Variación ${diff > 0 ? '+' : ''}${diff} (${scanned}/${expected})`;
      case 'critical':
        return `${name}: 🔴 Gran diferencia ${diff > 0 ? '+' : ''}${diff} (${scanned}/${expected})`;
      case 'error':
        return `${name}: ❌ Posible error: ${scanned} vs ${expected} esperado`;
      default:
        return `${name}: ${scanned}/${expected}`;
    }
  }

  /**
   * Verificar si un escaneo es duplicado (mismo producto en poco tiempo)
   */
  isDuplicate(barcode: string): boolean {
    const lastScanTime = this.recentScans.get(barcode);
    if (!lastScanTime) return false;

    const timeSinceLastScan = Date.now() - lastScanTime;
    return timeSinceLastScan < this.config.duplicateWindowMs;
  }

  /**
   * Registrar un escaneo para detección de duplicados
   */
  recordScan(barcode: string): void {
    this.recentScans.set(barcode, Date.now());

    // Limpiar escaneos antiguos (más de 1 minuto)
    const oneMinuteAgo = Date.now() - 60000;
    for (const [key, time] of this.recentScans.entries()) {
      if (time < oneMinuteAgo) {
        this.recentScans.delete(key);
      }
    }
  }

  /**
   * Calcular resumen de validación para un conjunto de items
   */
  calculateSummary(
    expectedItems: Map<string, { name: string; expectedQuantity: number }>,
    scannedItems: Map<string, { quantity: number; lastScannedAt?: number }>,
    startTime: number
  ): CountingValidationSummary {
    let totalItems = expectedItems.size + this.countUnexpectedItems(scannedItems, expectedItems);
    let completeItems = 0;
    let partialItems = 0;
    let missingItems = 0;
    let overCountedItems = 0;
    let criticalDiscrepancies = 0;
    let warningDiscrepancies = 0;
    let totalDiscrepancy = 0;

    // Analizar items esperados
    for (const [sku, expected] of expectedItems.entries()) {
      const scanned = scannedItems.get(sku);
      const scannedQty = scanned?.quantity || 0;
      const discrepancy = scannedQty - expected.expectedQuantity;
      const absDiscrepancy = Math.abs(discrepancy);

      if (discrepancy === 0) {
        completeItems++;
      } else if (scannedQty === 0) {
        missingItems++;
        totalDiscrepancy += absDiscrepancy;
        warningDiscrepancies++;
      } else if (scannedQty > expected.expectedQuantity * this.config.overCountThreshold) {
        overCountedItems++;
        totalDiscrepancy += absDiscrepancy;
        criticalDiscrepancies++;
      } else if (
        absDiscrepancy / expected.expectedQuantity >=
        this.config.criticalThreshold / 100
      ) {
        totalDiscrepancy += absDiscrepancy;
        criticalDiscrepancies++;
      } else {
        partialItems++;
        totalDiscrepancy += absDiscrepancy;
        warningDiscrepancies++;
      }
    }

    // Calcular progreso
    const expectedItemsCount = expectedItems.size;
    const progressPercent =
      expectedItemsCount > 0 ? Math.round((completeItems / expectedItemsCount) * 100) : 0;

    // Calcular velocidad
    const elapsedMinutes = (Date.now() - startTime) / 60000;
    const totalScanned = Array.from(scannedItems.values()).reduce((sum, s) => sum + s.quantity, 0);
    const itemsPerMinute = elapsedMinutes > 0 ? totalScanned / elapsedMinutes : 0;

    return {
      totalItems,
      expectedItems: expectedItemsCount,
      unexpectedItems: this.countUnexpectedItems(scannedItems, expectedItems),
      completeItems,
      partialItems,
      missingItems,
      overCountedItems,
      totalDiscrepancy,
      criticalDiscrepancies,
      warningDiscrepancies,
      progressPercent: Math.min(progressPercent, 100),
      itemsPerMinute: Math.round(itemsPerMinute * 10) / 10,
    };
  }

  /**
   * Contar items no esperados
   */
  private countUnexpectedItems(
    scannedItems: Map<string, any>,
    expectedItems: Map<string, any>
  ): number {
    let count = 0;
    for (const sku of scannedItems.keys()) {
      if (!expectedItems.has(sku)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Generar reporte de discrepancias
   */
  generateDiscrepancyReport(
    expectedItems: Map<string, { name: string; expectedQuantity: number }>,
    scannedItems: Map<string, { quantity: number }>
  ): ExpectedItemValidation[] {
    const discrepancies: ExpectedItemValidation[] = [];

    // Items esperados con discrepancia
    for (const [sku, expected] of expectedItems.entries()) {
      const scanned = scannedItems.get(sku);
      const scannedQty = scanned?.quantity || 0;
      const discrepancy = scannedQty - expected.expectedQuantity;
      const discrepancyPercent =
        expected.expectedQuantity > 0 ? (discrepancy / expected.expectedQuantity) * 100 : 100;

      let severity: ValidationSeverity = 'ok';
      let status: ExpectedItemValidation['status'] = 'complete';

      if (discrepancy === 0) {
        status = 'complete';
      } else if (scannedQty === 0) {
        status = 'missing';
        severity = 'warning';
      } else if (scannedQty > expected.expectedQuantity) {
        status = 'over';
        severity = discrepancyPercent >= this.config.criticalThreshold ? 'critical' : 'warning';
      } else {
        status = 'partial';
        severity = discrepancyPercent >= this.config.criticalThreshold ? 'critical' : 'warning';
      }

      discrepancies.push({
        sku,
        name: expected.name,
        expectedQuantity: expected.expectedQuantity,
        scannedQuantity: scannedQty,
        discrepancy,
        discrepancyPercent: Math.round(discrepancyPercent * 10) / 10,
        severity,
        status,
        isExpected: true,
      });
    }

    // Items no esperados (escaneados pero no en lista)
    for (const [sku, scanned] of scannedItems.entries()) {
      if (!expectedItems.has(sku)) {
        discrepancies.push({
          sku,
          name: 'Producto no esperado',
          expectedQuantity: 0,
          scannedQuantity: scanned.quantity,
          discrepancy: scanned.quantity,
          discrepancyPercent: 100,
          severity: 'warning',
          status: 'over',
          isExpected: false,
        });
      }
    }

    // Ordenar: primero críticos, luego warnings, luego ok
    return discrepancies.sort((a, b) => {
      const severityOrder = { error: 0, critical: 1, warning: 2, ok: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Resetear estado
   */
  reset(): void {
    this.recentScans.clear();
  }

  /**
   * Actualizar configuración
   */
  updateConfig(config: Partial<typeof DEFAULT_CONFIG>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const CountingValidationService = new CountingValidationServiceClass();

export default CountingValidationService;
