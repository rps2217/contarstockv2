
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

/**
 * HOOK MARTILLO INDUSTRIAL v10.0 - ENGINE OPTIMIZED
 * Utiliza un patrón de "Write-Behind" para garantizar 60FPS.
 */
export const useMassiveScanner = (batchId: string) => {
    const [isFlash, setIsFlash] = useState(false);
    const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
    
    // Caché volátil para respuesta instantánea (UI)
    const [optimisticItems, setOptimisticItems] = useState<Map<string, number>>(new Map());
    
    const buffer = useRef('');
    const lastKeyTime = useRef(0);
    const collisionGuard = useRef<Map<string, number>>(new Map());
    const writeQueue = useRef<{barcode: string, qty: number, ts: number}[]>([]);
    
    // Consulta reactiva de la DB (Fuente de verdad)
    const dbItems = useLiveQuery(async () => {
        if (!batchId) return [];
        const rawScans = await massiveDb.blindScans.where('batchId').equals(batchId).toArray();
        const manifests = await massiveDb.blindManifests.where('batchId').equals(batchId).toArray();
        
        const barcodesInBatch = new Set([...rawScans.map(s => s.barcode), ...manifests.map(m => m.barcode)]);
        const products = await masterDb.products.where('barcode').anyOf(Array.from(barcodesInBatch)).toArray();
        
        // Explicitly type Maps to resolve 'unknown' property access and arithmetic errors
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
                    // FIX: Explicitly typed manifestMap provides typed manInfo to resolve 'unknown' property access
                    name: manInfo?.name || prodMap.get(scan.barcode) || 'SKU_DESCONOCIDO',
                    // FIX: Explicitly typed manifestMap provides typed manInfo to resolve 'unknown' property access
                    loc: manInfo?.loc,
                    totalQuantity: scan.quantity,
                    // FIX: Explicitly typed manifestMap provides typed manInfo to resolve 'unknown' property access
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

        return Array.from(aggregation.values()).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
    }, [batchId]);

    // Persistencia debounced para no bloquear el hilo principal
    const flushToDb = useCallback(async () => {
        if (writeQueue.current.length === 0) return;
        const batch = [...writeQueue.current];
        writeQueue.current = [];
        
        const records = batch.map(b => ({
            batchId, barcode: b.barcode, quantity: b.qty, timestamp: b.ts
        }));
        
        await massiveDb.blindScans.bulkAdd(records);
    }, [batchId]);

    useEffect(() => {
        const timer = setInterval(flushToDb, 1000);
        return () => clearInterval(timer);
    }, [flushToDb]);

    const registerScan = useCallback(async (code: string, qty: number = 1) => {
        const clean = sanitizeBarcode(code);
        if (!clean || clean.length < 3) return;

        const now = Date.now();
        
        // 1. Feedback Sensorial (0ms latency)
        setIsFlash(true);
        setLastScannedCode(clean);
        SoundFX.play(qty > 0 ? 'success' : 'delete');
        if (navigator.vibrate) navigator.vibrate(25);
        setTimeout(() => setIsFlash(false), 80);

        // 2. Registro en cola de escritura
        writeQueue.current.push({ barcode: clean, qty, ts: now });

        // 3. Actualización Optimista de la UI (Caché local)
        setOptimisticItems(prev => {
            // FIX: Explicitly typing the Map ensures get() returns number|undefined instead of unknown, fixing arithmetic '+' operator error.
            const next = new Map<string, number>(prev);
            const currentQty = next.get(clean) || 0;
            next.set(clean, currentQty + qty);
            return next;
        });
    }, []);

    const removeItemCompletely = useCallback(async (barcode: string) => {
        await massiveDb.blindScans.where('batchId').equals(batchId).and(s => s.barcode === barcode).delete();
        SoundFX.play('delete');
    }, [batchId]);

    // Listener de Hardware optimizado
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

    const totalUnits = dbItems?.reduce((acc, curr) => acc + curr.totalQuantity, 0) || 0;

    return { 
        items: dbItems || [], 
        totalUnits, 
        isFlash, 
        lastScannedCode, 
        registerScan, 
        removeItemCompletely 
    };
};
