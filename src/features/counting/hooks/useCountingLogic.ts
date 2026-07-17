/**
 * useCountingLogic - Lógica central de conteo
 *
 * Este hook orquestra los hooks extraídos para formar el flujo de conteo.
 * Las acciones están en useCountingActions para reutilización.
 *
 * @see REFACTOR_ORCHESTRATOR.md
 * @see useCountingActions.ts
 */

import { useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { getSettings } from '@/services/settings';
import type { ConsolidatedItem } from '@/types';

import { useCountingSession } from './useCountingSession';
import { useCountingScanner } from './useCountingScanner';
import { useCountingAutosave, type CountingSessionSnapshot } from './useCountingAutosave';
import { useCountingSync } from './useCountingSync';
import { useCountingQueries } from './useCountingQueries';
import { useCountingAI } from './useCountingAI';
import { useExpiryTracker } from './useExpiryTracker';
import { useCountingActions } from './useCountingActions';

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
// HOOK PRINCIPAL (~150 LOC)
// =============================================================================

export const useCountingLogic = (
  sessionId: string | undefined,
  onExit: () => void
): UseCountingLogicResult => {
  const settings = getSettings();
  const itemsRef = useRef<ConsolidatedItem[]>([]);

  // ============================================================================
  // HOOKS EXTRAÍDOS
  // ============================================================================

  // Gestión de sesión, multiplicador, ubicación
  const { session, isLoading, multiplier, currentLocation, setCurrentLocation } =
    useCountingSession(sessionId);

  // State machine y engine
  const {
    machineState,
    dispatch,
    engine,
    activeBarcode,
    activeProduct,
    optimisticQty,
    feedback,
    setMultiplier,
  } = useCountingScanner(multiplier);

  // Persistencia automática
  const { hasPendingChanges, lastSaveTime, isSaving, saveData, recoveredData, clearRecovery } =
    useCountingAutosave(sessionId, { interval: 30000, showToasts: true });

  // Sincronización
  useCountingSync(sessionId);

  // Queries consolidadas
  const { consolidatedHistory } = useCountingQueries(sessionId, activeBarcode, itemsRef);

  // AI suggestions
  const { potentialMatch, setPotentialMatch } = useCountingAI(
    consolidatedHistory,
    session,
    settings
  );

  // Tracking de expiry
  const { saveExpiry, syncExpiry, getExpiryForBarcode } = useExpiryTracker();

  // ============================================================================
  // ACCIONES EXTRAÍDAS
  // ============================================================================

  const countingActions = useCountingActions({
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
  });

  // ============================================================================
  // AUTO-SAVE: Guardar cuando hay cambios
  // ============================================================================

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

  // ============================================================================
  // AUTO-SAVE: Mostrar toast de recovery
  // ============================================================================

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

  // ============================================================================
  // RETORNO
  // ============================================================================

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
      autoSave: { hasPendingChanges, lastSaveTime, isSaving },
    },
    sessionData: { session, history: consolidatedHistory || [] },
    actions: {
      setMultiplier,
      setCurrentLocation,
      handleExternalScan: countingActions.finalizeScanPipeline,
      resetSession: countingActions.resetSession,
      selectItem: countingActions.selectItem,
      handlePharmaComplete: countingActions.handlePharmaComplete,
      cancelPharma: countingActions.cancelPharma,
      undoLastScan: countingActions.undoLastScan,
      toggleAutoLock: () => countingActions.toggleAutoLock(session),
      setStatus: countingActions.setStatus,
      applyPotentialMatch: () => countingActions.applyPotentialMatch(setPotentialMatch),
    },
  };
};

export default useCountingLogic;
