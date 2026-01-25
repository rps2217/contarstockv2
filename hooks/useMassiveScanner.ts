
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

/**
 * ENGINE MARTILLO v15.0 - ULTRA LATENCY OPTIMIZED
 */
export const useMassiveScanner = (batchId: string) => {
    const [isFlash, setIsFlash] = useState(false);
    const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
    
    // Estado volátil para respuesta visual instantánea en el HUD
    const [optimisticItem, setOptimisticItem] = useState<ConsolidatedBlindItem | null>(null);
    
    const buffer = useRef('');
    const lastKeyTime = useRef(0);
    const writeQueue = useRef<{barcode: string, qty: number, ts: number}[]>([]);
    
    // Sincronización de fondo con la DB
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

        const sorted = Array.from(aggregation.values()).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
        
        // Mantener el ítem optimista actualizado si la DB cambia por debajo
        if (lastScannedCode) {
            const currentInDb = sorted.find(i => i.barcode === lastScannedCode);
            if (currentInDb) {
                setOptimisticItem(prev => prev ? { ...currentInDb, totalQuantity: Math.max(prev.totalQuantity, currentInDb.totalQuantity) } : currentInDb);
            }
        }

        return sorted;
    }, [batchId, lastScannedCode]);

    const flushToDb = useCallback(async () => {
        if (writeQueue.current.length === 0) return;
        const batch = [...writeQueue.current];
        writeQueue.current = [];
        await massiveDb.blindScans.bulkAdd(batch.map(b => ({
            batchId, barcode: b.barcode, quantity: b.qty, timestamp: b.ts
        })));
    }, [batchId]);

    useEffect(() => {
        const timer = setInterval(flushToDb, 1000);
        return () => clearInterval(timer);
    }, [flushToDb]);

    const registerScan = useCallback(async (code: string, qty: number = 1) => {
        const clean = sanitizeBarcode(code);
        if (!clean || clean.length < 3) return;

        const now = Date.now();
        
        // 1. Feedback Inmediato (Flash + Sound)
        setIsFlash(true);
        setLastScannedCode(clean);
        SoundFX.play(qty > 0 ? 'success' : 'delete');
        if (navigator.vibrate) navigator.vibrate(25);
        setTimeout(() => setIsFlash(false), 80);

        // 2. Actualización Optimista del HUD (Sin esperar a la DB)
        setOptimisticItem(prev => {
            if (prev && prev.barcode === clean) {
                return { ...prev, totalQuantity: Math.max(0, prev.totalQuantity + qty), lastTimestamp: now };
            }
            // Si es un SKU nuevo, buscamos datos básicos en lo que ya tenemos
            const existingInList = dbItems?.find(i => i.barcode === clean);
            if (existingInList) {
                return { ...existingInList, totalQuantity: existingInList.totalQuantity + qty, lastTimestamp: now };
            }
            return { barcode: clean, name: 'CARGANDO...', totalQuantity: qty, lastTimestamp: now };
        });

        // 3. Queue para persistencia diferida
        writeQueue.current.push({ barcode: clean, qty, ts: now });
    }, [dbItems]);

    const removeItemCompletely = useCallback(async (barcode: string) => {
        await massiveDb.blindScans.where('batchId').equals(batchId).and(s => s.barcode === barcode).delete();
        if (lastScannedCode === barcode) {
            setLastScannedCode(null);
            setOptimisticItem(null);
        }
    }, [batchId, lastScannedCode]);

    // Listener de Hardware (Láser USB/BT)
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

    return { 
        items: dbItems || [], 
        lastScannedItem: optimisticItem,
        isFlash, 
        registerScan, 
        removeItemCompletely 
    };
};
