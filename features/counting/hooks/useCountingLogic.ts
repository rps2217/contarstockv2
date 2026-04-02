import { useState, useEffect, useRef, useCallback, useReducer, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { firebaseSyncService } from '../../../services/firebaseSyncService';
import * as sessionService from '../../../services/sessionService'; 
import * as productService from '../../../services/productService';
import { normalizeSku } from '../../../services/utils';
import { getSettings } from '../../../services/settings';
import { aggregateScans } from '../../../services/aggregator';
import { shouldPromptForBatch } from '../../../services/uiLogic';
import { scannerReducer } from '../../../services/scannerMachine';
import { ConsolidatedItem, MatchResult } from '../../../types';
import { useScanPipeline } from '../../../shared/hooks/useScanPipeline';
import { SessionRepository } from '../../../repositories/SessionRepository';
import { ScanRepository } from '../../../repositories/ScanRepository';
import { DetectiveService } from '../../../services/detectiveService';
import { SoundFX } from '../../../services/audio';

export const useCountingLogic = (sessionId: string | undefined, onExit: () => void) => {
  const settings = getSettings();

  // Sincronización en tiempo real para la sesión actual y sus escaneos
  useEffect(() => {
    if (!sessionId) return;
    
    const unsubSession = firebaseSyncService.startFilteredSync('SESSIONS', db.sessions, 'id', sessionId);
    const unsubScans = firebaseSyncService.startFilteredSync('CONTEOS', db.scans, 'sessionId', sessionId);
    
    return () => {
      unsubSession();
      unsubScans();
    };
  }, [sessionId]);

  const { engine, processScan } = useScanPipeline(1);
  const [machineState, dispatch] = useReducer(scannerReducer, 'IDLE');
  
  const [currentLocation, setCurrentLocation] = useState(() => localStorage.getItem('last_loc') || 'BODEGA_GRAL'); 
  const [potentialMatch, setPotentialMatch] = useState<MatchResult | null>(null);
  const itemsRef = useRef<ConsolidatedItem[]>([]);
  
  useEffect(() => { localStorage.setItem('last_loc', currentLocation); }, [currentLocation]);

  const session = useLiveQuery(async () => {
    if (!sessionId) return null;
    return await SessionRepository.getById(sessionId);
  }, [sessionId]);

  const rawHistory = useLiveQuery(async () => {
    if (!sessionId) return [];
    const scans = await ScanRepository.getBySessionId(sessionId);
    const pending = sessionService.getPendingBuffer().filter(s => s.sessionId === sessionId);
    return await aggregateScans([...scans, ...pending]);
  }, [sessionId]);

  const consolidatedHistory = useMemo(() => {
    if (!rawHistory) return [];
    
    const expectedItems = session?.expectedItems || [];
    const expectedMap = new Map<string, number>(expectedItems.map(ei => [normalizeSku(ei.barcode), ei.expectedQty]));

    const finalItems = rawHistory.map(pi => ({
      ...pi,
      expectedQuantity: expectedMap.get(normalizeSku(pi.barcode)) || 0
    }));

    if (session?.isVerifiedMode) {
      const scannedBarcodes = new Set(rawHistory.map(pi => normalizeSku(pi.barcode)));
      expectedItems.forEach(exp => {
        if (!scannedBarcodes.has(normalizeSku(exp.barcode))) {
          finalItems.push({
            barcode: exp.barcode,
            productName: exp.name,
            totalQuantity: 0,
            expectedQuantity: exp.expectedQty,
            scans: 0,
            location: 'GUÍA'
          });
        }
      });
    }

    const sorted = finalItems.sort((a, b) => {
      if (normalizeSku(a.barcode) === engine.activeBarcode) return -1;
      return b.totalQuantity - a.totalQuantity;
    });

    itemsRef.current = sorted;
    return sorted;
  }, [rawHistory, session, engine.activeBarcode]);

  // MOTOR DETECTIVE: Resuelve 'Productos Desconocidos' en segundo plano para el conteo
  useEffect(() => {
    if (!consolidatedHistory) return;

    const unknownSkus = Array.from(new Set(
      consolidatedHistory
        .filter(item => (item.productName === 'Cargando...' || item.productName === 'Producto Desconocido' || !item.productName))
        .map(item => normalizeSku(item.barcode))
    )).slice(0, 10);

    if (unknownSkus.length === 0) return;

    const timer = setTimeout(() => {
      productService.resolveUnknownProducts(unknownSkus, settings.appSheetConfig);
    }, 1000);
    return () => clearTimeout(timer);
  }, [consolidatedHistory, settings]);

  // LÓGICA DE INFERENCIA EN SEGUNDO PLANO (Inteligencia Proactiva)
  useEffect(() => {
    if (!session || session.isVerifiedMode || !consolidatedHistory?.length) return;
    
    // Solo ejecutar si tenemos al menos 3 items diferentes para tener confianza
    if (consolidatedHistory.length < 3) return;

    const runInference = async () => {
      try {
        const matches = await DetectiveService.findMatchingOrders(consolidatedHistory);
        if (matches.length > 0 && matches[0].matchScore > 60) {
          // Si encontramos un match de alta confianza que no teníamos antes
          if (!potentialMatch || potentialMatch.expectedOrder.id !== matches[0].expectedOrder.id) {
            setPotentialMatch(matches[0]);
            // Feedback sutil para el operario
            SoundFX.play('success'); 
          }
        }
      } catch (e) {
        console.error("Inference Error:", e);
      }
    };

    const timer = setTimeout(runInference, 2000);
    return () => clearTimeout(timer);
  }, [consolidatedHistory, session, potentialMatch]);

  const finalizeScanPipeline = useCallback(async (barcode: string, qty: number, mm?: number, yyyy?: number, batch?: string) => {
    if (!sessionId) return;
    if (machineState !== 'IDLE' && machineState !== 'LOOKING_UP' && machineState !== 'COMMITTING' && machineState !== 'MANUAL_ENTRY') return;

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
    await ScanRepository.deleteBySessionId(sessionId);
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
  }), [engine.setMultiplier, setCurrentLocation, finalizeScanPipeline, resetSession, engine.actions, engine.activeBarcode, engine.multiplier, sessionId, session, potentialMatch]);

  return {
    state: { 
      isLoading: session === undefined,
      status: machineState.toLowerCase(),
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
