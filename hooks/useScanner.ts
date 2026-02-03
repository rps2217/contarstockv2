
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import * as productService from '../services/productService';
import { sanitizeBarcode } from '../services/utils';
import { SoundFX } from '../services/audio';
import { getSettings } from '../services/settings';
import { CountingSession, Product, ScannerStatus, ScanRecord, ConsolidatedItem } from '../types';
import { useFeedbackSystem, FeedbackStatus } from './useFeedbackSystem';
import { aggregateScans } from '../services/aggregator';

export type ScannerFeedback = FeedbackStatus; 

export const useScanner = (session: CountingSession, onFinish: () => void, onDiscard?: () => void) => {
    const settings = useMemo(() => getSettings(), []);
    const { feedback, trigger } = useFeedbackSystem(150);
    
    const [status, setStatus] = useState<ScannerStatus>('idle');
    const [manualInput, setManualInput] = useState('');
    const [multiplier, setMultiplier] = useState(1);
    const [currentLocation, setCurrentLocation] = useState('BODEGA_GRAL'); 
    
    const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
    const [optimisticQty, setOptimisticQty] = useState<number | null>(null);

    // Memoria de fecha para escaneo continuo
    const [rememberedDate, setRememberedDate] = useState<{mm: number, yyyy: number} | null>(null);

    const itemsRef = useRef<ConsolidatedItem[]>([]);

    const consolidatedHistory = useLiveQuery(async () => {
        const scans = await db.scans.where('sessionId').equals(session.id).toArray();
        const items = await aggregateScans(scans);
        
        const sorted = items.sort((a, b) => {
            if (a.barcode === activeBarcode) return -1;
            if (b.barcode === activeBarcode) return 1;
            return 0;
        });

        itemsRef.current = sorted;
        return sorted;
    }, [session.id, activeBarcode, feedback]);

    // Cálculo de progreso global para el Header
    const globalStats = useMemo(() => {
        if (!consolidatedHistory) return { progress: 0, totalUnits: 0, totalExpected: 0 };
        const units = consolidatedHistory.reduce((acc, i) => acc + i.totalQuantity, 0);
        const expected = session.expectedItems?.reduce((acc, i) => acc + i.expectedQty, 0) || 0;
        const progress = expected > 0 ? Math.min(100, (units / expected) * 100) : 0;
        return { progress, totalUnits: units, totalExpected: expected };
    }, [consolidatedHistory, session.expectedItems]);

    const finalizeScanPipeline = useCallback(async (barcode: string, qty: number, mm?: number, yyyy?: number) => {
        try {
            let product = await productService.getProductByBarcode(barcode);
            let isAutoRegistered = false;

            if (!product) {
                if (settings.autoRegisterUnknown) {
                    product = {
                        barcode,
                        name: `PENDIENTE - ${barcode}`,
                        category: 'POR_CLASIFICAR',
                        syncStatus: 'add'
                    };
                    await productService.saveProduct(product);
                    isAutoRegistered = true;
                } else {
                    product = { barcode, name: 'DESCONOCIDO', category: 'N/A' };
                }
            }

            let finalMM = mm;
            let finalYYYY = yyyy;

            const existingInList = itemsRef.current.find(i => i.barcode === barcode);
            
            // Lógica Smart Expiry: 1. Propia del scan, 2. Recordada en sesión, 3. Existente en lista
            if (!finalMM) {
                if (rememberedDate) {
                    finalMM = rememberedDate.mm;
                    finalYYYY = rememberedDate.yyyy;
                } else if (existingInList?.mm) {
                    finalMM = existingInList.mm;
                    finalYYYY = existingInList.yyyy;
                }
            }

            const currentTotal = existingInList?.totalQuantity || 0;
            const newTotal = Math.max(0, (activeBarcode === barcode ? (optimisticQty ?? currentTotal) : currentTotal) + qty);

            setOptimisticQty(newTotal);
            setActiveBarcode(barcode);
            
            await sessionService.addScanEvent(
                session.id, 
                barcode, 
                qty, 
                finalMM, 
                finalYYYY, 
                currentLocation
            );

            // Feedback háptico diferenciado
            if (qty > 0) {
                const target = session.expectedItems?.find(i => i.barcode === barcode)?.expectedQty;
                const isGoalReached = target && newTotal === target;
                
                trigger(isAutoRegistered ? 'unknown' : 'success', { 
                    sound: isGoalReached ? 'success' : (qty > 1 ? 'increment' : 'success'),
                    vibration: isGoalReached ? [100, 50, 100] : (qty > 1 ? 25 : 40)
                });
            } else {
                trigger('undo', { sound: 'delete', vibration: [20, 20] });
            }

            if (settings.ttsEnabled && qty > 0) {
                const ttsText = settings.ttsMode === 'count' 
                    ? `${newTotal}` 
                    : `${product.name.substring(0, 20)}, ${newTotal}`;
                SoundFX.speak(ttsText);
            }

        } catch (err) {
            trigger('error');
        }
    }, [session.id, session.expectedItems, settings, trigger, currentLocation, activeBarcode, optimisticQty, rememberedDate]);

    const handleInboundScan = useCallback((rawBarcode: string, mm?: number, yyyy?: number, qtyOverride?: number) => {
        const barcode = sanitizeBarcode(rawBarcode);
        if (!barcode || barcode.length < 2) return;

        const qtyToApply = qtyOverride !== undefined ? qtyOverride : multiplier;
        if (qtyOverride === undefined) setMultiplier(1); 
        
        finalizeScanPipeline(barcode, qtyToApply, mm, yyyy);
    }, [multiplier, finalizeScanPipeline]);

    const selectItem = useCallback((barcode: string) => {
        setActiveBarcode(barcode);
        const item = itemsRef.current.find(i => i.barcode === barcode);
        setOptimisticQty(item?.totalQuantity || 0);
        if (navigator.vibrate) navigator.vibrate(10);
    }, []);

    const lastScannedItem = useMemo(() => {
        if (!activeBarcode) return undefined;
        const realItem = consolidatedHistory?.find(i => i.barcode === activeBarcode);
        const qtyToShow = optimisticQty !== null ? optimisticQty : (realItem?.totalQuantity || 0);

        if (!realItem && optimisticQty !== null) {
            return { 
                barcode: activeBarcode, 
                productName: 'PROCESANDO...', 
                totalQuantity: qtyToShow, 
                scans: 1 
            } as any;
        }
        return realItem ? { ...realItem, totalQuantity: qtyToShow } : undefined;
    }, [consolidatedHistory, activeBarcode, optimisticQty]);

    return {
        state: { 
            status, setStatus, feedback, manualInput, setManualInput, multiplier, setMultiplier,
            currentLocation, setCurrentLocation,
            optimisticActiveQty: optimisticQty || 0,
            activeBarcode,
            globalStats,
            rememberedDate
        },
        data: { 
            lastScan: lastScannedItem, 
            recentScans: consolidatedHistory 
        },
        actions: { 
            handleExternalScan: handleInboundScan,
            selectItem,
            setRememberedDate,
            handleQuantityChange: (barcode: string, qty: number) => finalizeScanPipeline(barcode, qty),
            handleDeleteProduct: async (barcode: string) => {
                await sessionService.deleteSessionItem(session.id, barcode);
                if (activeBarcode === barcode) { setActiveBarcode(null); setOptimisticQty(null); }
                trigger('undo');
            },
            handleDiscard: () => { if (confirm("¿DESCARTAR SESIÓN?")) onDiscard?.(); }
        }
    };
};
