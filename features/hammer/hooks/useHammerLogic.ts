
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { massiveDb } from '../../../db.massive';
import { db as masterDb } from '../../../db';
import { sanitizeBarcode } from '../../../services/utils';
import { useFeedbackSystem } from '../../../hooks/useFeedbackSystem';
import { Product } from '../../../types';
import { SoundFX } from '../../../services/audio';

export interface HammerItem {
    barcode: string;
    name: string;
    loc?: string;
    totalQuantity: number;
    expectedQty?: number;
    lastTimestamp: number;
    embedding?: number[];
}

export const useHammerLogic = (batchId: string) => {
    const { feedback, trigger } = useFeedbackSystem(120);
    
    const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [optimisticQty, setOptimisticQty] = useState<number | null>(null);
    const [multiplier, setMultiplier] = useState(1);
    const [currentLocation, setCurrentLocation] = useState(() => localStorage.getItem('hammer_loc') || 'ZONA-A');
    
    const writeQueue = useRef<{barcode: string, qty: number, loc: string, ts: number}[]>([]);
    const itemsCache = useRef<HammerItem[]>([]);

    useEffect(() => { localStorage.setItem('hammer_loc', currentLocation); }, [currentLocation]);

    const dbItems = useLiveQuery(async () => {
        if (!batchId) return [];
        const [rawScans, manifests] = await Promise.all([
            massiveDb.blindScans.where('batchId').equals(batchId).toArray(),
            massiveDb.blindManifests.where('batchId').equals(batchId).toArray()
        ]);
        
        const uniqueBarcodes = Array.from(new Set([...rawScans.map(s => s.barcode), ...manifests.map(m => m.barcode)]));
        const products = uniqueBarcodes.length > 0 ? await masterDb.products.where('barcode').anyOf(uniqueBarcodes).toArray() : [];
        const prodMap = new Map<string, Product>(products.map(p => [p.barcode, p]));
        
        const aggregation = new Map<string, HammerItem>();

        manifests.forEach(m => {
            const pInfo = prodMap.get(m.barcode);
            aggregation.set(m.barcode, {
                barcode: m.barcode,
                name: m.name || pInfo?.name || 'SKU_DESCONOCIDO',
                loc: m.loc,
                totalQuantity: 0,
                expectedQty: m.expectedQty,
                lastTimestamp: 0,
                embedding: pInfo?.embedding
            });
        });

        rawScans.forEach(s => {
            const existing = aggregation.get(s.barcode);
            const pInfo = prodMap.get(s.barcode);
            if (existing) {
                existing.totalQuantity += s.quantity;
                existing.lastTimestamp = Math.max(existing.lastTimestamp, s.timestamp);
                if (s.location) existing.loc = s.location;
                if (existing.name === 'SKU_DESCONOCIDO' && pInfo) existing.name = pInfo.name;
            } else {
                aggregation.set(s.barcode, {
                    barcode: s.barcode,
                    name: pInfo?.name || 'SKU_DESCONOCIDO',
                    totalQuantity: s.quantity,
                    lastTimestamp: s.timestamp,
                    loc: s.location,
                    embedding: pInfo?.embedding
                });
            }
        });

        const sorted = Array.from(aggregation.values()).sort((a, b) => {
            if (a.barcode === activeBarcode) return -1;
            return b.lastTimestamp - a.lastTimestamp;
        });

        itemsCache.current = sorted;
        return sorted;
    }, [batchId, activeBarcode, feedback]);

    useEffect(() => {
        const flush = async () => {
            if (writeQueue.current.length === 0) return;
            const batch = [...writeQueue.current];
            writeQueue.current = [];
            try {
                await massiveDb.blindScans.bulkAdd(batch.map(b => ({
                    batchId, barcode: b.barcode, quantity: b.qty, location: b.loc, timestamp: b.ts
                })));
            } catch (e) {
                writeQueue.current = [...batch, ...writeQueue.current];
            }
        };
        const timer = setInterval(flush, 500);
        return () => { clearInterval(timer); flush(); };
    }, [batchId]);

    const removeItem = useCallback(async (barcode: string) => {
        if (barcode === 'ALL') {
            // LIMPIEZA PROFUNDA: Borra picks y también el manifiesto bajado del Excel
            await Promise.all([
                massiveDb.blindScans.where('batchId').equals(batchId).delete(),
                massiveDb.blindManifests.where('batchId').equals(batchId).delete()
            ]);
            setActiveBarcode(null);
            setOptimisticQty(null);
            SoundFX.play('delete');
        } else {
            // Borrado por SKU usando el nuevo índice compuesto de la v8
            await massiveDb.blindScans.where('[batchId+barcode]').equals([batchId, barcode]).delete();
            if (activeBarcode === barcode) {
                setActiveBarcode(null);
                setOptimisticQty(null);
            }
        }
        trigger('undo');
    }, [batchId, activeBarcode, trigger]);

    const registerScan = useCallback((code: string, qtyOverride?: number) => {
        const clean = sanitizeBarcode(code);
        if (!clean) return;
        
        const qtyToApply = qtyOverride ?? multiplier;
        const existingItem = itemsCache.current.find(i => i.barcode === clean);
        const currentQty = existingItem?.totalQuantity || 0;
        
        if (currentQty + qtyToApply < 0) {
            SoundFX.play('error');
            return;
        }

        trigger(qtyToApply > 0 ? 'success' : 'undo');
        setActiveBarcode(clean);
        
        masterDb.products.get(clean).then(p => {
            if (p) setActiveProduct(p);
        });
        
        setOptimisticQty(prev => {
            const base = currentQty;
            const currentUI = clean === activeBarcode ? (prev ?? base) : base;
            return Math.max(0, currentUI + qtyToApply);
        });

        writeQueue.current.push({ barcode: clean, qty: qtyToApply, loc: currentLocation, ts: Date.now() });
    }, [activeBarcode, trigger, multiplier, currentLocation]);

    const modifyQuantity = useCallback((barcode: string, delta: number) => {
        registerScan(barcode, delta);
    }, [registerScan]);

    const lastScannedItem = useMemo(() => {
        if (!activeBarcode) return undefined;
        const real = dbItems?.find(i => i.barcode === activeBarcode);
        return real ? { ...real, totalQuantity: optimisticQty ?? real.totalQuantity } : undefined;
    }, [dbItems, activeBarcode, optimisticQty]);

    return { 
        state: { 
            items: dbItems || [], 
            lastScannedItem: lastScannedItem as HammerItem | undefined,
            activeProduct,
            feedback, 
            multiplier, 
            currentLocation
        },
        actions: { 
            setMultiplier, 
            setCurrentLocation, 
            registerScan, 
            modifyQuantity,
            removeItem,
            selectItem: (b: string) => { 
                setActiveBarcode(b); 
                const item = itemsCache.current.find(i => i.barcode === b);
                setOptimisticQty(item?.totalQuantity || 0); 
                masterDb.products.get(b).then(setActiveProduct);
            }
        }
    };
};
