/**
 * ConsistencyDashboard - Panel de Consistencia de Datos
 *
 * Muestra métricas de calidad de datos en tiempo real:
 * - Estado de integridad
 * - Métricas de sync
 * - Actividad reciente
 * - Alertas de problemas
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Zap,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { IntegrityValidator } from '@/db/services/IntegrityValidator';
import { TransactionalSyncQueue } from '@/db/services/TransactionalSyncQueue';
import { SessionLockManager } from '@/db/services/SessionLockManager';
import { VersionManager } from '@/db/services/VersionManager';

// ============================================================================
// TIPOS
// ============================================================================

interface DashboardMetrics {
  integrity: {
    status: 'healthy' | 'warning' | 'critical';
    issues: number;
    lastCheck: number | null;
  };
  sync: {
    pending: number;
    failed: number;
    totalProcessed: number;
    avgDuration: number;
  };
  locks: {
    active: number;
    expired: number;
  };
  snapshots: {
    total: number;
    byType: Record<string, number>;
    totalSize: number;
  };
}

// ============================================================================
// COMPONENTES
// ============================================================================

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'stable';
  color?: 'blue' | 'green' | 'amber' | 'rose';
}) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    green: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={cn('bg-surface rounded-xl border p-4', colors[color])}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg bg-black/20')}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold text-primary">{value}</p>
            {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
          </div>
        </div>
        {trend && (
          <TrendIcon
            className={cn(
              'w-4 h-4',
              trend === 'up'
                ? 'text-emerald-500'
                : trend === 'down'
                  ? 'text-rose-500'
                  : 'text-muted'
            )}
          />
        )}
      </div>
    </div>
  );
}

function StatusBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className="h-2 bg-black/20 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={cn('h-full rounded-full', color)}
      />
    </div>
  );
}

function SyncStatusIndicator({ stats }: { stats: DashboardMetrics['sync'] }) {
  const total = stats.pending + stats.failed;
  const successRate =
    stats.totalProcessed > 0
      ? ((stats.totalProcessed - stats.failed) / stats.totalProcessed) * 100
      : 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-secondary">Tasa de éxito</span>
        <span
          className={cn(
            'text-sm font-medium',
            successRate >= 95
              ? 'text-emerald-500'
              : successRate >= 80
                ? 'text-amber-500'
                : 'text-rose-500'
          )}
        >
          {successRate.toFixed(1)}%
        </span>
      </div>
      <StatusBar
        value={successRate}
        max={100}
        color={
          successRate >= 95 ? 'bg-emerald-500' : successRate >= 80 ? 'bg-amber-500' : 'bg-rose-500'
        }
      />

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-black/10 rounded">
          <p className="text-lg font-bold text-blue-500">{stats.pending}</p>
          <p className="text-xs text-muted">Pendientes</p>
        </div>
        <div className="p-2 bg-black/10 rounded">
          <p className="text-lg font-bold text-rose-500">{stats.failed}</p>
          <p className="text-xs text-muted">Fallidos</p>
        </div>
        <div className="p-2 bg-black/10 rounded">
          <p className="text-lg font-bold text-emerald-500">{stats.totalProcessed}</p>
          <p className="text-xs text-muted">Procesados</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span>Avg. duración</span>
        <span>{stats.avgDuration.toFixed(0)}ms</span>
      </div>
    </div>
  );
}

function LockStatusIndicator({ locks }: { locks: DashboardMetrics['locks'] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-secondary">Locks activos</span>
        <span
          className={cn(
            'text-sm font-medium',
            locks.active > 0 ? 'text-amber-500' : 'text-emerald-500'
          )}
        >
          {locks.active}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-muted">
            <Activity className="w-3 h-3" />
            Activos
          </span>
          <span className="text-amber-500">{locks.active}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-muted">
            <Timer className="w-3 h-3" />
            Expirados
          </span>
          <span className="text-rose-500">{locks.expired}</span>
        </div>
      </div>
    </div>
  );
}

function SnapshotStatus({ snapshots }: { snapshots: DashboardMetrics['snapshots'] }) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-secondary">Total snapshots</span>
        <span className="text-sm font-medium text-primary">{snapshots.total}</span>
      </div>

      <div className="space-y-2">
        {Object.entries(snapshots.byType).map(([type, count]) => (
          <div key={type} className="flex items-center justify-between text-xs">
            <span className="text-muted capitalize">{type.replace('_', ' ')}</span>
            <span className="text-secondary">{count}</span>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
        <span className="text-muted">Espacio usado</span>
        <span className="text-secondary">{formatSize(snapshots.totalSize)}</span>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function ConsistencyDashboard({ className }: { className?: string }) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  // Cargar métricas
  const loadMetrics = async () => {
    setIsRefreshing(true);
    try {
      // Paralelizar todas las consultas
      const [integrity, syncQueue, locks, snapshots] = await Promise.all([
        IntegrityValidator.getQuickStatus(),
        TransactionalSyncQueue.getStats(),
        SessionLockManager.getAllLocks(),
        VersionManager.getStats(),
      ]);

      const syncMetrics = TransactionalSyncQueue.getMetrics();

      setMetrics({
        integrity: {
          status: integrity.status,
          issues: integrity.issues,
          lastCheck: integrity.lastCheck,
        },
        sync: {
          pending: syncQueue.pending,
          failed: syncQueue.failed,
          totalProcessed: syncMetrics.totalProcessed,
          avgDuration: syncMetrics.avgDuration,
        },
        locks: {
          active: locks.length,
          expired: 0, // Se limpian automáticamente
        },
        snapshots: {
          total: snapshots.totalSnapshots,
          byType: snapshots.byType as Record<string, number>,
          totalSize: snapshots.totalSize,
        },
      });

      setLastUpdate(Date.now());
    } catch (error) {
      toast.error('Error al cargar métricas');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Cargar al montar
  useEffect(() => {
    loadMetrics();

    // Auto-refresh cada 30 segundos
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-fix si hay problemas
  const handleAutoFix = async () => {
    try {
      toast.promise(IntegrityValidator.validate(true), {
        loading: 'Ejecutando validación y corrección...',
        success: report =>
          `Validación completada: ${report.totalIssues} problemas ${report.totalIssues === 0 ? 'corregidos' : 'encontrados'}`,
        error: 'Error en validación',
      });
      await loadMetrics();
    } catch {
      // Error manejado por toast
    }
  };

  // Cleanup de locks expirados
  const handleCleanupLocks = async () => {
    try {
      const cleaned = await SessionLockManager.cleanup();
      toast.success(`${cleaned} locks expirados limpiados`);
      await loadMetrics();
    } catch {
      toast.error('Error al limpiar locks');
    }
  };

  // Retry de sync fallidos
  const handleRetrySync = async () => {
    try {
      const retried = await TransactionalSyncQueue.retryFailed();
      toast.success(`${retried} operaciones reintentadas`);
      await loadMetrics();
    } catch {
      toast.error('Error al reintentar');
    }
  };

  const getOverallStatus = (): 'healthy' | 'warning' | 'critical' => {
    if (!metrics) return 'healthy';
    const { integrity, sync, locks } = metrics;

    if (integrity.status === 'critical' || sync.failed > 10) return 'critical';
    if (integrity.status === 'warning' || sync.failed > 0 || locks.active > 5) return 'warning';
    return 'healthy';
  };

  const statusConfig = {
    healthy: {
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      label: 'Saludable',
    },
    warning: {
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      label: 'Advertencia',
    },
    critical: {
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      label: 'Crítico',
    },
  };

  const overallStatus = getOverallStatus();
  const { color, bg, border, label } = statusConfig[overallStatus];

  return (
    <div className={cn('bg-base rounded-2xl border border-subtle overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-xl', bg)}>
              <Shield className={cn('w-5 h-5', color)} />
            </div>
            <div>
              <h3 className="font-bold text-primary">Consistencia de Datos</h3>
              <p className="text-xs text-muted">Métricas de calidad en tiempo real</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border',
                bg,
                color,
                border
              )}
            >
              {overallStatus === 'healthy' ? (
                <CheckCircle className="w-4 h-4" />
              ) : overallStatus === 'warning' ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              {label}
            </span>
            <button
              onClick={loadMetrics}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-surface transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-5 h-5 text-muted', isRefreshing && 'animate-spin')} />
            </button>
          </div>
        </div>

        {lastUpdate && (
          <p className="text-xs text-muted mt-2">
            Última actualización: {new Date(lastUpdate).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-muted animate-spin" />
          </div>
        ) : metrics ? (
          <div className="space-y-6">
            {/* Métricas principales */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                title="Problemas"
                value={metrics.integrity.issues}
                subtitle={
                  metrics.integrity.lastCheck
                    ? `Hace ${Math.round((Date.now() - metrics.integrity.lastCheck) / 60000)} min`
                    : 'Sin verificar'
                }
                icon={AlertTriangle}
                color={metrics.integrity.issues > 0 ? 'rose' : 'green'}
              />
              <MetricCard
                title="Sync Pendiente"
                value={metrics.sync.pending}
                subtitle={`${metrics.sync.failed} fallidos`}
                icon={Database}
                color={metrics.sync.pending > 0 ? 'amber' : 'green'}
              />
              <MetricCard
                title="Locks Activos"
                value={metrics.locks.active}
                subtitle="Bloqueos de sesión"
                icon={Activity}
                color={metrics.locks.active > 3 ? 'amber' : 'blue'}
              />
              <MetricCard
                title="Snapshots"
                value={metrics.snapshots.total}
                subtitle={`${(metrics.snapshots.totalSize / 1024).toFixed(1)} KB`}
                icon={Clock}
                color="blue"
              />
            </div>

            {/* Detalles de Sync */}
            <div className="p-4 bg-surface rounded-xl border border-subtle">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-4 h-4 text-muted" />
                <h4 className="text-sm font-medium text-secondary">Estado de Sincronización</h4>
              </div>
              <SyncStatusIndicator stats={metrics.sync} />
              {metrics.sync.failed > 0 && (
                <button
                  onClick={handleRetrySync}
                  className="w-full mt-4 py-2 px-4 bg-amber-500/10 text-amber-500 rounded-lg text-sm font-medium hover:bg-amber-500/20 transition-colors"
                >
                  Reintentar operaciones fallidas
                </button>
              )}
            </div>

            {/* Detalles de Locks */}
            <div className="p-4 bg-surface rounded-xl border border-subtle">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-muted" />
                <h4 className="text-sm font-medium text-secondary">Gestión de Locks</h4>
              </div>
              <LockStatusIndicator locks={metrics.locks} />
              {metrics.locks.active > 0 && (
                <button
                  onClick={handleCleanupLocks}
                  className="w-full mt-4 py-2 px-4 bg-rose-500/10 text-rose-500 rounded-lg text-sm font-medium hover:bg-rose-500/20 transition-colors"
                >
                  Limpiar locks expirados
                </button>
              )}
            </div>

            {/* Detalles de Snapshots */}
            <div className="p-4 bg-surface rounded-xl border border-subtle">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-muted" />
                <h4 className="text-sm font-medium text-secondary">Historial de Versiones</h4>
              </div>
              <SnapshotStatus snapshots={metrics.snapshots} />
            </div>

            {/* Acciones */}
            {metrics.integrity.issues > 0 && (
              <button
                onClick={handleAutoFix}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Validar y Auto-Reparar
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted">Error al cargar métricas</p>
            <button
              onClick={loadMetrics}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConsistencyDashboard;
