"use client";
/**
 * UndoRedoToast - Toast de confirmación con opción de deshacer
 * 
 * Muestra un toast con countdown para deshacer una acción.
 * Si el usuario no hace click en "Deshacer", la acción se confirma.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, Check, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UndoAction {
  id: string;
  description: string;
  onUndo: () => void | Promise<void>;
  duration?: number; // ms antes de confirmar
}

interface PendingUndo {
  action: UndoAction;
  expiresAt: number;
  remaining: number;
}

// Estado global de undo pendientes
let pendingUndos: Map<string, NodeJS.Timeout> = new Map();

/**
 * Mostrar toast de acción con opción de deshacer
 */
export const showUndoToast = (
  message: string,
  onUndo: () => void | Promise<void>,
  options?: {
    duration?: number;
    id?: string;
    description?: string;
  }
) => {
  const id = options?.id || `undo_${Date.now()}`;
  const duration = options?.duration || 5000;
  
  // Limpiar undo anterior con el mismo id
  if (pendingUndos.has(id)) {
    clearTimeout(pendingUndos.get(id));
    pendingUndos.delete(id);
  }
  
  // Mostrar toast con countdown
  toast.custom(
    (t) => (
      <UndoToast
        toastId={t}
        message={message}
        description={options?.description}
        duration={duration}
        onUndo={() => {
          onUndo();
          toast.dismiss(t);
        }}
        onExpire={() => {
          pendingUndos.delete(id);
        }}
      />
    ),
    {
      id,
      duration: duration,
    }
  );
  
  return id;
};

/**
 * Componente Toast de Undo
 */
interface UndoToastProps {
  toastId: string | number;
  message: string;
  description?: string;
  duration: number;
  onUndo: () => void;
  onExpire: () => void;
}

const UndoToast: React.FC<UndoToastProps> = ({
  toastId,
  message,
  description,
  duration,
  onUndo,
  onExpire,
}) => {
  const [remaining, setRemaining] = useState(duration);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Pausar countdown cuando está hovereado
    if (isHovered) return;
    
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 100) {
          clearInterval(interval);
          onExpire();
          toast.dismiss(toastId);
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isHovered, toastId, onExpire]);

  const progress = (remaining / duration) * 100;
  const secondsLeft = Math.ceil(remaining / 1000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className="bg-surface border border-subtle rounded-xl shadow-2xl overflow-hidden w-80"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Progress bar */}
      <div className="h-1 bg-elevated">
        <motion.div
          className="h-full bg-blue-500"
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
            remaining < 2000 ? 'bg-emerald-500/20' : 'bg-blue-500/20'
          )}>
            {remaining < 2000 ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Clock className="w-4 h-4 text-blue-500" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary">{message}</p>
            {description && (
              <p className="text-xs text-muted mt-0.5">{description}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onUndo}
              className="px-3 py-1.5 text-xs font-medium bg-blue-500 hover:bg-blue-400 text-white rounded-lg transition-colors flex items-center gap-1"
            >
              <Undo2 className="w-3 h-3" />
              Deshacer
            </button>
            <button
              onClick={() => toast.dismiss(toastId)}
              className="p-1.5 text-muted hover:text-primary hover:bg-elevated rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timer */}
        <div className="mt-2 text-xs text-muted flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>
            {secondsLeft > 0 ? `${secondsLeft}s` : 'Confirmando...'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// =============================================================================
// HOOK: useUndoToast
// =============================================================================

/**
 * Hook para mostrar toasts de undo con countdown
 */
export const useUndoToast = () => {
  const show = useCallback(
    (message: string, onUndo: () => void, options?: { duration?: number; id?: string }) => {
      return showUndoToast(message, onUndo, options);
    },
    []
  );

  const dismiss = useCallback((id?: string) => {
    if (id) {
      toast.dismiss(id);
      if (pendingUndos.has(id)) {
        clearTimeout(pendingUndos.get(id));
        pendingUndos.delete(id);
      }
    } else {
      toast.dismiss();
    }
  }, []);

  return { show, dismiss };
};

// =============================================================================
// SHORTCUT: Ctrl+Z / Ctrl+Shift+Z
// =============================================================================

/**
 * Hook para manejar shortcuts de undo/redo global
 */
export const useUndoRedoShortcuts = (
  onUndo: () => void,
  onRedo: () => void
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
      }
      
      // Ctrl/Cmd + Shift + Z = Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        onRedo();
      }
      
      // Ctrl/Cmd + Y = Redo (alternativo)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        onRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo]);
};

// =============================================================================
// INDICADOR EN PANTALLA
// =============================================================================

interface UndoIndicatorProps {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  onUndo: () => void;
  onRedo: () => void;
}

export const UndoIndicator: React.FC<UndoIndicatorProps> = ({
  canUndo,
  canRedo,
  undoCount,
  redoCount,
  onUndo,
  onRedo,
}) => {
  if (!canUndo && !canRedo) return null;

  return (
    <div className="fixed bottom-24 left-6 z-50 flex items-center gap-1 bg-surface border border-subtle rounded-xl shadow-lg p-1">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          canUndo
            ? 'hover:bg-elevated text-primary'
            : 'text-muted cursor-not-allowed opacity-50'
        )}
        title="Deshacer (Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4" />
        {undoCount > 0 && <span className="text-xs">{undoCount}</span>}
      </button>
      
      <div className="w-px h-6 bg-subtle" />
      
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          canRedo
            ? 'hover:bg-elevated text-primary'
            : 'text-muted cursor-not-allowed opacity-50'
        )}
        title="Rehacer (Ctrl+Shift+Z)"
      >
        <Undo2 className="w-4 h-4 rotate-180" />
        {redoCount > 0 && <span className="text-xs">{redoCount}</span>}
      </button>
    </div>
  );
};

export default UndoToast;