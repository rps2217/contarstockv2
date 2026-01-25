
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

export const useMassiveScanner = (batchId: string) => {
    const [isFlash, setIsFlash] = useState(false);
    const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
    const [isFlushing, setIsFlushing] = useState(false);
    
    const [rtTotalUnits, setRtTotalUnits] = useState(0);
    const [velocity, setVelocity] = useState(0);
    
    const buffer = useRef('');
    const lastKeyTime = useRef(0);
    const writeQueue = useRef<{barcode: string, qty: number, ts: number}[]>([]);
    const scanTimestamps = useRef<number[]>([]);
    
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
        let runningTotal = 0;

        for (const scan of rawScans) {
            runningTotal += scan.quantity;
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

        setRtTotalUnits(runningTotal);

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

    // Último ítem escaneado enriquecido para el HUD
    const lastScannedItem = useMemo(() => {
        if (!lastScannedCode || !dbItems) return null;
        return dbItems.find(i => i.barcode === lastScannedCode) || null;
    }, [lastScannedCode, dbItems]);

    const flushToDb = useCallback(async () => {
        if (writeQueue.current.length === 0) return;
        setIsFlushing(true);
        const batch = [...writeQueue.current];
        writeQueue.current = [];
        try {
            await massiveDb.blindScans.bulkAdd(batch.map(b => ({
                batchId, barcode: b.barcode, quantity: b.qty, timestamp: b.ts
            })));
        } catch (e) {
            writeQueue.current = [...batch, ...writeQueue.current];
        } finally {
            setIsFlushing(false);
        }
    }, [batchId]);

    useEffect(() => {
        const interval = setInterval(() => {
            const oneMinAgo = Date.now() - 60000;
            scanTimestamps.current = scanTimestamps.current.filter(ts => ts > oneMinAgo);
            setVelocity(scanTimestamps.current.length);
            flushToDb();
        }, 1000);
        return () => clearInterval(interval);
    }, [flushToDb]);

    const registerScan = useCallback(async (code: string, qty: number = 1) => {
        const clean = sanitizeBarcode(code);
        if (!clean || clean.length < 3) return;
        const now = Date.now();
        setIsFlash(true);
        setLastScannedCode(clean);
        setRtTotalUnits(prev => prev + qty);
        scanTimestamps.current.push(now);
        SoundFX.play(qty > 0 ? 'success' : 'delete');
        if (navigator.vibrate) navigator.vibrate(25);
        setTimeout(() => setIsFlash(false), 80);
        writeQueue.current.push({ barcode: clean, qty, ts: now });
    }, []);

    const removeItemCompletely = useCallback(async (barcode: string) => {
        await massiveDb.blindScans.where('batchId').equals(batchId).and(s => s.barcode === barcode).delete();
        if (lastScannedCode === barcode) setLastScannedCode(null);
        SoundFX.play('delete');
    }, [batchId, lastScannedCode]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') return;
            const now = Date.now();
            if (now - lastKeyTime.current > 50) buffer.current = ''; 
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
        totalUnits: rtTotalUnits,
        lastScannedItem,
        velocity,
        isFlash, 
        isFlushing,
        registerScan, 
        removeItemCompletely 
    };
};
