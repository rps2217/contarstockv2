
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { massiveDb } from '../db.massive';
import { db as masterDb } from '../db';
import { sanitizeBarcode } from '../services/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { useFeedbackSystem } from './useFeedbackSystem';
import { Product } from '../types';
import { SoundFX } from '../services/audio';

export interface ConsolidatedBlindItem {
    barcode: string;
    name: string;
    loc?: string;
    totalQuantity: number;
    expectedQty?: number;
    lastTimestamp: number;
}

export const useMassiveScanner = (batchId: string) => {
    const { feedback, trigger } = useFeedbackSystem(100);
    const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [optimisticQty, setOptimisticQty] = useState<number | null>(null);
    const [multiplier, setMultiplier] = useState(1);
    const [currentLocation, setCurrentLocation] = useState(() => localStorage.getItem('last_massive_loc') || 'ZONA-A');
    
    const writeQueue = useRef<{barcode: string, qty: number, loc: string, ts: number}[]>([]);
    const itemsRef = useRef<ConsolidatedBlindItem[]>([]);

    useEffect(() => { localStorage.setItem('last_massive_loc', currentLocation); }, [currentLocation]);

    const dbItems = useLiveQuery(async () => {
        if (!batchId) return [];
        const [rawScans, manifests] = await Promise.all([
            massiveDb.blindScans.where('batchId').equals(batchId).toArray(),
            massiveDb.blindManifests.where('batchId').equals(batchId).toArray()
        ]);
        
        const uniqueBarcodes = Array.from(new Set([...rawScans.map(s => s.barcode), ...manifests.map(m => m.barcode)]));
        const products = uniqueBarcodes.length > 0 ? await masterDb.products.where('barcode').anyOf(uniqueBarcodes).toArray() : [];
        const prodMap = new Map<string, Product>(products.map(p => [p.barcode, p]));
        
        const aggregation = new Map<string, ConsolidatedBlindItem>();

        manifests.forEach(m => {
            aggregation.set(m.barcode, {
                barcode: m.barcode,
                name: m.name || prodMap.get(m.barcode)?.name || 'SIN DESCRIPCIÓN',
                loc: m.loc,
                totalQuantity: 0,
                expectedQty: m.expectedQty,
                lastTimestamp: 0
            });
        });

        rawScans.forEach(s => {
            const existing = aggregation.get(s.barcode);
            if (existing) {
                existing.totalQuantity += s.quantity;
                existing.lastTimestamp = Math.max(existing.lastTimestamp, s.timestamp);
                if (s.location) existing.loc = s.location;
            } else {
                aggregation.set(s.barcode, {
                    barcode: s.barcode,
                    name: prodMap.get(s.barcode)?.name || 'SKU_DESCONOCIDO',
                    totalQuantity: s.quantity,
                    lastTimestamp: s.timestamp,
                    loc: s.location
                });
            }
        });

        const sorted = Array.from(aggregation.values()).sort((a, b) => {
            if (a.barcode === activeBarcode) return -1;
            return b.lastTimestamp - a.lastTimestamp;
        });

        itemsRef.current = sorted;
        return sorted;
    }, [batchId, activeBarcode, feedback]);

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
            writeQueue.current = [...currentBatch, ...writeQueue.current];
        }
    }, [batchId]);

    useEffect(() => {
        const timer = setInterval(flushToDb, 800);
        return () => { clearInterval(timer); flushToDb(); };
    }, [flushToDb]);

    const registerScan = useCallback(async (code: string, qtyOverride?: number) => {
        const clean = sanitizeBarcode(code);
        if (!clean) return;
        
        const qtyToApply = qtyOverride ?? multiplier;
        trigger(qtyToApply > 0 ? 'success' : 'undo');
        
        setActiveBarcode(clean);
        masterDb.products.get(clean).then(setActiveProduct);
        
        setOptimisticQty(prev => {
            const baseReal = itemsRef.current.find(i => i.barcode === clean)?.totalQuantity ?? 0;
            const currentUI = clean === activeBarcode ? (prev ?? baseReal) : baseReal;
            return Math.max(0, currentUI + qtyToApply);
        });

        writeQueue.current.push({ barcode: clean, qty: qtyToApply, loc: currentLocation, ts: Date.now() });
    }, [activeBarcode, trigger, multiplier, currentLocation]);

    const removeItem = useCallback(async (barcode: string) => {
        if (barcode === 'ALL') {
            if (!confirm("¿VACIAR TODO? Se borrarán los conteos físicos y las metas del Excel.")) return;
            // Borrado profundo para dejar la lista vacía
            await Promise.all([
                massiveDb.blindScans.where('batchId').equals(batchId).delete(),
                massiveDb.blindManifests.where('batchId').equals(batchId).delete()
            ]);
            setActiveBarcode(null);
            setOptimisticQty(null);
            SoundFX.play('delete');
        } else {
            await massiveDb.blindScans.where('[batchId+barcode]').equals([batchId, barcode]).delete();
            if (activeBarcode === barcode) {
                setActiveBarcode(null);
                setOptimisticQty(null);
            }
        }
        trigger('undo');
    }, [batchId, activeBarcode, trigger]);

    return { 
        state: { 
            items: dbItems || [], 
            lastScannedItem: useMemo(() => {
                if (!activeBarcode) return null;
                const real = dbItems?.find(i => i.barcode === activeBarcode);
                return real ? { ...real, totalQuantity: optimisticQty ?? real.totalQuantity } : undefined;
            }, [dbItems, activeBarcode, optimisticQty]),
            activeProduct,
            feedback, multiplier, currentLocation
        },
        actions: { 
            setMultiplier, 
            setCurrentLocation, 
            registerScan, 
            removeItem,
            selectItem: (b: string) => { 
                setActiveBarcode(b); 
                setOptimisticQty(itemsRef.current.find(i => i.barcode === b)?.totalQuantity || 0); 
                masterDb.products.get(b).then(setActiveProduct);
            }
        }
    };
};
