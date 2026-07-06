import { useState, useEffect, useRef, useCallback, useReducer, useMemo } from 'react';
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

// Domain (Lego Architecture)
import { shouldPromptBatch, findItemByBarcode, evaluateProduct } from '../domain/countingDomain';

// Lego Hooks
import { useCountingSync } from './useCountingSync';
import { useCountingQueries } from './useCountingQueries';
import { useCountingAI } from './useCountingAI';

export const useCountingLogic = (sessionId: string | undefined, onExit: () => void) => {
  const settings = getSettings();
  const itemsRef = useRef<ConsolidatedItem[]>([]);
  
  const [currentLocation, setCurrentLocation] = useState(() => localStorage.getItem('last_loc') || 'BODEGA_GRAL'); 
  useEffect(() => { localStorage.setItem('last_loc', currentLocation); }, [currentLocation]);

  const { engine, processScan } = useScanPipeline(1);
  const [machineState, dispatch] = useReducer(scannerReducer, 'IDLE');

  // Composability
  useCountingSync(sessionId);
  const { session, consolidatedHistory } = useCountingQueries(sessionId, engine.activeBarcode, itemsRef);
  const { potentialMatch, setPotentialMatch } = useCountingAI(consolidatedHistory, session, settings);

  const finalizeScanPipeline = useCallback(async (barcode: string, qty: number, mm?: number, yyyy?: number, batch?: string) => {
    if (!sessionId) return;
    const allowedStates = ['IDLE', 'LOOKING_UP', 'COMMITTING', 'MANUAL_ENTRY', 'AWAITING_PHARMA'];
    if (!allowedStates.includes(machineState)) return;

    // Si viene de AWAITING_PHARMA con fecha (del modal), ir directo a guardar
    if (machineState === 'AWAITING_PHARMA' && mm !== undefined && yyyy !== undefined) {
      dispatch({ type: 'PRODUCT_RESOLVED', needsPharma: false });
      await sessionService.addScanEvent(sessionId, barcode, qty, mm, yyyy, currentLocation, batch);
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
        const needsPharma = shouldPromptForBatch(cleanBarcode, consolidatedHistory || [], settings) && (mm === undefined);
        if (needsPharma) {
          dispatch({ type: 'PRODUCT_RESOLVED', needsPharma: true });
          return;
        }
        dispatch({ type: 'PRODUCT_RESOLVED', needsPharma: false });

        await sessionService.addScanEvent(sessionId, cleanBarcode, qty, mm, yyyy, currentLocation, batch);
        dispatch({ type: 'COMMIT_COMPLETE' });
      },
      (err) => {
        dispatch({ type: 'ERROR_OCCURRED' });
      }
    );
  }, [sessionId, settings, currentLocation, consolidatedHistory, machineState, processScan]);

  const resetSession = useCallback(async () => {
    if (!sessionId || !confirm("¿Vaciar todo el contenido de este bulto?")) return;
    await ScanRepository.deleteBySessions([sessionId]); 
    await sessionService.updateSessionMetadata(sessionId);
    engine.actions.resetActive();
    engine.actions.triggerFeedback('undo');
  }, [sessionId, engine.actions]);

  const actions = useMemo(() => ({
    setMultiplier: engine.setMultiplier, 
    setCurrentLocation, 
    handleExternalScan: finalizeScanPipeline,
    resetSession,
    selectItem: (b: string) => { 
      const norm = normalizeSku(b);
      const existing = itemsRef.current.find(i => normalizeSku(i.barcode) === norm);
      productService.getProductByBarcode(b).then(product => {
        engine.actions.updateActiveItem(b, product || null, existing?.totalQuantity || 0, 0);
      });
    },
    handlePharmaComplete: (m?: number, y?: number, b?: string) => {
      if (engine.activeBarcode) finalizeScanPipeline(engine.activeBarcode, engine.multiplier, m, y, b);
    },
    cancelPharma: () => {
      dispatch({ type: 'RESET' });
    },
    undoLastScan: async () => {
      if(sessionId) {
        const undone = await sessionService.undoLastAction(sessionId);
        if(undone) engine.actions.triggerFeedback('undo');
      }
    },
    toggleAutoLock: async () => {
      if (sessionId && session) {
        const newState = !session.isAutoLockEnabled;
        await SessionRepository.update(sessionId, { isAutoLockEnabled: newState });
        engine.actions.triggerFeedback(newState ? 'success' : 'undo');
      }
    },
    setStatus: (s: 'manual' | 'idle') => {
      if (s === 'manual') dispatch({ type: 'OPEN_MANUAL' });
      else dispatch({ type: 'RESET' });
    },
    applyPotentialMatch: async () => {
      if (!potentialMatch || !sessionId) return;
      await SessionRepository.update(sessionId, {
        erpOrder: potentialMatch.expectedOrder.internalId,
        expectedItems: potentialMatch.expectedOrder.items,
        isVerifiedMode: true
      });
      setPotentialMatch(null);
      engine.actions.triggerFeedback('success');
    },
    dismissPotentialMatch: () => setPotentialMatch(null)
  }), [engine.setMultiplier, setCurrentLocation, finalizeScanPipeline, resetSession, engine.actions, engine.activeBarcode, engine.multiplier, sessionId, session, potentialMatch, setPotentialMatch]);

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
      potentialMatch
    },
    sessionData: { session, history: consolidatedHistory || [] },
    actions
  };
};

