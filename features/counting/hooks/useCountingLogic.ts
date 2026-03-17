import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import * as sessionService from '../../../services/sessionService'; 
import * as productService from '../../../services/productService';
import { normalizeSku } from '../../../services/utils';
import { getSettings } from '../../../services/settings';
import { aggregateScans } from '../../../services/aggregator';
import { shouldPromptForBatch } from '../../../services/uiLogic';
import { scannerReducer } from '../../../services/scannerMachine';
import { ConsolidatedItem } from '../../../types';
import { useScanPipeline } from '../../../shared/hooks/useScanPipeline';
import { SessionRepository } from '../../../repositories/SessionRepository';
import { ScanRepository } from '../../../repositories/ScanRepository';

export const useCountingLogic = (sessionId: string | undefined, onExit: () => void) => {
  const settings = getSettings();
  const { engine, processScan } = useScanPipeline(1);
  const [machineState, dispatch] = useReducer(scannerReducer, 'IDLE');
  
  const [currentLocation, setCurrentLocation] = useState(() => localStorage.getItem('last_loc') || 'BODEGA_GRAL'); 
  const itemsRef = useRef<ConsolidatedItem[]>([]);
  
  useEffect(() => { localStorage.setItem('last_loc', currentLocation); }, [currentLocation]);

  const session = useLiveQuery(async () => {
    if (!sessionId) return null;
    return await SessionRepository.getById(sessionId);
  }, [sessionId]);

  const consolidatedHistory = useLiveQuery(async () => {
    if (!sessionId) return [];
    const scans = await ScanRepository.getBySessionId(sessionId);
    // INTEGRACIÓN DEL BUFFER DE PERSISTENCIA:
    const pending = sessionService.getPendingBuffer().filter(s => s.sessionId === sessionId);
    const physicalItems = await aggregateScans([...scans, ...pending]);
    
    const expectedItems = session?.expectedItems || [];
    const expectedMap = new Map<string, number>(expectedItems.map(ei => [normalizeSku(ei.barcode), ei.expectedQty]));

    const finalItems = physicalItems.map(pi => ({
      ...pi,
      expectedQuantity: expectedMap.get(normalizeSku(pi.barcode)) || 0
    }));

    if (session?.isVerifiedMode) {
      const scannedBarcodes = new Set(physicalItems.map(pi => normalizeSku(pi.barcode)));
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
  }, [sessionId, session, engine.activeBarcode, engine.feedback, engine.optimisticQty]);

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

  return {
    state: { 
      isLoading: session === undefined,
      status: machineState.toLowerCase(),
      feedback: engine.feedback, 
      multiplier: engine.multiplier, 
      currentLocation,
      activeBarcode: engine.activeBarcode, 
      activeProduct: engine.activeProduct,
      optimisticQty: engine.optimisticQty || 0
    },
    sessionData: { session, history: consolidatedHistory || [] },
    actions: { 
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
      undoLastScan: async () => {
        if(sessionId) {
          const undone = await sessionService.undoLastAction(sessionId);
          if(undone) engine.actions.triggerFeedback('undo');
        }
      },
      setStatus: (s: 'manual' | 'idle') => {
        if (s === 'manual') dispatch({ type: 'OPEN_MANUAL' });
        else dispatch({ type: 'RESET' });
      }
    }
  };
};
