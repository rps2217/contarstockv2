/**
 * ProductivityDashboard - Dashboard de productividad en tiempo real
 *
 * Muestra:
 * - Velocidad actual vs promedio
 * - Tendencia de productividad
 * - Barra de progreso
 * - Accuracy rate
 * - Comparación con sesiones anteriores
 */

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Target,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductivityMetrics, SessionComparison } from '../hooks/useProductivityMetrics';

// ============================================================================
// TIPOS
// ============================================================================

interface ProductivityDashboardProps {
  metrics: ProductivityMetrics;
  comparison?: SessionComparison | null;
  /** Mostrar versión compacta */
  compact?: boolean;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const formatRate = (rate: number): string => {
  return rate.toFixed(1);
};

const formatPercent = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

// ============================================================================
// COMPONENTES INTERNOS
// ============================================================================

const TrendIndicator = memo(({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  const config = {
    up: { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: '↑' },
    down: { icon: TrendingDown, color: 'text-rose-400', bg: 'bg-rose-500/20', label: '↓' },
    stable: { icon: Minus, color: 'text-amber-400', bg: 'bg-amber-500/20', label: '→' },
  };

  const { icon: Icon, color, bg, label } = config[trend];

  return (
    <div className={cn('flex items-center gap-1 px-2 py-1 rounded-lg', bg)}>
      <Icon className={cn('w-4 h-4', color)} />
      <span className={cn('text-sm font-bold', color)}>{label}</span>
    </div>
  );
});

TrendIndicator.displayName = 'TrendIndicator';

// -----------------------------------------------------------------------------

const MetricCard = memo(
  ({
    icon: Icon,
    label,
    value,
    subvalue,
    color = 'primary',
    trend,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subvalue?: string;
    color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
    trend?: 'up' | 'down' | 'stable';
  }) => {
    const colorClasses = {
      primary: 'text-primary bg-blue-500/10',
      success: 'text-emerald-400 bg-emerald-500/10',
      warning: 'text-amber-400 bg-amber-500/10',
      error: 'text-rose-400 bg-rose-500/10',
      info: 'text-cyan-400 bg-cyan-500/10',
    };

    return (
      <div className="flex items-center gap-3 p-3 bg-surface/50 rounded-xl border border-subtle">
        <div className={cn('p-2 rounded-lg', colorClasses[color])}>
          <Icon className={cn('w-5 h-5', colorClasses[color].split(' ')[0])} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted truncate">{label}</p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-black text-primary">{value}</p>
            {subvalue && <span className="text-xs text-muted">{subvalue}</span>}
          </div>
        </div>
        {trend && <TrendIndicator trend={trend} />}
      </div>
    );
  }
);

MetricCard.displayName = 'MetricCard';

// -----------------------------------------------------------------------------

const ProgressBar = memo(
  ({
    percent,
    label,
    showLabel = true,
  }: {
    percent: number;
    label?: string;
    showLabel?: boolean;
  }) => {
    // Color basado en progreso
    const getColor = (p: number) => {
      if (p >= 100) return 'bg-emerald-500';
      if (p >= 75) return 'bg-primary';
      if (p >= 50) return 'bg-amber-500';
      if (p >= 25) return 'bg-orange-500';
      return 'bg-rose-500';
    };

    return (
      <div className="space-y-1">
        {showLabel && (
          <div className="flex justify-between text-xs">
            <span className="text-muted">{label || 'Progreso'}</span>
            <span className="font-bold text-primary">{percent}%</span>
          </div>
        )}
        <div className="h-2 bg-elevated rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, percent)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn('h-full rounded-full', getColor(percent))}
          />
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';

// -----------------------------------------------------------------------------

const SparklineChart = memo(
  ({
    data,
    color = '#3b82f6',
    height = 40,
  }: {
    data: number[];
    color?: string;
    height?: number;
  }) => {
    if (data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const width = 100;
    const padding = 2;

    const points = data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((value - min) / range) * (height - padding * 2) - padding;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg width="100%" height={height} className="overflow-visible">
        {/* Gradiente */}
        <defs>
          <linearGradient
            id={`gradient-${color.replace('#', '')}`}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Área bajo la curva */}
        <polygon
          points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
          fill={`url(#gradient-${color.replace('#', '')})`}
        />

        {/* Línea */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Punto final */}
        <circle
          cx={parseFloat(points.split(' ').pop()!.split(',')[0])}
          cy={parseFloat(points.split(' ').pop()!.split(',')[1])}
          r="3"
          fill={color}
        />
      </svg>
    );
  }
);

SparklineChart.displayName = 'SparklineChart';

// -----------------------------------------------------------------------------

const ComparisonBadge = memo(({ comparison }: { comparison: SessionComparison }) => {
  const isPositive = comparison.currentVsPrevious >= 0;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-xl border',
        isPositive
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
      )}
    >
      <Award className="w-4 h-4" />
      <div>
        <p className="text-xs font-medium">
          {isPositive ? '+' : ''}
          {comparison.currentVsPrevious}% vs anterior
        </p>
        <p className="text-[10px] opacity-75">Posición #{comparison.ranking}</p>
      </div>
    </div>
  );
});

ComparisonBadge.displayName = 'ComparisonBadge';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const ProductivityDashboard: React.FC<ProductivityDashboardProps> = memo(
  ({ metrics, comparison, compact = false, className }) => {
    // Extraer datos para el gráfico
    const chartData = useMemo(
      () => metrics.dataPoints.map(p => p.itemsPerMinute),
      [metrics.dataPoints]
    );

    if (compact) {
      return (
        <div className={cn('flex items-center gap-4', className)}>
          {/* Velocidad */}
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="font-bold">{formatRate(metrics.currentRate)}</span>
            <span className="text-xs text-muted">/min</span>
          </div>

          {/* Tendencia */}
          <TrendIndicator trend={metrics.trend} />

          {/* Accuracy */}
          <div className="flex items-center gap-1">
            <CheckCircle2
              className={cn(
                'w-4 h-4',
                metrics.accuracy >= 95
                  ? 'text-emerald-400'
                  : metrics.accuracy >= 85
                    ? 'text-amber-400'
                    : 'text-rose-400'
              )}
            />
            <span className="text-sm font-medium">{formatPercent(metrics.accuracy, 0)}</span>
          </div>

          {/* Tiempo */}
          <div className="flex items-center gap-1 text-muted">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{Math.floor(metrics.elapsedTime / 60000)}m</span>
          </div>
        </div>
      );
    }

    return (
      <div className={cn('space-y-4', className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Productividad
          </h3>
          <TrendIndicator trend={metrics.trend} />
        </div>

        {/* Gráfico de velocidad */}
        {chartData.length > 1 && (
          <div className="bg-surface/30 rounded-xl p-3">
            <div className="flex justify-between text-xs text-muted mb-2">
              <span>Velocidad (items/min)</span>
              <span>Pico: {formatRate(metrics.peakRate)}</span>
            </div>
            <SparklineChart data={chartData} color="#3b82f6" height={60} />
          </div>
        )}

        {/* Métricas principales */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={Target}
            label="Velocidad actual"
            value={formatRate(metrics.currentRate)}
            subvalue="items/min"
            color="primary"
            trend={metrics.trend}
          />
          <MetricCard
            icon={Clock}
            label="Tiempo transcurrido"
            value={Math.floor(metrics.elapsedTime / 60000)}
            subvalue="min"
            color="info"
          />
          <MetricCard
            icon={CheckCircle2}
            label="Accuracy"
            value={formatPercent(metrics.accuracy, 0)}
            color={
              metrics.accuracy >= 95 ? 'success' : metrics.accuracy >= 85 ? 'warning' : 'error'
            }
          />
          <MetricCard
            icon={AlertTriangle}
            label="Discrepancias"
            value={metrics.discrepancyCount}
            color={metrics.discrepancyCount > 0 ? 'warning' : 'success'}
          />
        </div>

        {/* Progreso */}
        {metrics.totalItems > 0 && (
          <ProgressBar
            percent={metrics.progressPercent}
            label={`${metrics.completedItems} / ${metrics.totalItems} items`}
          />
        )}

        {/* Comparación con sesión anterior */}
        {comparison && <ComparisonBadge comparison={comparison} />}

        {/* Resumen rápido */}
        <div className="flex justify-between text-xs text-muted pt-2 border-t border-subtle">
          <span>Promedio: {formatRate(metrics.averageRate)}/min</span>
          {metrics.estimatedTimeRemaining && (
            <span>Restante: ~{Math.ceil(metrics.estimatedTimeRemaining / 60000)}min</span>
          )}
        </div>
      </div>
    );
  }
);

ProductivityDashboard.displayName = 'ProductivityDashboard';

export default ProductivityDashboard;
