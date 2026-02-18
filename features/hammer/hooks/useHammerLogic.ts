
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { massiveDb } from '../../../db.massive';
import { db as masterDb } from '../../../db';
import { sanitizeBarcode } from '../../../services/utils';
import { useScannerEngine } from '../../../shared/hooks/useScannerEngine';
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
 * HOOK MARTILLO v7.0 (Ultra-Fast HID Stabilized)
 */
export const useHammerLogic = (batchId: string) => {
    const engine = useScannerEngine(1);
    const [currentLocation, setCurrentLocation] = useState(() => localStorage.getItem('hammer_loc') || 'ZONA-A');
    
    const writeQueue = useRef<{barcode: string, qty: number, loc: string, ts: number}[]>([]);
    const itemsCache = useRef<HammerItem[]>([]);
    
    // REFS DE ESTABILIZACIÓN: Evitan que registerScan cambie su identidad en cada pick
    const multiplierRef = useRef(1);
    const locationRef = useRef(currentLocation);

    useEffect(() => { 
        multiplierRef.current = engine.multiplier;
    }, [engine.multiplier]);

    useEffect(() => { 
        locationRef.current = currentLocation;
        localStorage.setItem('hammer_loc', currentLocation); 
    }, [currentLocation]);

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
                lastTimestamp: 0
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
                    loc: s.location
                });
            }
        });

        const sorted = Array.from(aggregation.values()).sort((a, b) => {
            if (a.barcode === engine.activeBarcode) return -1;
            return b.lastTimestamp - a.lastTimestamp;
        });

        itemsCache.current = sorted;
        return sorted;
    }, [batchId, engine.activeBarcode, engine.feedback]);

    // Persistencia por lotes (Flush)
    useEffect(() => {
        const timer = setInterval(async () => {
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
        }, 400);
        return () => clearInterval(timer);
    }, [batchId]);

    /**
     * REGISTRO DE ALTA VELOCIDAD
     * Esta función ya no depende de estados externos, permitiendo que useHIDScanner 
     * mantenga el puerto de escucha abierto sin interrupciones.
     */
    const registerScan = useCallback(async (code: string, qtyOverride?: number) => {
        const clean = sanitizeBarcode(code);
        if (!clean) return;
        
        const delta = qtyOverride ?? multiplierRef.current;
        const existing = itemsCache.current.find(i => i.barcode === clean);
        const currentBaseQty = existing?.totalQuantity || 0;
        
        if (currentBaseQty + delta < 0) {
            SoundFX.play('error');
            return;
        }

        // Búsqueda asíncrona pero sin bloquear el hilo
        masterDb.products.get(clean).then(product => {
            engine.actions.updateActiveItem(clean, product || null, currentBaseQty, delta);
        });

        // Encolado instantáneo
        writeQueue.current.push({ 
            barcode: clean, 
            qty: delta, 
            loc: locationRef.current, 
            ts: Date.now() 
        });
    }, [engine.actions]); // Única dependencia estable

    const removeItem = useCallback(async (barcode: string) => {
        if (barcode === 'ALL') {
            await massiveDb.blindScans.where('batchId').equals(batchId).delete();
            engine.actions.resetActive();
        } else {
            await massiveDb.blindScans.where({ batchId, barcode }).delete();
            if (engine.activeBarcode === barcode) engine.actions.resetActive();
        }
        engine.actions.triggerFeedback('undo');
    }, [batchId, engine.actions, engine.activeBarcode]);

    return { 
        state: { 
            items: dbItems || [], 
            activeBarcode: engine.activeBarcode,
            activeProduct: engine.activeProduct,
            feedback: engine.feedback,
            multiplier: engine.multiplier,
            optimisticQty: engine.optimisticQty,
            currentLocation
        },
        actions: { 
            setMultiplier: engine.setMultiplier,
            setCurrentLocation, 
            registerScan, 
            removeItem,
            selectItem: async (b: string) => {
                const item = itemsCache.current.find(i => i.barcode === b);
                const product = await masterDb.products.get(b);
                engine.actions.updateActiveItem(b, product || null, item?.totalQuantity || 0, 0);
            }
        }
    };
};
