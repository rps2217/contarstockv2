
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import * as productService from '../services/productService';
import { predictIdealLocation } from '../services/slottingService';
import { sanitizeBarcode, normalizeSku } from '../services/utils';
import { SoundFX } from '../services/audio';
import { getSettings } from '../services/settings';
import { CountingSession, ScannerStatus, ConsolidatedItem, ExpectedOrder } from '../types';
import { useFeedbackSystem, FeedbackStatus } from './useFeedbackSystem';
import { aggregateScans } from '../services/aggregator';
import { calculateOrderMatch } from '../services/matcher';

export type ScannerFeedback = FeedbackStatus; 

export const useScanner = (session: CountingSession, onFinish: () => void) => {
    const settings = useMemo(() => getSettings(), []);
    const { feedback, trigger } = useFeedbackSystem(150);
    
    const [status, setStatus] = useState<ScannerStatus>('idle');
    const [manualInput, setManualInput] = useState('');
    const [multiplier, setMultiplier] = useState(1);
    const [currentLocation, setCurrentLocation] = useState('BODEGA_GRAL'); 
    const [aiLocationSuggestion, setAiLocationSuggestion] = useState<string | null>(null);
    
    const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
    const [optimisticQty, setOptimisticQty] = useState<number | null>(null);

    const [rememberedDate, setRememberedDate] = useState<{mm: number, yyyy: number, batch: string} | null>(null);
    const [deducedOrder, setDeducedOrder] = useState<ExpectedOrder | null>(null);
    const [isDeducing, setIsDeducing] = useState(false);

    const itemsRef = useRef<ConsolidatedItem[]>([]);

    const currentSessionData = useLiveQuery(() => db.sessions.get(session.id), [session.id]);
    
    const activeExpectedItems = useMemo(() => {
        return currentSessionData?.expectedItems || deducedOrder?.items || [];
    }, [currentSessionData?.expectedItems, deducedOrder?.items]);

    const isVerified = currentSessionData?.isVerifiedMode || !!deducedOrder;

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

    const finalizeScanPipeline = useCallback(async (barcode: string, qty: number, mm?: number, yyyy?: number, batch?: string) => {
        try {
            const cleanBarcode = sanitizeBarcode(barcode);
            const normBarcode = normalizeSku(cleanBarcode);
            
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

            const finalMM = mm || rememberedDate?.mm;
            const finalYYYY = yyyy || rememberedDate?.yyyy;
            const finalBatch = batch || rememberedDate?.batch;

            const existingInList = itemsRef.current.find(i => normalizeSku(i.barcode) === normBarcode);
            const currentTotal = existingInList?.totalQuantity || 0;
            const newTotal = Math.max(0, currentTotal + qty);

            setOptimisticQty(newTotal);
            setActiveBarcode(normBarcode);
            
            await sessionService.addScanEvent(session.id, cleanBarcode, qty, finalMM, finalYYYY, currentLocation, finalBatch);

            trigger(qty > 0 ? (isAutoRegistered ? 'unknown' : 'success') : 'undo');
            if (settings.ttsEnabled && qty > 0) SoundFX.speak(`${newTotal}`);
        } catch (err) {
            trigger('error');
        }
    }, [session.id, activeExpectedItems, settings, trigger, currentLocation, rememberedDate]);

    const handleInboundScan = useCallback((rawBarcode: string, qtyOverride?: number, mm?: number, yyyy?: number, batch?: string) => {
        const barcode = sanitizeBarcode(rawBarcode);
        if (!barcode || barcode.length < 2) return;
        const qtyToApply = qtyOverride !== undefined ? qtyOverride : multiplier;
        if (qtyOverride === undefined) setMultiplier(1); 
        finalizeScanPipeline(barcode, qtyToApply, mm, yyyy, batch);
    }, [multiplier, finalizeScanPipeline]);

    return {
        state: { 
            status, setStatus, feedback, manualInput, setManualInput, multiplier, setMultiplier,
            currentLocation, setCurrentLocation,
            aiLocationSuggestion, setAiLocationSuggestion,
            optimisticActiveQty: optimisticQty || 0,
            activeBarcode,
            rememberedDate,
            isDeducing,
            deducedErp: currentSessionData?.erpOrder
        },
        data: { 
            lastScan: useMemo(() => {
                if (!activeBarcode) return undefined;
                const realItem = consolidatedHistory?.find(i => normalizeSku(i.barcode) === activeBarcode);
                const qtyToShow = optimisticQty !== null ? optimisticQty : (realItem?.totalQuantity || 0);
                return realItem ? { ...realItem, totalQuantity: qtyToShow } : { barcode: activeBarcode, productName: '...', totalQuantity: qtyToShow, scans: 1 } as any;
            }, [consolidatedHistory, activeBarcode, optimisticQty]),
            recentScans: consolidatedHistory 
        },
        actions: { 
            handleExternalScan: handleInboundScan,
            selectItem: (b: string) => { 
                const norm = normalizeSku(b);
                setActiveBarcode(norm); 
                setOptimisticQty(itemsRef.current.find(i => normalizeSku(i.barcode) === norm)?.totalQuantity || 0); 
            },
            setRememberedDate: (val: any) => setRememberedDate(val),
            changeLogisticsLabel: (label: string) => sessionService.updateSessionLabel(session.id, label),
            handleQuantityChange: (barcode: string, qty: number, batch?: string) => finalizeScanPipeline(barcode, qty, undefined, undefined, batch),
            handleDeleteProduct: async (barcode: string, batch?: string) => {
                await sessionService.deleteSessionItemByBatch(session.id, barcode, batch);
                if (activeBarcode === normalizeSku(barcode)) setActiveBarcode(null);
                trigger('undo');
            }
        }
    };
};
