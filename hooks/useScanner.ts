
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

export type ScannerFeedback = 'idle' | 'success' | 'error' | 'undo' | 'unknown' | 'incident';

/**
 * HOOK DE ESCANEO INDUSTRIAL v7.0 - PROTOCOLO MARTILLO
 * Optimizado para ráfagas extremas y operación 'manos libres'.
 */
export const useScanner = (session: CountingSession, onFinish: () => void, onDiscard?: () => void) => {
    const settings = useMemo(() => getSettings(), []);
    
    const [status, setStatus] = useState<ScannerStatus>('idle');
    const [feedback, setFeedback] = useState<ScannerFeedback>('idle');
    const [manualInput, setManualInput] = useState('');
    const [multiplier, setMultiplier] = useState(1);
    
    const [currentScan, setCurrentScan] = useState<ScanRecord | null>(null);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [currentSkuTotal, setCurrentSkuTotal] = useState(0);

    const skuCounters = useRef<Map<string, number>>(new Map());
    const isLocked = useRef(false);
    const hidBuffer = useRef('');
    const lastKeyTime = useRef(0);

    // Consulta reactiva del historial reciente
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

    // Sincronización inicial de caché
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

    /**
     * PIPELINE DE PROCESAMIENTO CRÍTICO
     */
    const finalizeScanPipeline = useCallback(async (barcode: string, qty: number) => {
        try {
            // 1. Verificación de Producto (Maestro)
            let product = await productService.getProductByBarcode(barcode);
            let isAutoRegistered = false;

            if (!product) {
                if (settings.autoRegisterUnknown) {
                    // REGISTRO SILENCIOSO: No detiene el flujo
                    product = {
                        barcode,
                        name: `PENDIENTE - ${barcode}`,
                        category: 'POR_CLASIFICAR',
                        syncStatus: 'add'
                    };
                    await productService.saveProduct(product);
                    isAutoRegistered = true;
                } else {
                    // Si no hay auto-registro, el producto es 'Desconocido'
                    product = { barcode, name: 'DESCONOCIDO', category: 'N/A' };
                }
            }

            // 2. Actualización de Contadores Locales (UI Optimista)
            const newTotal = (skuCounters.current.get(barcode) || 0) + qty;
            skuCounters.current.set(barcode, newTotal);
            
            // 3. Persistencia en Segundo Plano
            const scanRecord = await sessionService.addScanEvent(session.id, barcode, qty);

            // 4. Feedback Sensorial y Visual
            setCurrentScan(scanRecord);
            setCurrentProduct(product);
            setCurrentSkuTotal(newTotal);
            
            if (isAutoRegistered) {
                setFeedback('unknown');
                SoundFX.play('increment'); // Sonido distintivo para nuevo
            } else {
                setFeedback('success');
                SoundFX.play(qty > 1 ? 'increment' : 'success');
            }

            // 5. Motor de Voz (TTS)
            if (settings.ttsEnabled) {
                const ttsText = settings.ttsMode === 'count' 
                    ? `${newTotal}` 
                    : `${product.name.substring(0, 20)}, ${newTotal}`;
                SoundFX.speak(ttsText);
            }
            
            // Auto-limpieza de feedback flash
            setTimeout(() => setFeedback('idle'), 250);

        } catch (err) {
            setFeedback('error');
            SoundFX.play('error');
        } finally {
            isLocked.current = false;
        }
    }, [session.id, settings]);

    /**
     * MANEJADOR DE ENTRADA (LÁSER / TECLADO)
     */
    const handleInboundScan = useCallback((rawBarcode: string) => {
        if (isLocked.current) return;
        const barcode = sanitizeBarcode(rawBarcode);
        if (!barcode || barcode.length < 2) return;

        isLocked.current = true;
        const qtyToApply = multiplier;
        setMultiplier(1); // Reset de seguridad tras aplicar
        
        finalizeScanPipeline(barcode, qtyToApply);
    }, [multiplier, finalizeScanPipeline]);

    // Escucha de Hardware (Protocolo Martillo)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') return;

            const now = Date.now();
            if (now - lastKeyTime.current > 40) hidBuffer.current = '';
            lastKeyTime.current = now;

            if (e.key === 'Enter') {
                if (hidBuffer.current.length >= 2) handleInboundScan(hidBuffer.current);
                hidBuffer.current = '';
            } else if (e.key.length === 1) {
                hidBuffer.current += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleInboundScan]);

    return {
        state: { 
            status, setStatus, feedback, manualInput, setManualInput, multiplier, setMultiplier,
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
                    setFeedback('undo');
                    SoundFX.play('delete');
                    setTimeout(() => setFeedback('idle'), 400);
                }
            },
            handleQuantityChange: sessionService.updateScanQuantity, 
            handleDeleteScan: sessionService.deleteScan,
            handleToggleIncident: async (e: any, id: string, current: boolean) => {
                await sessionService.updateScanIncident(e, id, current);
                setFeedback('incident');
                setTimeout(() => setFeedback('idle'), 500);
            },
            handleDiscard: () => { if (confirm("¿DESCARTAR SESIÓN?")) onDiscard?.(); },
            clearMultiplier: () => setMultiplier(1)
        }
    };
};
