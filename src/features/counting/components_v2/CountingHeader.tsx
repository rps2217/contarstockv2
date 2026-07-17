/**
 * CountingHeader - Header con título y estadísticas del conteo
 *
 * @since 2026-07-07 - Incluye indicador de auto-save
 */

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Settings,
  Cloud,
  CloudOff,
  Loader2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ✅ Tipos para auto-save
interface AutoSaveState {
  hasPendingChanges: boolean;
  lastSaveTime: Date | null | number;
  isSaving: boolean;
}

interface CountingStats {
  total: number;
  complete: number;
  withVariance: number;
  totalQty: number;
}

interface CountingHeaderProps {
  sessionName?: string;
  location: string;
  formattedDuration: string;
  stats: CountingStats;
  itemsPerMinute: number;
  onUndo?: () => void;
  onOpenOptions?: () => void;
  multiplier: number;
  onMultiplierChange: (value: number) => void;
  // ✅ Props de auto-save
  autoSave?: AutoSaveState;
  className?: string;
}

const StatCard = memo(
  ({
    icon: Icon,
    label,
    value,
    color = 'text-primary',
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color?: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-surface border border-subtle rounded-xl p-2 sm:p-3 flex items-center gap-2 sm:gap-3"
    >
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-elevated flex items-center justify-center">
        <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5', color)} />
      </div>
      <div className="min-w-0">
        <p className={cn('text-base sm:text-lg font-bold', color)}>{value}</p>
        <p className="text-[10px] sm:text-xs text-muted truncate">{label}</p>
      </div>
    </motion.div>
  )
);

StatCard.displayName = 'StatCard';

export const CountingHeader = memo(
  ({
    sessionName,
    location,
    formattedDuration,
    stats,
    itemsPerMinute,
    onUndo,
    onOpenOptions,
    multiplier,
    onMultiplierChange,
    autoSave,
    className = '',
  }: CountingHeaderProps) => {
    // ✅ Formatear tiempo relativo del último guardado
    const formatLastSave = (date: Date | null | number): string => {
      if (!date) return 'Nunca';
      const timestamp = typeof date === 'number' ? date : date.getTime();
      const diff = Date.now() - timestamp;
      const seconds = Math.floor(diff / 1000);
      if (seconds < 60) return 'Ahora';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `Hace ${minutes}m`;
      const hours = Math.floor(minutes / 60);
      return `Hace ${hours}h`;
    };

    return (
      <div className={cn('space-y-3 sm:space-y-4', className)}>
        {/* Title Bar */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-primary">Conteo</h1>
            <p className="text-[10px] sm:text-xs text-muted truncate">
              {sessionName || 'Sin orden'} • {location}
            </p>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* ✅ Indicador de Auto-Save */}
            <AnimatePresence mode="wait">
              {autoSave && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cn(
                    'flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium transition-colors',
                    autoSave.isSaving
                      ? 'bg-blue-500/10 text-blue-400'
                      : autoSave.hasPendingChanges
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                  )}
                  title={`Último guardado: ${formatLastSave(autoSave.lastSaveTime)}`}
                >
                  {autoSave.isSaving ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="hidden sm:inline">Guardando...</span>
                    </>
                  ) : autoSave.hasPendingChanges ? (
                    <>
                      <Cloud className="w-3 h-3" />
                      <span className="hidden sm:inline">Pendiente</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3 h-3" />
                      <span className="hidden sm:inline">Guardado</span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <span className="text-[10px] sm:text-xs text-muted font-mono hidden sm:inline">
              {formattedDuration}
            </span>
            {onUndo && (
              <button
                onClick={onUndo}
                className="p-1.5 sm:p-2 rounded-lg bg-surface hover:bg-elevated transition-colors"
                title="Deshacer último"
              >
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-muted" />
              </button>
            )}
            {onOpenOptions && (
              <button
                onClick={onOpenOptions}
                className="p-1.5 sm:p-2 rounded-lg bg-surface hover:bg-elevated transition-colors"
                title="Opciones"
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-muted" />
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard icon={Package} label="Items" value={stats.total} />
          <StatCard
            icon={CheckCircle2}
            label="Completos"
            value={stats.complete}
            color="text-emerald-500"
          />
          <StatCard
            icon={AlertTriangle}
            label="Variación"
            value={stats.withVariance}
            color="text-amber-500"
          />
          <StatCard icon={BarChart3} label="Total" value={stats.totalQty} color="text-blue-500" />
        </div>

        {/* Multiplier */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm text-muted">Cantidad:</span>
          <div className="flex items-center gap-1 sm:gap-2 bg-surface rounded-lg p-1">
            <MultiplierButton
              onClick={() => onMultiplierChange(Math.max(1, multiplier - 1))}
              icon="-"
              variant="danger"
            />
            <span className="w-6 sm:w-8 text-center font-bold text-primary text-sm sm:text-base">
              {multiplier}
            </span>
            <MultiplierButton
              onClick={() => onMultiplierChange(multiplier + 1)}
              icon="+"
              variant="success"
            />
          </div>
          <span className="text-[10px] sm:text-xs text-muted">{itemsPerMinute}/min</span>
        </div>
      </div>
    );
  }
);

CountingHeader.displayName = 'CountingHeader';

// Internal component for multiplier buttons
const MultiplierButton = memo(
  ({
    onClick,
    icon,
    variant,
  }: {
    onClick: () => void;
    icon: string;
    variant: 'danger' | 'success';
  }) => (
    <button
      onClick={onClick}
      className={cn(
        'w-8 h-8 rounded flex items-center justify-center transition-colors',
        variant === 'danger'
          ? 'bg-elevated hover:bg-rose-500/20 text-rose-400'
          : 'bg-elevated hover:bg-emerald-500/20 text-emerald-400'
      )}
    >
      {icon === '+' ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      )}
    </button>
  )
);

MultiplierButton.displayName = 'MultiplierButton';
