/**
 * HammerHeader - Header del modo Hammer
 *
 * Muestra:
 * - Título y batch ID
 * - Selector de ubicación
 * - Indicador de sincronización
 * - Stats de escaneos
 * - Progreso (si hay carga teórica)
 * - Estados de error/sincronización
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Hammer,
  MapPin,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  Package,
  Check,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HorizontalStatCard } from '@/shared/components/ui/HorizontalStatCard';

export interface HammerHeaderProps {
  // Navegación
  batchId: string;
  onBack: () => void;

  // Ubicación
  location: string | null;
  onOpenLocation: () => void;

  // Estado de sync
  autoSyncEnabled: boolean;
  isSyncing: boolean;
  pendingWrites: number;
  syncError: string | null;
  onSync: () => void;

  // Stats
  stats: {
    total: number;
    complete: number;
    withVariance: number;
    totalQty: number;
    hasExpected: boolean;
  };
}

export const HammerHeader: React.FC<HammerHeaderProps> = ({
  batchId,
  onBack,
  location,
  onOpenLocation,
  autoSyncEnabled,
  isSyncing,
  pendingWrites,
  syncError,
  onSync,
  stats,
}) => {
  return (
    <div className="pt-4 px-4 sm:px-6 shrink-0 bg-base border-b border-subtle">
      {/* Top Row */}
      <div className="flex items-center justify-between mb-4">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-surface transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Hammer className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary">Modo Rafaga</h1>
            <p className="text-xs text-muted font-mono">{batchId}</p>
          </div>
        </div>

        {/* Right: Location + Sync */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenLocation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-subtle text-sm font-medium hover:bg-elevated transition-colors"
          >
            <MapPin className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">{location || 'ZONA-A'}</span>
          </button>

          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              autoSyncEnabled ? 'bg-emerald-500/10' : 'bg-subtle'
            )}
          >
            {autoSyncEnabled ? (
              <Cloud className="w-4 h-4 text-emerald-500" />
            ) : (
              <CloudOff className="w-4 h-4 text-muted" />
            )}
          </div>

          <button
            onClick={onSync}
            disabled={isSyncing}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isSyncing ? 'bg-blue-500 text-white' : 'bg-surface hover:bg-elevated'
            )}
          >
            <RefreshCw className={cn('w-5 h-5', isSyncing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <HorizontalStatCard icon={Package} label="SKUs" value={stats.total} />
        <HorizontalStatCard
          icon={Check}
          label="OK"
          value={stats.complete}
          color="text-emerald-500"
        />
        <HorizontalStatCard
          icon={AlertTriangle}
          label="Variacion"
          value={stats.withVariance}
          color="text-amber-500"
        />
        <HorizontalStatCard
          icon={TrendingUp}
          label="Unidades"
          value={stats.totalQty}
          color="text-blue-500"
        />
      </div>

      {/* Progress */}
      {stats.hasExpected && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Progreso</span>
            <span className="font-mono">
              {stats.complete}/{stats.total} OK
            </span>
          </div>
          <div className="h-2 bg-elevated rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.total > 0 ? (stats.complete / stats.total) * 100 : 0}%` }}
              className="h-full bg-emerald-500 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Status Messages */}
      {pendingWrites > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-amber-500 mb-2"
        >
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>{pendingWrites} escrituras pendientes</span>
        </motion.div>
      )}
      {syncError && (
        <div className="flex items-center gap-2 text-sm text-rose-500 mb-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{syncError}</span>
        </div>
      )}
    </div>
  );
};

export default HammerHeader;
