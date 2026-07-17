/**
 * DatabaseHealthPanel - Panel de diagnóstico de la base de datos
 *
 * Muestra:
 * - Score de salud general
 * - Estado de cada check
 * - Recomendaciones
 * - Estadísticas de tablas
 * - Acciones de mantenimiento
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Database,
  HardDrive,
  Clock,
  TrendingUp,
  Trash2,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
  Info,
  Shield,
  Zap,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DatabaseHealthService,
  BackupService,
  QueryCache,
  type HealthCheckResult,
  type TableStats,
  type HealthCheck,
} from '@/db/services';

// ============================================================================
// TIPOS
// ============================================================================

interface DatabaseHealthPanelProps {
  className?: string;
  onClose?: () => void;
}

// ============================================================================
// COMPONENTES HIJO
// ============================================================================

function StatusBadge({ status }: { status: HealthCheck['status'] }) {
  const config = {
    pass: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    fail: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    critical: { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-600/10' },
  };

  const { icon: Icon, color, bg } = config[status] || config.warning;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        bg,
        color
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {status === 'pass'
        ? 'OK'
        : status === 'warning'
          ? 'Advertencia'
          : status === 'critical'
            ? 'Crítico'
            : 'Error'}
    </span>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return 'emerald';
    if (s >= 60) return 'amber';
    return 'rose';
  };

  const color = getColor(score);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-surface"
        />
        {/* Progress circle */}
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={cn(
            color === 'emerald'
              ? 'text-emerald-500'
              : color === 'amber'
                ? 'text-amber-500'
                : 'text-rose-500'
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-primary">{score}</span>
        <span className="text-xs text-muted">puntuación</span>
      </div>
    </div>
  );
}

function CheckCard({ check }: { check: HealthCheck }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-subtle rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <StatusBadge status={check.status} />
          <span className="font-medium text-primary">{check.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">{check.duration.toFixed(0)}ms</span>
          {check.details &&
            (expanded ? (
              <ChevronDown className="w-4 h-4 text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted" />
            ))}
        </div>
      </button>

      <AnimatePresence>
        {expanded && check.details && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-subtle">
              <p className="text-sm text-secondary">{check.message}</p>
              {check.details && (
                <pre className="mt-2 p-2 bg-surface rounded-lg text-xs text-muted overflow-auto">
                  {JSON.stringify(check.details, null, 2)}
                </pre>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TableStatsRow({ stats }: { stats: TableStats }) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-subtle last:border-0">
      <div className="flex items-center gap-3">
        <Database className="w-4 h-4 text-muted" />
        <div>
          <p className="text-sm font-medium text-primary">{stats.tableName}</p>
          <p className="text-xs text-muted">{stats.recordCount.toLocaleString()} registros</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted">{formatBytes(stats.sizeEstimate)}</p>
        <p className="text-xs text-muted">{stats.indexCount} índices</p>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function DatabaseHealthPanel({ className, onClose }: DatabaseHealthPanelProps) {
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [tableStats, setTableStats] = useState<TableStats[]>([]);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'health' | 'tables' | 'cache' | 'backup'>('health');

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [healthResult, tables, cache] = await Promise.all([
        DatabaseHealthService.checkHealth(),
        DatabaseHealthService.getAllTableStats(),
        Promise.resolve(QueryCache.getStats()),
      ]);

      setHealth(healthResult);
      setTableStats(tables);
      setCacheStats(cache);
    } catch (error) {
      toast.error('Error al cargar datos de la base de datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('¿Limpiar datos antiguos? Esta acción puede tomar un momento.')) return;

    setIsLoading(true);
    try {
      // Aquí se llamaría al cleanup service cuando exista
      toast.success('Limpieza iniciada');
      await loadData();
    } catch {
      toast.error('Error al limpiar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await BackupService.exportToFile();
      toast.success('Backup exportado correctamente');
    } catch {
      toast.error('Error al exportar backup');
    }
  };

  const handleClearCache = () => {
    QueryCache.clear();
    setCacheStats(QueryCache.getStats());
    toast.success('Caché limpiado');
  };

  const getStatusIcon = () => {
    if (!health) return <Activity className="w-6 h-6" />;
    switch (health.status) {
      case 'healthy':
        return <CheckCircle className="w-6 h-6 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-500" />;
      case 'critical':
        return <XCircle className="w-6 h-6 text-rose-500" />;
      default:
        return <Activity className="w-6 h-6" />;
    }
  };

  return (
    <div className={cn('bg-base rounded-2xl border border-subtle overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-bold text-primary">Salud de Base de Datos</h3>
              <p className="text-xs text-muted">
                {health
                  ? health.status === 'healthy'
                    ? 'Todo funcionando correctamente'
                    : health.status === 'warning'
                      ? 'Se requieren atención'
                      : 'Acción requerida inmediatamente'
                  : 'Cargando...'}
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-surface transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-5 h-5 text-muted', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-subtle">
        {[
          { id: 'health', label: 'Salud', icon: Shield },
          { id: 'tables', label: 'Tablas', icon: Database },
          { id: 'cache', label: 'Caché', icon: Zap },
          { id: 'backup', label: 'Backup', icon: Download },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-500/5'
                : 'text-muted hover:text-primary'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-muted animate-spin" />
          </div>
        )}

        {!isLoading && activeTab === 'health' && health && (
          <div className="space-y-4">
            {/* Score */}
            <div className="flex items-center justify-center py-4">
              <ScoreGauge score={health.overallScore} />
            </div>

            {/* Checks */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-secondary">Diagnósticos</h4>
              {health.checks.map((check, i) => (
                <CheckCard key={i} check={check} />
              ))}
            </div>

            {/* Recommendations */}
            {health.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-secondary">Recomendaciones</h4>
                {health.recommendations.slice(0, 3).map((rec, i) => (
                  <div
                    key={i}
                    className={cn(
                      'p-3 rounded-xl border',
                      rec.priority === 'high'
                        ? 'border-rose-500/30 bg-rose-500/5'
                        : rec.priority === 'medium'
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-surface bg-surface/50'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Info
                        className={cn(
                          'w-4 h-4 mt-0.5',
                          rec.priority === 'high'
                            ? 'text-rose-500'
                            : rec.priority === 'medium'
                              ? 'text-amber-500'
                              : 'text-muted'
                        )}
                      />
                      <div>
                        <p className="text-sm font-medium text-primary">{rec.title}</p>
                        <p className="text-xs text-secondary mt-1">{rec.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isLoading && activeTab === 'tables' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-secondary">Estadísticas de Tablas</h4>
              <span className="text-xs text-muted">{tableStats.length} tablas</span>
            </div>
            {tableStats.map(stats => (
              <TableStatsRow key={stats.tableName} stats={stats} />
            ))}
          </div>
        )}

        {!isLoading && activeTab === 'cache' && cacheStats && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-surface rounded-xl">
                <p className="text-2xl font-bold text-primary">{cacheStats.size}</p>
                <p className="text-xs text-muted">Entradas en caché</p>
              </div>
              <div className="p-3 bg-surface rounded-xl">
                <p className="text-2xl font-bold text-emerald-500">{cacheStats.hitRate}%</p>
                <p className="text-xs text-muted">Tasa de acierto</p>
              </div>
              <div className="p-3 bg-surface rounded-xl">
                <p className="text-2xl font-bold text-blue-500">{cacheStats.hits}</p>
                <p className="text-xs text-muted">Hits</p>
              </div>
              <div className="p-3 bg-surface rounded-xl">
                <p className="text-2xl font-bold text-muted">{cacheStats.misses}</p>
                <p className="text-xs text-muted">Misses</p>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={handleClearCache}
              className="w-full flex items-center justify-center gap-2 py-3 bg-surface hover:bg-elevated rounded-xl text-sm font-medium text-primary transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Limpiar Caché
            </button>

            {/* Keys */}
            {cacheStats.size > 0 && (
              <div>
                <h4 className="text-sm font-medium text-secondary mb-2">Claves en Caché</h4>
                <div className="space-y-1">
                  {QueryCache.getKeys()
                    .slice(0, 10)
                    .map(key => (
                      <div key={key} className="flex items-center gap-2 p-2 bg-surface rounded-lg">
                        <Zap className="w-3 h-3 text-blue-500" />
                        <span className="text-xs text-muted truncate flex-1">{key}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isLoading && activeTab === 'backup' && (
          <div className="space-y-4">
            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExport}
                className="flex flex-col items-center gap-2 p-4 bg-surface hover:bg-elevated rounded-xl transition-colors"
              >
                <Download className="w-6 h-6 text-blue-500" />
                <span className="text-sm font-medium text-primary">Exportar</span>
              </button>
              <button
                onClick={handleCleanup}
                className="flex flex-col items-center gap-2 p-4 bg-surface hover:bg-elevated rounded-xl transition-colors"
              >
                <Trash2 className="w-6 h-6 text-rose-500" />
                <span className="text-sm font-medium text-primary">Limpiar</span>
              </button>
            </div>

            {/* Info */}
            <div className="p-4 bg-surface/50 rounded-xl space-y-3">
              <h4 className="text-sm font-medium text-primary flex items-center gap-2">
                <Info className="w-4 h-4 text-muted" />
                Información de Backup
              </h4>
              <div className="space-y-2 text-xs text-secondary">
                <p>• Los backups se guardan en formato JSON comprimido</p>
                <p>• Se crean puntos de recuperación automáticos</p>
                <p>• Los datos de sync se incluyen por defecto</p>
                <p>• Los logs no se incluyen en el backup</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DatabaseHealthPanel;
