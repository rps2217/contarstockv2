/**
 * CycleCountService - Sistema de conteo cíclico (ABC Classification)
 *
 * El conteo cíclico es un método de inventario donde se verifican
 * subsets de items regularmente en lugar de contar todo el inventario.
 *
 * Clasificación ABC:
 * - A: 20% de items = 80% del valor (cuentas más frecuentes)
 * - B: 30% de items = 15% del valor (cuentas moderadas)
 * - C: 50% de items = 5% del valor (cuentas infrecuentes)
 *
 * Beneficios:
 * - Reduce tiempo de conteo (20% del esfuerzo)
 * - Mayor accuracy en items críticos
 * - Detección temprana de problemas
 */

import { logger } from '@/services/logger';
import { db } from '@/db';

// ============================================================================
// TIPOS
// ============================================================================

export type CycleCountPriority = 'A' | 'B' | 'C' | 'none';

export type CycleCountStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface CycleCountItem {
  id: string;
  barcode: string;
  productName: string;
  location: string;
  currentStock: number;
  lastCountedAt?: number;
  lastCountedBy?: string;
  countHistory: CycleCountRecord[];
  priority: CycleCountPriority;
  daysSinceLastCount: number;
  stockVariance: number; // % de variación histórica
  expectedAccuracy: number; // % accuracy basado en historial
}

export interface CycleCountRecord {
  id: string;
  countedAt: number;
  countedBy: string;
  countedQuantity: number;
  systemQuantity: number;
  variance: number;
  variancePercent: number;
  isRecount: boolean;
}

export interface CycleCountSession {
  id: string;
  createdAt: number;
  status: 'active' | 'completed' | 'cancelled';
  priorityFilter?: CycleCountPriority;
  locationFilter?: string;
  items: CycleCountItem[];
  completedCount: number;
  totalItems: number;
  accuracy: number;
  startedAt?: number;
  completedAt?: number;
}

export interface CycleCountConfig {
  /** Política de conteo: 'daily', 'weekly', 'monthly' */
  policy: 'daily' | 'weekly' | 'monthly';
  /** Días entre conteos por prioridad */
  frequencyDays: Record<CycleCountPriority, number>;
  /** Items a contar por sesión (0 = ilimitado) */
  maxItemsPerSession: number;
  /** Umbral de varianza para marcar como problemático (%) */
  varianceThreshold: number;
  /** Habilitar recuentos automáticos */
  autoRecountEnabled: boolean;
  /** Número máximo de recuentos por item */
  maxRecounts: number;
  /** Tolerancia de varianza para pasar recount (%) */
  recountTolerance: number;
}

export interface CycleCountSuggestion {
  item: CycleCountItem;
  reason: string;
  priority: CycleCountPriority;
  dueDate: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_CONFIG: CycleCountConfig = {
  policy: 'weekly',
  frequencyDays: { A: 7, B: 14, C: 30, none: 90 },
  maxItemsPerSession: 50,
  varianceThreshold: 5, // 5% de varianza = problemático
  autoRecountEnabled: true,
  maxRecounts: 3,
  recountTolerance: 1, // 1% de tolerancia para pasar recount
};

// ============================================================================
// CLASIFICACIÓN ABC
// ============================================================================

/**
 * Clasificar items según movimiento/valor (método simplificado)
 *
 * Se puede implementar con datos reales de:
 * - Ventas últimas 30/60/90 días
 * - Valor unitario
 * - Margen de contribución
 */
export function classifyABC(
  items: Array<{
    barcode: string;
    movementVelocity?: number; // Unidades movidas por semana
    unitValue?: number;
    stockTurns?: number;
  }>
): Map<string, CycleCountPriority> {
  const classified = new Map<string, CycleCountPriority>();

  // Calcular score para cada item
  const itemsWithScore = items.map(item => {
    // Factores de scoring (ponderados)
    const velocityScore = (item.movementVelocity || 0) * 0.5;
    const valueScore = (item.unitValue || 0) * 0.3;
    const turnsScore = (item.stockTurns || 1) * 0.2;

    return {
      barcode: item.barcode,
      score: velocityScore + valueScore + turnsScore,
    };
  });

  // Ordenar por score descendente
  itemsWithScore.sort((a, b) => b.score - a.score);

  // Calcular percentiles
  const totalItems = itemsWithScore.length;
  const aCutoff = Math.ceil(totalItems * 0.2); // Top 20%
  const bCutoff = Math.ceil(totalItems * 0.5); // Top 50%

  itemsWithScore.forEach((item, index) => {
    if (index < aCutoff) {
      classified.set(item.barcode, 'A');
    } else if (index < bCutoff) {
      classified.set(item.barcode, 'B');
    } else {
      classified.set(item.barcode, 'C');
    }
  });

  logger.debug('CycleCount', 'ABC classification complete', {
    total: totalItems,
    A: aCutoff,
    B: bCutoff - aCutoff,
    C: totalItems - bCutoff,
  });

  return classified;
}

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================

class CycleCountServiceClass {
  private config: CycleCountConfig;

  constructor(config: Partial<CycleCountConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Actualizar configuración
   */
  updateConfig(config: Partial<CycleCountConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('CycleCount', 'Config updated', { config: this.config });
  }

  /**
   * Obtener configuración actual
   */
  getConfig(): CycleCountConfig {
    return { ...this.config };
  }

  /**
   * Calcular prioridad de conteo para un item
   */
  calculatePriority(item: {
    barcode: string;
    lastCountedAt?: number;
    stockVariance?: number;
    classification?: CycleCountPriority;
  }): CycleCountPriority {
    // Si tiene clasificación ABC, usarla como base
    let priority = item.classification || 'C';

    // Si nunca se contó, priorizar
    if (!item.lastCountedAt) {
      return 'A';
    }

    // Calcular días desde último conteo
    const daysSince = Math.floor((Date.now() - item.lastCountedAt) / (1000 * 60 * 60 * 24));

    // Verificar frecuencia según prioridad
    const maxDays = this.config.frequencyDays[priority];

    if (daysSince > maxDays) {
      // Subir prioridad si está overdue
      if (priority === 'C') priority = 'B';
      if (priority === 'B') priority = 'A';
    }

    // Si tiene alta varianza, priorizar
    if ((item.stockVariance || 0) > this.config.varianceThreshold) {
      priority = 'A';
    }

    return priority;
  }

  /**
   * Generar lista de items para conteo cíclico
   */
  async generateCycleCountList(params?: {
    location?: string;
    priority?: CycleCountPriority;
    limit?: number;
  }): Promise<CycleCountSuggestion[]> {
    const suggestions: CycleCountSuggestion[] = [];

    try {
      // Obtener todos los productos (o desde la BD)
      const products = await db.products.toArray();

      // Para cada producto, calcular prioridad y si necesita conteo
      for (const product of products) {
        // Obtener último conteo de la historia
        const lastCount = await this.getLastCount(product.barcode);

        // Calcular varianza histórica
        const variance = await this.calculateStockVariance(product.barcode);

        // Calcular prioridad
        const priority = this.calculatePriority({
          barcode: product.barcode,
          lastCountedAt: lastCount?.countedAt,
          stockVariance: variance,
        });

        // Aplicar filtros
        if (params?.priority && params.priority !== priority) continue;

        // Calcular fecha de vencimiento del conteo
        const dueDate = lastCount
          ? lastCount.countedAt + this.config.frequencyDays[priority] * 24 * 60 * 60 * 1000
          : 0;

        // Solo incluir si está debido o es prioritario
        if (dueDate <= Date.now() || priority === 'A') {
          suggestions.push({
            item: {
              id: product.id || product.barcode,
              barcode: product.barcode,
              productName: product.name || 'Unknown',
              location: product.location || 'DEFAULT',
              currentStock: product.stock || 0,
              lastCountedAt: lastCount?.countedAt,
              countHistory: [],
              priority,
              daysSinceLastCount: lastCount
                ? Math.floor((Date.now() - lastCount.countedAt) / (1000 * 60 * 60 * 24))
                : 999,
              stockVariance: variance,
              expectedAccuracy: this.calculateExpectedAccuracy(product.barcode),
            },
            reason: this.generateCountReason(priority, lastCount?.countedAt, variance),
            priority,
            dueDate,
          });
        }
      }

      // Ordenar por prioridad y fecha de vencimiento
      suggestions.sort((a, b) => {
        const priorityOrder = { A: 0, B: 1, C: 2, none: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.dueDate - b.dueDate;
      });

      // Limitar resultados
      if (params?.limit) {
        return suggestions.slice(0, params.limit);
      }

      return suggestions;
    } catch (error) {
      logger.error('CycleCount', 'Error generating cycle count list', { error });
      return [];
    }
  }

  /**
   * Crear sesión de conteo cíclico
   */
  async createSession(params?: {
    priorityFilter?: CycleCountPriority;
    locationFilter?: string;
    maxItems?: number;
  }): Promise<CycleCountSession> {
    const suggestions = await this.generateCycleCountList({
      priority: params?.priorityFilter,
      location: params?.locationFilter,
      limit: params?.maxItems || this.config.maxItemsPerSession,
    });

    const session: CycleCountSession = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      status: 'active',
      priorityFilter: params?.priorityFilter,
      locationFilter: params?.locationFilter,
      items: suggestions.map(s => s.item),
      completedCount: 0,
      totalItems: suggestions.length,
      accuracy: 0,
    };

    logger.info('CycleCount', 'Session created', {
      sessionId: session.id,
      itemCount: session.totalItems,
    });

    return session;
  }

  /**
   * Registrar resultado de conteo
   */
  async recordCount(params: {
    sessionId: string;
    barcode: string;
    countedQuantity: number;
    countedBy: string;
  }): Promise<{
    isMatch: boolean;
    variance: number;
    variancePercent: number;
    needsRecount: boolean;
    recountNumber: number;
  }> {
    const { sessionId, barcode, countedQuantity, countedBy } = params;

    // Obtener cantidad del sistema
    const product = await db.products.where('barcode').equals(barcode).first();
    const systemQuantity = product?.stock || 0;

    // Calcular varianza
    const variance = countedQuantity - systemQuantity;
    const variancePercent =
      systemQuantity > 0
        ? Math.abs((variance / systemQuantity) * 100)
        : countedQuantity > 0
          ? 100
          : 0;

    // Obtener historial de recuentos
    const recountNumber = await this.getRecountNumber(sessionId, barcode);

    // Determinar si necesita recount
    const needsRecount =
      this.config.autoRecountEnabled &&
      variancePercent > this.config.varianceThreshold &&
      recountNumber < this.config.maxRecounts;

    // Guardar registro
    const record: CycleCountRecord = {
      id: crypto.randomUUID(),
      countedAt: Date.now(),
      countedBy,
      countedQuantity,
      systemQuantity,
      variance,
      variancePercent,
      isRecount: recountNumber > 0,
    };

    await this.saveCountRecord(sessionId, barcode, record);

    logger.info('CycleCount', 'Count recorded', {
      sessionId,
      barcode,
      countedQuantity,
      systemQuantity,
      variancePercent,
      needsRecount,
    });

    return {
      isMatch: variancePercent <= this.config.varianceThreshold,
      variance,
      variancePercent,
      needsRecount,
      recountNumber: recountNumber + 1,
    };
  }

  /**
   * Obtener último conteo de un item
   */
  async getLastCount(barcode: string): Promise<CycleCountRecord | null> {
    try {
      const records = await db
        .table('cycle_count_records')
        .where('barcode')
        .equals(barcode)
        .reverse()
        .limit(1)
        .toArray();

      return records[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Obtener número de recuentos
   */
  async getRecountNumber(sessionId: string, barcode: string): Promise<number> {
    try {
      const records = await db
        .table('cycle_count_records')
        .where('barcode')
        .equals(barcode)
        .filter(r => r.sessionId === sessionId)
        .toArray();

      return records.filter(r => r.isRecount).length;
    } catch {
      return 0;
    }
  }

  /**
   * Calcular varianza histórica de stock
   */
  async calculateStockVariance(barcode: string): Promise<number> {
    try {
      const records = await db
        .table('cycle_count_records')
        .where('barcode')
        .equals(barcode)
        .limit(10)
        .toArray();

      if (records.length < 2) return 0;

      // Calcular desviación estándar de varianza
      const variances = records.map(r => Math.abs(r.variancePercent));
      const avg = variances.reduce((a, b) => a + b, 0) / variances.length;
      const variance = Math.sqrt(
        variances.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / variances.length
      );

      return Math.round(variance * 100) / 100;
    } catch {
      return 0;
    }
  }

  /**
   * Calcular accuracy esperado basado en historial
   */
  calculateExpectedAccuracy(_barcode: string): number {
    // Placeholder - implementar con datos reales
    return 95;
  }

  /**
   * Generar razón para conteo
   */
  private generateCountReason(
    priority: CycleCountPriority,
    lastCountedAt: number | undefined,
    variance: number
  ): string {
    if (!lastCountedAt) {
      return 'Nunca contado - Alta prioridad';
    }

    const daysSince = Math.floor((Date.now() - lastCountedAt) / (1000 * 60 * 60 * 24));

    if (variance > this.config.varianceThreshold) {
      return `Alta varianza histórica (${variance.toFixed(1)}%)`;
    }

    const reasons: Record<CycleCountPriority, string> = {
      A: `Clase A - Conteo frecuente (${daysSince} días)`,
      B: `Clase B - Conteo moderado (${daysSince} días)`,
      C: `Clase C - Conteo estándar (${daysSince} días)`,
      none: `Sin clasificación (${daysSince} días)`,
    };

    return reasons[priority];
  }

  /**
   * Guardar registro de conteo
   */
  private async saveCountRecord(
    sessionId: string,
    barcode: string,
    record: CycleCountRecord
  ): Promise<void> {
    try {
      await db.table('cycle_count_records').add({
        ...record,
        sessionId,
        barcode,
      });
    } catch (error) {
      logger.error('CycleCount', 'Error saving count record', { error });
      throw error;
    }
  }

  /**
   * Obtener estadísticas de cycle counting
   */
  async getStats(): Promise<{
    totalCounts: number;
    pendingCounts: number;
    completedToday: number;
    accuracyRate: number;
    averageVariance: number;
    byPriority: Record<CycleCountPriority, number>;
  }> {
    try {
      const records = await db.table('cycle_count_records').toArray();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const completedToday = records.filter(r => r.countedAt >= today.getTime()).length;

      const accuracyRate =
        records.length > 0
          ? (records.filter(r => r.variancePercent <= 1).length / records.length) * 100
          : 100;

      const avgVariance =
        records.length > 0
          ? records.reduce((sum, r) => sum + r.variancePercent, 0) / records.length
          : 0;

      return {
        totalCounts: records.length,
        pendingCounts: await this.generateCycleCountList().then(s => s.length),
        completedToday,
        accuracyRate: Math.round(accuracyRate * 10) / 10,
        averageVariance: Math.round(avgVariance * 100) / 100,
        byPriority: { A: 0, B: 0, C: 0, none: 0 }, // Llenar desde BD
      };
    } catch {
      return {
        totalCounts: 0,
        pendingCounts: 0,
        completedToday: 0,
        accuracyRate: 100,
        averageVariance: 0,
        byPriority: { A: 0, B: 0, C: 0, none: 0 },
      };
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const CycleCountService = new CycleCountServiceClass();

export default CycleCountService;
