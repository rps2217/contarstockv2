import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { massiveDb } from '../db.massive';
import { db as masterDb } from '../db';
import { sanitizeBarcode } from '../services/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { useFeedbackSystem } from './useFeedbackSystem';

export interface ConsolidatedBlindItem {
    barcode: string;
    name: string;
    loc?: string;
    totalQuantity: number;
    expectedQty?: number;
    lastTimestamp: number;
}

/**
 * HOOK ULTRA-SENSITIVO PARA MODO MARTILLO INDUSTRIAL
 * Refactorizado para usar sistema de feedback unificado.
 */
export const useMassiveScanner = (batchId: string) => {
    // Sistema de Feedback (50ms para latencia ultra baja en martillo)
    const { feedback, trigger } = useFeedbackSystem(50);
    
    const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
    const [optimisticQty, setOptimisticQty] = useState<number | null>(null);
    
    const buffer = useRef('');
    const lastKeyTime = useRef(0);
    const writeQueue = useRef<{barcode: string, qty: number, ts: number}[]>([]);
    
    // Referencia de sombra para evitar cierres obsoletos
    const itemsRef = useRef<ConsolidatedBlindItem[]>([]);

    // Consulta reactiva
    const dbItems = useLiveQuery(async () => {
        if (!batchId) return [];
        
        const [rawScans, manifests] = await Promise.all([
            massiveDb.blindScans.where('batchId').equals(batchId).toArray(),
            massiveDb.blindManifests.where('batchId').equals(batchId).toArray()
        ]);
        
        const uniqueBarcodes = Array.from(new Set([...rawScans.map(s => s.barcode), ...manifests.map(m => m.barcode)]));
        const products = await masterDb.products.where('barcode').anyOf(uniqueBarcodes).toArray();
        const prodMap = new Map<string, string>(products.map(p => [p.barcode, p.name]));
        
        const aggregation = new Map<string, ConsolidatedBlindItem>();

        for (const m of manifests) {
            aggregation.set(m.barcode, {
                barcode: m.barcode,
                name: m.name || prodMap.get(m.barcode) || 'CARGANDO...',
                loc: m.loc,
                totalQuantity: 0,
                expectedQty: m.expectedQty,
                lastTimestamp: 0
            });
        }

        for (const scan of rawScans) {
            const existing = aggregation.get(scan.barcode);
            if (existing) {
                existing.totalQuantity += scan.quantity;
                existing.lastTimestamp = Math.max(existing.lastTimestamp, scan.timestamp);
            } else {
                aggregation.set(scan.barcode, {
                    barcode: scan.barcode,
                    name: prodMap.get(scan.barcode) || 'SKU_DESCONOCIDO',
                    totalQuantity: scan.quantity,
                    lastTimestamp: scan.timestamp
                });
            }
        }

        const sorted = Array.from(aggregation.values()).sort((a, b) => {
            if (a.barcode === activeBarcode) return -1;
            if (b.barcode === activeBarcode) return 1;
            return b.lastTimestamp - a.lastTimestamp;
        });

        itemsRef.current = sorted;
        return sorted;
    }, [batchId, activeBarcode]);

    // Sincronización post-suspensión
    useEffect(() => {
        const handleFocus = () => { buffer.current = ''; };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    const flushToDb = useCallback(async () => {
        if (writeQueue.current.length === 0) return;
        const batch = [...writeQueue.current];
        writeQueue.current = []; 
        try {
            await massiveDb.blindScans.bulkAdd(batch.map(b => ({
                batchId, barcode: b.barcode, quantity: b.qty, timestamp: b.ts
            })));
        } catch (e) {
            console.error("Fallo persistencia Martillo", e);
            writeQueue.current = [...batch, ...writeQueue.current];
        }
    }, [batchId]);

    // Flush loop
    useEffect(() => {
        const timer = setInterval(flushToDb, 300);
        return () => {
            clearInterval(timer);
            flushToDb();
        };
    }, [flushToDb]);

    /**
     * REGISTRO ULTRA-RÁPIDO
     */
    const registerScan = useCallback(async (code: string, qty: number = 1) => {
        const clean = sanitizeBarcode(code);
        if (!clean || clean.length < 2) return;

        const now = Date.now();
        const isSame = clean === activeBarcode;
        
        // 1. Feedback Unificado (Latencia casi cero)
        if (qty > 0) {
            trigger('success', { sound: qty > 1 ? 'increment' : 'success', vibration: qty > 1 ? 25 : 40 });
        } else {
            trigger('undo', { sound: 'delete', vibration: [40, 20] });
        }

        // 2. UI Optimista
        if (!isSame) setActiveBarcode(clean);
        
        setOptimisticQty(prev => {
            const baseReal = itemsRef.current.find(i => i.barcode === clean)?.totalQuantity ?? 0;
            const currentUI = isSame ? (prev ?? baseReal) : baseReal;
            return Math.max(0, currentUI + qty);
        });

        // 3. Cola Disco
        writeQueue.current.push({ barcode: clean, qty, ts: now });
    }, [activeBarcode, trigger]);

    const selectItem = useCallback((barcode: string) => {
        const clean = sanitizeBarcode(barcode);
        if (activeBarcode === clean) return;
        
        setActiveBarcode(clean);
        const realVal = itemsRef.current.find(i => i.barcode === clean)?.totalQuantity ?? 0;
        setOptimisticQty(realVal); 
        if (navigator.vibrate) navigator.vibrate(10);
    }, [activeBarcode]);

    const removeItemCompletely = useCallback(async (barcode: string) => {
        await flushToDb();
        await massiveDb.blindScans.where('batchId').equals(batchId).and(s => s.barcode === barcode).delete();
        if (activeBarcode === barcode) {
            setActiveBarcode(null);
            setOptimisticQty(null);
        }
        trigger('undo');
    }, [batchId, activeBarcode, flushToDb, trigger]);

    const resetBatch = useCallback(async () => {
        writeQueue.current = []; 
        await Promise.all([
            massiveDb.blindScans.where('batchId').equals(batchId).delete(),
            massiveDb.blindManifests.where('batchId').equals(batchId).delete()
        ]);
        setActiveBarcode(null);
        setOptimisticQty(null);
        trigger('undo');
    }, [batchId, trigger]);

    // Motor HID
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
            
            const now = Date.now();
            if (now - lastKeyTime.current > 50) buffer.current = ''; 
            lastKeyTime.current = now;

            if (e.key === 'Enter') {
                if (buffer.current.length >= 2) {
                    registerScan(buffer.current);
                }
                buffer.current = '';
                e.preventDefault();
            } else if (e.key.length === 1) {
                buffer.current += e.key;
            }
        };
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [registerScan]);

    const lastScannedItem = useMemo(() => {
        if (!activeBarcode) return null;
        const realItem = dbItems?.find(i => i.barcode === activeBarcode);
        
        if (!realItem) {
            return {
                barcode: activeBarcode,
                name: 'PROCESANDO...',
                totalQuantity: optimisticQty || 0,
                lastTimestamp: Date.now()
            };
        }

        return { 
            ...realItem, 
            totalQuantity: optimisticQty !== null ? optimisticQty : realItem.totalQuantity 
        };
    }, [dbItems, activeBarcode, optimisticQty]);

    return { 
        items: dbItems || [], 
        lastScannedItem,
        feedback, // Exponemos el objeto feedback estandarizado en lugar de isFlash
        registerScan, 
        selectItem,
        removeItemCompletely,
        resetBatch
    };
};