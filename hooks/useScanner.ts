
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import * as productService from '../services/productService';
import { predictIdealLocation } from '../services/slottingService';
import { sanitizeBarcode } from '../services/utils';
import { SoundFX } from '../services/audio';
import { getSettings } from '../services/settings';
import { CountingSession, ScannerStatus, ConsolidatedItem, ExpectedOrder } from '../types';
import { useFeedbackSystem, FeedbackStatus } from './useFeedbackSystem';
import { aggregateScans } from '../services/aggregator';
import { calculateOrderMatch } from '../services/matcher';

export type ScannerFeedback = FeedbackStatus; 

export const useScanner = (session: CountingSession, onFinish: () => void, onDiscard?: () => void) => {
    const settings = useMemo(() => getSettings(), []);
    const { feedback, trigger } = useFeedbackSystem(150);
    
    const [status, setStatus] = useState<ScannerStatus>('idle');
    const [manualInput, setManualInput] = useState('');
    const [multiplier, setMultiplier] = useState(1);
    const [currentLocation, setCurrentLocation] = useState('BODEGA_GRAL'); 
    const [aiLocationSuggestion, setAiLocationSuggestion] = useState<string | null>(null);
    
    const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
    const [activeBatch, setActiveBatch] = useState<string | null>(null);
    const [optimisticQty, setOptimisticQty] = useState<number | null>(null);

    const [rememberedDate, setRememberedDate] = useState<{mm: number, yyyy: number, batch: string} | null>(null);
    const [deducedOrder, setDeducedOrder] = useState<ExpectedOrder | null>(null);
    const [isDeducing, setIsDeducing] = useState(false);
    const [hasOrdersInDb, setHasOrdersInDb] = useState<boolean | null>(null);

    const itemsRef = useRef<ConsolidatedItem[]>([]);

    useEffect(() => {
        db.expectedOrders.count().then(count => setHasOrdersInDb(count > 0));
    }, []);

    const currentSessionData = useLiveQuery(() => db.sessions.get(session.id), [session.id]);
    const activeExpectedItems = currentSessionData?.expectedItems || deducedOrder?.items || [];
    const isVerified = currentSessionData?.isVerifiedMode || !!deducedOrder;

    const consolidatedHistory = useLiveQuery(async () => {
        const scans = await db.scans.where('sessionId').equals(session.id).toArray();
        const physicalItems = await aggregateScans(scans);
        
        let finalItems: ConsolidatedItem[] = [...physicalItems];

        if (isVerified && activeExpectedItems.length > 0) {
            const scannedBarcodes = new Set(physicalItems.map(i => i.barcode));
            activeExpectedItems.forEach(expected => {
                if (!scannedBarcodes.has(expected.barcode)) {
                    finalItems.push({
                        barcode: expected.barcode,
                        productName: expected.name,
                        totalQuantity: 0,
                        expectedQuantity: expected.expectedQty,
                        scans: 0,
                        location: 'PENDIENTE',
                        isIncident: false
                    });
                } else {
                    const idx = finalItems.findIndex(fi => fi.barcode === expected.barcode);
                    if (idx !== -1) finalItems[idx].expectedQuantity = expected.expectedQty;
                }
            });
        }

        const sorted = finalItems.sort((a, b) => {
            if (a.barcode === activeBarcode) return -1;
            if (b.barcode === activeBarcode) return 1;
            if (a.scans > 0 && b.scans === 0) return -1;
            if (b.scans > 0 && a.scans === 0) return 1;
            return a.productName.localeCompare(b.productName);
        });

        itemsRef.current = sorted;
        return sorted;
    }, [session.id, isVerified, activeExpectedItems, activeBarcode, feedback]);

    // MOTOR DETECTIVE
    useEffect(() => {
        const isActuallySearching = currentSessionData?.erpOrder?.includes('BUSCANDO') || !currentSessionData?.isVerifiedMode;
        if (!isActuallySearching || deducedOrder || !consolidatedHistory || !hasOrdersInDb) return;
        
        const physicalPicks = consolidatedHistory.filter(i => i.totalQuantity > 0);
        if (physicalPicks.length < 1) return;

        const runDeduction = async () => {
            setIsDeducing(true);
            const allExpected = await db.expectedOrders.toArray();
            let bestMatch: any = null;

            for (const order of allExpected) {
                const match = calculateOrderMatch(physicalPicks, order);
                if (match.matchScore > 85) { 
                    if (!bestMatch || match.matchScore > bestMatch.matchScore) {
                        bestMatch = match;
                    }
                }
            }

            if (bestMatch && bestMatch.matchScore > 92) {
                setDeducedOrder(bestMatch.expectedOrder);
                await db.sessions.update(session.id, {
                    erpOrder: bestMatch.expectedOrder.internalId,
                    expectedItems: bestMatch.expectedOrder.items,
                    isVerifiedMode: true,
                    auditStatus: 'pending'
                });
                SoundFX.play('success');
            }
            setIsDeducing(false);
        };

        const timer = setTimeout(runDeduction, 1500);
        return () => clearTimeout(timer);
    }, [consolidatedHistory, currentSessionData, deducedOrder, hasOrdersInDb]);

    const globalStats = useMemo(() => {
        if (!consolidatedHistory) return { progress: 0, totalUnits: 0, totalExpected: 0 };
        const units = consolidatedHistory.reduce((acc, i) => acc + i.totalQuantity, 0);
        const expected = activeExpectedItems.reduce((acc, i) => acc + i.expectedQty, 0) || 0;
        const progress = expected > 0 ? Math.min(100, (units / expected) * 100) : 0;
        return { progress, totalUnits: units, totalExpected: expected };
    }, [consolidatedHistory, activeExpectedItems]);

    const finalizeScanPipeline = useCallback(async (barcode: string, qty: number, mm?: number, yyyy?: number, batch?: string) => {
        try {
            const cleanBarcode = sanitizeBarcode(barcode);
            let product = await productService.getProductByBarcode(cleanBarcode);
            let isAutoRegistered = false;

            if (!product) {
                const expected = activeExpectedItems.find(ei => ei.barcode === cleanBarcode);
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

            // --- IA SLOTTING INVOCATION ---
            if (qty > 0 && product && currentLocation === 'BODEGA_GRAL') {
                predictIdealLocation(product).then(suggestion => {
                    if (suggestion) setAiLocationSuggestion(suggestion);
                });
            }

            let finalMM = mm;
            let finalYYYY = yyyy;
            let finalBatch = batch;

            if (!finalMM && rememberedDate && rememberedDate.batch === batch) {
                finalMM = rememberedDate.mm;
                finalYYYY = rememberedDate.yyyy;
            }

            const existingInList = itemsRef.current.find(i => i.barcode === cleanBarcode);
            const currentTotal = existingInList?.totalQuantity || 0;
            const newTotal = Math.max(0, currentTotal + qty);

            setOptimisticQty(newTotal);
            setActiveBarcode(cleanBarcode);
            setActiveBatch(finalBatch || null);
            
            await sessionService.addScanEvent(session.id, cleanBarcode, qty, finalMM, finalYYYY, currentLocation, finalBatch);

            trigger(qty > 0 ? (isAutoRegistered ? 'unknown' : 'success') : 'undo', { 
                sound: qty > 0 ? (qty > 1 ? 'increment' : 'success') : 'delete'
            });

            if (settings.ttsEnabled && qty > 0) SoundFX.speak(`${newTotal}`);
        } catch (err) {
            trigger('error');
        }
    }, [session.id, activeExpectedItems, settings, trigger, currentLocation, rememberedDate]);

    const handleInboundScan = useCallback((rawBarcode: string, mm?: number, yyyy?: number, batch?: string, qtyOverride?: number) => {
        const barcode = sanitizeBarcode(rawBarcode);
        if (!barcode || barcode.length < 2) return;
        const qtyToApply = qtyOverride !== undefined ? qtyOverride : multiplier;
        if (qtyOverride === undefined) setMultiplier(1); 
        finalizeScanPipeline(barcode, qtyToApply, mm, yyyy, batch);
    }, [multiplier, finalizeScanPipeline]);

    const lastScannedItem = useMemo(() => {
        if (!activeBarcode) return undefined;
        const realItem = consolidatedHistory?.find(i => i.barcode === activeBarcode);
        const qtyToShow = optimisticQty !== null ? optimisticQty : (realItem?.totalQuantity || 0);
        return realItem ? { ...realItem, totalQuantity: qtyToShow } : { barcode: activeBarcode, productName: '...', totalQuantity: qtyToShow, scans: 1 } as any;
    }, [consolidatedHistory, activeBarcode, optimisticQty]);

    return {
        state: { 
            status, setStatus, feedback, manualInput, setManualInput, multiplier, setMultiplier,
            currentLocation, setCurrentLocation,
            aiLocationSuggestion, setAiLocationSuggestion,
            optimisticActiveQty: optimisticQty || 0,
            activeBarcode,
            globalStats,
            rememberedDate,
            isDeducing,
            hasOrdersInDb,
            deducedErp: currentSessionData?.erpOrder
        },
        data: { 
            lastScan: lastScannedItem, 
            recentScans: consolidatedHistory 
        },
        actions: { 
            handleExternalScan: handleInboundScan,
            selectItem: (b: string) => { setActiveBarcode(b); setOptimisticQty(itemsRef.current.find(i => i.barcode === b)?.totalQuantity || 0); },
            setRememberedDate: (val: any) => setRememberedDate(val),
            changeLogisticsLabel: (label: string) => sessionService.updateSessionLabel(session.id, label),
            handleQuantityChange: (barcode: string, qty: number, batch?: string) => finalizeScanPipeline(barcode, qty, undefined, undefined, batch),
            handleDeleteProduct: async (barcode: string, batch?: string) => {
                await sessionService.deleteSessionItemByBatch(session.id, barcode, batch);
                if (activeBarcode === barcode) setActiveBarcode(null);
                trigger('undo');
            }
        }
    };
};
