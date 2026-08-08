/**
 * useCountingActions - Acciones de conteo extraídas
 *
 * Este hook contiene todas las acciones de conteo que antes estaban
 * inline en useCountingLogic. Al extraerlas:
 * - useCountingLogic se reduce a ~150 LOC
 * - Las acciones son reutilizables en otros módulos (Hammer, Reception)
 * - Los tests pueden enfocarse en cada hook individualmente
 *
 * USO:
 * const actions = useCountingActions({
 *   sessionId,
 *   engine,
 *   settings,
 *   consolidatedHistory,
 *   onPharmaNeeded,
 *   onError,
 * });
 */

import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { normalizeSku } from '@/services/utils';
import { isNoDateRecord } from '@/lib/expiryConfig';
import { logger } from '@/services/logger';
import * as sessionService from '@/services/sessionService';
import * as productService from '@/services/productService';
import { SessionRepository } from '@/repositories/SessionRepository';
import { ScanRepository } from '@/repositories/ScanRepository';
import type { ConsolidatedItem, Product, MatchResult, AppSettings, CountingSession } from '@/types';
import type { ExpiryEntry } from '@/services/ExpiryService';

interface UseCountingActionsOptions {
  sessionId: string | undefined;

  engine: any; // CountingEngine - tipo complejo de useScanPipeline

  settings: AppSettings;
  consolidatedHistory: ConsolidatedItem[] | null;
  currentLocation: string;
  multiplier: number;
  activeBarcode: string | null;
  activeProduct: Product | null;
  machineState: string;
  potentialMatch: MatchResult | null;

  dispatch: (action: any) => void;
  // Callbacks para efectos secundarios
  onPharmaNeeded?: (barcode: string, qty: number) => void;
  onError?: (error: string) => void;

  saveExpiry?: (data: any) => Promise<any>;

  getExpiryForBarcode?: (barcode: string) => Promise<any>;

  syncExpiry?: (entry: any) => Promise<any>;
}

interface UseCountingActionsResult {
  finalizeScanPipeline: (
    barcode: string,
    qty?: number,
    mm?: number,
    yyyy?: number,
    batch?: string
  ) => Promise<void>;
  resetSession: () => Promise<void>;
  selectItem: (barcode: string) => void;
  handlePharmaComplete: (m?: number, y?: number, batch?: string) => Promise<void>;
  cancelPharma: () => void;
  undoLastScan: () => Promise<void>;
  toggleAutoLock: (session: CountingSession) => Promise<void>;
  setStatus: (status: 'manual' | 'idle') => void;

  applyPotentialMatch: (setPotentialMatch: (val: MatchResult | null) => void) => Promise<void>;
  updateMultiplier: (value: number) => void;
  updateLocation: (location: string) => void;
}

/** Tipo para acciones del reducer de conteo */
interface CountingAction {
  type: string;
  payload?: Record<string, unknown>;
  needsPharma?: boolean;
  barcode?: string;
}

export const useCountingActions = (
  options: UseCountingActionsOptions
): UseCountingActionsResult => {
  const {
    sessionId,
    engine,
    settings,
    consolidatedHistory,
    currentLocation,
    multiplier,
    activeBarcode,
    activeProduct,
    machineState,
    potentialMatch,
    dispatch,
    saveExpiry,
    getExpiryForBarcode,
    syncExpiry,
  } = options;

  // ============================================================================
  // ACCIÓN: Escanear producto
  // ============================================================================
  const finalizeScanPipeline = useCallback(
    async (barcode: string, qty?: number, mm?: number, yyyy?: number, batch?: string) => {
      if (!sessionId) return;
      const allowedStates = ['IDLE', 'LOOKING_UP', 'COMMITTING', 'MANUAL_ENTRY', 'AWAITING_PHARMA'];
      if (!allowedStates.includes(machineState)) return;

      try {
        // Si viene de AWAITING_PHARMA con fecha (del modal), ir directo a guardar
        if (machineState === 'AWAITING_PHARMA' && mm !== undefined && yyyy !== undefined) {
          dispatch({ type: 'PRODUCT_RESOLVED', needsPharma: false });
          await sessionService.addScanEvent(
            sessionId,
            barcode,
            qty,
            mm,
            yyyy,
            currentLocation,
            batch
          );
          dispatch({ type: 'COMMIT_COMPLETE' });
          return;
        }

        dispatch({ type: 'SCAN_INBOUND', barcode });

        const normBarcode = normalizeSku(barcode);
        const existing = consolidatedHistory?.find(i => normalizeSku(i.barcode) === normBarcode);
        const currentQty = existing?.totalQuantity || 0;
        const scanQty = qty ?? engine.multiplier;

        engine.processScan(
          barcode,
          scanQty,
          currentQty,
          undefined,

          async (cleanBarcode: string, product: Product | null, newQty: number) => {
            try {
              // TODO: Usar shouldPromptForBatch cuando esté disponible
              dispatch({ type: 'PRODUCT_RESOLVED', needsPharma: false });
              await sessionService.addScanEvent(
                sessionId,
                cleanBarcode,
                qty,
                mm,
                yyyy,
                currentLocation,
                batch
              );
              dispatch({ type: 'COMMIT_COMPLETE' });
            } catch (err) {
              logger.error(
                'useCountingActions',
                'Error in scan commit',
                err instanceof Error ? err.message : String(err)
              );
              dispatch({ type: 'ERROR_OCCURRED' });
            }
          },
          () => dispatch({ type: 'ERROR_OCCURRED' })
        );
      } catch (err) {
        logger.error(
          'useCountingActions',
          'Error in finalizeScanPipeline',
          err instanceof Error ? err.message : String(err)
        );
        dispatch({ type: 'ERROR_OCCURRED' });
      }
    },
    [sessionId, currentLocation, consolidatedHistory, machineState, engine, dispatch]
  );

  // ============================================================================
  // ACCIÓN: Resetear sesión
  // ============================================================================
  const resetSession = useCallback(async () => {
    if (!sessionId || !confirm('¿Vaciar todo el contenido de este bulto?')) return;
    try {
      await ScanRepository.deleteBySessions([sessionId]);
      await sessionService.updateSessionMetadata(sessionId);
      engine.actions.resetActive();
      engine.actions.triggerFeedback('undo');
    } catch (err) {
      logger.error(
        'useCountingActions',
        'Error resetting session',
        err instanceof Error ? err.message : String(err)
      );
      toast.error('Error al reiniciar la sesión');
    }
  }, [sessionId, engine]);

  // ============================================================================
  // ACCIÓN: Seleccionar item
  // ============================================================================
  const selectItem = useCallback(
    (barcode: string) => {
      const norm = normalizeSku(barcode);
      const existing = consolidatedHistory?.find(i => normalizeSku(i.barcode) === norm);
      productService
        .getProductByBarcode(barcode)
        .then(product => {
          engine.actions.updateActiveItem(
            barcode,
            product || null,
            existing?.totalQuantity || 0,
            0
          );
        })
        .catch(err => {
          logger.error('CountingLogic', 'Error selecting item', { barcode, error: String(err) });
        });
    },
    [consolidatedHistory, engine]
  );

  // ============================================================================
  // ACCIÓN: Completar pharma (fecha vencimiento)
  // ============================================================================
  const handlePharmaComplete = useCallback(
    async (m?: number, y?: number, b?: string) => {
      try {
        if (activeBarcode && m !== undefined && y !== undefined) {
          const isSkip = isNoDateRecord(m, y);

          if (!isSkip && saveExpiry && getExpiryForBarcode && syncExpiry) {
            await saveExpiry({
              barcode: activeBarcode,
              productName: activeProduct?.name,
              mm: m,
              yyyy: y,
              sessionId,
            });
            const entry = await getExpiryForBarcode(activeBarcode);
            if (entry) await syncExpiry(entry);
          }

          finalizeScanPipeline(activeBarcode, multiplier, m, y, b);
        }
      } catch (err) {
        logger.error(
          'useCountingActions',
          'Error in handlePharmaComplete',
          err instanceof Error ? err.message : String(err)
        );
        toast.error('Error al procesar el vencimiento');
      }
    },
    [
      activeBarcode,
      activeProduct,
      sessionId,
      multiplier,
      finalizeScanPipeline,
      saveExpiry,
      getExpiryForBarcode,
      syncExpiry,
    ]
  );

  // ============================================================================
  // ACCIÓN: Cancelar pharma
  // ============================================================================
  const cancelPharma = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  // ============================================================================
  // ACCIÓN: Deshacer último escaneo
  // ============================================================================
  const undoLastScan = useCallback(async () => {
    try {
      if (sessionId) {
        const undone = await sessionService.undoLastAction(sessionId);
        if (undone) engine.actions.triggerFeedback('undo');
      }
    } catch (err) {
      logger.error(
        'useCountingActions',
        'Error in undoLastScan',
        err instanceof Error ? err.message : String(err)
      );
      toast.error('Error al deshacer');
    }
  }, [sessionId, engine]);

  // ============================================================================
  // ACCIÓN: Toggle auto-lock
  // ============================================================================
  const toggleAutoLock = useCallback(
    async (session: CountingSession) => {
      try {
        if (sessionId && session) {
          const newState = !session.isAutoLockEnabled;
          await SessionRepository.update(sessionId, { isAutoLockEnabled: newState });
          engine.actions.triggerFeedback(newState ? 'success' : 'undo');
        }
      } catch (err) {
        logger.error(
          'useCountingActions',
          'Error in toggleAutoLock',
          err instanceof Error ? err.message : String(err)
        );
        toast.error('Error al cambiar auto-lock');
      }
    },
    [sessionId, engine]
  );

  // ============================================================================
  // ACCIÓN: Cambiar status
  // ============================================================================
  const setStatus = useCallback(
    (s: 'manual' | 'idle') => {
      if (s === 'manual') dispatch({ type: 'OPEN_MANUAL' });
      else dispatch({ type: 'RESET' });
    },
    [dispatch]
  );

  // ============================================================================
  // ACCIÓN: Aplicar sugerencia de matching
  // ============================================================================
  const applyPotentialMatch = useCallback(
    async (setPotentialMatch: (val: MatchResult | null) => void) => {
      try {
        if (!potentialMatch || !sessionId) return;
        await SessionRepository.update(sessionId, {
          erpOrder: potentialMatch.expectedOrder.internalId,
          expectedItems: potentialMatch.expectedOrder.items,
        });
        engine.actions.triggerFeedback('success');
        setPotentialMatch(null);
      } catch (err) {
        logger.error(
          'useCountingActions',
          'Error in applyPotentialMatch',
          err instanceof Error ? err.message : String(err)
        );
        toast.error('Error al aplicar sugerencia');
      }
    },
    [sessionId, potentialMatch, engine]
  );

  // ============================================================================
  // ACCIONES ADICIONALES (para compatibilidad con otros módulos)
  // ============================================================================
  const updateMultiplier = useCallback(
    (value: number) => {
      engine.setMultiplier(value);
    },
    [engine]
  );

  const updateLocation = useCallback((location: string) => {
    // La ubicación se maneja en useCountingSession
  }, []);

  return {
    finalizeScanPipeline,
    resetSession,
    selectItem,
    handlePharmaComplete,
    cancelPharma,
    undoLastScan,
    toggleAutoLock,
    setStatus,
    applyPotentialMatch,
    updateMultiplier,
    updateLocation,
  };
};

export default useCountingActions;
