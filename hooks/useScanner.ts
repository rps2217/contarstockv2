
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import { sanitizeBarcode } from '../services/utils';
import { SoundFX } from '../services/audio';
import { CountingSession, Product, ScannerStatus, ScanRecord } from '../types';
import { Dexie } from 'dexie';

/**
 * HOOK DE ESCANEO INDUSTRIAL v6.0
 * Diseñado para ráfagas de alta velocidad (>100 scans/min)
 */
export const useScanner = (session: CountingSession, onFinish: () => void, onDiscard?: () => void) => {
    const [status, setStatus] = useState<ScannerStatus>('idle');
    const [feedback, setFeedback] = useState<'idle' | 'success' | 'error' | 'undo'>('idle');
    const [manualInput, setManualInput] = useState('');
    const [multiplier, setMultiplier] = useState(1);
    
    const [currentScan, setCurrentScan] = useState<ScanRecord | null>(null);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [currentSkuTotal, setCurrentSkuTotal] = useState(0);

    const skuCounters = useRef<Map<string, number>>(new Map());
    const isLocked = useRef(false);
    const hidBuffer = useRef('');
    const lastKeyTime = useRef(0);

    // Consulta reactiva optimizada: solo trae lo mínimo necesario para el log
    const recentHistory = useLiveQuery(
        () => db.scans
            .where('[sessionId+timestamp]')
            .between([session.id, Dexie.minKey], [session.id, Dexie.maxKey], true, true)
            .reverse()
            .limit(10)
            .toArray(), 
        [session.id]
    );
    
    const sessionStats = useLiveQuery(() => db.sessions.get(session.id), [session.id]);

    // Sincronización de caché al inicio para evitar lag en el primer escaneo
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
            const newTotal = (skuCounters.current.get(barcode) || 0) + qty;
            skuCounters.current.set(barcode, newTotal);
            
            // Persistencia en background
            const scanRecord = await sessionService.addScanEvent(session.id, barcode, qty);
            const productInfo = await db.products.get(barcode);

            // Actualización UI instantánea
            setCurrentScan(scanRecord);
            setCurrentProduct(productInfo || { barcode, name: 'SKU NUEVO', category: 'N/A' });
            setCurrentSkuTotal(newTotal);
            
            setFeedback('success');
            SoundFX.play(qty > 1 ? 'increment' : 'success');
            
            setTimeout(() => setFeedback('idle'), 300);
        } catch (err) {
            setFeedback('error');
            SoundFX.play('error');
        } finally {
            isLocked.current = false;
        }
    }, [session.id]);

    const handleInboundScan = useCallback((rawBarcode: string) => {
        if (isLocked.current) return;
        const barcode = sanitizeBarcode(rawBarcode);
        if (!barcode || barcode.length < 2) return;

        isLocked.current = true;
        const qtyToApply = multiplier;
        setMultiplier(1); // Reset multiplicador tras uso
        
        finalizeScanPipeline(barcode, qtyToApply);
    }, [multiplier, finalizeScanPipeline]);

    // MOTOR HID GLOBAL (Protocolo Martillo)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') return;

            const now = Date.now();
            if (now - lastKeyTime.current > 40) hidBuffer.current = '';
            lastKeyTime.current = now;

            if (e.key === 'Enter') {
                if (hidBuffer.current.length >= 2) {
                    handleInboundScan(hidBuffer.current);
                }
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
            handleManualSubmit: (e: any) => { e.preventDefault(); if (manualInput) handleInboundScan(manualInput); setManualInput(''); },
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
            // Added handleToggleIncident to fix the missing property error in Scanner component
            handleToggleIncident: sessionService.updateScanIncident,
            handleDiscard: () => { if (confirm("¿DESCARTAR SESIÓN?")) onDiscard?.(); }
        }
    };
};
