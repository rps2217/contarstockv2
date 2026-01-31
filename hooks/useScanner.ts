
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import * as productService from '../services/productService';
import { sanitizeBarcode } from '../services/utils';
import { SoundFX } from '../services/audio';
import { getSettings } from '../services/settings';
import { CountingSession, Product, ScannerStatus, ScanRecord } from '../types';
import { Dexie } from 'dexie';
import { useHIDScanner } from './useHIDScanner';
import { useFeedbackSystem, FeedbackStatus } from './useFeedbackSystem';

export type ScannerFeedback = FeedbackStatus; 

export const useScanner = (session: CountingSession, onFinish: () => void, onDiscard?: () => void) => {
    const settings = useMemo(() => getSettings(), []);
    const { feedback, trigger } = useFeedbackSystem(250);
    
    const [status, setStatus] = useState<ScannerStatus>('idle');
    const [manualInput, setManualInput] = useState('');
    const [multiplier, setMultiplier] = useState(1);
    const [currentLocation, setCurrentLocation] = useState('BODEGA_GRAL'); // Nueva ubicación persistente
    
    const [currentScan, setCurrentScan] = useState<ScanRecord | null>(null);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [currentSkuTotal, setCurrentSkuTotal] = useState(0);

    const skuCounters = useRef<Map<string, number>>(new Map());
    const isLocked = useRef(false);

    const recentHistory = useLiveQuery(
        () => db.scans
            .where('[sessionId+timestamp]')
            .between([session.id, Dexie.minKey], [session.id, Dexie.maxKey], true, true)
            .reverse()
            .limit(15)
            .toArray(), 
        [session.id]
    );
    
    const sessionStats = useLiveQuery(() => db.sessions.get(session.id), [session.id]);

    useEffect(() => {
        const syncCache = async () => {
            skuCounters.current.clear();
            await db.scans.where('sessionId').equals(session.id).each(s => {
                const prev = skuCounters.current.get(s.barcode) || 0;
                skuCounters.current.set(s.barcode, prev + s.quantity);
            });
        };
        syncCache();
    }, [session.id]);

    const finalizeScanPipeline = useCallback(async (barcode: string, qty: number) => {
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

            const newTotal = (skuCounters.current.get(barcode) || 0) + qty;
            skuCounters.current.set(barcode, newTotal);
            
            // Persistencia con UBICACIÓN
            const scanRecord = await sessionService.addScanEvent(
                session.id, 
                barcode, 
                qty, 
                undefined, 
                undefined, 
                currentLocation
            );

            setCurrentScan(scanRecord);
            setCurrentProduct(product);
            setCurrentSkuTotal(newTotal);
            
            if (isAutoRegistered) {
                trigger('unknown', { sound: 'increment' });
            } else {
                trigger('success', { sound: qty > 1 ? 'increment' : 'success' });
            }

            if (settings.ttsEnabled) {
                const ttsText = settings.ttsMode === 'count' 
                    ? `${newTotal}` 
                    : `${product.name.substring(0, 20)}, ${newTotal}`;
                SoundFX.speak(ttsText);
            }

        } catch (err) {
            trigger('error');
        } finally {
            isLocked.current = false;
        }
    }, [session.id, settings, trigger, currentLocation]);

    const handleInboundScan = useCallback((rawBarcode: string) => {
        if (isLocked.current) return;
        const barcode = sanitizeBarcode(rawBarcode);
        if (!barcode || barcode.length < 2) return;

        isLocked.current = true;
        const qtyToApply = multiplier;
        setMultiplier(1); 
        
        finalizeScanPipeline(barcode, qtyToApply);
    }, [multiplier, finalizeScanPipeline]);

    useHIDScanner({
        onScan: handleInboundScan,
        minChars: 2,
        isEnabled: status === 'idle'
    });

    return {
        state: { 
            status, setStatus, feedback, manualInput, setManualInput, multiplier, setMultiplier,
            currentLocation, setCurrentLocation,
            optimisticActiveQty: currentSkuTotal,
            optimisticTotalQty: sessionStats?.totalUnits || 0,
            optimisticUniqueSkus: sessionStats?.totalSKUs || 0
        },
        data: { 
            lastScan: currentScan || undefined, 
            activeProduct: currentProduct || undefined, 
            recentScans: recentHistory 
        },
        actions: { 
            handleExternalScan: handleInboundScan,
            handleManualSubmit: (e: any) => { 
                e.preventDefault(); 
                if (manualInput) handleInboundScan(manualInput); 
                setManualInput(''); 
            },
            handleUndo: async () => {
                const removed = await sessionService.undoLastAction(session.id);
                if (removed) {
                    const prev = skuCounters.current.get(removed) || 0;
                    skuCounters.current.set(removed, Math.max(0, prev - 1));
                    trigger('undo');
                }
            },
            handleQuantityChange: sessionService.updateScanQuantity, 
            handleDeleteScan: sessionService.deleteScan,
            handleToggleIncident: async (e: any, id: string, current: boolean) => {
                await sessionService.updateScanIncident(e, id, current);
                trigger('incident');
            },
            handleDiscard: () => { if (confirm("¿DESCARTAR SESIÓN?")) onDiscard?.(); },
            clearMultiplier: () => setMultiplier(1)
        }
    };
};
