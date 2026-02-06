
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { massiveDb, BlindScan, BlindManifestItem } from '../db.massive';
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
    // Feedback ultra-rápido (50ms) para que el operario no sienta lag tras el bip del láser
    const { feedback, trigger } = useFeedbackSystem(100);
    const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
    const [optimisticQty, setOptimisticQty] = useState<number | null>(null);
    const [multiplier, setMultiplier] = useState(1);
    const [currentLocation, setCurrentLocation] = useState('BODEGA_GRAL');
    
    // Cola de escritura paralela
    const writeQueue = useRef<{barcode: string, qty: number, loc: string, ts: number}[]>([]);
    const itemsRef = useRef<ConsolidatedBlindItem[]>([]);

    const dbItems = useLiveQuery(async () => {
        if (!batchId) return [];
        // FIX: Explicitly typed query results to prevent 'unknown' inference in loops
        // Added 'as BlindScan[]' and 'as BlindManifestItem[]' to fix type errors on lines 46 and 64
        const rawScans = await massiveDb.blindScans.where('batchId').equals(batchId).toArray() as BlindScan[];
        const manifests = await massiveDb.blindManifests.where('batchId').equals(batchId).toArray() as BlindManifestItem[];
        
        const uniqueBarcodes = Array.from(new Set([...rawScans.map(s => s.barcode), ...manifests.map(m => m.barcode)]));
        const products = await masterDb.products.where('barcode').anyOf(uniqueBarcodes).toArray();
        // FIX: Explicitly type the prodMap to ensure .get() doesn't return unknown
        const prodMap = new Map<string, string>(products.map(p => [p.barcode, p.name] as [string, string]));
        
        const aggregation = new Map<string, ConsolidatedBlindItem>();

        // Pre-cargar manifiesto teórico
        for (const m of manifests) {
            // FIX: Explicitly type iteration variable to avoid 'unknown' inference on properties
            const item: BlindManifestItem = m;
            aggregation.set(item.barcode, {
                barcode: item.barcode,
                name: item.name || prodMap.get(item.barcode) || 'SIN DESCRIPCIÓN',
                loc: item.loc,
                totalQuantity: 0,
                expectedQty: item.expectedQty,
                lastTimestamp: 0
            });
        }

        // Sumar físico
        for (const scan of rawScans) {
            // FIX: Explicitly type iteration variable to avoid 'unknown' inference on properties
            const s: BlindScan = scan;
            const existing = aggregation.get(s.barcode);
            if (existing) {
                existing.totalQuantity += s.quantity;
                existing.lastTimestamp = Math.max(existing.lastTimestamp, s.timestamp);
                if (s.location) existing.loc = s.location;
            } else {
                aggregation.set(s.barcode, {
                    barcode: s.barcode,
                    name: prodMap.get(s.barcode) || 'SKU_DESCONOCIDO',
                    totalQuantity: s.quantity,
                    lastTimestamp: s.timestamp,
                    loc: s.location
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

    // Flush de base de datos desacoplado de la renderización
    const flushToDb = useCallback(async () => {
        if (writeQueue.current.length === 0) return;
        const currentBatch = [...writeQueue.current];
        writeQueue.current = []; 
        try {
            await massiveDb.blindScans.bulkAdd(currentBatch.map(b => ({
                batchId, 
                barcode: b.barcode, 
                quantity: b.qty, 
                location: b.loc,
                timestamp: b.ts
            })));
        } catch (e) {
            console.error("MARTILLO_WRITE_FAIL", e);
            writeQueue.current = [...currentBatch, ...writeQueue.current];
        }
    }, [batchId]);

    useEffect(() => {
        const timer = setInterval(flushToDb, 500);
        return () => { clearInterval(timer); flushToDb(); };
    }, [flushToDb]);

    const registerScan = useCallback(async (code: string, qtyOverride?: number) => {
        const clean = sanitizeBarcode(code);
        if (!clean || clean.length < 2) return;

        const qtyToApply = qtyOverride !== undefined ? qtyOverride : multiplier;
        if (qtyOverride === undefined) setMultiplier(1);

        // Feedback visual y háptico instantáneo
        trigger(qtyToApply > 0 ? 'success' : 'undo');

        setActiveBarcode(clean);
        
        // Cálculo de cantidad optimista para la UI
        setOptimisticQty(prev => {
            const baseReal = itemsRef.current.find(i => i.barcode === clean)?.totalQuantity ?? 0;
            const currentUI = clean === activeBarcode ? (prev ?? baseReal) : baseReal;
            return Math.max(0, currentUI + qtyToApply);
        });

        writeQueue.current.push({ 
            barcode: clean, 
            qty: qtyToApply, 
            loc: currentLocation, 
            ts: Date.now() 
        });
    }, [activeBarcode, trigger, multiplier, currentLocation]);

    return { 
        items: dbItems || [], 
        lastScannedItem: useMemo(() => {
            if (!activeBarcode) return null;
            const real = dbItems?.find(i => i.barcode === activeBarcode);
            return real 
                ? { ...real, totalQuantity: optimisticQty ?? real.totalQuantity } 
                : { barcode: activeBarcode, name: '...', totalQuantity: optimisticQty || 0, lastTimestamp: Date.now() } as any;
        }, [dbItems, activeBarcode, optimisticQty]),
        feedback,
        multiplier, setMultiplier,
        currentLocation, setCurrentLocation,
        registerScan, 
        selectItem: (b: string) => { 
            setActiveBarcode(b); 
            setOptimisticQty(itemsRef.current.find(i => i.barcode === b)?.totalQuantity || 0); 
        },
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
