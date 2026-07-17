import { useState, useEffect, useRef, useCallback, useReducer, useMemo } from 'react';
import { toast } from 'sonner';
import { getSettings } from '../../../services/settings';
import { scannerReducer } from '../../../services/scannerMachine';
import { ConsolidatedItem } from '../../../types';
import { useScanPipeline } from '../../../shared/hooks/useScanPipeline';
import { SessionRepository } from '../../../repositories/SessionRepository';
import { ScanRepository } from '../../../repositories/ScanRepository';
import * as sessionService from '../../../services/sessionService';
import * as productService from '../../../services/productService';
import { normalizeSku } from '../../../services/utils';
import { shouldPromptForBatch } from '../../../services/uiLogic';
import { logger } from '../../../services/logger';

// ✅ Auto-save
import { useAutoSave, useAutoSaveRecovery } from '@/shared/hooks/auto-save';

// ✅ Configuración de vencimiento
import { isNoDateRecord } from '@/lib/expiryConfig';

// Domain (Lego Architecture)
import { shouldPromptBatch, findItemByBarcode, evaluateProduct } from '../domain/countingDomain';

// Lego Hooks
import { useCountingSync } from './useCountingSync';
import { useExpiryTracker } from './useExpiryTracker';
import { useCountingQueries } from './useCountingQueries';
import { useCountingAI } from './useCountingAI';

// ============================================================================
// TIPOS PARA AUTO-SAVE
// ============================================================================

interface CountingSessionSnapshot {
  sessionId: string;
  items: ConsolidatedItem[];
  currentLocation: string;
  multiplier: number;
  timestamp: number;
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export const useCountingLogic = (sessionId: string | undefined, onExit: () => void) => {
  const settings = getSettings();
  const itemsRef = useRef<ConsolidatedItem[]>([]);

  const [currentLocation, setCurrentLocation] = useState(
    () => localStorage.getItem('last_loc') || 'BODEGA_GRAL'
  );
  useEffect(() => {
    localStorage.setItem('last_loc', currentLocation);
  }, [currentLocation]);

  const { engine, processScan } = useScanPipeline(1);
  const [machineState, dispatch] = useReducer(scannerReducer, 'IDLE');

  // ✅ AUTO-SAVE: Configurar guardado automático
  const autoSaveKey = sessionId ? `counting_session_${sessionId}` : 'counting_session';

  const {
    state: autoSaveState,
    saveData,
    saveNow,
    getRecoveredData,
    clearSavedData,
  } = useAutoSave<CountingSessionSnapshot>({
    interval: 30000, // Cada 30 segundos
    storageKey: autoSaveKey,
    enabled: !!sessionId,
    showToasts: false, // No mostrar toasts en cada save
  });

  // ✅ AUTO-SAVE: Recuperar datos si hay sesión anterior
  const { recoveredData, clearRecovery } =
    useAutoSaveRecovery<CountingSessionSnapshot>(autoSaveKey);

  // ✅ AUTO-SAVE: Mostrar toast si hay datos recuperables al montar
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

  // Composability
  useCountingSync(sessionId);
  const { session, consolidatedHistory } = useCountingQueries(
    sessionId,
    engine.activeBarcode,
    itemsRef
  );

  // ✅ AUTO-SAVE: Guardar cuando hay cambios en los items
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
  const { potentialMatch, setPotentialMatch } = useCountingAI(
    consolidatedHistory,
    session,
    settings
  );
  const { saveExpiry, syncExpiry, getExpiryForBarcode } = useExpiryTracker();

  const finalizeScanPipeline = useCallback(
    async (barcode: string, qty: number, mm?: number, yyyy?: number, batch?: string) => {
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

        processScan(
          barcode,
          qty,
          currentQty,
          undefined, // Optimistic update is handled by engine internally
          async (cleanBarcode, product, newQty) => {
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
          err => {
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
    [sessionId, settings, currentLocation, consolidatedHistory, machineState, processScan]
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
      setMultiplier: engine.setMultiplier,
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
            // Verificar si es "omitir" (m=0 o y=9999)
            const isSkip = isNoDateRecord(m, y);

            // Solo guardar en expiry si NO es omitir
            if (!isSkip) {
              // Registrar vencimiento
              await saveExpiry({
                barcode: engine.activeBarcode,
                productName: engine.activeProduct?.name,
                mm: m,
                yyyy: y,
                sessionId: sessionId,
              });
              // Sincronizar a la nube si hay conexión
              const entry = await getExpiryForBarcode(engine.activeBarcode);
              if (entry) {
                syncExpiry(entry);
              }
            }

            // Continuar con el flujo normal (para contar el producto)
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
            isVerifiedMode: true,
          });
          setPotentialMatch(null);
          engine.actions.triggerFeedback('success');
        } catch (err) {
          logger.error(
            'useCountingLogic',
            'Error in applyPotentialMatch',
            err instanceof Error ? err.message : String(err)
          );
          toast.error('Error al aplicar coincidencia');
        }
      },
      dismissPotentialMatch: () => setPotentialMatch(null),
    }),
    [
      engine.setMultiplier,
      setCurrentLocation,
      finalizeScanPipeline,
      resetSession,
      engine.actions,
      engine.activeBarcode,
      engine.multiplier,
      sessionId,
      session,
      potentialMatch,
      setPotentialMatch,
    ]
  );

  // ✅ AUTO-SAVE: Guardar y limpiar al desmontar o salir
  useEffect(() => {
    return () => {
      // Guardar datos pendientes antes de desmontar
      if (autoSaveState.hasPendingChanges && sessionId) {
        saveNow();
      }
      // Limpiar datos guardados al salir
      if (recoveredData && sessionId === recoveredData.sessionId) {
        clearSavedData();
      }
    };
  }, [autoSaveState.hasPendingChanges, sessionId, saveNow, recoveredData, clearSavedData]);

  // ✅ AUTO-SAVE: Confirmar antes de salir si hay cambios pendientes
  // Usar ref para evitar re-registro de listeners en cada cambio
  const hasPendingChangesRef = useRef(autoSaveState.hasPendingChanges);
  hasPendingChangesRef.current = autoSaveState.hasPendingChanges;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingChangesRef.current) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro de salir?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []); // Dependencia vacía - el ref se actualiza automáticamente

  return {
    state: {
      isLoading: session === undefined,
      status: machineState.toLowerCase(),
      machineState, // Exportar para detectar AWAITING_PHARMA en UI
      feedback: engine.feedback,
      multiplier: engine.multiplier,
      currentLocation,
      activeBarcode: engine.activeBarcode,
      activeProduct: engine.activeProduct,
      optimisticQty: engine.optimisticQty || 0,
      potentialMatch,
      // ✅ AUTO-SAVE: Exportar estado
      autoSave: {
        hasPendingChanges: autoSaveState.hasPendingChanges,
        lastSaveTime: autoSaveState.lastSaveTime,
        isSaving: autoSaveState.isSaving,
      },
    },
    sessionData: { session, history: consolidatedHistory || [] },
    actions,
  };
};
