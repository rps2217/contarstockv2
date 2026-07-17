/**
 * useCountingLogic v2 - Refactorizado usando hooks extraídos
 *
 * Este archivo es una versión refactorizada de useCountingLogic.ts
 * que usa los hooks extraídos del Sprint 1:
 * - useCountingSession
 * - useCountingScanner
 * - useCountingAutosave
 *
 * Una vez validado, reemplazar useCountingLogic.ts con este contenido.
 *
 * @see REFACTOR_ORCHESTRATOR.md
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { getSettings } from '@/services/settings';
import { ConsolidatedItem } from '@/types';
import { normalizeSku } from '@/services/utils';
import { isNoDateRecord } from '@/lib/expiryConfig';
import { logger } from '@/services/logger';

import * as sessionService from '@/services/sessionService';
import * as productService from '@/services/productService';

import { SessionRepository } from '@/repositories/SessionRepository';
import { ScanRepository } from '@/repositories/ScanRepository';

import { shouldPromptBatch, findItemByBarcode } from '../domain/countingDomain';

// =============================================================================
// HOOKS EXTRAÍDOS DEL SPRINT 1
// =============================================================================

import { useCountingSession } from './useCountingSession';
import { useCountingScanner } from './useCountingScanner';
import { useCountingAutosave, type CountingSessionSnapshot } from './useCountingAutosave';

import { useCountingSync } from './useCountingSync';
import { useExpiryTracker } from './useExpiryTracker';
import { useCountingQueries } from './useCountingQueries';
import { useCountingAI } from './useCountingAI';
import { shouldPromptForBatch } from '@/services/uiLogic';

// =============================================================================
// TIPOS
// =============================================================================

interface UseCountingLogicResult {
  state: {
    isLoading: boolean;
    status: string;
    machineState: ReturnType<typeof useCountingScanner>['machineState'];
    feedback: string | null;
    multiplier: number;
    currentLocation: string;
    activeBarcode: string | null;
    activeProduct: any | null;
    optimisticQty: number;
    potentialMatch: any | null;
    autoSave: {
      hasPendingChanges: boolean;
      lastSaveTime: number | null;
      isSaving: boolean;
    };
  };
  sessionData: {
    session: any;
    history: ConsolidatedItem[];
  };
  actions: {
    setMultiplier: (value: number) => void;
    setCurrentLocation: (location: string) => void;
    handleExternalScan: (
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
    toggleAutoLock: () => Promise<void>;
    setStatus: (status: 'manual' | 'idle') => void;
    applyPotentialMatch: () => Promise<void>;
  };
}

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

export const useCountingLogic_v2 = (
  sessionId: string | undefined,
  onExit: () => void
): UseCountingLogicResult => {
  const settings = getSettings();
  const itemsRef = useRef<ConsolidatedItem[]>([]);

  // =============================================================================
  // HOOKS EXTRAÍDOS
  // =============================================================================

  // useCountingSession - Gestión de sesión, multiplicador, ubicación
  const {
    session,
    isLoading,
    multiplier,
    currentLocation,
    setCurrentLocation,
    resetSession: resetSessionAction,
  } = useCountingSession(sessionId);

  // useCountingScanner - State machine y engine
  const {
    machineState,
    dispatch,
    engine,
    processScan,
    activeBarcode,
    activeProduct,
    optimisticQty,
    feedback,
    setMultiplier,
  } = useCountingScanner(multiplier);

  // useCountingAutosave - Persistencia automática
  const { hasPendingChanges, lastSaveTime, isSaving, saveData, recoveredData, clearRecovery } =
    useCountingAutosave(sessionId, {
      interval: 30000,
      showToasts: true,
    });

  // =============================================================================
  // HOOKS EXISTENTES (mantener por ahora)
  // =============================================================================

  useCountingSync(sessionId);

  const { consolidatedHistory } = useCountingQueries(sessionId, activeBarcode, itemsRef);

  const { potentialMatch, setPotentialMatch } = useCountingAI(
    consolidatedHistory,
    session,
    settings
  );

  const { saveExpiry, syncExpiry, getExpiryForBarcode } = useExpiryTracker();

  // =============================================================================
  // AUTO-SAVE: Guardar cuando hay cambios
  // =============================================================================

  useEffect(() => {
    if (sessionId && consolidatedHistory) {
      const snapshot: CountingSessionSnapshot = {
        sessionId,
        items: consolidatedHistory,
        currentLocation,
        multiplier: engine.multiplier,
        timestamp: Date.now(),
      };
      saveData(snapshot, sessionId);
    }
  }, [sessionId, consolidatedHistory, currentLocation, engine.multiplier, saveData]);

  // =============================================================================
  // AUTO-SAVE: Mostrar toast de recovery
  // =============================================================================

  useEffect(() => {
    if (recoveredData && sessionId && recoveredData.sessionId === sessionId) {
      toast.info('📦 Sesión anterior recuperada', {
        duration: 5000,
        action: {
          label: 'Descartar',
          onClick: () => {
            clearRecovery();
            toast.success('Datos descartados');
          },
        },
      });
    }
  }, [recoveredData, sessionId, clearRecovery]);

  // =============================================================================
  // ACCIONES
  // =============================================================================

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
        const existing = itemsRef.current.find(i => normalizeSku(i.barcode) === normBarcode);
        const currentQty = existing?.totalQuantity || 0;
        const scanQty = qty ?? engine.multiplier;

        processScan(
          barcode,
          scanQty,
          currentQty,
          undefined,
          async (cleanBarcode: string, product: any, newQty: number) => {
            try {
              const needsPharma =
                shouldPromptForBatch(cleanBarcode, consolidatedHistory || [], settings) &&
                mm === undefined;
              if (needsPharma) {
                dispatch({ type: 'PRODUCT_RESOLVED', needsPharma: true });
                return;
              }
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
                'useCountingLogic',
                'Error in scan commit',
                err instanceof Error ? err.message : String(err)
              );
              dispatch({ type: 'ERROR_OCCURRED' });
            }
          },
          () => {
            dispatch({ type: 'ERROR_OCCURRED' });
          }
        );
      } catch (err) {
        logger.error(
          'useCountingLogic',
          'Error in finalizeScanPipeline',
          err instanceof Error ? err.message : String(err)
        );
        dispatch({ type: 'ERROR_OCCURRED' });
      }
    },
    [sessionId, settings, currentLocation, consolidatedHistory, machineState, dispatch, engine]
  );

  const resetSession = useCallback(async () => {
    if (!sessionId || !confirm('¿Vaciar todo el contenido de este bulto?')) return;
    try {
      await ScanRepository.deleteBySessions([sessionId]);
      await sessionService.updateSessionMetadata(sessionId);
      engine.actions.resetActive();
      engine.actions.triggerFeedback('undo');
    } catch (err) {
      logger.error(
        'useCountingLogic',
        'Error resetting session',
        err instanceof Error ? err.message : String(err)
      );
      toast.error('Error al reiniciar la sesión');
    }
  }, [sessionId, engine.actions]);

  const actions = useMemo(
    () => ({
      setMultiplier,
      setCurrentLocation,
      handleExternalScan: finalizeScanPipeline,
      resetSession,
      selectItem: (b: string) => {
        const norm = normalizeSku(b);
        const existing = itemsRef.current.find(i => normalizeSku(i.barcode) === norm);
        productService
          .getProductByBarcode(b)
          .then(product => {
            engine.actions.updateActiveItem(b, product || null, existing?.totalQuantity || 0, 0);
          })
          .catch(err => {
            logger.error('CountingLogic', 'Error selecting item', {
              barcode: b,
              error: String(err),
            });
          });
      },
      handlePharmaComplete: async (m?: number, y?: number, b?: string) => {
        try {
          if (engine.activeBarcode && m !== undefined && y !== undefined) {
            const isSkip = isNoDateRecord(m, y);

            if (!isSkip) {
              await saveExpiry({
                barcode: engine.activeBarcode,
                productName: engine.activeProduct?.name,
                mm: m,
                yyyy: y,
                sessionId: sessionId,
              });
              const entry = await getExpiryForBarcode(engine.activeBarcode);
              if (entry) {
                syncExpiry(entry);
              }
            }

            finalizeScanPipeline(engine.activeBarcode, engine.multiplier, m, y, b);
          }
        } catch (err) {
          logger.error(
            'useCountingLogic',
            'Error in handlePharmaComplete',
            err instanceof Error ? err.message : String(err)
          );
          toast.error('Error al procesar el vencimiento');
        }
      },
      cancelPharma: () => {
        dispatch({ type: 'RESET' });
      },
      undoLastScan: async () => {
        try {
          if (sessionId) {
            const undone = await sessionService.undoLastAction(sessionId);
            if (undone) engine.actions.triggerFeedback('undo');
          }
        } catch (err) {
          logger.error(
            'useCountingLogic',
            'Error in undoLastScan',
            err instanceof Error ? err.message : String(err)
          );
          toast.error('Error al deshacer');
        }
      },
      toggleAutoLock: async () => {
        try {
          if (sessionId && session) {
            const newState = !session.isAutoLockEnabled;
            await SessionRepository.update(sessionId, { isAutoLockEnabled: newState });
            engine.actions.triggerFeedback(newState ? 'success' : 'undo');
          }
        } catch (err) {
          logger.error(
            'useCountingLogic',
            'Error in toggleAutoLock',
            err instanceof Error ? err.message : String(err)
          );
          toast.error('Error al cambiar auto-lock');
        }
      },
      setStatus: (s: 'manual' | 'idle') => {
        if (s === 'manual') dispatch({ type: 'OPEN_MANUAL' });
        else dispatch({ type: 'RESET' });
      },
      applyPotentialMatch: async () => {
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
            'useCountingLogic',
            'Error in applyPotentialMatch',
            err instanceof Error ? err.message : String(err)
          );
          toast.error('Error al aplicar sugerencia');
        }
      },
    }),
    [
      sessionId,
      session,
      settings,
      currentLocation,
      consolidatedHistory,
      machineState,
      engine,
      dispatch,
      finalizeScanPipeline,
      resetSession,
      setMultiplier,
      setCurrentLocation,
      potentialMatch,
      setPotentialMatch,
      saveExpiry,
      syncExpiry,
      getExpiryForBarcode,
    ]
  );

  // =============================================================================
  // RETORNO
  // =============================================================================

  return {
    state: {
      isLoading,
      status: machineState.toLowerCase(),
      machineState,
      feedback,
      multiplier,
      currentLocation,
      activeBarcode,
      activeProduct,
      optimisticQty,
      potentialMatch,
      autoSave: {
        hasPendingChanges,
        lastSaveTime,
        isSaving,
      },
    },
    sessionData: { session, history: consolidatedHistory || [] },
    actions,
  };
};

export default useCountingLogic_v2;
