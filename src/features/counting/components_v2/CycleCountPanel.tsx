/**
 * CycleCountPanel - Panel de conteo cíclico
 *
 * Muestra:
 * - Lista de items pendientes por contar
 * - Clasificación ABC visual
 * - Progreso de la sesión
 * - Stats de accuracy
 */

import React, { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/services/logger';
import { Button } from '@/shared/components/ui';
import {
  CycleCountService,
  type CycleCountSuggestion,
  type CycleCountPriority,
  type CycleCountSession,
} from '../services/CycleCountService';

// ============================================================================
// TIPOS
// ============================================================================

interface CycleCountPanelProps {
  onStartCount?: (session: CycleCountSession) => void;
  onItemSelected?: (barcode: string) => void;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const getPriorityColor = (priority: CycleCountPriority): string => {
  const colors = {
    A: 'text-red-400 bg-red-500/20 border-red-500/30',
    B: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
    C: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
    none: 'text-muted bg-surface border-subtle',
  };
  return colors[priority];
};

// ============================================================================
// COMPONENTES
// ============================================================================

const PriorityBadge = memo(({ priority }: { priority: CycleCountPriority }) => {
  const labels = { A: 'Alta', B: 'Media', C: 'Baja', none: 'Sin clasificar' };

  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border',
        getPriorityColor(priority)
      )}
    >
      {labels[priority]}
    </span>
  );
});

PriorityBadge.displayName = 'PriorityBadge';

// -----------------------------------------------------------------------------

const CycleCountItem = memo(
  ({
    suggestion,
    onClick,
    isActive,
  }: {
    suggestion: CycleCountSuggestion;
    onClick?: () => void;
    isActive?: boolean;
  }) => {
    const { item, reason } = suggestion;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className={cn(
          'p-3 rounded-xl border transition-colors cursor-pointer',
          'hover:bg-surface/50',
          isActive ? 'bg-blue-500/10 border-blue-500/30' : 'bg-surface/30 border-subtle'
        )}
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold truncate">{item.productName}</p>
              <PriorityBadge priority={suggestion.priority} />
            </div>
            <p className="text-xs text-muted mb-1">{item.barcode}</p>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span>Stock actual: {item.currentStock}</span>
              <span>•</span>
              <span>{reason}</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-sm text-muted">
              Hace {item.daysSinceLastCount === 999 ? '∞' : item.daysSinceLastCount}d
            </p>
            {item.stockVariance > 5 && (
              <span className="text-xs text-amber-400">±{item.stockVariance.toFixed(1)}%</span>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);

CycleCountItem.displayName = 'CycleCountItem';

// -----------------------------------------------------------------------------

const StatsCard = memo(
  ({
    icon: Icon,
    label,
    value,
    color = 'primary',
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color?: 'primary' | 'success' | 'warning' | 'error';
  }) => {
    const colors = {
      primary: 'text-primary bg-blue-500/10',
      success: 'text-emerald-400 bg-emerald-500/10',
      warning: 'text-amber-400 bg-amber-500/10',
      error: 'text-rose-400 bg-rose-500/10',
    };

    return (
      <div className="flex items-center gap-2 p-2 bg-surface/30 rounded-lg">
        <Icon className={cn('w-4 h-4', colors[color].split(' ')[0])} />
        <div>
          <p className="text-[10px] text-muted">{label}</p>
          <p className="text-sm font-bold">{value}</p>
        </div>
      </div>
    );
  }
);

StatsCard.displayName = 'StatsCard';

// -----------------------------------------------------------------------------

const FilterBar = memo(
  ({
    priority,
    onPriorityChange,
    showCompleted,
    onShowCompletedChange,
  }: {
    priority: CycleCountPriority | 'all';
    onPriorityChange: (p: CycleCountPriority | 'all') => void;
    showCompleted: boolean;
    onShowCompletedChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center gap-2 flex-wrap">
      <Filter className="w-4 h-4 text-muted" />

      {(['all', 'A', 'B', 'C'] as const).map(p => (
        <button
          key={p}
          onClick={() => onPriorityChange(p === 'all' ? 'all' : p)}
          className={cn(
            'px-2 py-1 rounded-lg text-xs font-medium transition-colors',
            priority === p ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-primary'
          )}
        >
          {p === 'all' ? 'Todos' : `Clase ${p}`}
        </button>
      ))}

      <div className="flex-1" />

      <label className="flex items-center gap-1 text-xs text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={showCompleted}
          onChange={e => onShowCompletedChange(e.target.checked)}
          className="w-3 h-3 rounded"
        />
        Mostrar completados
      </label>
    </div>
  )
);

FilterBar.displayName = 'FilterBar';

// -----------------------------------------------------------------------------

const ProgressRing = memo(
  ({
    percent,
    size = 60,
    strokeWidth = 6,
  }: {
    percent: number;
    size?: number;
    strokeWidth?: number;
  }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;

    const color = percent >= 100 ? '#10b981' : percent >= 50 ? '#3b82f6' : '#f59e0b';

    return (
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-elevated"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
    );
  }
);

ProgressRing.displayName = 'ProgressRing';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const CycleCountPanel: React.FC<CycleCountPanelProps> = memo(
  ({ onStartCount, onItemSelected, className }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<CycleCountSuggestion[]>([]);
    const [session, setSession] = useState<CycleCountSession | null>(null);
    const [selectedItem, setSelectedItem] = useState<CycleCountSuggestion | null>(null);
    const [filterPriority, setFilterPriority] = useState<CycleCountPriority | 'all'>('all');
    const [showCompleted, setShowCompleted] = useState(false);
    const [stats, setStats] = useState<{
      totalCounts: number;
      accuracyRate: number;
      pendingCounts: number;
    }>({ totalCounts: 0, accuracyRate: 100, pendingCounts: 0 });

    // Cargar sugerencias
    const loadSuggestions = async () => {
      setIsLoading(true);
      try {
        const list = await CycleCountService.generateCycleCountList();
        setSuggestions(list);

        // Actualizar stats
        const s = await CycleCountService.getStats();
        setStats({
          totalCounts: s.totalCounts,
          accuracyRate: s.accuracyRate,
          pendingCounts: s.pendingCounts,
        });
      } catch (error) {
        logger.error('CycleCount', 'Error loading suggestions', { error });
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      loadSuggestions();
    }, []);

    // Iniciar sesión
    const handleStartSession = async () => {
      const newSession = await CycleCountService.createSession({
        priorityFilter: filterPriority === 'all' ? undefined : filterPriority,
        maxItems: 20,
      });
      setSession(newSession);
      onStartCount?.(newSession);
    };

    // Filtrar sugerencias
    const filteredSuggestions = suggestions.filter(s => {
      if (filterPriority !== 'all' && s.priority !== filterPriority) return false;
      if (!showCompleted && s.item.lastCountedAt) return false;
      return true;
    });

    // Manejar click en item
    const handleItemClick = (suggestion: CycleCountSuggestion) => {
      setSelectedItem(suggestion);
      onItemSelected?.(suggestion.item.barcode);
    };

    return (
      <div className={cn('bg-base rounded-xl border border-subtle overflow-hidden', className)}>
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 bg-surface/50 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <RefreshCw
              className={cn(
                'w-5 h-5 text-primary transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
            <div>
              <h3 className="font-bold">Conteo Cíclico (ABC)</h3>
              <p className="text-xs text-muted">
                {stats.pendingCounts} items pendientes • {stats.accuracyRate}% accuracy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session ? (
              <div className="flex items-center gap-2">
                <ProgressRing percent={(session.completedCount / session.totalItems) * 100} />
                <span className="text-sm font-bold">
                  {session.completedCount}/{session.totalItems}
                </span>
              </div>
            ) : (
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleStartSession();
                }}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors"
              >
                Iniciar Sesión
              </button>
            )}

            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted" />
            )}
          </div>
        </div>

        {/* Contenido */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {/* Stats rápidos */}
                <div className="grid grid-cols-4 gap-2">
                  <StatsCard
                    icon={Clock}
                    label="Pendientes"
                    value={stats.pendingCounts}
                    color="warning"
                  />
                  <StatsCard
                    icon={CheckCircle2}
                    label="Contados"
                    value={stats.totalCounts}
                    color="success"
                  />
                  <StatsCard
                    icon={TrendingUp}
                    label="Accuracy"
                    value={`${stats.accuracyRate}%`}
                    color="primary"
                  />
                  <StatsCard
                    icon={AlertTriangle}
                    label="Clase A"
                    value={suggestions.filter(s => s.priority === 'A').length}
                    color="error"
                  />
                </div>

                {/* Filtros */}
                <FilterBar
                  priority={filterPriority}
                  onPriorityChange={setFilterPriority}
                  showCompleted={showCompleted}
                  onShowCompletedChange={setShowCompleted}
                />

                {/* Lista de items */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 text-muted animate-spin" />
                    </div>
                  ) : filteredSuggestions.length === 0 ? (
                    <div className="text-center py-8 text-muted">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-400" />
                      <p>No hay items pendientes para contar</p>
                    </div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {filteredSuggestions.map(suggestion => (
                        <CycleCountItem
                          key={suggestion.item.barcode}
                          suggestion={suggestion}
                          isActive={selectedItem?.item.barcode === suggestion.item.barcode}
                          onClick={() => handleItemClick(suggestion)}
                        />
                      ))}
                    </AnimatePresence>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex justify-between pt-2 border-t border-subtle">
                  <Button variant="ghost" size="sm" onClick={loadSuggestions} disabled={isLoading}>
                    <RefreshCw className={cn('w-4 h-4 mr-1', isLoading && 'animate-spin')} />
                    Actualizar
                  </Button>

                  <Button variant="outline" size="sm" onClick={() => setIsExpanded(false)}>
                    Minimizar
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

CycleCountPanel.displayName = 'CycleCountPanel';

export default CycleCountPanel;
