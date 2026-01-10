
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import { sanitizeBarcode } from '../services/utils';
import { SoundFX } from '../services/audio';
import { CountingSession, Product, ScannerStatus, ScanRecord } from '../types';
import { lookupSkuHistory } from '../services/gasService';

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

    const recentHistory = useLiveQuery(
        () => db.scans.where('sessionId').equals(session.id).reverse().sortBy('timestamp').then(res => res.slice(0, 15)), 
        [session.id]
    );
    const sessionStats = useLiveQuery(() => db.sessions.get(session.id), [session.id]);

    useEffect(() => {
        const syncCache = async () => {
            const allScans = await db.scans.where('sessionId').equals(session.id).toArray();
            skuCounters.current.clear();
            seenBarcodes.current.clear();
            
            allScans.forEach(s => {
                seenBarcodes.current.add(s.barcode);
                const prev = skuCounters.current.get(s.barcode) || 0;
                skuCounters.current.set(s.barcode, prev + s.quantity);
            });

            if (allScans.length > 0) {
                const last = allScans.sort((a,b) => b.timestamp - a.timestamp)[0];
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
            isLocked.current = false;
        }
    }, [session.id, multiplier]);

    const handleInboundScan = useCallback(async (rawBarcode: string) => {
        if (isLocked.current) return;
        const barcode = sanitizeBarcode(rawBarcode);
        if (!barcode || barcode.length < 2) return;

        isLocked.current = true;
        
        // 1. PRIMERO: BUSCAR EN MÁSTER LOCAL (DEXIE)
        let product = await db.products.get(barcode);
        
        // 2. SEGUNDO: SI NO ESTÁ, BUSCAR EN MÁSTER CLOUD (GAS)
        if (!product && navigator.onLine) {
            try {
                const cloudResult = await lookupSkuHistory(barcode);
                if (cloudResult && cloudResult.name) {
                    const newProduct: Product = {
                        barcode,
                        name: cloudResult.name,
                        category: cloudResult.category || 'MÁSTER CLOUD',
                        syncStatus: 'synced'
                    };
                    await db.products.put(newProduct);
                    product = newProduct;
                }
            } catch (e) { console.warn("Cloud lookup failed, proceeding offline"); }
        }

        // 3. TERCERO: SI SIGUE SIN APARECER, MARCAR COMO PENDIENTE
        if (!product) {
            await db.products.put({ barcode, name: 'PENDIENTE', category: 'NUEVO', syncStatus: 'add' });
        }

        setPendingScan({ barcode, name: product?.name || 'NUEVO PRODUCTO' });

        if (!seenBarcodes.current.has(barcode)) {
            setStatus('expiring');
        } else {
            const firstScan = await db.scans.where('[sessionId+barcode]').equals([session.id, barcode]).first();
            await finalizeScanPipeline(barcode, firstScan?.mm, firstScan?.yyyy);
        }
    }, [session.id, finalizeScanPipeline]);

    const handleUndoAction = useCallback(async () => {
        const removedBarcode = await sessionService.undoLastAction(session.id);
        if (removedBarcode) {
            setFeedback('undo');
            SoundFX.play('delete');
            const scans = await db.scans.where('sessionId').equals(session.id).toArray();
            skuCounters.current.clear();
            scans.forEach(s => {
                const c = skuCounters.current.get(s.barcode) || 0;
                skuCounters.current.set(s.barcode, c + s.quantity);
            });
            
            if (scans.length > 0) {
                const last = scans.sort((a,b) => b.timestamp - a.timestamp)[0];
                setCurrentSkuTotal(skuCounters.current.get(last.barcode) || 0);
            } else {
                setCurrentSkuTotal(0);
                setCurrentScan(null);
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
            optimisticUniqueSkus: sessionStats?.totalSKUs || 0,
            predictions: [] 
        },
        data: { 
            lastScan: currentScan || undefined, 
            activeProduct: currentProduct || undefined, 
            recentScans: recentHistory 
        },
        actions: { 
            handleExternalScan: handleInboundScan,
            handleManualSubmit: (e: any) => { e.preventDefault(); if (manualInput) handleInboundScan(manualInput); setManualInput(''); },
            handleExpirationComplete: (mm?: number, yyyy?: number) => { if (pendingScan) finalizeScanPipeline(pendingScan.barcode, mm, yyyy); },
            handleUndo: handleUndoAction,
            handleQuantityChange: sessionService.updateScanQuantity, 
            handleDeleteScan: sessionService.deleteScan,
            handleToggleIncident: sessionService.updateScanIncident,
            handleDiscard: () => { if (confirm("¿Borrar sesión física?")) onDiscard?.(); }
        }
    };
};
