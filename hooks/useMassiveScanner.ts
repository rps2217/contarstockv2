
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

export const useMassiveScanner = (batchId: string) => {
    const { feedback, trigger } = useFeedbackSystem(50);
    
    const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
    const [optimisticQty, setOptimisticQty] = useState<number | null>(null);
    const [multiplier, setMultiplier] = useState(1);
    const [currentLocation, setCurrentLocation] = useState('BODEGA_GRAL');
    
    const buffer = useRef('');
    const lastKeyTime = useRef(0);
    const writeQueue = useRef<{barcode: string, qty: number, loc: string, ts: number}[]>([]);
    const itemsRef = useRef<ConsolidatedBlindItem[]>([]);

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

    const flushToDb = useCallback(async () => {
        if (writeQueue.current.length === 0) return;
        const batch = [...writeQueue.current];
        writeQueue.current = []; 
        try {
            await massiveDb.blindScans.bulkAdd(batch.map(b => ({
                batchId, 
                barcode: b.barcode, 
                quantity: b.qty, 
                location: b.loc,
                timestamp: b.ts
            })));
        } catch (e) {
            console.error("Fallo persistencia Martillo", e);
            writeQueue.current = [...batch, ...writeQueue.current];
        }
    }, [batchId]);

    useEffect(() => {
        const timer = setInterval(flushToDb, 300);
        return () => {
            clearInterval(timer);
            flushToDb();
        };
    }, [flushToDb]);

    const registerScan = useCallback(async (code: string, qtyOverride?: number) => {
        const clean = sanitizeBarcode(code);
        if (!clean || clean.length < 2) return;

        const now = Date.now();
        const isSame = clean === activeBarcode;
        
        const qtyToApply = qtyOverride !== undefined ? qtyOverride : multiplier;
        if (qtyOverride === undefined) setMultiplier(1);

        if (qtyToApply > 0) {
            trigger('success', { sound: qtyToApply > 1 ? 'increment' : 'success', vibration: qtyToApply > 1 ? 25 : 40 });
        } else {
            trigger('undo', { sound: 'delete', vibration: [40, 20] });
        }

        if (!isSame) setActiveBarcode(clean);
        
        setOptimisticQty(prev => {
            const baseReal = itemsRef.current.find(i => i.barcode === clean)?.totalQuantity ?? 0;
            const currentUI = isSame ? (prev ?? baseReal) : baseReal;
            return Math.max(0, currentUI + qtyToApply);
        });

        writeQueue.current.push({ barcode: clean, qty: qtyToApply, loc: currentLocation, ts: now });
    }, [activeBarcode, trigger, multiplier, currentLocation]);

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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
            const now = Date.now();
            if (now - lastKeyTime.current > 50) buffer.current = ''; 
            lastKeyTime.current = now;
            if (e.key === 'Enter') {
                if (buffer.current.length >= 2) registerScan(buffer.current);
                buffer.current = '';
                e.preventDefault();
            } else if (e.key.length === 1) buffer.current += e.key;
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
        feedback,
        multiplier,
        setMultiplier,
        currentLocation,
        setCurrentLocation,
        registerScan, 
        selectItem,
        removeItemCompletely,
        resetBatch
    };
};
