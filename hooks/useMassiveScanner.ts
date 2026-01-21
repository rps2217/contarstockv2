
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
    
    // Motor de Colisión Mecánico (Evita re-procesamiento por SKU en ráfaga rápida)
    const collisionGuard = useRef<Map<string, number>>(new Map());
    const REBOUNCE_MS = 1400;

    // Consulta reactiva blindada
    const items = useLiveQuery(async () => {
        try {
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
                        name: prodMap.get(scan.barcode) || 'SKU_NO_IDENTIFICADO',
                        totalQuantity: scan.quantity,
                        lastTimestamp: scan.timestamp
                    });
                }
            }
            return Array.from(aggregation.values()).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
        } catch (e) {
            return [];
        }
    }, [batchId]);

    const registerScan = useCallback(async (code: string, qty: number = 1) => {
        const clean = sanitizeBarcode(code);
        if (!clean || clean.length < 3) return;

        const now = Date.now();
        const lastTime = collisionGuard.current.get(clean) || 0;
        
        // MOTOR DE COLISIÓN: Bloqueo de rebote óptico
        if (qty > 0 && (now - lastTime) < REBOUNCE_MS) return;

        try {
            collisionGuard.current.set(clean, now);
            
            // UI Feedback (Atomic Update)
            setLastScannedCode(clean);
            setIsFlash(true);
            SoundFX.play(qty > 0 ? 'success' : 'delete');
            setTimeout(() => setIsFlash(false), 80);

            // Persistencia asíncrona fuera del ciclo de render para evitar invariantes
            massiveDb.blindScans.add({
                batchId,
                barcode: clean,
                quantity: qty,
                timestamp: now
            }).catch(err => console.error("CollisionEngine_WriteError", err));

        } catch (e) {
            console.error("CollisionEngine_Fatal", e);
        }
    }, [batchId]);

    // Listener HID Industrial
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

    return { items, totalUnits, isFlash, lastScannedCode, registerScan };
};
