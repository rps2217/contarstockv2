/**
 * DatabaseMetricsPanel - Panel de métricas de uso de la base de datos
 *
 * Muestra:
 * - Gráficos de uso de tablas
 * - Historial de sincronización
 * - Métricas de performance
 * - Tendencias de crecimiento
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/db';
import { QueryCache } from '@/db/services/QueryCache';
import { DatabaseHealthService } from '@/db/services/DatabaseHealthService';
import type { TableStats } from '@/db/services';

// ============================================================================
// TIPOS
// ============================================================================

interface DatabaseMetricsPanelProps {
  className?: string;
}

// ============================================================================
// UTILIDADES
// ============================================================================

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// ============================================================================
// COMPONENTES
// ============================================================================

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="h-2 bg-surface rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={cn('h-full rounded-full', color)}
      />
    </div>
  );
}

function TableMetricCard({ stats, maxRecords }: { stats: TableStats; maxRecords: number }) {
  return (
    <div className="p-3 bg-surface rounded-xl border border-subtle">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-primary">{stats.tableName}</span>
        </div>
        <span className="text-xs text-muted">{formatNumber(stats.recordCount)}</span>
      </div>
      <MiniBar
        value={stats.recordCount}
        max={maxRecords}
        color={stats.recordCount > maxRecords * 0.8 ? 'bg-rose-500' : 'bg-blue-500'}
      />
      <div className="flex justify-between mt-1 text-[10px] text-muted">
        <span>{formatBytes(stats.sizeEstimate)}</span>
        <span>{stats.indexCount} índices</span>
      </div>
    </div>
  );
}

function CacheStatsCard() {
  const stats = QueryCache.getStats();
  const keys = QueryCache.getKeys();

  return (
    <div className="p-4 bg-surface rounded-xl border border-subtle">
      <h4 className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4 text-purple-500" />
        Estadísticas de Caché
      </h4>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-base rounded-lg">
          <p className="text-2xl font-bold text-primary">{stats.size}</p>
          <p className="text-xs text-muted">Entradas</p>
        </div>
        <div className="p-3 bg-base rounded-lg">
          <p
            className={cn(
              'text-2xl font-bold',
              stats.hitRate >= 70
                ? 'text-emerald-500'
                : stats.hitRate >= 40
                  ? 'text-amber-500'
                  : 'text-rose-500'
            )}
          >
            {stats.hitRate}%
          </p>
          <p className="text-xs text-muted">Hit Rate</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted">Hits</span>
          <span className="text-emerald-500 font-medium">{stats.hits}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Misses</span>
          <span className="text-rose-500 font-medium">{stats.misses}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted">Evictions</span>
          <span className="text-muted">{stats.evictions}</span>
        </div>
      </div>

      {keys.length > 0 && (
        <div className="mt-3 pt-3 border-t border-subtle">
          <p className="text-xs text-muted mb-2">Claves activas:</p>
          <div className="flex flex-wrap gap-1">
            {keys.slice(0, 5).map(key => (
              <span
                key={key}
                className="px-2 py-0.5 bg-base rounded text-[10px] text-muted truncate max-w-[100px]"
              >
                {key.split(':')[0]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GrowthChart({ tableStats }: { tableStats: TableStats[] }) {
  const totalRecords = tableStats.reduce((sum, t) => sum + t.recordCount, 0);
  const totalSize = tableStats.reduce((sum, t) => sum + t.sizeEstimate, 0);

  return (
    <div className="p-4 bg-surface rounded-xl border border-subtle">
      <h4 className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-emerald-500" />
        Resumen de Crecimiento
      </h4>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-base rounded-lg text-center">
          <p className="text-2xl font-bold text-primary">{formatNumber(totalRecords)}</p>
          <p className="text-xs text-muted">Total Registros</p>
        </div>
        <div className="p-3 bg-base rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-500">{formatBytes(totalSize)}</p>
          <p className="text-xs text-muted">Tamaño Estimado</p>
        </div>
      </div>

      {/* Gráfico simple de barras */}
      <div className="space-y-2">
        <p className="text-xs text-muted">Distribución por tabla</p>
        {tableStats.slice(0, 6).map(stat => (
          <div key={stat.tableName} className="flex items-center gap-2">
            <span className="text-xs text-muted w-20 truncate">{stat.tableName}</span>
            <div className="flex-1">
              <MiniBar value={stat.recordCount} max={totalRecords} color="bg-blue-500" />
            </div>
            <span className="text-xs text-muted w-12 text-right">
              {formatNumber(stat.recordCount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SyncMetricsCard() {
  const [syncData, setSyncData] = useState<{
    pending: number;
    errors: number;
    lastSync: number | null;
  }>({ pending: 0, errors: 0, lastSync: null });

  useEffect(() => {
    const loadData = async () => {
      try {
        const pending = await db.syncQueue.count();
        const errors = await db.syncQueue.filter(q => q.retries >= 3).count();
        const lastSyncRecord = await db.syncMetrics.orderBy('timestamp').last();

        setSyncData({
          pending,
          errors,
          lastSync: lastSyncRecord?.timestamp || null,
        });
      } catch {
        // Ignore errors
      }
    };

    loadData();
  }, []);

  return (
    <div className="p-4 bg-surface rounded-xl border border-subtle">
      <h4 className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-500" />
        Métricas de Sincronización
      </h4>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-base rounded-lg text-center">
          <p className="text-xl font-bold text-primary">{syncData.pending}</p>
          <p className="text-[10px] text-muted">Pendientes</p>
        </div>
        <div className="p-3 bg-base rounded-lg text-center">
          <p
            className={cn(
              'text-xl font-bold',
              syncData.errors > 0 ? 'text-rose-500' : 'text-emerald-500'
            )}
          >
            {syncData.errors}
          </p>
          <p className="text-[10px] text-muted">Errores</p>
        </div>
        <div className="p-3 bg-base rounded-lg text-center">
          <p className="text-xs font-bold text-primary">
            {syncData.lastSync ? new Date(syncData.lastSync).toLocaleTimeString() : '—'}
          </p>
          <p className="text-[10px] text-muted">Última Sync</p>
        </div>
      </div>

      {syncData.pending > 100 && (
        <div className="p-2 bg-amber-500/10 rounded-lg flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-500" />
          <p className="text-xs text-amber-500">Muchas operaciones pendientes en cola</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function DatabaseMetricsPanel({ className }: DatabaseMetricsPanelProps) {
  const [tableStats, setTableStats] = useState<TableStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const stats = await DatabaseHealthService.getAllTableStats();
      setTableStats(stats);
      setLastUpdate(Date.now());
    } catch {
      // Ignore errors
    } finally {
      setIsLoading(false);
    }
  };

  const maxRecords = Math.max(...tableStats.map(t => t.recordCount), 1);

  return (
    <div className={cn('bg-base rounded-2xl border border-subtle overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-bold text-primary">Métricas de Base de Datos</h3>
            <p className="text-xs text-muted">
              Actualizado: {new Date(lastUpdate).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <button
          onClick={loadStats}
          disabled={isLoading}
          className="p-2 rounded-lg hover:bg-surface transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-5 h-5 text-muted', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[500px] overflow-y-auto space-y-4">
        {isLoading && tableStats.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-muted animate-spin" />
          </div>
        ) : (
          <>
            {/* Growth Chart */}
            <GrowthChart tableStats={tableStats} />

            {/* Tables Grid */}
            <div>
              <h4 className="text-sm font-medium text-secondary mb-3">
                Tablas ({tableStats.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tableStats.map(stats => (
                  <TableMetricCard key={stats.tableName} stats={stats} maxRecords={maxRecords} />
                ))}
              </div>
            </div>

            {/* Cache Stats */}
            <CacheStatsCard />

            {/* Sync Metrics */}
            <SyncMetricsCard />
          </>
        )}
      </div>
    </div>
  );
}

export default DatabaseMetricsPanel;
