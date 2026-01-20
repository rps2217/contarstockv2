
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
    const buffer = useRef('');
    const lastKeyTime = useRef(0);

    // Consulta consolidada: Suma cantidades y busca nombres en la DB maestra
    const items = useLiveQuery(async () => {
        const rawScans = await massiveDb.blindScans
            .where('batchId')
            .equals(batchId)
            .toArray();

        const products = await masterDb.products.toArray();
        // Explicitly type the map to avoid 'unknown' type inference issues
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
                    // FIX: prodMap.get returns string | undefined because of explicit typing above
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

        try {
            await massiveDb.blindScans.add({
                batchId,
                barcode: clean,
                quantity: qty,
                timestamp: Date.now()
            });

            setIsFlash(true);
            SoundFX.play(qty > 0 ? 'increment' : 'delete');
            if (navigator.vibrate) navigator.vibrate(qty > 0 ? 15 : 30);
            setTimeout(() => setIsFlash(false), 100);
        } catch (e) {
            SoundFX.play('error');
        }
    }, [batchId]);

    const updateItemQty = useCallback(async (barcode: string, delta: number) => {
        await registerScan(barcode, delta);
    }, [registerScan]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') return;
            const now = Date.now();
            if (now - lastKeyTime.current > 40) buffer.current = '';
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

    return { items, totalUnits, isFlash, registerScan, updateItemQty };
};
