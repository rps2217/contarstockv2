/**
 * useOptimisticCounting - Optimistic UI para conteo
 *
 * Proporciona actualizaciones instantáneas de la UI antes de que
 * los datos se guarden en el servidor/IndexedDB.
 *
 * Patrón: Optimistic Update
 * 1. Actualizar UI inmediatamente (< 16ms)
 * 2. Mostrar feedback visual/háptico (< 50ms)
 * 3. Guardar en background (sin bloquear UI)
 * 4. Confirmar o rollback si falla
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/services/logger';
import type { ConsolidatedItem } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'undo';

export interface OptimisticItem extends ConsolidatedItem {
  _optimisticId?: string;
  _isPending?: boolean;
  _rollback?: () => void;
}

export interface OptimisticUpdate {
  id: string;
  type: 'add' | 'update' | 'remove';
  item: OptimisticItem;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'rolled_back';
}

export interface UseOptimisticCountingOptions {
  /** Callback cuando se confirma un update */
  onConfirm?: (update: OptimisticUpdate) => void;
  /** Callback cuando se hace rollback */
  onRollback?: (update: OptimisticUpdate) => void;
  /** Callback cuando falla el guardado */
  onError?: (update: OptimisticUpdate, error: Error) => void;
  /** Delay máximo para confirmación (ms) */
  confirmDelay?: number;
  /** Habilitar logging de debug */
  debug?: boolean;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_CONFIRM_DELAY = 1000; // 1 segundo para confirmar

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export function useOptimisticCounting(options: UseOptimisticCountingOptions = {}) {
  const {
    onConfirm,
    onRollback,
    onError,
    confirmDelay = DEFAULT_CONFIRM_DELAY,
    debug = false,
  } = options;

  // Estado de items (optimistic)
  const [items, setItems] = useState<OptimisticItem[]>([]);

  // Feedback visual actual
  const [feedback, setFeedback] = useState<FeedbackType | null>(null);

  // Cola de updates pendientes
  const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate[]>([]);

  // Refs para callbacks
  const callbacksRef = useRef({ onConfirm, onRollback, onError });
  callbacksRef.current = { onConfirm, onRollback, onError };

  // Ref para tracking de timers
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Debug log
  const log = useCallback(
    (message: string, data?: unknown) => {
      if (debug) {
        logger.debug('OptimisticUI', message, data);
      }
    },
    [debug]
  );

  // ---------------------------------------------------------------------------
  // Feedback
  // ---------------------------------------------------------------------------

  /**
   * Mostrar feedback visual/háptico
   */
  const triggerFeedback = useCallback((type: FeedbackType, duration = 300) => {
    setFeedback(type);

    // Limpiar feedback después del delay
    setTimeout(() => {
      setFeedback(prev => (prev === type ? null : prev));
    }, duration);
  }, []);

  // ---------------------------------------------------------------------------
  // Agregar item (optimistic)
  // ---------------------------------------------------------------------------

  /**
   * Agregar un item con actualización optimista
   */
  const addItem = useCallback(
    (
      item: ConsolidatedItem,
      /** Función para guardar en persistencia (IndexedDB/API) */
      persistFn: () => Promise<void>,
      /** Función para rollback si falla */
      rollbackFn?: () => void
    ): string => {
      const optimisticId = crypto.randomUUID();
      const timestamp = Date.now();

      log('addItem optimistic', { optimisticId, barcode: item.barcode });

      // 1. Crear item optimístico
      const optimisticItem: OptimisticItem = {
        ...item,
        _optimisticId: optimisticId,
        _isPending: true,
      };

      // 2. Actualizar UI inmediatamente (< 16ms)
      setItems(prev => {
        // Verificar si ya existe para hacer update en lugar de add
        const existingIndex = prev.findIndex(i => i.barcode === item.barcode);

        if (existingIndex >= 0) {
          // Update - sumar cantidades
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            totalQuantity: updated[existingIndex].totalQuantity + item.totalQuantity,
            _optimisticId: optimisticId,
            _isPending: true,
          };
          log('addItem - updated existing', { optimisticId });
          return updated;
        }

        // Add - nuevo item
        log('addItem - added new', { optimisticId });
        return [optimisticItem, ...prev];
      });

      // 3. Trigger feedback
      triggerFeedback('success', 200);

      // 4. Crear update record
      const update: OptimisticUpdate = {
        id: optimisticId,
        type: 'add',
        item: optimisticItem,
        timestamp,
        status: 'pending',
      };

      // 5. Guardar en background
      setPendingUpdates(prev => [...prev, update]);

      // 6. Timer para confirmar o rollback
      const timer = setTimeout(async () => {
        try {
          await persistFn();

          // Confirmado - limpiar flag pending
          setItems(prev =>
            prev.map(i => (i._optimisticId === optimisticId ? { ...i, _isPending: false } : i))
          );

          setPendingUpdates(prev =>
            prev.map(u => (u.id === optimisticId ? { ...u, status: 'confirmed' } : u))
          );

          callbacksRef.current.onConfirm?.(update);
          log('addItem - confirmed', { optimisticId });
        } catch (error: unknown) {
          // Falló - hacer rollback
          log('addItem - error, rolling back', { optimisticId, error });

          setItems(prev => prev.filter(i => i._optimisticId !== optimisticId));

          setPendingUpdates(prev =>
            prev.map(u => (u.id === optimisticId ? { ...u, status: 'rolled_back' } : u))
          );

          // Ejecutar rollback si se proporcionó función
          try {
            await rollbackFn?.();
          } catch (rollbackError) {
            logger.error('OptimisticUI', 'Rollback failed', rollbackError);
          }

          triggerFeedback('error', 500);
          callbacksRef.current.onError?.(update, error as Error);
          callbacksRef.current.onRollback?.(update);
        }
      }, confirmDelay);

      timersRef.current.set(optimisticId, timer);

      return optimisticId;
    },
    [log, triggerFeedback, confirmDelay]
  );

  // ---------------------------------------------------------------------------
  // Cancelar update (antes de confirmación)
  // ---------------------------------------------------------------------------

  /**
   * Cancelar un update pendiente (ej: undo antes de confirmar)
   */
  const cancelUpdate = useCallback(
    (optimisticId: string) => {
      const timer = timersRef.current.get(optimisticId);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(optimisticId);
      }

      log('cancelUpdate', { optimisticId });

      // Limpiar de pending
      setPendingUpdates(prev => prev.filter(u => u.id !== optimisticId));

      // Limpiar flag pending del item
      setItems(prev =>
        prev.map(i =>
          i._optimisticId === optimisticId
            ? { ...i, _isPending: false, _optimisticId: undefined }
            : i
        )
      );

      triggerFeedback('undo', 200);
    },
    [log, triggerFeedback]
  );

  // ---------------------------------------------------------------------------
  // Forzar confirmación
  // ---------------------------------------------------------------------------

  /**
   * Forzar confirmación inmediata de un update
   */
  const confirmUpdate = useCallback(
    (optimisticId: string) => {
      const timer = timersRef.current.get(optimisticId);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(optimisticId);
      }

      setItems(prev =>
        prev.map(i =>
          i._optimisticId === optimisticId
            ? { ...i, _isPending: false, _optimisticId: undefined }
            : i
        )
      );

      setPendingUpdates(prev =>
        prev.map(u => (u.id === optimisticId ? { ...u, status: 'confirmed' } : u))
      );

      log('confirmUpdate', { optimisticId });
    },
    [log]
  );

  // ---------------------------------------------------------------------------
  // Obtener estado
  // ---------------------------------------------------------------------------

  /**
   * Verificar si hay updates pendientes
   */
  const hasPendingUpdates = pendingUpdates.some(u => u.status === 'pending');

  /**
   * Cantidad de items pendientes
   */
  const pendingCount = pendingUpdates.filter(u => u.status === 'pending').length;

  /**
   * Verificar si un item específico está pendiente
   */
  const isItemPending = useCallback(
    (barcode: string) => {
      return items.some(i => i.barcode === barcode && i._isPending);
    },
    [items]
  );

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      // Limpiar todos los timers al desmontar
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Exportar
  // ---------------------------------------------------------------------------

  return {
    // Estado
    items,
    feedback,
    pendingUpdates,
    hasPendingUpdates,
    pendingCount,

    // Estado derivado
    isItemPending,
    confirmedItems: items.filter(i => !i._isPending),
    pendingItems: items.filter(i => i._isPending),

    // Acciones
    addItem,
    cancelUpdate,
    confirmUpdate,
    triggerFeedback,

    // Setters (para inicializar desde persistencia)
    setItems,
  };
}

// ============================================================================
// HOC: withOptimistic - Para usar con hooks existentes
// ============================================================================

export function wrapWithOptimistic<T extends object>(
  useHook: () => T,
  options?: UseOptimisticCountingOptions
): () => T & ReturnType<typeof useOptimisticCounting> {
  return function OptimisticWrapper() {
    const hookResult = useHook();
    const optimistic = useOptimisticCounting(options);

    return {
      ...hookResult,
      ...optimistic,
    };
  };
}

export default useOptimisticCounting;
