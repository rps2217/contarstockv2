/**
 * ExpiryHeader - Header de la página de vencimientos
 */

import React from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, RefreshCw, Check, X, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExpiryHeaderProps {
  // Stats
  totalRecords: number;
  urgentCount: number;

  // Estado de sync
  isSyncing: boolean;

  // Selección
  isSelectionMode: boolean;
  selectedIds: Set<string>;

  // Acciones
  onToggleSelectionMode: () => void;
  onBulkDelete: () => void;
  onSync: () => void;
}

export const ExpiryHeader: React.FC<ExpiryHeaderProps> = ({
  totalRecords,
  urgentCount,
  isSyncing,
  isSelectionMode,
  selectedIds,
  onToggleSelectionMode,
  onBulkDelete,
  onSync,
}) => {
  return (
    <div className="px-4 sm:px-6 lg:px-8 xl:px-12 shrink-0 border-b border-subtle bg-surface/50">
      <div className="max-w-7xl mx-auto flex items-center justify-between py-4">
        {/* Título y stats */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <CalendarClock className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-primary">Vencimientos</h1>
            <p className="text-xs lg:text-sm text-muted">
              {totalRecords} registros • {urgentCount} urgente{urgentCount !== 1 ? 's' : ''}
            </p>
          </div>
          {urgentCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-rose-500 bg-rose-500/10 px-3 py-1.5 rounded-full">
              <AlertCircle className="w-4 h-4" />
              {urgentCount}
            </span>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-2 shrink-0">
          {isSelectionMode ? (
            <>
              <button
                onClick={onBulkDelete}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Eliminar ({selectedIds.size})</span>
              </button>
              <button
                onClick={onToggleSelectionMode}
                className="flex items-center gap-2 bg-surface hover:bg-elevated border border-subtle text-primary px-3 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Cancelar</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onToggleSelectionMode}
                className="flex items-center gap-2 bg-surface hover:bg-elevated border border-subtle text-primary px-3 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">Seleccionar</span>
              </button>
              <button
                onClick={onSync}
                disabled={isSyncing}
                className="flex items-center gap-2 bg-surface hover:bg-elevated border border-subtle text-primary px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
                <span className="hidden sm:inline">
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpiryHeader;
