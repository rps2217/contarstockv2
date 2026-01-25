
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
 * MOTOR MARTILLO INDUSTRIAL v11.0 - PERFORMANCE ENGINE
 * Diseñado para entornos de 100+ escaneos por minuto.
 */
export const useMassiveScanner = (batchId: string) => {
    const [isFlash, setIsFlash] = useState(false);
    const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
    const [isFlushing, setIsFlushing] = useState(false);
    
    // Unidades en tiempo real (Bypass de DB para la UI principal)
    const [rtTotalUnits, setRtTotalUnits] = useState(0);
    const [velocity, setVelocity] = useState(0); // Scans per minute (UPM)
    
    const buffer = useRef('');
    const lastKeyTime = useRef(0);
    const writeQueue = useRef<{barcode: string, qty: number, ts: number}[]>([]);
    const scanTimestamps = useRef<number[]>([]);
    
    // Consulta reactiva (Fuente de verdad persistida)
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

        // Sincronizar RT total con DB al cargar
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

    // Persistencia Agrupada (Batch Write)
    const flushToDb = useCallback(async () => {
        if (writeQueue.current.length === 0) return;
        setIsFlushing(true);
        const batch = [...writeQueue.current];
        writeQueue.current = [];
        
        try {
            const records = batch.map(b => ({
                batchId, barcode: b.barcode, quantity: b.qty, timestamp: b.ts
            }));
            await massiveDb.blindScans.bulkAdd(records);
        } catch (e) {
            console.error("Flush error, re-queuing...", e);
            writeQueue.current = [...batch, ...writeQueue.current];
        } finally {
            setIsFlushing(false);
        }
    }, [batchId]);

    // Monitor de Velocidad (UPM)
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const oneMinuteAgo = now - 60000;
            // Limpiar timestamps viejos
            scanTimestamps.current = scanTimestamps.current.filter(ts => ts > oneMinuteAgo);
            setVelocity(scanTimestamps.current.length);
            
            // Flush automático
            flushToDb();
        }, 1000);
        return () => clearInterval(interval);
    }, [flushToDb]);

    const registerScan = useCallback(async (code: string, qty: number = 1) => {
        const clean = sanitizeBarcode(code);
        if (!clean || clean.length < 3) return;

        const now = Date.now();
        
        // 1. Efectos Tácticos (0ms)
        setIsFlash(true);
        setLastScannedCode(clean);
        setRtTotalUnits(prev => prev + qty);
        scanTimestamps.current.push(now);
        
        SoundFX.play(qty > 0 ? 'success' : 'delete');
        if (navigator.vibrate) navigator.vibrate(25);
        setTimeout(() => setIsFlash(false), 80);

        // 2. Queue for Persistence
        writeQueue.current.push({ barcode: clean, qty, ts: now });
    }, []);

    const removeItemCompletely = useCallback(async (barcode: string) => {
        await massiveDb.blindScans.where('batchId').equals(batchId).and(s => s.barcode === barcode).delete();
        // Recalcular total RT tras borrado
        const newTotal = (await massiveDb.blindScans.where('batchId').equals(batchId).toArray())
            .reduce((acc, s) => acc + s.quantity, 0);
        setRtTotalUnits(newTotal);
        SoundFX.play('delete');
    }, [batchId]);

    // Listener HID de Alta Velocidad
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
        totalUnits: rtTotalUnits, // Usamos el valor Real-Time
        velocity,
        isFlash, 
        isFlushing,
        lastScannedCode, 
        registerScan, 
        removeItemCompletely 
    };
};
