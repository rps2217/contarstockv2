
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

            // BUSCAR ATRIBUTOS EXISTENTES (FECHA) PARA EVITAR DUPLICIDAD
            // Si el usuario no pasó fecha, la heredamos del registro ya existente en la lista
            let finalMM = mm;
            let finalYYYY = yyyy;

            const existingInList = itemsRef.current.find(i => i.barcode === barcode);
            if (!finalMM && existingInList?.mm) {
                finalMM = existingInList.mm;
                finalYYYY = existingInList.yyyy;
            }

            // ACTUALIZACIÓN OPTIMISTA ACUMULATIVA (Fix: Botón Restar/Sumar rápido)
            setOptimisticQty(prev => {
                const currentTotal = existingInList?.totalQuantity || 0;
                const base = prev !== null ? prev : currentTotal;
                return Math.max(0, base + qty);
            });
            
            setActiveBarcode(barcode);
            
            // Persistencia en DB
            await sessionService.addScanEvent(
                session.id, 
                barcode, 
                qty, 
                finalMM, 
                finalYYYY, 
                currentLocation
            );

            if (qty > 0) {
                trigger(isAutoRegistered ? 'unknown' : 'success', { sound: qty > 1 ? 'increment' : 'success' });
            } else {
                trigger('undo', { sound: 'delete' });
            }

            if (settings.ttsEnabled && qty > 0) {
                const totalCalculado = (existingInList?.totalQuantity || 0) + qty;
                const ttsText = settings.ttsMode === 'count' 
                    ? `${totalCalculado}` 
                    : `${product.name.substring(0, 20)}, ${totalCalculado}`;
                SoundFX.speak(ttsText);
            }

        } catch (err) {
            trigger('error');
        }
    }, [session.id, settings, trigger, currentLocation]);

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
        
        // El visor siempre prioriza la cantidad optimista (rápida) sobre la real (lenta de DB)
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
            optimisticActiveQty: optimisticQty || 0
        },
        data: { 
            lastScan: lastScannedItem, 
            recentScans: consolidatedHistory 
        },
        actions: { 
            handleExternalScan: handleInboundScan,
            selectItem,
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
