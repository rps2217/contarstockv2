
import { useState, useEffect, useRef, useCallback } from 'react';
import { massiveDb } from '../db.massive';
import { db as masterDb } from '../db';
import { SoundFX } from '../services/audio';
import { sanitizeBarcode } from '../services/utils';
import { useLiveQuery } from 'dexie-react-hooks';

export interface ConsolidatedBlindItem {
    barcode: string;
    name: string;
    loc?: string;
    totalQuantity: number;
    expectedQty?: number;
    lastTimestamp: number;
}

export const useMassiveScanner = (batchId: string) => {
    const [isFlash, setIsFlash] = useState(false);
    const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
    const [optimisticQty, setOptimisticQty] = useState<number | null>(null);
    
    const buffer = useRef('');
    const lastKeyTime = useRef(0);
    const writeQueue = useRef<{barcode: string, qty: number, ts: number}[]>([]);
    
    const dbItems = useLiveQuery(async () => {
        if (!batchId) return [];
        const rawScans = await massiveDb.blindScans.where('batchId').equals(batchId).toArray();
        const manifests = await massiveDb.blindManifests.where('batchId').equals(batchId).toArray();
        
        const barcodesInBatch = new Set([...rawScans.map(s => s.barcode), ...manifests.map(m => m.barcode)]);
        const products = await masterDb.products.where('barcode').anyOf(Array.from(barcodesInBatch)).toArray();
        
        const prodMap = new Map<string, string>(products.map(p => [p.barcode, p.name]));
        const manifestMap = new Map<string, { qty: number, name?: string, loc?: string }>(
            manifests.map(m => [m.barcode, { qty: m.expectedQty, name: m.name, loc: m.loc }])
        );
        
        const aggregation = new Map<string, ConsolidatedBlindItem>();

        for (const scan of rawScans) {
            const manInfo = manifestMap.get(scan.barcode);
            const existing = aggregation.get(scan.barcode);
            if (existing) {
                existing.totalQuantity += scan.quantity;
                existing.lastTimestamp = Math.max(existing.lastTimestamp, scan.timestamp);
            } else {
                aggregation.set(scan.barcode, {
                    barcode: scan.barcode,
                    name: manInfo?.name || prodMap.get(scan.barcode) || 'SKU_DESCONOCIDO',
                    loc: manInfo?.loc,
                    totalQuantity: scan.quantity,
                    expectedQty: manInfo?.qty,
                    lastTimestamp: scan.timestamp
                });
            }
        }

        for (const m of manifests) {
            if (!aggregation.has(m.barcode)) {
                aggregation.set(m.barcode, {
                    barcode: m.barcode,
                    name: m.name || prodMap.get(m.barcode) || 'PENDIENTE',
                    loc: m.loc,
                    totalQuantity: 0,
                    expectedQty: m.expectedQty,
                    lastTimestamp: 0
                });
            }
        }

        // ORDENAMIENTO DE FOCO ÚNICO: El ítem activo siempre va primero, luego por recencia.
        return Array.from(aggregation.values()).sort((a, b) => {
            if (a.barcode === activeBarcode) return -1;
            if (b.barcode === activeBarcode) return 1;
            return b.lastTimestamp - a.lastTimestamp;
        });
    }, [batchId, activeBarcode]);

    // Sincronizar la cantidad del HUD con los datos reales de la DB cuando cambian
    useEffect(() => {
        if (activeBarcode && dbItems) {
            const item = dbItems.find(i => i.barcode === activeBarcode);
            if (item) setOptimisticQty(item.totalQuantity);
        }
    }, [activeBarcode, dbItems]);

    const flushToDb = useCallback(async () => {
        if (writeQueue.current.length === 0) return;
        const batch = [...writeQueue.current];
        writeQueue.current = [];
        await massiveDb.blindScans.bulkAdd(batch.map(b => ({
            batchId, barcode: b.barcode, quantity: b.qty, timestamp: b.ts
        })));
    }, [batchId]);

    useEffect(() => {
        const timer = setInterval(flushToDb, 800);
        return () => clearInterval(timer);
    }, [flushToDb]);

    const selectItem = useCallback((barcode: string) => {
        setActiveBarcode(barcode);
        SoundFX.play('increment'); // Sonido sutil de selección
        if (navigator.vibrate) navigator.vibrate(15);
    }, []);

    const registerScan = useCallback(async (code: string, qty: number = 1) => {
        const clean = sanitizeBarcode(code);
        if (!clean || clean.length < 3) return;

        const now = Date.now();
        setActiveBarcode(clean);

        // Feedback sensorial inmediato
        SoundFX.play(qty > 0 ? 'success' : 'delete');
        setIsFlash(true);
        if (navigator.vibrate) navigator.vibrate(qty > 0 ? 25 : [50, 30]);
        setTimeout(() => setIsFlash(false), 50);

        // Actualización optimista del HUD
        setOptimisticQty(prev => {
            const baseQty = clean === activeBarcode ? (prev || 0) : (dbItems?.find(i => i.barcode === clean)?.totalQuantity || 0);
            return Math.max(0, baseQty + qty);
        });

        writeQueue.current.push({ barcode: clean, qty, ts: now });
    }, [activeBarcode, dbItems]);

    const removeItemCompletely = useCallback(async (barcode: string) => {
        await massiveDb.blindScans.where('batchId').equals(batchId).and(s => s.barcode === barcode).delete();
        if (activeBarcode === barcode) {
            setActiveBarcode(null);
            setOptimisticQty(null);
        }
        SoundFX.play('delete');
    }, [batchId, activeBarcode]);

    // Hardware Laser Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') return;
            const now = Date.now();
            if (now - lastKeyTime.current > 40) buffer.current = ''; 
            lastKeyTime.current = now;
            if (e.key === 'Enter') {
                if (buffer.current.length >= 3) registerScan(buffer.current);
                buffer.current = '';
            } else if (e.key.length === 1) buffer.current += e.key;
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [registerScan]);

    const lastScannedItem = activeBarcode && dbItems 
        ? dbItems.find(i => i.barcode === activeBarcode) 
        : null;

    return { 
        items: dbItems || [], 
        lastScannedItem: lastScannedItem ? { ...lastScannedItem, totalQuantity: optimisticQty ?? lastScannedItem.totalQuantity } : null,
        isFlash, 
        registerScan, 
        selectItem,
        removeItemCompletely 
    };
};
