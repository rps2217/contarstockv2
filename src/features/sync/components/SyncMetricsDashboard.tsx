/**
 * =============================================================================
 * SyncMetricsDashboard - Panel de Métricas de Sincronización
 * =============================================================================
 * 
 * Dashboard en tiempo real con métricas del sistema de sincronización.
 * 
 * @module SyncMetricsDashboard
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Database,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import { syncMetrics, SyncHealth, SyncStats } from '@/services/cloud/SyncMetrics';
import { formatDuration, formatTimeAgo } from '@/lib/date';

interface SyncMetricsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export const SyncMetricsDashboard: React.FC<SyncMetricsDashboardProps> = ({
  isOpen,
  onClose,
  onRefresh
}) => {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [health, setHealth] = useState<SyncHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar métricas
  useEffect(() => {
    if (!isOpen) return;

    const loadMetrics = () => {
      try {
        const statsData = syncMetrics.getStats();
        const healthData = syncMetrics.getHealth();
        setStats(statsData);
        setHealth(healthData);
      } catch (e) {
        console.error('Error loading metrics:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadMetrics();

    // Suscribirse a nuevas métricas
    const unsubscribe = syncMetrics.subscribe(() => {
      loadMetrics();
    });

    // Auto-refresh cada 10 segundos
    const interval = setInterval(loadMetrics, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper para formatear tiempo relativo con mensaje personalizado
  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Nunca';
    return formatTimeAgo(timestamp, { lessThanOneMinute: 'Hace menos de 1m' });
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'emerald';
    if (score >= 70) return 'amber';
    return 'rose';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 90) return 'Excelente';
    if (score >= 70) return 'Bueno';
    if (score >= 50) return 'Regular';
    return 'Crítico';
  };

  return (
    <div className="bg-surface rounded-2xl border border-subtle overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-subtle flex items-center justify-between bg-surface/50">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-white text-sm">Métricas de Sincronización</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const statsData = syncMetrics.getStats();
              const healthData = syncMetrics.getHealth();
              setStats(statsData);
              setHealth(healthData);
              onRefresh?.();
            }}
            className="p-2 hover:bg-elevated rounded-lg transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4 text-muted" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-muted animate-spin" />
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Health Score */}
          {health && (
            <div className={`p-4 rounded-xl border bg-${getHealthColor(health.score)}-500/5 border-${getHealthColor(health.score)}-500/20`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${getHealthColor(health.score)}-500/10`}>
                    <span className={`text-2xl font-black text-${getHealthColor(health.score)}-400`}>
                      {health.score}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-white">Salud del Sync</p>
                    <p className="text-xs text-muted">{getHealthLabel(health.score)}</p>
                  </div>
                </div>
                {health.issues.length > 0 && (
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-bold">{health.issues.length} issues</span>
                  </div>
                )}
              </div>
              {health.issues.length > 0 && (
                <div className="mt-3 space-y-1">
                  {health.issues.map((issue, i) => (
                    <p key={i} className="text-xs text-amber-300 flex items-start gap-1.5">
                      <span className="mt-0.5">•</span>
                      {issue}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Total Syncs */}
              <div className="p-3 rounded-xl bg-elevated/50 border border-subtle/30">
                <div className="flex items-center gap-2 text-muted mb-2">
                  <Zap className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase">Total</span>
                </div>
                <p className="text-2xl font-black text-white">{stats.totalSyncs}</p>
                <p className="text-[10px] text-slate-500 mt-1">sincronizaciones</p>
              </div>

              {/* Success Rate */}
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase">Éxitos</span>
                </div>
                <p className="text-2xl font-black text-emerald-400">
                  {stats.totalSyncs > 0 
                    ? Math.round((stats.successfulSyncs / stats.totalSyncs) * 100)
                    : 0}%
                </p>
                <p className="text-[10px] text-slate-500 mt-1">{stats.successfulSyncs} exitosos</p>
              </div>

              {/* Errors */}
              <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <div className="flex items-center gap-2 text-rose-400 mb-2">
                  <XCircle className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase">Errores</span>
                </div>
                <p className="text-2xl font-black text-rose-400">{stats.failedSyncs}</p>
                <p className="text-[10px] text-slate-500 mt-1">fallidos</p>
              </div>

              {/* Latency */}
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase">Latencia</span>
                </div>
                <p className="text-2xl font-black text-blue-400">
                  {formatDuration(stats.averageLatency)}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">promedio</p>
              </div>

              {/* Records Pushed */}
              <div className="p-3 rounded-xl bg-elevated/50 border border-subtle/30">
                <div className="flex items-center gap-2 text-muted mb-2">
                  <ArrowUpCircle className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase">Subidos</span>
                </div>
                <p className="text-2xl font-black text-white">{stats.totalRecordsPushed}</p>
                <p className="text-[10px] text-slate-500 mt-1">registros</p>
              </div>

              {/* Records Pulled */}
              <div className="p-3 rounded-xl bg-elevated/50 border border-subtle/30">
                <div className="flex items-center gap-2 text-muted mb-2">
                  <ArrowDownCircle className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase">Descargados</span>
                </div>
                <p className="text-2xl font-black text-white">{stats.totalRecordsPulled}</p>
                <p className="text-[10px] text-slate-500 mt-1">registros</p>
              </div>

              {/* Last Sync */}
              <div className="p-3 rounded-xl bg-elevated/50 border border-subtle/30 col-span-2">
                <div className="flex items-center gap-2 text-muted mb-2">
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase">Última Sync</span>
                </div>
                <p className="text-lg font-black text-white">
                  {formatTimeAgo(stats.lastSyncTime ?? 0)}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {stats.lastSyncTime 
                    ? new Date(stats.lastSyncTime).toLocaleString('es-CL')
                    : 'Sin datos'}
                </p>
              </div>
            </div>
          )}

          {/* Per-Table Stats */}
          {stats && Object.keys(stats.tables).length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Por Tabla
              </h4>
              <div className="space-y-2">
                {Object.entries(stats.tables).map(([table, tableStats]) => (
                  <div 
                    key={table}
                    className="flex items-center justify-between p-2 rounded-lg bg-elevated/30 border border-subtle/20"
                  >
                    <span className="text-sm font-medium text-secondary capitalize">{table}</span>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-emerald-400">
                        ↑{tableStats.recordsPushed}
                      </span>
                      <span className="text-blue-400">
                        ↓{tableStats.recordsPulled}
                      </span>
                      <span className="text-slate-500">
                        {tableStats.syncCount} sync
                      </span>
                      {tableStats.failCount > 0 && (
                        <span className="text-rose-400 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          {tableStats.failCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SyncMetricsDashboard;
