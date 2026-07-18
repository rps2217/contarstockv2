/**
 * PerformanceWorker - Web Worker para operaciones pesadas
 *
 * Ejecuta fuera del hilo principal para no bloquear la UI:
 * - Cálculos de métricas
 * - Procesamiento de datos masivos
 * - Serialización/deserialización
 * - Búsquedas en grandes datasets
 */

import { logger } from '@/services/logger';

// ============================================================================
// TIPOS
// ============================================================================

/** Item de metric con timestamp */
interface MetricItem {
  timestamp: number;
  expectedQty?: number;
  totalQuantity?: number;
  [key: string]: unknown;
}

/** Payload para calcular métricas */
interface CalculateMetricsPayload {
  items: MetricItem[];
  startTime: number;
}

/** Payload para procesar batch */
interface ProcessBatchPayload {
  items: unknown[];
  batchSize?: number;
}

/** Payload para búsqueda */
interface SearchItemsPayload {
  items: Record<string, unknown>[];
  query: string;
  fields: string[];
  limit?: number;
}

/** Payload para agregar estadísticas */
interface AggregateStatsPayload {
  items: Record<string, unknown>[];
  groupBy: string | string[];
  aggregations: Array<{
    field: string;
    operation: 'sum' | 'avg' | 'count' | 'min' | 'max';
    type?: 'sum' | 'avg' | 'count' | 'min' | 'max';
    alias?: string;
  }>;
}

/** Payload para serializar datos */
interface SerializeDataPayload {
  data: unknown;
  format: 'json' | 'csv';
}

/** Payload unificado para tasks */
export type WorkerTaskPayload =
  | CalculateMetricsPayload
  | ProcessBatchPayload
  | SearchItemsPayload
  | AggregateStatsPayload
  | SerializeDataPayload;

export type WorkerTaskType =
  'CALCULATE_METRICS' | 'PROCESS_BATCH' | 'SEARCH_ITEMS' | 'SERIALIZE_DATA' | 'AGGREGATE_STATS';

export interface WorkerTask {
  id: string;
  type: WorkerTaskType;
  payload: WorkerTaskPayload;
  priority?: number;
}

export interface WorkerResult<T = unknown> {
  id: string;
  success: boolean;
  result?: T;
  error?: string;
  duration: number;
}

// ============================================================================
// HANDLERS
// ============================================================================

type HandlerResult = unknown;

const handlers: Record<string, (payload: WorkerTaskPayload) => HandlerResult> = {
  /**
   * Calcular métricas de productividad
   */
  CALCULATE_METRICS: payload => {
    const { items, startTime } = payload as CalculateMetricsPayload;

    const now = Date.now();
    const elapsed = now - startTime;

    // Agrupar por timestamp (ventanas de 30 segundos)
    const buckets = new Map<number, number>();

    items.forEach((item: MetricItem) => {
      const bucket = Math.floor(item.timestamp / 30000) * 30000;
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    });

    // Calcular rates
    const rates = Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([timestamp, count]) => ({
        timestamp,
        rate: count * 2, // items por minuto (30s bucket = 2x)
      }));

    // Calcular tendencia
    const recentRates = rates.slice(-3).map(r => r.rate);
    const olderRates = rates.slice(-6, -3).map(r => r.rate);

    const recentAvg = recentRates.reduce((a, b) => a + b, 0) / (recentRates.length || 1);
    const olderAvg = olderRates.reduce((a, b) => a + b, 0) / (olderRates.length || 1);

    const trend =
      recentAvg > olderAvg * 1.1 ? 'up' : recentAvg < olderAvg * 0.9 ? 'down' : 'stable';

    // Accuracy
    const withExpected = items.filter((i: MetricItem) => i.expectedQty !== undefined);
    const correct = withExpected.filter(
      (i: MetricItem) =>
        i.totalQuantity !== undefined &&
        Math.abs(i.totalQuantity - i.expectedQty!) <= Math.ceil(i.expectedQty! * 0.05)
    );

    return {
      totalItems: items.length,
      elapsed,
      currentRate: rates.length > 0 ? rates[rates.length - 1].rate : 0,
      averageRate: elapsed > 0 ? (items.length / elapsed) * 60000 : 0,
      peakRate: rates.length > 0 ? Math.max(...rates.map(r => r.rate)) : 0,
      trend,
      accuracy: withExpected.length > 0 ? (correct.length / withExpected.length) * 100 : 100,
      rateHistory: rates,
    };
  },

  /**
   * Procesar batch de items
   */
  PROCESS_BATCH: payload => {
    const { items } = payload as ProcessBatchPayload;
    const results: Array<Record<string, unknown> & { processed?: boolean; error?: boolean }> = [];

    for (const item of items) {
      const recordItem = item as Record<string, unknown>;
      try {
        // Simular procesamiento
        const processed = {
          ...recordItem,
          processed: true,
          processedAt: Date.now(),
        };
        results.push(processed);
      } catch (err) {
        results.push({ ...recordItem, error: true });
      }
    }

    return {
      total: items.length,
      processed: results.filter(r => !r.error).length,
      failed: results.filter(r => r.error).length,
      results,
    };
  },

  /**
   * Búsqueda en grandes datasets
   */
  SEARCH_ITEMS: payload => {
    const { items, query, fields, limit = 50 } = payload as SearchItemsPayload;
    const start = Date.now();

    const normalizedQuery = query.toLowerCase().trim();
    const results: Array<Record<string, unknown> & { score: number }> = [];

    for (const item of items) {
      const recordItem = item as Record<string, unknown>;
      // Buscar en campos especificados
      const match = fields.some((field: string) => {
        const value = recordItem[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(normalizedQuery);
        }
        return String(value).toLowerCase().includes(normalizedQuery);
      });

      if (match) {
        results.push({
          ...recordItem,
          score: fields.reduce((score: number, field: string) => {
            const value = String(recordItem[field] || '').toLowerCase();
            if (value === normalizedQuery) return score + 100;
            if (value.startsWith(normalizedQuery)) return score + 50;
            if (value.includes(normalizedQuery)) return score + 10;
            return score;
          }, 0),
        });
      }

      // Limitar para no procesar todo el array
      if (results.length >= limit * 2) break;
    }

    // Ordenar por score y limitar
    results.sort((a, b) => b.score - a.score);

    return {
      query,
      totalScanned: items.length,
      found: results.length,
      duration: Date.now() - start,
      results: results.slice(0, limit),
    };
  },

  /**
   * Serializar datos grandes
   */
  SERIALIZE_DATA: payload => {
    const { data, format } = payload as SerializeDataPayload;

    switch (format) {
      case 'json':
        return JSON.stringify(data);

      case 'csv':
        if (!Array.isArray(data) || data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const rows = data.map(item =>
          headers
            .map(h => {
              const val = item[h];
              if (val === null || val === undefined) return '';
              if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                return `"${val.replace(/"/g, '""')}"`;
              }
              return String(val);
            })
            .join(',')
        );

        return [headers.join(','), ...rows].join('\n');

      default:
        return JSON.stringify(data);
    }
  },

  /**
   * Agregar estadísticas
   */
  AGGREGATE_STATS: payload => {
    const { items, groupBy, aggregations } = payload as AggregateStatsPayload;

    // Normalizar groupBy a array
    const groupByFields = Array.isArray(groupBy) ? groupBy : [groupBy];

    // Agrupar
    type GroupKey = string | number;
    const groups = new Map<GroupKey, Record<string, unknown>[]>();

    for (const item of items) {
      // Crear key compuesta de los campos de groupBy
      const keyValues = groupByFields.map(field => item[field]);
      const key: GroupKey =
        keyValues.length === 1
          ? (String(keyValues[0]) as GroupKey)
          : (keyValues.join('_') as GroupKey);

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }

    // Agregar
    interface AggregationResult extends Record<string, unknown> {
      [key: string]: unknown;
    }
    const results: AggregationResult[] = [];

    groups.forEach((groupItems, key) => {
      const result: AggregationResult = { [groupByFields[groupByFields.length - 1]]: key };

      for (const agg of aggregations) {
        const values = groupItems.map((i: Record<string, unknown>) => i[agg.field] as number);

        switch (agg.type) {
          case 'sum':
            result[agg.alias || agg.field] = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            result[agg.alias || agg.field] = values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case 'min':
            result[agg.alias || agg.field] = Math.min(...values);
            break;
          case 'max':
            result[agg.alias || agg.field] = Math.max(...values);
            break;
          case 'count':
            result[agg.alias || agg.field] = values.length;
            break;
        }
      }

      results.push(result);
    });

    return results;
  },
};

// ============================================================================
// WORKER
// ============================================================================

self.onmessage = (event: MessageEvent<WorkerTask>) => {
  const { id, type, payload } = event.data;
  const startTime = Date.now();

  try {
    logger.debug('PerformanceWorker', 'Processing task', { id, type });

    const handler = handlers[type];

    if (!handler) {
      throw new Error(`Unknown task type: ${type}`);
    }

    const result = handler(payload);

    self.postMessage({
      id,
      success: true,
      result,
      duration: Date.now() - startTime,
    } as WorkerResult);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('PerformanceWorker', 'Task failed', { id, type, error: message });

    self.postMessage({
      id,
      success: false,
      error: message,
      duration: Date.now() - startTime,
    } as WorkerResult);
  }
};

// Export para TypeScript
export {};
