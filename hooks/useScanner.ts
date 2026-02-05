
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
    const [activeBatch, setActiveBatch] = useState<string | null>(null);
    const [optimisticQty, setOptimisticQty] = useState<number | null>(null);

    const [rememberedDate, setRememberedDate] = useState<{mm: number, yyyy: number, batch: string} | null>(null);

    const itemsRef = useRef<ConsolidatedItem[]>([]);

    // --- LÓGICA DE CONSOLIDACIÓN UNIFICADA (TEÓRICO + FÍSICO) ---
    const consolidatedHistory = useLiveQuery(async () => {
        const scans = await db.scans.where('sessionId').equals(session.id).toArray();
        const physicalItems = await aggregateScans(scans);
        
        let finalItems: ConsolidatedItem[] = [...physicalItems];

        // Si es verificado, inyectamos los esperados que aún no tienen escaneo
        if (session.isVerifiedMode && session.expectedItems) {
            const scannedBarcodes = new Set(physicalItems.map(i => i.barcode));
            
            session.expectedItems.forEach(expected => {
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
                }
            });
        }

        // Ordenamiento: El activo arriba, luego por último escaneo o por nombre si no hay escaneos
        const sorted = finalItems.sort((a, b) => {
            if (a.barcode === activeBarcode) return -1;
            if (b.barcode === activeBarcode) return 1;
            if (a.scans > 0 && b.scans === 0) return -1;
            if (b.scans > 0 && a.scans === 0) return 1;
            return a.productName.localeCompare(b.productName);
        });

        itemsRef.current = sorted;
        return sorted;
    }, [session.id, session.isVerifiedMode, session.expectedItems, activeBarcode, activeBatch, feedback]);

    const globalStats = useMemo(() => {
        if (!consolidatedHistory) return { progress: 0, totalUnits: 0, totalExpected: 0 };
        const units = consolidatedHistory.reduce((acc, i) => acc + i.totalQuantity, 0);
        const expected = session.expectedItems?.reduce((acc, i) => acc + i.expectedQty, 0) || 0;
        const progress = expected > 0 ? Math.min(100, (units / expected) * 100) : 0;
        return { progress, totalUnits: units, totalExpected: expected };
    }, [consolidatedHistory, session.expectedItems]);

    const finalizeScanPipeline = useCallback(async (barcode: string, qty: number, mm?: number, yyyy?: number, batch?: string) => {
        try {
            let product = await productService.getProductByBarcode(barcode);
            let isAutoRegistered = false;

            if (!product) {
                // Si es verificado, intentamos buscar en la lista de esperados del ERP
                const expected = session.expectedItems?.find(ei => ei.barcode === barcode);
                if (expected) {
                    product = { barcode, name: expected.name, category: 'VERIFICADO' };
                } else if (settings.autoRegisterUnknown) {
                    product = {
                        barcode,
                        name: `NUEVO_ITEM - ${barcode}`,
                        category: 'MEDICAMENTO',
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
            let finalBatch = batch;

            const existingInList = itemsRef.current.find(i => i.barcode === barcode && (batch ? i.batch === batch : true));
            
            if (!finalMM && rememberedDate && rememberedDate.batch === batch) {
                finalMM = rememberedDate.mm;
                finalYYYY = rememberedDate.yyyy;
                finalBatch = rememberedDate.batch;
            } else if (!finalMM && existingInList) {
                finalMM = existingInList.mm;
                finalYYYY = existingInList.yyyy;
                finalBatch = existingInList.batch;
            }

            const currentTotal = existingInList?.totalQuantity || 0;
            const newTotal = Math.max(0, (activeBarcode === barcode && activeBatch === batch ? (optimisticQty ?? currentTotal) : currentTotal) + qty);

            setOptimisticQty(newTotal);
            setActiveBarcode(barcode);
            setActiveBatch(finalBatch || null);
            
            await sessionService.addScanEvent(
                session.id, 
                barcode, 
                qty, 
                finalMM, 
                finalYYYY, 
                currentLocation,
                finalBatch
            );

            if (qty > 0) {
                trigger(isAutoRegistered ? 'unknown' : 'success', { 
                    sound: qty > 1 ? 'increment' : 'success',
                    vibration: qty > 1 ? 25 : 40
                });
            } else {
                trigger('undo', { sound: 'delete', vibration: [20, 20] });
            }

            if (settings.ttsEnabled && qty > 0) {
                SoundFX.speak(`${newTotal}`);
            }

        } catch (err) {
            trigger('error');
        }
    }, [session.id, session.expectedItems, settings, trigger, currentLocation, activeBarcode, activeBatch, optimisticQty, rememberedDate]);

    const handleInboundScan = useCallback((rawBarcode: string, mm?: number, yyyy?: number, batch?: string, qtyOverride?: number) => {
        const barcode = sanitizeBarcode(rawBarcode);
        if (!barcode || barcode.length < 2) return;
        const qtyToApply = qtyOverride !== undefined ? qtyOverride : multiplier;
        if (qtyOverride === undefined) setMultiplier(1); 
        finalizeScanPipeline(barcode, qtyToApply, mm, yyyy, batch);
    }, [multiplier, finalizeScanPipeline]);

    const selectItem = useCallback((barcode: string, batch?: string) => {
        setActiveBarcode(barcode);
        setActiveBatch(batch || null);
        const item = itemsRef.current.find(i => i.barcode === barcode && (batch ? i.batch === batch : true));
        setOptimisticQty(item?.totalQuantity || 0);
        if (navigator.vibrate) navigator.vibrate(10);
    }, []);

    const lastScannedItem = useMemo(() => {
        if (!activeBarcode) return undefined;
        const realItem = consolidatedHistory?.find(i => i.barcode === activeBarcode && (activeBatch ? i.batch === activeBatch : true));
        const qtyToShow = optimisticQty !== null ? optimisticQty : (realItem?.totalQuantity || 0);

        if (!realItem && optimisticQty !== null) {
            return { 
                barcode: activeBarcode, 
                productName: 'REGISTRANDO...', 
                batch: activeBatch || undefined,
                totalQuantity: qtyToShow, 
                scans: 1 
            } as any;
        }
        return realItem ? { ...realItem, totalQuantity: qtyToShow } : undefined;
    }, [consolidatedHistory, activeBarcode, activeBatch, optimisticQty]);

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
            setRememberedDate: (val: any) => setRememberedDate(val),
            changeLogisticsLabel: (label: string) => sessionService.updateSessionLabel(session.id, label),
            handleQuantityChange: (barcode: string, qty: number, batch?: string) => finalizeScanPipeline(barcode, qty, undefined, undefined, batch),
            handleDeleteProduct: async (barcode: string, batch?: string) => {
                await sessionService.deleteSessionItemByBatch(session.id, barcode, batch);
                if (activeBarcode === barcode && (batch ? activeBatch === batch : true)) { 
                    setActiveBarcode(null); 
                    setOptimisticQty(null); 
                }
                trigger('undo');
            }
        }
    };
};
