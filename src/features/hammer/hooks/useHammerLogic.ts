
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
 * HOOK MARTILLO v6.0 (Modular)
 */
export const useHammerLogic = (batchId: string) => {
    // Usamos el motor unificado de escaneo
    const engine = useScannerEngine(1);
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

    // Persistencia flush
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
        }, 500);
        return () => clearInterval(timer);
    }, [batchId]);

    const registerScan = useCallback(async (code: string, qtyOverride?: number) => {
        const clean = sanitizeBarcode(code);
        if (!clean) return;
        
        const delta = qtyOverride ?? engine.multiplier;
        const existing = itemsCache.current.find(i => i.barcode === clean);
        const currentBaseQty = existing?.totalQuantity || 0;
        
        if (currentBaseQty + delta < 0) {
            SoundFX.play('error');
            return;
        }

        const product = await masterDb.products.get(clean);
        engine.actions.updateActiveItem(clean, product || null, currentBaseQty, delta);

        writeQueue.current.push({ barcode: clean, qty: delta, loc: currentLocation, ts: Date.now() });
    }, [engine, currentLocation]);

    const removeItem = useCallback(async (barcode: string) => {
        if (barcode === 'ALL') {
            await massiveDb.blindScans.where('batchId').equals(batchId).delete();
            engine.actions.resetActive();
        } else {
            await massiveDb.blindScans.where({ batchId, barcode }).delete();
            if (engine.activeBarcode === barcode) engine.actions.resetActive();
        }
        engine.actions.triggerFeedback('undo');
    }, [batchId, engine]);

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
