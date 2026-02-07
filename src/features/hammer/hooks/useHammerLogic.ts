
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { massiveDb } from '../../../db.massive';
import { db as masterDb } from '../../../db';
import { sanitizeBarcode } from '../../../services/utils';
import { useFeedbackSystem } from '../../../hooks/useFeedbackSystem';
import { Product } from '../../../types';

export interface HammerItem {
    barcode: string;
    name: string;
    loc?: string;
    totalQuantity: number;
    expectedQty?: number;
    lastTimestamp: number;
}

export const useHammerLogic = (batchId: string) => {
    const { feedback, trigger } = useFeedbackSystem(150);
    
    // Estado Operativo
    const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [optimisticQty, setOptimisticQty] = useState<number | null>(null);
    const [multiplier, setMultiplier] = useState(1);
    const [currentLocation, setCurrentLocation] = useState(() => localStorage.getItem('hammer_loc') || 'ZONA-A');
    
    // Buffer de Escritura (Optimización de I/O)
    const writeQueue = useRef<{barcode: string, qty: number, loc: string, ts: number}[]>([]);
    const itemsCache = useRef<HammerItem[]>([]);

    useEffect(() => { localStorage.setItem('hammer_loc', currentLocation); }, [currentLocation]);

    // Query Reactiva a la Base de Datos (Dexie)
    const dbItems = useLiveQuery(async () => {
        if (!batchId) return [];
        
        // Parallel Fetch
        const [rawScans, manifests] = await Promise.all([
            massiveDb.blindScans.where('batchId').equals(batchId).toArray(),
            massiveDb.blindManifests.where('batchId').equals(batchId).toArray()
        ]);
        
        const uniqueBarcodes = new Set([...rawScans.map(s => s.barcode), ...manifests.map(m => m.barcode)]);
        const products = await masterDb.products.where('barcode').anyOf(Array.from(uniqueBarcodes)).toArray();
        const prodMap = new Map<string, Product>(products.map(p => [p.barcode, p]));
        
        const aggregation = new Map<string, HammerItem>();

        // 1. Hidratar con Manifiesto (Metas)
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

        // 2. Aplicar Escaneos Reales
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
            if (a.barcode === activeBarcode) return -1; // Active item always on top
            return b.lastTimestamp - a.lastTimestamp;
        });

        itemsCache.current = sorted;
        return sorted;
    }, [batchId, activeBarcode, feedback]); // Feedback dependency forces refresh on scan

    // Flush Loop (Escritura en Bucle)
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
                console.error("Write failed, retrying", e);
                writeQueue.current = [...batch, ...writeQueue.current]; // Re-queue on fail
            }
        };
        const timer = setInterval(flush, 500); // 500ms debounce
        return () => { clearInterval(timer); flush(); };
    }, [batchId]);

    // Acciones Públicas
    const registerScan = useCallback((code: string, qtyOverride?: number) => {
        const clean = sanitizeBarcode(code);
        if (!clean) return;
        
        const qtyToApply = qtyOverride ?? multiplier;
        trigger(qtyToApply > 0 ? 'success' : 'undo');
        
        setActiveBarcode(clean);
        masterDb.products.get(clean).then(setActiveProduct);
        
        // Optimistic UI Update
        setOptimisticQty(prev => {
            const baseReal = itemsCache.current.find(i => i.barcode === clean)?.totalQuantity ?? 0;
            const currentUI = clean === activeBarcode ? (prev ?? baseReal) : baseReal;
            return Math.max(0, currentUI + qtyToApply);
        });

        writeQueue.current.push({ barcode: clean, qty: qtyToApply, loc: currentLocation, ts: Date.now() });
    }, [activeBarcode, trigger, multiplier, currentLocation]);

    const modifyQuantity = useCallback((barcode: string, delta: number) => {
        const item = itemsCache.current.find(i => i.barcode === barcode);
        if (item && item.totalQuantity + delta <= 0) {
             // Remove logic handled externally or implies 0
             // For hammer mode, we allow adding negative records to fix counts
        }
        registerScan(barcode, delta);
    }, [registerScan]);

    const removeItem = async (barcode: string) => {
        await massiveDb.blindScans.where({ batchId, barcode }).delete();
        if (activeBarcode === barcode) setActiveBarcode(null);
        trigger('undo');
    };

    const lastScannedItem = useMemo(() => {
        if (!activeBarcode) return null;
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
                setOptimisticQty(itemsCache.current.find(i => i.barcode === b)?.totalQuantity || 0); 
                masterDb.products.get(b).then(setActiveProduct);
            }
        }
    };
};
