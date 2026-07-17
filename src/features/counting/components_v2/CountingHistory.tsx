/**
 * CountingHistory - Historial de conteos completados
 *
 * Muestra:
 * - Lista de conteos anteriores
 * - Comparación de métricas
 * - Tendencias de productividad
 */

import React, { memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui';

// ============================================================================
// TIPOS
// ============================================================================

export interface CountingHistoryItem {
  id: string;
  sessionName: string;
  createdAt: number;
  completedAt?: number;
  status: 'completed' | 'active' | 'cancelled';

  // Métricas
  totalItems: number;
  completeItems: number;
  missingItems: number;
  partialItems: number;
  totalDiscrepancy: number;

  // Tendencia (comparado con anterior)
  trend?: 'up' | 'down' | 'stable';
  trendPercent?: number;
}

interface CountingHistoryProps {
  items: CountingHistoryItem[];
  onSelect?: (item: CountingHistoryItem) => void;
  onExport?: (item: CountingHistoryItem, format: 'csv' | 'xlsx' | 'pdf') => void;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatDuration = (start: number, end?: number): string => {
  if (!end) return 'En curso';

  const durationMs = end - start;
  const minutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

const getProgressPercent = (complete: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((complete / total) * 100);
};

// ============================================================================
// COMPONENTES
// ============================================================================

const TrendBadge = memo(
  ({ trend, percent }: { trend?: 'up' | 'down' | 'stable'; percent?: number }) => {
    if (!trend) return null;

    const config = {
      up: { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
      down: { icon: TrendingDown, color: 'text-rose-400', bg: 'bg-rose-500/20' },
      stable: { icon: Minus, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    };

    const { icon: Icon, color, bg } = config[trend];

    return (
      <div className={cn('flex items-center gap-1 px-2 py-1 rounded-lg', bg)}>
        <Icon className={cn('w-3 h-3', color)} />
        {percent !== undefined && (
          <span className={cn('text-[10px] font-bold', color)}>
            {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}
            {Math.abs(percent)}%
          </span>
        )}
      </div>
    );
  }
);

TrendBadge.displayName = 'TrendBadge';

// -----------------------------------------------------------------------------

const StatusBadge = memo(({ status }: { status: CountingHistoryItem['status'] }) => {
  const config = {
    completed: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Completado' },
    active: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Activo' },
    cancelled: { color: 'text-muted', bg: 'bg-surface', label: 'Cancelado' },
  };

  const { color, bg, label } = config[status];

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', bg, color)}>
      {label}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

// -----------------------------------------------------------------------------

const HistoryRow = memo(
  ({
    item,
    onClick,
    onExport,
  }: {
    item: CountingHistoryItem;
    onClick?: () => void;
    onExport?: (format: 'csv' | 'xlsx' | 'pdf') => void;
  }) => {
    const progress = getProgressPercent(item.completeItems, item.totalItems);
    const hasDiscrepancies = item.missingItems > 0 || item.totalDiscrepancy !== 0;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'p-4 rounded-xl border transition-colors',
          'bg-surface/50 border-subtle',
          'hover:bg-surface hover:border-primary/30',
          onClick && 'cursor-pointer'
        )}
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold truncate">{item.sessionName}</h4>
              <StatusBadge status={item.status} />
            </div>

            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(item.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(item.createdAt, item.completedAt)}
              </span>
            </div>
          </div>

          {/* Métricas */}
          <div className="flex items-center gap-3">
            <TrendBadge trend={item.trend} percent={item.trendPercent} />

            {/* Progress */}
            <div className="text-right">
              <span
                className={cn(
                  'text-lg font-black',
                  progress >= 100
                    ? 'text-emerald-400'
                    : progress >= 75
                      ? 'text-primary'
                      : progress >= 50
                        ? 'text-amber-400'
                        : 'text-rose-400'
                )}
              >
                {progress}%
              </span>
              <p className="text-[9px] text-muted">
                {item.completeItems}/{item.totalItems}
              </p>
            </div>

            {/* Discrepancia */}
            {hasDiscrepancies && (
              <div
                className={cn(
                  'p-2 rounded-lg',
                  item.missingItems > 0 ? 'bg-rose-500/20' : 'bg-amber-500/20'
                )}
              >
                <AlertTriangle
                  className={cn(
                    'w-4 h-4',
                    item.missingItems > 0 ? 'text-rose-400' : 'text-amber-400'
                  )}
                />
              </div>
            )}

            {/* Acciones */}
            <div className="flex items-center gap-1">
              {onExport && (
                <div className="relative group">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      // Mostrar dropdown de exportación
                    }}
                    className="p-2 rounded-lg hover:bg-elevated transition-colors"
                  >
                    <Download className="w-4 h-4 text-muted" />
                  </button>
                </div>
              )}
              {onClick && <ChevronRight className="w-4 h-4 text-muted" />}
            </div>
          </div>
        </div>

        {/* Barra de progreso mini */}
        <div className="mt-3 h-1 bg-elevated rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              progress >= 100
                ? 'bg-emerald-500'
                : progress >= 75
                  ? 'bg-primary'
                  : progress >= 50
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </motion.div>
    );
  }
);

HistoryRow.displayName = 'HistoryRow';

// -----------------------------------------------------------------------------

const EmptyHistory = memo(() => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mb-4">
      <History className="w-8 h-8 text-muted" />
    </div>
    <h3 className="font-bold text-primary mb-2">Sin historial</h3>
    <p className="text-sm text-muted max-w-xs">
      Los conteos completados aparecerán aquí para que puedas revisar tu historial y comparar
      métricas.
    </p>
  </div>
));

EmptyHistory.displayName = 'EmptyHistory';

// -----------------------------------------------------------------------------

const HistoryStats = memo(({ items }: { items: CountingHistoryItem[] }) => {
  const stats = useMemo(() => {
    if (items.length === 0) return null;

    const completed = items.filter(i => i.status === 'completed');
    const avgProgress =
      completed.length > 0
        ? Math.round(
            completed.reduce(
              (sum, i) => sum + getProgressPercent(i.completeItems, i.totalItems),
              0
            ) / completed.length
          )
        : 0;
    const totalDiscrepancies = completed.reduce((sum, i) => sum + i.totalDiscrepancy, 0);

    // Tendencia general (últimos 5 vs anteriores)
    const recent = completed.slice(0, 5);
    const older = completed.slice(5, 10);
    const recentAvg =
      recent.length > 0
        ? recent.reduce((sum, i) => sum + getProgressPercent(i.completeItems, i.totalItems), 0) /
          recent.length
        : 0;
    const olderAvg =
      older.length > 0
        ? older.reduce((sum, i) => sum + getProgressPercent(i.completeItems, i.totalItems), 0) /
          older.length
        : 0;
    const trendValue = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;

    return {
      count: completed.length,
      avgProgress,
      totalDiscrepancies,
      trend: (trendValue > 0 ? 'up' : trendValue < 0 ? 'down' : 'stable') as
        'up' | 'down' | 'stable',
      trendValue: Math.abs(trendValue),
    };
  }, [items]);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-4 gap-2 p-4 bg-surface/30 rounded-xl border border-subtle mb-4">
      <div className="text-center">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
        <p className="text-lg font-black text-primary">{stats.count}</p>
        <p className="text-[9px] text-muted">Completados</p>
      </div>
      <div className="text-center">
        <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
        <p className="text-lg font-black text-primary">{stats.avgProgress}%</p>
        <p className="text-[9px] text-muted">Promedio</p>
      </div>
      <div className="text-center">
        <AlertTriangle className="w-4 h-4 text-amber-400 mx-auto mb-1" />
        <p className="text-lg font-black text-amber-400">{stats.totalDiscrepancies}</p>
        <p className="text-[9px] text-muted">Discrepancias</p>
      </div>
      <div className="text-center">
        <TrendBadge trend={stats.trend} percent={stats.trendValue} />
        <p className="text-[9px] text-muted mt-1">Tendencia</p>
      </div>
    </div>
  );
});

HistoryStats.displayName = 'HistoryStats';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const CountingHistory: React.FC<CountingHistoryProps> = memo(
  ({ items, onSelect, onExport, className }) => {
    const [filter, setFilter] = useState<'all' | 'completed' | 'active'>('all');
    const [expanded, setExpanded] = useState(true);

    // Filtrar
    const filteredItems = useMemo(() => {
      switch (filter) {
        case 'completed':
          return items.filter(i => i.status === 'completed');
        case 'active':
          return items.filter(i => i.status === 'active');
        default:
          return items;
      }
    }, [items, filter]);

    return (
      <div className={cn('bg-base rounded-xl border border-subtle overflow-hidden', className)}>
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 bg-surface/50 border-b border-subtle cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-primary" />
            <h3 className="font-bold">Historial de Conteos</h3>
            <span className="text-xs text-muted">{items.length} total</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filtros */}
            <div className="flex gap-1 mr-2">
              <button
                onClick={e => {
                  e.stopPropagation();
                  setFilter('all');
                }}
                className={cn(
                  'px-2 py-1 rounded-lg text-xs transition-colors',
                  filter === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-surface text-muted hover:text-primary'
                )}
              >
                Todos
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  setFilter('completed');
                }}
                className={cn(
                  'px-2 py-1 rounded-lg text-xs transition-colors',
                  filter === 'completed'
                    ? 'bg-primary text-white'
                    : 'bg-surface text-muted hover:text-primary'
                )}
              >
                Completados
              </button>
            </div>

            {onSelect && <Eye className="w-4 h-4 text-muted" />}
          </div>
        </div>

        {/* Contenido */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 max-h-[500px] overflow-y-auto space-y-2">
                {filteredItems.length === 0 ? (
                  <EmptyHistory />
                ) : (
                  <>
                    <HistoryStats items={filteredItems} />
                    <AnimatePresence mode="popLayout">
                      {filteredItems.map(item => (
                        <HistoryRow
                          key={item.id}
                          item={item}
                          onClick={onSelect ? () => onSelect(item) : undefined}
                          onExport={onExport ? format => onExport(item, format) : undefined}
                        />
                      ))}
                    </AnimatePresence>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

CountingHistory.displayName = 'CountingHistory';

export default CountingHistory;
