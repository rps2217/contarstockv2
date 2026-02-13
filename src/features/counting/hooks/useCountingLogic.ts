
import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import * as sessionService from '../../../services/sessionService'; 
import * as productService from '../../../services/productService';
import { sanitizeBarcode, normalizeSku } from '../../../services/utils';
import { SoundFX } from '../../../services/audio';
import { getSettings } from '../../../services/settings';
import { useScannerEngine } from '../../../shared/hooks/useScannerEngine';
import { aggregateScans } from '../../../services/aggregator';
import { shouldPromptForBatch } from '../../../services/uiLogic';
import { scannerReducer } from '../../../services/scannerMachine';
import { Product, ConsolidatedItem } from '../../../types';

export const useCountingLogic = (sessionId: string | undefined, onExit: () => void) => {
    const settings = getSettings();
    const engine = useScannerEngine(1);
    const [machineState, dispatch] = useReducer(scannerReducer, 'IDLE');
    const [currentLocation, setCurrentLocation] = useState(() => localStorage.getItem('last_loc') || 'BODEGA_GRAL'); 

    const itemsRef = useRef<ConsolidatedItem[]>([]);
    useEffect(() => { localStorage.setItem('last_loc', currentLocation); }, [currentLocation]);

    const session = useLiveQuery(async () => {
        if (!sessionId) return null;
        return await db.sessions.get(sessionId);
    }, [sessionId]);

    const consolidatedHistory = useLiveQuery(async () => {
        if (!sessionId) return [];
        const scans = await db.scans.where('sessionId').equals(sessionId).toArray();
        const physicalItems = await aggregateScans(scans);
        
        const expectedItems = session?.expectedItems || [];
        const expectedMap = new Map(expectedItems.map(ei => [normalizeSku(ei.barcode), ei.expectedQty]));

        const finalItems = physicalItems.map(pi => ({
            ...pi,
            expectedQuantity: expectedMap.get(normalizeSku(pi.barcode)) || 0
        }));

        if (session?.isVerifiedMode) {
            const scannedBarcodes = new Set(physicalItems.map(pi => normalizeSku(pi.barcode)));
            expectedItems.forEach(exp => {
                if (!scannedBarcodes.has(normalizeSku(exp.barcode))) {
                    finalItems.push({
                        barcode: exp.barcode, productName: exp.name, totalQuantity: 0,
                        expectedQuantity: exp.expectedQty, scans: 0, location: 'GUÍA'
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
    }, [sessionId, session, engine.activeBarcode, engine.feedback]);

    const finalizeScanPipeline = useCallback(async (barcode: string, qty: number, mm?: number, yyyy?: number, batch?: string) => {
        if (!sessionId || (machineState !== 'IDLE' && machineState !== 'LOOKING_UP' && machineState !== 'COMMITTING' && machineState !== 'MANUAL_ENTRY')) return;

        dispatch({ type: 'SCAN_INBOUND', barcode });
        try {
            const cleanBarcode = sanitizeBarcode(barcode);
            const normBarcode = normalizeSku(cleanBarcode);
            const product = await productService.getProductByBarcode(cleanBarcode);

            const needsPharma = shouldPromptForBatch(cleanBarcode, consolidatedHistory || [], settings) && (mm === undefined);
            if (needsPharma) {
                const existing = itemsRef.current.find(i => normalizeSku(i.barcode) === normBarcode);
                engine.actions.updateActiveItem(cleanBarcode, product || null, existing?.totalQuantity || 0, 0);
                dispatch({ type: 'PRODUCT_RESOLVED', needsPharma: true });
                return;
            }
            dispatch({ type: 'PRODUCT_RESOLVED', needsPharma: false });

            const existing = itemsRef.current.find(i => normalizeSku(i.barcode) === normBarcode);
            const newTotal = engine.actions.updateActiveItem(cleanBarcode, product || null, existing?.totalQuantity || 0, qty);

            await sessionService.addScanEvent(sessionId, cleanBarcode, qty, mm, yyyy, currentLocation);
            
            dispatch({ type: 'COMMIT_COMPLETE' });
            if (settings.ttsEnabled && qty > 0) SoundFX.speak(`${newTotal}`);
        } catch (err) {
            dispatch({ type: 'ERROR_OCCURRED' });
            engine.actions.triggerFeedback('error');
        }
    }, [sessionId, settings, engine, currentLocation, consolidatedHistory, machineState]);

    return {
        state: { 
            isLoading: session === undefined,
            status: machineState.toLowerCase(),
            feedback: engine.feedback,
            multiplier: engine.multiplier,
            currentLocation,
            activeBarcode: engine.activeBarcode,
            activeProduct: engine.activeProduct,
            optimisticQty: engine.optimisticQty
        },
        sessionData: { session, history: consolidatedHistory || [] },
        actions: { 
            setMultiplier: engine.setMultiplier,
            setCurrentLocation, 
            handleExternalScan: finalizeScanPipeline,
            selectItem: async (b: string) => { 
                const norm = normalizeSku(b);
                const existing = itemsRef.current.find(i => normalizeSku(i.barcode) === norm);
                const product = await productService.getProductByBarcode(b);
                engine.actions.updateActiveItem(b, product || null, existing?.totalQuantity || 0, 0);
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
