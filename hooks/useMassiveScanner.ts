
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
                name: m.name || prodMap.get(m.barcode) || 'SIN DESCRIPCIÓN',
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
                if (scan.location) existing.loc = scan.location;
            } else {
                aggregation.set(scan.barcode, {
                    barcode: scan.barcode,
                    name: prodMap.get(scan.barcode) || 'SKU_DESCONOCIDO',
                    totalQuantity: scan.quantity,
                    lastTimestamp: scan.timestamp,
                    loc: scan.location
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
    }, [batchId, activeBarcode, feedback]);

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
            writeQueue.current = [...batch, ...writeQueue.current];
        }
    }, [batchId]);

    useEffect(() => {
        const timer = setInterval(flushToDb, 300);
        return () => { clearInterval(timer); flushToDb(); };
    }, [flushToDb]);

    const registerScan = useCallback(async (code: string, qtyOverride?: number) => {
        const clean = sanitizeBarcode(code);
        if (!clean || clean.length < 2) return;

        const qtyToApply = qtyOverride !== undefined ? qtyOverride : multiplier;
        if (qtyOverride === undefined) setMultiplier(1);

        trigger(qtyToApply > 0 ? 'success' : 'undo', { 
            sound: qtyToApply > 0 ? (qtyToApply > 1 ? 'increment' : 'success') : 'delete'
        });

        setActiveBarcode(clean);
        setOptimisticQty(prev => {
            const baseReal = itemsRef.current.find(i => i.barcode === clean)?.totalQuantity ?? 0;
            const currentUI = clean === activeBarcode ? (prev ?? baseReal) : baseReal;
            return Math.max(0, currentUI + qtyToApply);
        });

        writeQueue.current.push({ barcode: clean, qty: qtyToApply, loc: currentLocation, ts: Date.now() });
    }, [activeBarcode, trigger, multiplier, currentLocation]);

    return { 
        items: dbItems || [], 
        lastScannedItem: useMemo(() => {
            if (!activeBarcode) return null;
            const real = dbItems?.find(i => i.barcode === activeBarcode);
            return real ? { ...real, totalQuantity: optimisticQty ?? real.totalQuantity } : { barcode: activeBarcode, name: '...', totalQuantity: optimisticQty || 0, lastTimestamp: Date.now() } as any;
        }, [dbItems, activeBarcode, optimisticQty]),
        feedback,
        multiplier, setMultiplier,
        currentLocation, setCurrentLocation,
        registerScan, 
        selectItem: (b: string) => { setActiveBarcode(b); setOptimisticQty(itemsRef.current.find(i => i.barcode === b)?.totalQuantity || 0); },
        removeItemCompletely: async (barcode: string) => {
            await massiveDb.blindScans.where({ batchId, barcode }).delete();
            if (activeBarcode === barcode) setActiveBarcode(null);
            trigger('undo');
        },
        resetBatch: async () => {
            await massiveDb.blindScans.where('batchId').equals(batchId).delete();
            await massiveDb.blindManifests.where('batchId').equals(batchId).delete();
            setActiveBarcode(null);
            trigger('undo');
        }
    };
};
