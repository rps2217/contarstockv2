/**
 * CountingMetricsBar - Barra de métricas visuales para el conteo
 *
 * Muestra:
 * - Progreso del conteo (%)
 * - Velocidad (items/min)
 * - Tiempo transcurrido
 * - Tendencia de productividad
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Clock, Zap, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TIPOS
// ============================================================================

interface CountingMetricsBarProps {
  // Progreso
  progress: number; // 0-100
  itemsScanned: number;
  totalExpected: number;

  // Velocidad
  itemsPerMinute: number;
  trend: 'up' | 'down' | 'stable';

  // Tiempo
  elapsedSeconds: number;

  // Clases
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ============================================================================
// COMPONENTES
// ============================================================================

const TrendIcon = memo(({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  const configs = {
    up: { icon: TrendingUp, color: 'text-emerald-400', label: 'Mejorando' },
    down: { icon: TrendingDown, color: 'text-rose-400', label: 'Bajando' },
    stable: { icon: Minus, color: 'text-amber-400', label: 'Estable' },
  };

  const { icon: Icon, color, label } = configs[trend];

  return (
    <div className={cn('flex items-center gap-1', color)} title={label}>
      <Icon className="w-3 h-3" />
    </div>
  );
});

TrendIcon.displayName = 'TrendIcon';

// -----------------------------------------------------------------------------

const ProgressBar = memo(({ value }: { value: number }) => {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  // Color basado en progreso
  const getColor = () => {
    if (clampedValue >= 100) return 'bg-emerald-500';
    if (clampedValue >= 75) return 'bg-primary';
    if (clampedValue >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="relative w-full h-1.5 bg-surface rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clampedValue}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={cn('h-full rounded-full', getColor())}
      />
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';

// -----------------------------------------------------------------------------

const MetricItem = memo(
  ({
    icon: Icon,
    label,
    value,
    subtext,
    color = 'text-primary',
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subtext?: string;
    color?: string;
  }) => (
    <div className="flex items-center gap-2">
      <div className="p-1.5 rounded-lg bg-surface">
        <Icon className={cn('w-4 h-4', color)} />
      </div>
      <div>
        <p className={cn('text-sm font-bold', color)}>{value}</p>
        <p className="text-[9px] text-muted uppercase tracking-wider">{label}</p>
      </div>
      {subtext && <span className="text-[9px] text-muted/60">{subtext}</span>}
    </div>
  )
);

MetricItem.displayName = 'MetricItem';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const CountingMetricsBar: React.FC<CountingMetricsBarProps> = memo(
  ({ progress, itemsScanned, totalExpected, itemsPerMinute, trend, elapsedSeconds, className }) => {
    const progressPercent =
      totalExpected > 0 ? Math.round((itemsScanned / totalExpected) * 100) : 0;

    return (
      <div
        className={cn(
          'flex items-center gap-4 px-4 py-2',
          'bg-surface/80 backdrop-blur-sm rounded-xl',
          'border border-subtle',
          className
        )}
      >
        {/* Progreso */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Target className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted">
                {itemsScanned}/{totalExpected}
              </span>
              <span
                className={cn(
                  'text-xs font-bold',
                  progressPercent >= 100 ? 'text-emerald-400' : 'text-primary'
                )}
              >
                {progressPercent}%
              </span>
            </div>
            <ProgressBar value={progressPercent} />
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-subtle" />

        {/* Velocidad */}
        <MetricItem
          icon={Zap}
          label="Velocidad"
          value={itemsPerMinute}
          subtext="min"
          color="text-amber-400"
        />

        {/* Tendencia */}
        <TrendIcon trend={trend} />

        {/* Divider */}
        <div className="w-px h-8 bg-subtle" />

        {/* Tiempo */}
        <MetricItem
          icon={Clock}
          label="Tiempo"
          value={formatTime(elapsedSeconds)}
          color="text-muted"
        />
      </div>
    );
  }
);

CountingMetricsBar.displayName = 'CountingMetricsBar';

// ============================================================================
// COMPACT VERSION
// ============================================================================

export const CountingMetricsCompact: React.FC<CountingMetricsBarProps> = memo(
  ({ progress, itemsScanned, totalExpected, itemsPerMinute, elapsedSeconds, className }) => {
    const progressPercent =
      totalExpected > 0 ? Math.round((itemsScanned / totalExpected) * 100) : 0;

    return (
      <div
        className={cn(
          'flex items-center gap-3 px-3 py-1.5',
          'bg-surface/60 backdrop-blur-sm rounded-lg',
          'border border-subtle text-xs',
          className
        )}
      >
        <Target className="w-3.5 h-3.5 text-primary" />
        <span className="font-bold text-primary">{progressPercent}%</span>
        <span className="text-muted">
          {itemsScanned}/{totalExpected}
        </span>
        <span className="text-amber-400">{itemsPerMinute}/min</span>
        <span className="text-muted">{formatTime(elapsedSeconds)}</span>
      </div>
    );
  }
);

CountingMetricsCompact.displayName = 'CountingMetricsCompact';

export default CountingMetricsBar;
