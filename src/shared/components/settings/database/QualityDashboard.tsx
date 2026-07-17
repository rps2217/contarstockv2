/**
 * QualityDashboard - Panel de Métricas de Calidad
 *
 * Dashboard completo de quality assurance:
 * - Score general y grade
 * - Métricas de conteo
 * - Métricas de sincronización
 * - Calidad de datos
 * - Tendencias históricas
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Award,
  Database,
  BarChart3,
  Target,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  QualityMetricsCollector,
  type QualityMetrics,
  type QualityIssue,
} from '@/db/services/QualityMetricsCollector';

// ============================================================================
// TIPOS
// ============================================================================

type Period = 'day' | 'week' | 'month' | 'all';

interface QualityDashboardProps {
  className?: string;
}

// ============================================================================
// COMPONENTES
// ============================================================================

function ScoreCircle({
  score,
  grade,
  size = 'large',
}: {
  score: number;
  grade: string;
  size?: 'small' | 'large';
}) {
  const colors = {
    A: { stroke: 'stroke-emerald-500', fill: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    B: { stroke: 'stroke-blue-500', fill: 'text-blue-500', bg: 'bg-blue-500/10' },
    C: { stroke: 'stroke-amber-500', fill: 'text-amber-500', bg: 'bg-amber-500/10' },
    D: { stroke: 'stroke-orange-500', fill: 'text-orange-500', bg: 'bg-orange-500/10' },
    F: { stroke: 'stroke-rose-500', fill: 'text-rose-500', bg: 'bg-rose-500/10' },
  };

  const { stroke, fill, bg } = colors[grade as keyof typeof colors] || colors.C;
  const circumference = size === 'large' ? 2 * Math.PI * 45 : 2 * Math.PI * 30;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center', size === 'large' ? 'gap-3' : 'gap-1')}>
      <div className={cn('relative', size === 'large' ? 'w-28 h-28' : 'w-16 h-16')}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={size === 'large' ? 45 : 30}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-white/10"
          />
          <motion.circle
            cx="50"
            cy="50"
            r={size === 'large' ? 45 : 30}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={cn(stroke)}
            style={{ strokeDasharray: circumference, strokeDashoffset }}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold', fill, size === 'large' ? 'text-3xl' : 'text-lg')}>
            {Math.round(score)}
          </span>
        </div>
      </div>
      <div
        className={cn(
          'px-3 py-1 rounded-full font-bold',
          bg,
          fill,
          size === 'large' ? 'text-lg' : 'text-xs'
        )}
      >
        GRADE {grade}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  progress,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'stable';
  color?: 'blue' | 'green' | 'amber' | 'rose';
  progress?: number;
}) {
  const colors = {
    blue: 'border-blue-500/20 text-blue-500',
    green: 'border-emerald-500/20 text-emerald-500',
    amber: 'border-amber-500/20 text-amber-500',
    rose: 'border-rose-500/20 text-rose-500',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={cn('bg-surface rounded-xl border p-4', colors[color])}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-black/20">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm text-secondary">{title}</span>
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
      <p className="text-2xl font-bold text-primary mb-1">{value}</p>
      {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      {progress !== undefined && (
        <div className="mt-2 h-1.5 bg-black/20 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, progress)}%` }}
            transition={{ duration: 0.5 }}
            className={cn(
              'h-full rounded-full',
              colors[color].replace('border-', 'bg-').split(' ')[0]
            )}
          />
        </div>
      )}
    </div>
  );
}

function IssueCard({ issue }: { issue: QualityIssue }) {
  const severityConfig = {
    low: { icon: AlertTriangle, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    medium: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    high: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    critical: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  };

  const { icon: Icon, color, bg } = severityConfig[issue.severity];

  return (
    <div className={cn('rounded-xl border p-4', bg, `border-${color.split('-')[1]}-500/20`)}>
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-black/20">
          <Icon className={cn('w-4 h-4', color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium text-sm', color)}>{issue.title}</p>
          <p className="text-xs text-muted mt-1">{issue.description}</p>
          {issue.affectedCount !== undefined && (
            <p className="text-xs text-muted mt-1">
              Afecta: {issue.affectedCount.toLocaleString()} registros
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PeriodSelector({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const periods: { value: Period; label: string }[] = [
    { value: 'day', label: 'Hoy' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mes' },
    { value: 'all', label: 'Todo' },
  ];

  return (
    <div className="flex gap-1 bg-surface rounded-lg p-1">
      {periods.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            period === value ? 'bg-blue-500 text-white' : 'text-muted hover:text-primary'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function QualityDashboard({ className }: QualityDashboardProps) {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [period, setPeriod] = useState<Period>('day');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [quickMetrics, setQuickMetrics] = useState<{
    score: number;
    grade: string;
    trend: 'up' | 'down' | 'stable';
  } | null>(null);

  // Cargar métricas
  const loadMetrics = async (p?: Period) => {
    setIsRefreshing(true);
    try {
      const periodToUse = p || period;
      const data = await QualityMetricsCollector.collect(periodToUse);
      setMetrics(data);
      setPeriod(periodToUse);
    } catch (error) {
      toast.error('Error al cargar métricas de calidad');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Cargar métricas rápidas
  const loadQuickMetrics = async () => {
    try {
      const quick = await QualityMetricsCollector.getQuickMetrics();
      setQuickMetrics(quick);
    } catch {
      // Silently fail
    }
  };

  // Cargar al montar
  useEffect(() => {
    loadMetrics();
    loadQuickMetrics();
  }, []);

  const handlePeriodChange = (p: Period) => {
    setIsLoading(true);
    loadMetrics(p);
  };

  return (
    <div className={cn('bg-base rounded-2xl border border-subtle overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Award className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-bold text-primary">Quality Assurance</h3>
              <p className="text-xs text-muted">Métricas de calidad de datos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <PeriodSelector period={period} onChange={handlePeriodChange} />
            <button
              onClick={() => loadMetrics()}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-surface transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-5 h-5 text-muted', isRefreshing && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[700px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-muted animate-spin" />
          </div>
        ) : metrics ? (
          <div className="space-y-6">
            {/* Score principal */}
            <div className="flex items-center justify-center py-4">
              <ScoreCircle score={metrics.summary.overallScore} grade={metrics.summary.grade} />
            </div>

            {/* Resumen rápido */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                title="Exactitud"
                value={`${metrics.counting.averageAccuracy.toFixed(1)}%`}
                subtitle={`${metrics.counting.completedSessions} sesiones`}
                icon={Target}
                color="green"
                progress={metrics.counting.averageAccuracy}
              />
              <MetricCard
                title="Tasa Éxito Sync"
                value={`${metrics.sync.successRate.toFixed(1)}%`}
                subtitle={`${metrics.sync.successfulOperations} ops`}
                icon={Database}
                color={
                  metrics.sync.successRate >= 95
                    ? 'green'
                    : metrics.sync.successRate >= 80
                      ? 'amber'
                      : 'rose'
                }
                progress={metrics.sync.successRate}
              />
              <MetricCard
                title="Discrepancias"
                value={`${metrics.counting.discrepancyRate.toFixed(1)}%`}
                subtitle={`${metrics.counting.totalScans} scans`}
                icon={Activity}
                color={
                  metrics.counting.discrepancyRate <= 10
                    ? 'green'
                    : metrics.counting.discrepancyRate <= 20
                      ? 'amber'
                      : 'rose'
                }
              />
              <MetricCard
                title="Integridad"
                value={`${metrics.data.integrityScore.toFixed(0)}%`}
                subtitle={`${metrics.data.totalRecords.toLocaleString()} registros`}
                icon={CheckCircle}
                color={
                  metrics.data.integrityScore >= 90
                    ? 'green'
                    : metrics.data.integrityScore >= 70
                      ? 'amber'
                      : 'rose'
                }
                progress={metrics.data.integrityScore}
              />
            </div>

            {/* Issues */}
            {metrics.summary.issues.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-secondary flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Problemas Detectados ({metrics.summary.issues.length})
                </h4>
                <div className="space-y-2">
                  {metrics.summary.issues.map((issue, index) => (
                    <IssueCard key={index} issue={issue} />
                  ))}
                </div>
              </div>
            )}

            {/* Recomendaciones */}
            {metrics.summary.recommendations.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-secondary flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Recomendaciones
                </h4>
                <ul className="space-y-2">
                  {metrics.summary.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detalles de Sync */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-secondary flex items-center gap-2">
                <Database className="w-4 h-4" />
                Operaciones por Tabla
              </h4>
              <div className="bg-surface rounded-xl border border-subtle overflow-hidden">
                {Object.entries(metrics.sync.operationsByTable).map(([table, data], index) => (
                  <div
                    key={table}
                    className={cn(
                      'flex items-center justify-between px-4 py-3',
                      index > 0 && 'border-t border-subtle'
                    )}
                  >
                    <span className="text-sm text-primary">{table}</span>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-muted">{data.total} total</span>
                      <span className="text-emerald-500">{data.success} ✓</span>
                      {data.failed > 0 && <span className="text-rose-500">{data.failed} ✗</span>}
                    </div>
                  </div>
                ))}
                {Object.keys(metrics.sync.operationsByTable).length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-muted">
                    Sin datos de sincronización en este período
                  </div>
                )}
              </div>
            </div>

            {/* Detalles de Conteo */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-secondary flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Sesiones por Tipo
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(metrics.counting.bySessionType).map(([type, data]) => (
                  <div key={type} className="bg-surface rounded-xl border border-subtle p-3">
                    <p className="text-sm font-medium text-primary capitalize">{type}</p>
                    <p className="text-xs text-muted mt-1">
                      {data.completed}/{data.count} completadas
                    </p>
                    <div className="mt-2 h-1.5 bg-black/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${data.count > 0 ? (data.completed / data.count) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted">Error al cargar métricas</p>
            <button
              onClick={() => loadMetrics()}
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

export default QualityDashboard;
