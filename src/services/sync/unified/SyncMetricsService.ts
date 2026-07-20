/**
 * SyncMetricsService - Sistema de métricas de sincronización
 */
import { db } from '@/db';
import { logger } from '@/services/logger';

// ============================================================================
// TIPOS
// ============================================================================

export interface MetricRecord {
  id?: number;
  timestamp: number;
  operation: string;
  tableName: string;
  duration: number;
  success: boolean;
  recordsAffected: number;
  error?: string;
}

export type MetricOperation =
  | 'push'
  | 'pull'
  | 'batch_push'
  | 'batch_pull'
  | 'delete'
  | 'conflict_check'
  | 'conflict_resolve'
  | 'realtime_update';

export interface TableMetrics {
  tableName: string;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  avgDuration: number;
  successRate: number;
}

export interface SyncTrend {
  date: string;
  operations: number;
  successRate: number;
  avgDuration: number;
  recordsProcessed: number;
}

// ============================================================================
// SERVICE
// ============================================================================

class SyncMetricsService {
  private inMemoryCache: MetricRecord[] = [];
  private cacheFlushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly CACHE_MAX_SIZE = 50;
  private readonly FLUSH_INTERVAL_MS = 30000;

  constructor() {
    this.startCacheFlush();
  }

  async recordMetric(record: Omit<MetricRecord, 'id'>): Promise<void> {
    const fullRecord: MetricRecord = {
      ...record,
      timestamp: Date.now(),
    };

    this.inMemoryCache.push(fullRecord);

    if (this.inMemoryCache.length >= this.CACHE_MAX_SIZE) {
      await this.flushCache();
    }
  }

  async getTableMetrics(since?: number): Promise<TableMetrics[]> {
    try {
      let records: MetricRecord[];

      if (since) {
        records = await db.syncMetrics.where('timestamp').above(since).toArray();
      } else {
        records = await db.syncMetrics.toArray();
      }

      const byTable = new Map<string, MetricRecord[]>();
      for (const record of records) {
        const arr = byTable.get(record.tableName) || [];
        arr.push(record);
        byTable.set(record.tableName, arr);
      }

      const results: TableMetrics[] = [];

      for (const [name, tableRecords] of byTable) {
        const successful = tableRecords.filter(r => r.success);
        const durations = tableRecords.map(r => r.duration);

        results.push({
          tableName: name,
          totalOperations: tableRecords.length,
          successfulOperations: successful.length,
          failedOperations: tableRecords.length - successful.length,
          avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
          successRate: successful.length / tableRecords.length,
        });
      }

      return results.sort((a, b) => b.totalOperations - a.totalOperations);
    } catch (error: unknown) {
      logger.error('METRICS', 'Failed to get table metrics', String(error));
      return [];
    }
  }

  async getTrends(days: number = 7): Promise<SyncTrend[]> {
    try {
      const since = Date.now() - days * 24 * 60 * 60 * 1000;
      const records = await db.syncMetrics.where('timestamp').above(since).toArray();

      const byDay = new Map<string, MetricRecord[]>();
      for (const record of records) {
        const date = new Date(record.timestamp).toISOString().split('T')[0];
        const arr = byDay.get(date) || [];
        arr.push(record);
        byDay.set(date, arr);
      }

      const trends: SyncTrend[] = [];

      for (const [date, dayRecords] of byDay) {
        const successful = dayRecords.filter(r => r.success);
        trends.push({
          date,
          operations: dayRecords.length,
          successRate: successful.length / dayRecords.length,
          avgDuration: dayRecords.reduce((sum, r) => sum + r.duration, 0) / dayRecords.length,
          recordsProcessed: dayRecords.reduce((sum, r) => sum + r.recordsAffected, 0),
        });
      }

      return trends.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error: unknown) {
      logger.error('METRICS', 'Failed to get trends', String(error));
      return [];
    }
  }

  async getHealthSummary(): Promise<{
    successRate: number;
    avgResponseTime: number;
    lastSyncAt: number | null;
  }> {
    try {
      const since = Date.now() - 24 * 60 * 60 * 1000;
      const records = await db.syncMetrics.where('timestamp').above(since).toArray();

      if (records.length === 0) {
        return { successRate: 1, avgResponseTime: 0, lastSyncAt: null };
      }

      const successful = records.filter(r => r.success);

      return {
        successRate: successful.length / records.length,
        avgResponseTime: records.reduce((sum, r) => sum + r.duration, 0) / records.length,
        lastSyncAt: Math.max(...records.map(r => r.timestamp)),
      };
    } catch (error: unknown) {
      logger.error('METRICS', 'Failed to get health', String(error));
      return { successRate: 0, avgResponseTime: 0, lastSyncAt: null };
    }
  }

  async cleanupOldMetrics(days: number = 30): Promise<number> {
    try {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const oldRecords = await db.syncMetrics.where('timestamp').below(cutoff).toArray();

      await db.syncMetrics.bulkDelete(oldRecords.map(r => r.id!));
      return oldRecords.length;
    } catch (error: unknown) {
      logger.error('METRICS', 'Cleanup failed', String(error));
      return 0;
    }
  }

  private async flushCache(): Promise<void> {
    if (this.inMemoryCache.length === 0) return;

    const records = [...this.inMemoryCache];
    this.inMemoryCache = [];

    try {
      await db.syncMetrics.bulkAdd(records);
    } catch (error: unknown) {
      logger.error('METRICS', 'Flush failed', String(error));
      this.inMemoryCache = [...records, ...this.inMemoryCache];
    }
  }

  private startCacheFlush(): void {
    this.cacheFlushInterval = setInterval(() => {
      this.flushCache();
    }, this.FLUSH_INTERVAL_MS);
  }

  destroy(): void {
    if (this.cacheFlushInterval) {
      clearInterval(this.cacheFlushInterval);
    }
    this.flushCache();
  }
}

export const syncMetricsService = new SyncMetricsService();
export default SyncMetricsService;
