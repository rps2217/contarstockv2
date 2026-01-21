
import { useState, useEffect, useRef, useCallback } from 'react';
import { massiveDb } from '../db.massive';
import { db as masterDb } from '../db';
import { SoundFX } from '../services/audio';
import { sanitizeBarcode } from '../services/utils';
import { useLiveQuery } from 'dexie-react-hooks';

export interface ConsolidatedBlindItem {
    barcode: string;
    name: string;
    totalQuantity: number;
    lastTimestamp: number;
}

export const useMassiveScanner = (batchId: string) => {
    const [isFlash, setIsFlash] = useState(false);
    const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
    const buffer = useRef('');
    const lastKeyTime = useRef(0);
    
    // Protección contra rebotes de láser (Doble disparo accidental)
    const lastProcessedTime = useRef<number>(0);
    const lastProcessedCode = useRef<string | null>(null);
    const REBOUNCE_MS = 1800; // Bloqueo de 1.8s solo para el MISMO SKU

    const items = useLiveQuery(async () => {
        const rawScans = await massiveDb.blindScans.where('batchId').equals(batchId).toArray();
        const products = await masterDb.products.toArray();
        const prodMap = new Map<string, string>(products.map(p => [p.barcode, p.name]));
        const aggregation = new Map<string, ConsolidatedBlindItem>();

        for (const scan of rawScans) {
            const existing = aggregation.get(scan.barcode);
            if (existing) {
                existing.totalQuantity += scan.quantity;
                existing.lastTimestamp = Math.max(existing.lastTimestamp, scan.timestamp);
            } else {
                aggregation.set(scan.barcode, {
                    barcode: scan.barcode,
                    name: prodMap.get(scan.barcode) || 'SKU DESCONOCIDO',
                    totalQuantity: scan.quantity,
                    lastTimestamp: scan.timestamp
                });
            }
        }
        return Array.from(aggregation.values()).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
    }, [batchId]);

    const registerScan = useCallback(async (code: string, qty: number = 1) => {
        const clean = sanitizeBarcode(code);
        if (!clean || clean.length < 3) return;

        const now = Date.now();
        if (clean === lastProcessedCode.current && (now - lastProcessedTime.current) < REBOUNCE_MS) {
            return; // Evitar duplicado accidental rápido
        }

        try {
            await massiveDb.blindScans.add({
                batchId,
                barcode: clean,
                quantity: qty,
                timestamp: now
            });

            lastProcessedCode.current = clean;
            lastProcessedTime.current = now;
            setLastScannedCode(clean);

            // FEEDBACK MARTILLO INDUSTRIAL
            setIsFlash(true);
            SoundFX.play(qty > 0 ? 'success' : 'delete');
            
            setTimeout(() => setIsFlash(false), 120);
        } catch (e) {
            SoundFX.play('error');
        }
    }, [batchId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') return;
            const now = Date.now();
            if (now - lastKeyTime.current > 45) buffer.current = ''; // Reset buffer si la cadencia es humana
            lastKeyTime.current = now;

            if (e.key === 'Enter') {
                if (buffer.current.length >= 3) registerScan(buffer.current);
                buffer.current = '';
            } else if (e.key.length === 1) {
                buffer.current += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [registerScan]);

    const totalUnits = items?.reduce((acc, curr) => acc + curr.totalQuantity, 0) || 0;

    return { items, totalUnits, isFlash, lastScannedCode, registerScan, updateItemQty: registerScan };
}, [batchId]);
