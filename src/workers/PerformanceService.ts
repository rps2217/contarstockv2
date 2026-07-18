/**
 * PerformanceService - Wrapper para el Web Worker
 *
 * Proporciona una API simple para ejecutar operaciones pesadas
 * en un Web Worker sin bloquear el hilo principal.
 */

import { logger } from '@/services/logger';
import type {
  WorkerTask,
  WorkerResult,
  WorkerTaskType,
  WorkerTaskPayload,
} from './PerformanceWorker';

// ============================================================================
// TIPOS
// ============================================================================

/** Resultado genérico del worker */
type WorkerResultValue = unknown;

// ============================================================================
// SINGLETON
// ============================================================================

class PerformanceServiceClass {
  private worker: Worker | null = null;
  private pendingTasks = new Map<
    string,
    {
      resolve: (result: WorkerResultValue) => void;
      reject: (error: Error) => void;
    }
  >();
  private isInitialized = false;

  /**
   * Inicializar worker
   */
  private init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      // Crear worker inline
      const workerCode = this.getWorkerCode();
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);

      this.worker = new Worker(workerUrl);

      this.worker.onmessage = (event: MessageEvent<WorkerResult>) => {
        this.handleResult(event.data);
      };

      this.worker.onerror = error => {
        logger.error('PerformanceService', 'Worker error', { error });
      };

      this.isInitialized = true;
      logger.info('PerformanceService', 'Initialized');
    } catch (error) {
      logger.error('PerformanceService', 'Failed to initialize worker', { error });
    }
  }

  /**
   * Obtener código del worker
   */
  private getWorkerCode(): string {
    return `
      const handlers = {
        CALCULATE_METRICS: (payload) => {
          const { items, startTime } = payload;
          const now = Date.now();
          const elapsed = now - startTime;
          
          const buckets = new Map();
          items.forEach((item) => {
            const bucket = Math.floor(item.timestamp / 30000) * 30000;
            buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
          });

          const rates = Array.from(buckets.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([timestamp, count]) => ({
              timestamp,
              rate: count * 2,
            }));

          const recentRates = rates.slice(-3).map(r => r.rate);
          const olderRates = rates.slice(-6, -3).map(r => r.rate);
          
          const recentAvg = recentRates.reduce((a, b) => a + b, 0) / (recentRates.length || 1);
          const olderAvg = olderRates.reduce((a, b) => a + b, 0) / (olderRates.length || 1);
          
          const trend = recentAvg > olderAvg * 1.1 ? 'up' 
                     : recentAvg < olderAvg * 0.9 ? 'down' 
                     : 'stable';

          const withExpected = items.filter(i => i.expectedQty !== undefined);
          const correct = withExpected.filter(
            i => Math.abs(i.totalQuantity - i.expectedQty) <= Math.ceil(i.expectedQty * 0.05)
          );

          return {
            totalItems: items.length,
            elapsed,
            currentRate: rates.length > 0 ? rates[rates.length - 1].rate : 0,
            averageRate: elapsed > 0 ? (items.length / elapsed) * 60000 : 0,
            peakRate: rates.length > 0 ? Math.max(...rates.map(r => r.rate)) : 0,
            trend,
            accuracy: withExpected.length > 0 
              ? (correct.length / withExpected.length) * 100 
              : 100,
            rateHistory: rates,
          };
        },

        SEARCH_ITEMS: (payload) => {
          const { items, query, fields, limit = 50 } = payload;
          const normalizedQuery = query.toLowerCase().trim();
          const results = [];
          
          for (const item of items) {
            const match = fields.some(field => {
              const value = item[field];
              if (typeof value === 'string') {
                return value.toLowerCase().includes(normalizedQuery);
              }
              return String(value || '').toLowerCase().includes(normalizedQuery);
            });
            
            if (match) {
              results.push(item);
            }
            
            if (results.length >= limit * 2) break;
          }
          
          return {
            query,
            totalScanned: items.length,
            found: results.length,
            results: results.slice(0, limit),
          };
        },

        SERIALIZE_DATA: (payload) => {
          const { data, format } = payload;
          
          if (format === 'csv' && Array.isArray(data) && data.length > 0) {
            const headers = Object.keys(data[0]);
            const rows = data.map(item => 
              headers.map(h => {
                const val = item[h];
                if (val === null || val === undefined) return '';
                return String(val);
              }).join(',')
            );
            return [headers.join(','), ...rows].join('\\n');
          }
          
          return JSON.stringify(data);
        },
      };

      self.onmessage = (event) => {
        const { id, type, payload } = event.data;
        const startTime = Date.now();

        try {
          const handler = handlers[type];
          if (!handler) throw new Error('Unknown task type: ' + type);

          const result = handler(payload);
          
          self.postMessage({
            id,
            success: true,
            result,
            duration: Date.now() - startTime,
          });
        } catch (error) {
          self.postMessage({
            id,
            success: false,
            error: error.message,
            duration: Date.now() - startTime,
          });
        }
      };
    `;
  }

  /**
   * Manejar resultado del worker
   */
  private handleResult(result: WorkerResult): void {
    const pending = this.pendingTasks.get(result.id);

    if (!pending) {
      logger.warn('PerformanceService', 'No pending task found', { id: result.id });
      return;
    }

    this.pendingTasks.delete(result.id);

    if (result.success) {
      pending.resolve(result.result);
    } else {
      pending.reject(new Error(result.error));
    }
  }

  /**
   * Ejecutar tarea en el worker
   */
  async execute<T = unknown>(type: WorkerTaskType, payload: WorkerTaskPayload): Promise<T> {
    // Inicializar si no está hecho
    this.init();

    // Si el worker no está disponible, ejecutar en main thread
    if (!this.worker) {
      logger.warn('PerformanceService', 'Worker not available, executing in main thread');
      return this.executeInMainThread(type, payload) as T;
    }

    return new Promise<T>((resolve, reject) => {
      const id = crypto.randomUUID();

      this.pendingTasks.set(id, {
        resolve: resolve as (result: WorkerResultValue) => void,
        reject,
      });

      this.worker!.postMessage({ id, type, payload });

      // Timeout de 30 segundos
      setTimeout(() => {
        if (this.pendingTasks.has(id)) {
          this.pendingTasks.delete(id);
          reject(new Error('Worker task timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Fallback: ejecutar en main thread
   */
  private executeInMainThread(type: WorkerTaskType, payload: WorkerTaskPayload): WorkerResultValue {
    switch (type) {
      case 'CALCULATE_METRICS': {
        const p = payload as { items: Record<string, unknown>[]; startTime: number };
        return this.calculateMetrics(p.items, p.startTime);
      }
      case 'SEARCH_ITEMS': {
        const p = payload as {
          items: Record<string, unknown>[];
          query: string;
          fields: string[];
          limit?: number;
        };
        return this.searchItems(p.items, p.query, p.fields, p.limit);
      }
      case 'SERIALIZE_DATA': {
        const p = payload as { data: unknown };
        return JSON.stringify(p.data);
      }
      default:
        throw new Error(`Unsupported task type: ${type}`);
    }
  }

  /**
   * Calcular métricas (fallback main thread)
   */
  private calculateMetrics(items: Record<string, unknown>[], startTime: number) {
    const elapsed = Date.now() - startTime;

    return {
      totalItems: items.length,
      elapsed,
      averageRate: elapsed > 0 ? (items.length / elapsed) * 60000 : 0,
      currentRate: 0,
      peakRate: 0,
      trend: 'stable',
      accuracy: 100,
      rateHistory: [],
    };
  }

  /**
   * Calcular métricas de productividad
   */
  calculateProductivityMetrics(
    items: Record<string, unknown>[],
    startTime: number
  ): Promise<unknown> {
    return this.execute('CALCULATE_METRICS', { items, startTime });
  }

  /**
   * Buscar en items
   */
  searchItems(
    items: Record<string, unknown>[],
    query: string,
    fields: string[],
    limit = 50
  ): Promise<unknown> {
    return this.execute('SEARCH_ITEMS', { items, query, fields, limit });
  }

  /**
   * Serializar datos
   */
  serializeData(data: unknown, format: 'json' | 'csv' = 'json'): Promise<string> {
    return this.execute('SERIALIZE_DATA', { data, format });
  }

  /**
   * Verificar si el worker está disponible
   */
  isWorkerAvailable(): boolean {
    return !!this.worker;
  }

  /**
   * Terminar worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.pendingTasks.clear();
    }
  }
}

export const PerformanceService = new PerformanceServiceClass();
export default PerformanceService;
