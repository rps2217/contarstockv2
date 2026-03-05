
import { useState, useEffect, useRef, useCallback } from 'react';
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

export const useHammerLogic = (batchId: string) => {
    const engine = useScannerEngine(1);
    const [currentLocation, setCurrentLocation] = useState(() => localStorage.getItem('hammer_loc') || 'ZONA-A');
    
    const [optimisticItems, setOptimisticItems] = useState<HammerItem[]>([]);
    const writeQueue = useRef<{barcode: string, qty: number, loc: string, ts: number}[]>([]);
    
    // REFS DE ESTABILIZACIÓN: Imprescindibles para que el escáner HID no se resetee
    const multiplierRef = useRef(1);
    const locationRef = useRef(currentLocation);

    useEffect(() => { multiplierRef.current = engine.multiplier; }, [engine.multiplier]);
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

        return sorted;
    }, [batchId, engine.activeBarcode, engine.feedback]);

    // Sincronizar items optimistas con DB
    useEffect(() => {
        if (dbItems) {
            setOptimisticItems(dbItems);
        }
    }, [dbItems]);

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

    const registerScan = useCallback(async (code: string, qtyOverride?: number) => {
        const clean = sanitizeBarcode(code);
        if (!clean) return;
        
        const delta = qtyOverride ?? multiplierRef.current;
        const ts = Date.now();

        // ACTUALIZACIÓN OPTIMISTA DE LA LISTA
        setOptimisticItems(prev => {
            const existingIdx = prev.findIndex(i => i.barcode === clean);
            if (existingIdx !== -1) {
                const updated = [...prev];
                const item = { ...updated[existingIdx] };
                item.totalQuantity = Math.max(0, item.totalQuantity + delta);
                item.lastTimestamp = ts;
                updated[existingIdx] = item;
                // Re-ordenar para que el activo suba (opcional, pero mejora UX)
                return updated.sort((a, b) => {
                    if (a.barcode === clean) return -1;
                    if (b.barcode === clean) return 1;
                    return b.lastTimestamp - a.lastTimestamp;
                });
            } else {
                // Nuevo item optimista
                const newItem: HammerItem = {
                    barcode: clean,
                    name: 'Cargando...',
                    totalQuantity: delta,
                    lastTimestamp: ts,
                    loc: locationRef.current
                };
                // Buscar nombre en DB de forma asíncrona
                masterDb.products.get(clean).then(p => {
                    if (p) {
                        setOptimisticItems(current => 
                            current.map(i => i.barcode === clean ? { ...i, name: p.name } : i)
                        );
                    }
                });
                return [newItem, ...prev];
            }
        });
        
        masterDb.products.get(clean).then(product => {
            const currentItem = optimisticItems.find(i => i.barcode === clean);
            engine.actions.updateActiveItem(clean, product || null, currentItem?.totalQuantity || 0, delta);
        });

        writeQueue.current.push({ 
            barcode: clean, qty: delta, loc: locationRef.current, ts 
        });
    }, [engine.actions, optimisticItems]);

    return { 
        state: { 
            items: optimisticItems, 
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
            removeItem: async (barcode: string) => {
                if (barcode === 'ALL') {
                    if (!confirm("¿Eliminar todos los registros de este bulto?")) return;
                    await massiveDb.blindScans.where('batchId').equals(batchId).delete();
                    setOptimisticItems([]);
                } else {
                    if (!confirm(`¿Eliminar registros de ${barcode}?`)) return;
                    await massiveDb.blindScans.where({ batchId, barcode }).delete();
                    setOptimisticItems(prev => prev.filter(i => i.barcode !== barcode));
                }
                engine.actions.triggerFeedback('undo');
            },
            selectItem: async (b: string) => {
                const item = optimisticItems.find(i => i.barcode === b);
                const product = await masterDb.products.get(b);
                engine.actions.updateActiveItem(b, product || null, item?.totalQuantity || 0, 0);
            }
        }
    };
};
