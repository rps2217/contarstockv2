
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import { sanitizeBarcode } from '../services/utils';
import { SoundFX } from '../services/audio';
import { CountingSession, Product, ScannerStatus, ScanRecord } from '../types';
import { Dexie } from 'dexie';

export const useScanner = (session: CountingSession, onFinish: () => void, onDiscard?: () => void) => {
    const [status, setStatus] = useState<ScannerStatus>('idle');
    const [feedback, setFeedback] = useState<'idle' | 'success' | 'error' | 'undo'>('idle');
    const [manualInput, setManualInput] = useState('');
    const [multiplier, setMultiplier] = useState(1);
    
    const [currentScan, setCurrentScan] = useState<ScanRecord | null>(null);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [currentSkuTotal, setCurrentSkuTotal] = useState(0);

    const seenBarcodes = useRef<Set<string>>(new Set());
    const skuCounters = useRef<Map<string, number>>(new Map());
    const isLocked = useRef(false);

    const [pendingScan, setPendingScan] = useState<{barcode: string, name: string} | null>(null);

    // OPTIMIZACIÓN: Solo traer los últimos 15 items sin ordenar todo el array
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
            seenBarcodes.current.clear();
            
            // Construcción ligera de caché
            await db.scans.where('sessionId').equals(session.id).each(s => {
                seenBarcodes.current.add(s.barcode);
                const prev = skuCounters.current.get(s.barcode) || 0;
                skuCounters.current.set(s.barcode, prev + s.quantity);
            });

            // Estado inicial UI
            const lastScanArray = await db.scans
                .where('[sessionId+timestamp]')
                .between([session.id, Dexie.minKey], [session.id, Dexie.maxKey])
                .reverse()
                .limit(1)
                .toArray();

            if (lastScanArray.length > 0) {
                const last = lastScanArray[0];
                const p = await db.products.get(last.barcode);
                setCurrentScan(last);
                setCurrentProduct(p || null);
                setCurrentSkuTotal(skuCounters.current.get(last.barcode) || 0);
            }
        };
        syncCache();
    }, [session.id]);

    const finalizeScanPipeline = useCallback(async (barcode: string, mm?: number, yyyy?: number) => {
        try {
            const qtyToAdd = multiplier;
            const newTotal = (skuCounters.current.get(barcode) || 0) + qtyToAdd;
            skuCounters.current.set(barcode, newTotal);
            seenBarcodes.current.add(barcode);
            
            const scanRecord = await sessionService.addScanEvent(session.id, barcode, qtyToAdd, mm, yyyy);
            const productInfo = await db.products.get(barcode);

            setCurrentScan(scanRecord);
            setCurrentProduct(productInfo || null);
            setCurrentSkuTotal(newTotal);
            setFeedback('success');
            SoundFX.play(qtyToAdd > 1 ? 'increment' : 'success');

            setMultiplier(1);
            setStatus('idle');
            setTimeout(() => setFeedback('idle'), 400);
        } catch (err) {
            setFeedback('error');
            SoundFX.play('error');
        } finally {
            // CRÍTICO: Siempre liberar el lock
            isLocked.current = false;
        }
    }, [session.id, multiplier]);

    const handleInboundScan = useCallback(async (rawBarcode: string) => {
        if (isLocked.current) return;
        const barcode = sanitizeBarcode(rawBarcode);
        if (!barcode || barcode.length < 2) return;

        isLocked.current = true;
        
        try {
            let product = await db.products.get(barcode);
            
            if (!product) {
                // Registro implícito rápido para no bloquear
                const newProd: Product = { barcode, name: 'PENDIENTE', category: 'NUEVO', syncStatus: 'add' };
                await db.products.put(newProd);
                product = newProd;
            }

            // Si es producto nuevo real (no visto en esta sesión), pedir confirmación opcional
            // Para "Martillo Industrial", preferimos velocidad, así que eliminamos flujos complejos de expiración por defecto
            const firstScan = await db.scans.where('[sessionId+barcode]').equals([session.id, barcode]).first();
            await finalizeScanPipeline(barcode, firstScan?.mm, firstScan?.yyyy);

        } catch (error) {
            console.error("Critical Scanner Error:", error);
            setFeedback('error');
            SoundFX.play('error');
            isLocked.current = false;
        }
    }, [session.id, finalizeScanPipeline]);

    const handleUndoAction = useCallback(async () => {
        const removedBarcode = await sessionService.undoLastAction(session.id);
        if (removedBarcode) {
            setFeedback('undo');
            SoundFX.play('delete');
            
            const currentCount = skuCounters.current.get(removedBarcode);
            if (currentCount !== undefined) {
                // Recargar estado UI
                const lastScanArray = await db.scans
                    .where('[sessionId+timestamp]')
                    .between([session.id, Dexie.minKey], [session.id, Dexie.maxKey])
                    .reverse()
                    .limit(1)
                    .toArray();
                
                if (lastScanArray.length > 0) {
                    const last = lastScanArray[0];
                    let realTotal = 0;
                    // Recálculo seguro
                    await db.scans.where({sessionId: session.id, barcode: last.barcode}).each(s => realTotal += s.quantity);
                    skuCounters.current.set(last.barcode, realTotal);
                    
                    setCurrentScan(last);
                    setCurrentSkuTotal(realTotal);
                } else {
                    setCurrentScan(null);
                    setCurrentSkuTotal(0);
                }
            }
            setTimeout(() => setFeedback('idle'), 500);
        }
    }, [session.id]);

    return {
        state: { 
            status, setStatus, feedback, manualInput, setManualInput, multiplier, setMultiplier,
            pendingScanCode: pendingScan?.barcode,
            pendingProductName: pendingScan?.name,
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
            handleExpirationComplete: (mm?: number, yyyy?: number) => { 
                if (pendingScan) finalizeScanPipeline(pendingScan.barcode, mm, yyyy);
                else { isLocked.current = false; setStatus('idle'); }
            },
            handleUndo: handleUndoAction,
            handleQuantityChange: sessionService.updateScanQuantity, 
            handleDeleteScan: sessionService.deleteScan,
            handleToggleIncident: sessionService.updateScanIncident,
            handleDiscard: () => { if (confirm("¿Borrar sesión física?")) onDiscard?.(); }
        }
    };
};
