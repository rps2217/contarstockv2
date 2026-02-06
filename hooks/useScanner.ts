
import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import * as productService from '../services/productService';
import { predictIdealLocation } from '../services/slottingService';
import { sanitizeBarcode, normalizeSku } from '../services/utils';
import { SoundFX } from '../services/audio';
import { getSettings } from '../services/settings';
import { CountingSession, ScannerStatus, ConsolidatedItem, ExpectedOrder, Product } from '../types';
import { useFeedbackSystem, FeedbackStatus } from './useFeedbackSystem';
import { aggregateScans } from '../services/aggregator';
import { shouldPromptForBatch } from '../services/uiLogic';
import { scannerReducer, ScannerState } from '../services/scannerMachine';

export const useScanner = (session: CountingSession, onFinish: () => void) => {
    const settings = useMemo(() => getSettings(), []);
    const { feedback, trigger } = useFeedbackSystem(200);
    const [machineState, dispatch] = useReducer(scannerReducer, 'IDLE');
    
    const [multiplier, setMultiplier] = useState(1);
    const [currentLocation, setCurrentLocation] = useState('BODEGA_GRAL'); 
    const [aiLocationSuggestion, setAiLocationSuggestion] = useState<string | null>(null);
    const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
    const [optimisticQty, setOptimisticQty] = useState<number | null>(null);
    const [rememberedDate, setRememberedDate] = useState<{mm: number, yyyy: number, batch: string} | null>(null);
    const [deducedOrder, setDeducedOrder] = useState<ExpectedOrder | null>(null);
    const [isDeducing, setIsDeducing] = useState(false);
    
    // RADAR SEMÁNTICO STATE
    const [semanticNeighbors, setSemanticNeighbors] = useState<Product[]>([]);
    const workerRef = useRef<Worker | null>(null);

    const itemsRef = useRef<ConsolidatedItem[]>([]);
    const currentSessionData = useLiveQuery(() => db.sessions.get(session.id), [session.id]);
    
    const activeExpectedItems = useMemo(() => {
        return currentSessionData?.expectedItems || deducedOrder?.items || [];
    }, [currentSessionData?.expectedItems, deducedOrder?.items]);

    const isVerified = !!(currentSessionData?.isVerifiedMode || deducedOrder);

    const consolidatedHistory = useLiveQuery(async () => {
        const scans = await db.scans.where('sessionId').equals(session.id).toArray();
        const physicalItems = await aggregateScans(scans);
        
        const expectedMap = new Map<string, number>();
        activeExpectedItems.forEach(ei => {
            expectedMap.set(normalizeSku(ei.barcode), ei.expectedQty);
        });

        let finalItems: ConsolidatedItem[] = physicalItems.map(pi => ({
            ...pi,
            expectedQuantity: expectedMap.get(normalizeSku(pi.barcode)) || 0
        }));

        if (isVerified && activeExpectedItems.length > 0) {
            const scannedBarcodes = new Set(physicalItems.map(pi => normalizeSku(pi.barcode)));
            activeExpectedItems.forEach(expected => {
                const normExpected = normalizeSku(expected.barcode);
                if (!scannedBarcodes.has(normExpected)) {
                    finalItems.push({
                        barcode: expected.barcode,
                        productName: expected.name,
                        totalQuantity: 0,
                        expectedQuantity: expected.expectedQty,
                        scans: 0,
                        location: 'GUÍA',
                        isIncident: false
                    });
                }
            });
        }

        const sorted = finalItems.sort((a, b) => {
            const normA = normalizeSku(a.barcode);
            const normB = normalizeSku(b.barcode);
            if (normA === activeBarcode) return -1;
            if (normB === activeBarcode) return 1;
            if (a.totalQuantity > 0 && b.totalQuantity === 0) return -1;
            if (b.totalQuantity > 0 && a.totalQuantity === 0) return 1;
            return a.productName.localeCompare(b.productName);
        });

        itemsRef.current = sorted;
        return sorted;
    }, [session.id, isVerified, activeExpectedItems, activeBarcode, feedback]);

    // EFECTO: ACTIVAR RADAR CUANDO CAMBIA EL PRODUCTO ACTIVO
    useEffect(() => {
        if (!activeBarcode) return;
        
        const triggerRadar = async () => {
            const product = await productService.getProductByBarcode(activeBarcode);
            if (product?.embedding) {
                if (!workerRef.current) {
                    workerRef.current = new Worker(new URL('../workers/detective.worker.ts', import.meta.url), { type: 'module' });
                }
                const catalog = await db.products.toArray();
                workerRef.current.postMessage({ 
                    action: 'GET_SEMANTIC_NEIGHBORS', 
                    targetEmbedding: product.embedding,
                    catalog 
                });
                workerRef.current.onmessage = (e) => {
                    if (e.data.success && e.data.action === 'GET_SEMANTIC_NEIGHBORS') {
                        setSemanticNeighbors(e.data.neighbors);
                    }
                };
            } else {
                setSemanticNeighbors([]);
            }
        };
        triggerRadar();
    }, [activeBarcode]);

    useEffect(() => {
        if (machineState === 'FEEDBACK_SUCCESS' || machineState === 'FEEDBACK_ERROR') {
            const timer = setTimeout(() => dispatch({ type: 'RESET' }), 200);
            return () => clearTimeout(timer);
        }
    }, [machineState]);

    const finalizeScanPipeline = useCallback(async (barcode: string, qty: number, mm?: number, yyyy?: number, batch?: string) => {
        if (machineState !== 'IDLE' && machineState !== 'LOOKING_UP' && machineState !== 'COMMITTING' && machineState !== 'MANUAL_ENTRY') {
            return;
        }
        dispatch({ type: 'SCAN_INBOUND', barcode });
        try {
            const cleanBarcode = sanitizeBarcode(barcode);
            const normBarcode = normalizeSku(cleanBarcode);
            const needsPharma = shouldPromptForBatch(cleanBarcode, consolidatedHistory || [], settings) && (mm === undefined);
            dispatch({ type: 'PRODUCT_RESOLVED', needsPharma });
            if (needsPharma) {
                setActiveBarcode(normBarcode);
                return;
            }
            let product = await productService.getProductByBarcode(cleanBarcode);
            let isAutoRegistered = false;
            if (!product) {
                const expected = activeExpectedItems.find(ei => normalizeSku(ei.barcode) === normBarcode);
                if (expected) {
                    product = { barcode: cleanBarcode, name: expected.name, category: 'VERIFICADO' };
                } else if (settings.autoRegisterUnknown) {
                    product = { barcode: cleanBarcode, name: `NUEVO_ITEM - ${cleanBarcode}`, category: 'GENERAL', syncStatus: 'add' };
                    await productService.saveProduct(product);
                    isAutoRegistered = true;
                } else {
                    product = { barcode: cleanBarcode, name: 'DESCONOCIDO', category: 'N/A' };
                }
            }
            if (qty > 0 && product && currentLocation === 'BODEGA_GRAL') {
                predictIdealLocation(product).then(suggestion => {
                    if (suggestion) setAiLocationSuggestion(suggestion);
                });
            }
            const isSameSkuAsRemembered = rememberedDate && normBarcode === activeBarcode;
            const finalMM = mm || (isSameSkuAsRemembered ? rememberedDate.mm : undefined);
            const finalYYYY = yyyy || (isSameSkuAsRemembered ? rememberedDate.yyyy : undefined);
            const finalBatch = batch || (isSameSkuAsRemembered ? rememberedDate.batch : undefined);
            const existingInList = itemsRef.current.find(i => normalizeSku(i.barcode) === normBarcode);
            const currentTotal = existingInList?.totalQuantity || 0;
            const newTotal = Math.max(0, currentTotal + qty);
            setOptimisticQty(newTotal);
            setActiveBarcode(normBarcode);
            await sessionService.addScanEvent(session.id, cleanBarcode, qty, finalMM, finalYYYY, currentLocation, finalBatch);
            dispatch({ type: 'COMMIT_COMPLETE' });
            trigger(qty > 0 ? (isAutoRegistered ? 'unknown' : 'success') : 'undo');
            if (settings.ttsEnabled && qty > 0) SoundFX.speak(`${newTotal}`);
        } catch (err) {
            dispatch({ type: 'ERROR_OCCURRED' });
            trigger('error');
        }
    }, [session.id, activeExpectedItems, settings, trigger, currentLocation, rememberedDate, activeBarcode, consolidatedHistory, machineState]);

    return {
        state: { 
            machineState,
            status: machineState.toLowerCase() as ScannerStatus,
            setStatus: (s: ScannerStatus) => {
                if (s === 'manual') dispatch({ type: 'OPEN_MANUAL' });
                else if (s === 'confirming') dispatch({ type: 'TRIGGER_CLOSE' });
                else if (s === 'idle') dispatch({ type: 'RESET' });
            },
            feedback, multiplier, setMultiplier,
            currentLocation, setCurrentLocation,
            aiLocationSuggestion, setAiLocationSuggestion,
            semanticNeighbors,
            optimisticActiveQty: optimisticQty || 0,
            activeBarcode,
            rememberedDate,
            isDeducing,
            deducedErp: deducedOrder?.internalId || currentSessionData?.erpOrder
        },
        data: { 
            lastScan: useMemo(() => {
                if (!activeBarcode) return undefined;
                const realItem = consolidatedHistory?.find(i => normalizeSku(i.barcode) === activeBarcode);
                const qtyToShow = (optimisticQty !== null && activeBarcode === normalizeSku(realItem?.barcode || '')) ? optimisticQty : (realItem?.totalQuantity || 0);
                return realItem ? { ...realItem, totalQuantity: qtyToShow } : { barcode: activeBarcode, productName: '...', totalQuantity: qtyToShow, scans: 1 } as any;
            }, [consolidatedHistory, activeBarcode, optimisticQty]),
            recentScans: consolidatedHistory 
        },
        actions: { 
            handleExternalScan: finalizeScanPipeline,
            selectItem: (b: string) => { 
                const norm = normalizeSku(b);
                setActiveBarcode(norm); 
                const existing = itemsRef.current.find(i => normalizeSku(i.barcode) === norm);
                setOptimisticQty(existing?.totalQuantity || 0); 
            },
            setRememberedDate: (val: any) => setRememberedDate(val),
            handlePharmaComplete: (m?: number, y?: number, b?: string) => {
                if (activeBarcode) {
                    dispatch({ type: 'PHARMA_COMPLETE', mm: m, yyyy: y, batch: b });
                    finalizeScanPipeline(activeBarcode, multiplier, m, y, b);
                }
            },
            cancelPharma: () => dispatch({ type: 'RESET' }),
            handleDeleteProduct: async (barcode: string, batch?: string) => {
                await sessionService.deleteSessionItemByBatch(session.id, barcode, batch);
                if (activeBarcode === normalizeSku(barcode)) setActiveBarcode(null);
                trigger('undo');
            }
        }
    };
};
