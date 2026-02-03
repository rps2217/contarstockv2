
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import * as productService from '../services/productService';
import { sanitizeBarcode } from '../services/utils';
import { SoundFX } from '../services/audio';
import { getSettings } from '../services/settings';
import { CountingSession, Product, ScannerStatus, ScanRecord, ConsolidatedItem } from '../types';
import { Dexie } from 'dexie';
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

    // QUERY CONSOLIDADA: Igual que en modo Martillo
    const consolidatedHistory = useLiveQuery(async () => {
        const scans = await db.scans.where('sessionId').equals(session.id).toArray();
        const items = await aggregateScans(scans);
        
        // Ordenar: Primero el activo, luego por orden de último escaneo/entrada
        const sorted = items.sort((a, b) => {
            if (a.barcode === activeBarcode) return -1;
            if (b.barcode === activeBarcode) return 1;
            return 0; // Se podría añadir un timestamp al agregador para mayor precisión
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

            // Actualizar Estado de HUD
            setActiveBarcode(barcode);
            const currentTotal = itemsRef.current.find(i => i.barcode === barcode)?.totalQuantity || 0;
            setOptimisticQty(Math.max(0, currentTotal + qty));
            
            // Persistir en DB
            await sessionService.addScanEvent(
                session.id, 
                barcode, 
                qty, 
                mm, 
                yyyy, 
                currentLocation
            );

            if (qty > 0) {
                trigger(isAutoRegistered ? 'unknown' : 'success', { sound: qty > 1 ? 'increment' : 'success' });
            } else {
                trigger('undo', { sound: 'delete' });
            }

            if (settings.ttsEnabled && qty > 0) {
                const ttsText = settings.ttsMode === 'count' 
                    ? `${currentTotal + qty}` 
                    : `${product.name.substring(0, 20)}, ${currentTotal + qty}`;
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
        if (!realItem && optimisticQty !== null) {
            return { barcode: activeBarcode, productName: 'PROCESANDO...', totalQuantity: optimisticQty, scans: 1 } as any;
        }
        return realItem ? { ...realItem, totalQuantity: optimisticQty ?? realItem.totalQuantity } : undefined;
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
            handleQuantityChange: (barcode: string, qty: number) => handleInboundScan(barcode, undefined, undefined, qty),
            handleDeleteProduct: async (barcode: string) => {
                await sessionService.deleteSessionItem(session.id, barcode);
                if (activeBarcode === barcode) { setActiveBarcode(null); setOptimisticQty(null); }
                trigger('undo');
            },
            handleDiscard: () => { if (confirm("¿DESCARTAR SESIÓN?")) onDiscard?.(); }
        }
    };
};
