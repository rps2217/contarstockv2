/**
 * =============================================================================
 * EVENTS BULK ACTIONS - Barra de acciones masivas para eventos
 * =============================================================================
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Square, Trash2, Loader2 } from 'lucide-react';

interface EventsBulkActionsProps {
  selectedCount: number;
  isAllSelected: boolean;
  isDeleting: boolean;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  totalCount: number;
}

export const EventsBulkActions: React.FC<EventsBulkActionsProps> = ({
  selectedCount,
  isAllSelected,
  isDeleting,
  onToggleSelectAll,
  onClearSelection,
  onBulkDelete,
  totalCount,
}) => {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-blue-600/10 border-b border-blue-500/30 px-6 py-3 shrink-0 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">
                  {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={onClearSelection}
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Limpiar selección
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleSelectAll}
                className="flex items-center gap-2 bg-surface hover:bg-elevated text-secondary px-3 py-1.5 rounded-lg text-sm transition-colors border border-subtle"
              >
                {isAllSelected ? (
                  <>
                    <Square className="w-4 h-4" />
                    Deseleccionar todo
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    Seleccionar todo ({totalCount})
                  </>
                )}
              </button>
              <button
                onClick={onBulkDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 bg-rose-600/80 hover:bg-rose-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar {selectedCount}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
