/**
 * DiscrepancyReport - Reporte detallado de diferencias teórico vs real
 *
 * Muestra:
 * - Items completos (sin discrepancia)
 * - Items faltantes
 * - Items con sobre-conteo
 * - Items parciales
 * - Items no esperados
 */

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui';
import type {
  ExpectedItemValidation,
  CountingValidationSummary,
} from '../services/CountingValidationService';

// ============================================================================
// TIPOS
// ============================================================================

interface DiscrepancyReportProps {
  items: ExpectedItemValidation[];
  summary: CountingValidationSummary;
  onExport?: () => void;
  className?: string;
}

// ============================================================================
// COMPONENTES
// ============================================================================

const StatusBadge = memo(
  ({
    status,
    severity,
  }: {
    status: ExpectedItemValidation['status'];
    severity: ExpectedItemValidation['severity'];
  }) => {
    const config = {
      complete: {
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-400',
        icon: CheckCircle2,
        label: 'Completo',
      },
      partial: {
        bg: 'bg-amber-500/20',
        text: 'text-amber-400',
        icon: AlertTriangle,
        label: 'Parcial',
      },
      missing: {
        bg: 'bg-rose-500/20',
        text: 'text-rose-400',
        icon: XCircle,
        label: 'Faltante',
      },
      over: {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        icon: AlertCircle,
        label: 'Sobrecuento',
      },
      pending: {
        bg: 'bg-slate-500/20',
        text: 'text-slate-400',
        icon: AlertTriangle,
        label: 'Pendiente',
      },
    };

    const { bg, text, icon: Icon, label } = config[status];

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide',
          bg,
          text
        )}
      >
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

// -----------------------------------------------------------------------------

const SummaryCard = memo(
  ({
    title,
    value,
    icon: Icon,
    color,
    subtext,
  }: {
    title: string;
    value: number | string;
    icon: React.ElementType;
    color: string;
    subtext?: string;
  }) => (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-4 rounded-xl border',
        'bg-surface/50 border-subtle'
      )}
    >
      <Icon className={cn('w-5 h-5 mb-2', color)} />
      <span className={cn('text-2xl font-black', color)}>{value}</span>
      <span className="text-[10px] text-muted uppercase tracking-wider">{title}</span>
      {subtext && <span className="text-[9px] text-muted/60">{subtext}</span>}
    </div>
  )
);

SummaryCard.displayName = 'SummaryCard';

// -----------------------------------------------------------------------------

const DiscrepancyRow = memo(
  ({ item, onClick }: { item: ExpectedItemValidation; onClick?: () => void }) => {
    const discrepancyColor =
      item.discrepancy > 0
        ? 'text-rose-400'
        : item.discrepancy < 0
          ? 'text-amber-400'
          : 'text-emerald-400';

    const discrepancyText =
      item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy.toString();

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex items-center gap-4 p-3 rounded-lg border',
          'bg-surface/30 border-subtle',
          'hover:bg-surface/50 transition-colors',
          item.severity === 'critical' && 'border-rose-500/30 bg-rose-500/5',
          item.severity === 'warning' && 'border-amber-500/30 bg-amber-500/5',
          !item.isExpected && 'border-dashed border-amber-500/50',
          onClick && 'cursor-pointer'
        )}
        onClick={onClick}
      >
        <StatusBadge status={item.status} severity={item.severity} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.name}</p>
          <p className="text-[10px] text-muted font-mono">{item.sku}</p>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <span className="text-muted text-[10px]">Esperado</span>
            <p className="font-bold">{item.expectedQuantity}</p>
          </div>

          <span className="text-muted">→</span>

          <div className="text-right">
            <span className="text-muted text-[10px]">Contado</span>
            <p className="font-bold">{item.scannedQuantity}</p>
          </div>

          {item.discrepancy !== 0 && (
            <div className={cn('text-right min-w-[50px]', discrepancyColor)}>
              <span className="text-[10px] opacity-70">Dif</span>
              <p className="font-black">{discrepancyText}</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }
);

DiscrepancyRow.displayName = 'DiscrepancyRow';

// -----------------------------------------------------------------------------

type FilterType = 'all' | 'critical' | 'warning' | 'complete' | 'missing' | 'unexpected';

const FilterButton = memo(
  ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
        active ? 'bg-primary text-white' : 'bg-surface text-muted hover:text-primary'
      )}
    >
      {children}
    </button>
  )
);

FilterButton.displayName = 'FilterButton';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const DiscrepancyReport: React.FC<DiscrepancyReportProps> = memo(
  ({ items, summary, onExport, className }) => {
    const [filter, setFilter] = React.useState<FilterType>('all');
    const [expanded, setExpanded] = React.useState(true);

    // Filtrar items
    const filteredItems = useMemo(() => {
      switch (filter) {
        case 'critical':
          return items.filter(i => i.severity === 'critical');
        case 'warning':
          return items.filter(i => i.severity === 'warning');
        case 'complete':
          return items.filter(i => i.status === 'complete');
        case 'missing':
          return items.filter(i => i.status === 'missing');
        case 'unexpected':
          return items.filter(i => !i.isExpected);
        default:
          return items;
      }
    }, [items, filter]);

    // Resumen rápido
    const filterCounts = useMemo(
      () => ({
        all: items.length,
        critical: items.filter(i => i.severity === 'critical').length,
        warning: items.filter(i => i.severity === 'warning').length,
        complete: items.filter(i => i.status === 'complete').length,
        missing: items.filter(i => i.status === 'missing').length,
        unexpected: items.filter(i => !i.isExpected).length,
      }),
      [items]
    );

    return (
      <div className={cn('bg-base rounded-xl border border-subtle overflow-hidden', className)}>
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 bg-surface/50 border-b border-subtle cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold">Reporte de Discrepancias</h3>
            <span className="text-xs text-muted">
              {summary.criticalDiscrepancies + summary.warningDiscrepancies} diferencias
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onExport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation();
                  onExport();
                }}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-muted" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted" />
            )}
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
              {/* Resumen */}
              <div className="grid grid-cols-4 gap-2 p-4 bg-surface/30 border-b border-subtle">
                <SummaryCard
                  title="Completos"
                  value={summary.completeItems}
                  icon={CheckCircle2}
                  color="text-emerald-400"
                />
                <SummaryCard
                  title="Faltantes"
                  value={summary.missingItems}
                  icon={XCircle}
                  color="text-rose-400"
                />
                <SummaryCard
                  title="Críticos"
                  value={summary.criticalDiscrepancies}
                  icon={AlertCircle}
                  color="text-red-400"
                />
                <SummaryCard
                  title="Advertencia"
                  value={summary.warningDiscrepancies}
                  icon={AlertTriangle}
                  color="text-amber-400"
                />
              </div>

              {/* Filtros */}
              <div className="flex items-center gap-2 p-3 border-b border-subtle bg-surface/20">
                <Filter className="w-4 h-4 text-muted mr-2" />
                <div className="flex flex-wrap gap-1">
                  <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
                    Todos ({filterCounts.all})
                  </FilterButton>
                  <FilterButton
                    active={filter === 'critical'}
                    onClick={() => setFilter('critical')}
                  >
                    Críticos ({filterCounts.critical})
                  </FilterButton>
                  <FilterButton active={filter === 'warning'} onClick={() => setFilter('warning')}>
                    Advertencias ({filterCounts.warning})
                  </FilterButton>
                  <FilterButton active={filter === 'missing'} onClick={() => setFilter('missing')}>
                    Faltantes ({filterCounts.missing})
                  </FilterButton>
                  <FilterButton
                    active={filter === 'unexpected'}
                    onClick={() => setFilter('unexpected')}
                  >
                    No esperados ({filterCounts.unexpected})
                  </FilterButton>
                </div>
              </div>

              {/* Lista */}
              <div className="max-h-[400px] overflow-y-auto p-4 space-y-2">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-muted">
                    {filter === 'all'
                      ? 'No hay discrepancias en este conteo 🎉'
                      : `No hay items con el filtro "${filter}"`}
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {filteredItems.map(item => (
                      <DiscrepancyRow key={item.sku} item={item} />
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-3 bg-surface/30 border-t border-subtle text-xs text-muted">
                <span>
                  Progreso: {summary.progressPercent}% ({summary.completeItems}/
                  {summary.expectedItems} items)
                </span>
                <span>Velocidad: {summary.itemsPerMinute} items/min</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

DiscrepancyReport.displayName = 'DiscrepancyReport';

export default DiscrepancyReport;
