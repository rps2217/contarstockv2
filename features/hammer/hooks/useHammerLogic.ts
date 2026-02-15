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

/**
 * HOOK MARTILLO INDUSTRIAL v6.5
 * Optimizado para PDAs de alto rendimiento y ráfagas HID.
 */
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

    // Query unificada de base de datos masiva
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

        // 1. Cargar metas teóricas (STOCK)
        manifests.forEach(m => {
            const pInfo = prodMap.get(m.barcode);
            aggregation.set(m.barcode, {
                barcode: m.barcode,
                name: m.name || pInfo?.name || 'SKU_DESCONOCIDO',
                loc: m.loc,
                totalQuantity: 0,
                expectedQty: m.expectedQty,
                lastTimestamp: 0
            });
        });

        // 2. Sumar picks físicos registrados
        rawScans.forEach(s => {
            const existing = aggregation.get(s.barcode);
            const pInfo = prodMap.get(s.barcode);
            if (existing) {
                existing.totalQuantity += s.quantity;
                existing.lastTimestamp = Math.max(existing.lastTimestamp, s.timestamp);
                if (s.location) existing.loc = s.location;
            } else {
                aggregation.set(s.barcode, {
                    barcode: s.barcode,
                    name: pInfo?.name || 'SKU_DESCONOCIDO',
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

        itemsCache.current = sorted;
        return sorted;
    }, [batchId, activeBarcode, feedback]);

    // Persistencia flush ultra-rápida (PDA Burst Ready)
    useEffect(() => {
        const flush = async () => {
            if (writeQueue.current.length === 0) return;
            const batch = [...writeQueue.current];
            writeQueue.current = [];
            try {
                // Escritura directa por lotes
                await massiveDb.blindScans.bulkAdd(batch.map(b => ({
                    batchId, barcode: b.barcode, quantity: b.qty, location: b.loc, timestamp: b.ts
                })));
            } catch (e) {
                // Fallback de reintento
                writeQueue.current = [...batch, ...writeQueue.current];
            }
        };
        const timer = setInterval(flush, 300); // Reducido de 600 a 300ms para mayor velocidad
        return () => { clearInterval(timer); flush(); };
    }, [batchId]);

    const registerScan = useCallback((code: string, qtyOverride?: number) => {
        const clean = sanitizeBarcode(code);
        if (!clean) return;
        
        const qtyToApply = qtyOverride ?? multiplier;
        const existingItem = itemsCache.current.find(i => i.barcode === clean);
        const currentQty = existingItem?.totalQuantity || 0;
        
        // Protección anti-negativos extrema
        if (currentQty + qtyToApply < 0) {
            SoundFX.play('error');
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            return;
        }

        trigger(qtyToApply > 0 ? 'success' : 'undo');
        setActiveBarcode(clean);
        
        masterDb.products.get(clean).then(p => {
            if (p) setActiveProduct(p);
        });
        
        // UI OPTIMISTA: Actualización visual instantánea sin esperar a IndexedDB
        setOptimisticQty(prev => {
            const base = currentQty;
            const currentUI = clean === activeBarcode ? (prev ?? base) : base;
            return Math.max(0, currentUI + qtyToApply);
        });

        writeQueue.current.push({ barcode: clean, qty: qtyToApply, loc: currentLocation, ts: Date.now() });
    }, [activeBarcode, trigger, multiplier, currentLocation]);

    const removeItem = useCallback(async (barcode: string) => {
        if (barcode === 'ALL') {
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
            // Fix: Expose activeBarcode to state to fix errors in HammerPage
            activeBarcode,
            // Fix: Expose optimisticQty to state to fix errors in HammerPage
            optimisticQty,
            lastScannedItem: useMemo(() => {
                if (!activeBarcode) return undefined;
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
            modifyQuantity: (b: string, d: number) => registerScan(b, d),
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