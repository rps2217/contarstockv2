
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

/**
 * MOTOR MARTILLO INDUSTRIAL v8.0
 * Optimizado para ráfagas de >120 PPM (Puntos Por Minuto)
 */
export const useMassiveScanner = (batchId: string) => {
    const [isFlash, setIsFlash] = useState(false);
    const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
    const buffer = useRef('');
    const lastKeyTime = useRef(0);
    
    // RAM BUFFER: Para respuesta instantánea <5ms
    const ramCounter = useRef<Map<string, number>>(new Map());
    
    // DEBOUNCE TÁCTICO: Bloqueo inteligente por SKU
    const lastProcessedTime = useRef<Map<string, number>>(new Map());
    const REBOUNCE_MS = 1400; // Ventana de protección para mismo item

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
        const lastTime = lastProcessedTime.current.get(clean) || 0;
        
        // MOTOR DE COLISIÓN ÓPTICA: Evitar disparos accidentales del mismo laser
        if (qty > 0 && (now - lastTime) < REBOUNCE_MS) return;

        try {
            // 1. UPDATE RAM (Optimismo Absoluto)
            const currentRam = ramCounter.current.get(clean) || 0;
            ramCounter.current.set(clean, currentRam + qty);
            
            lastProcessedTime.current.set(clean, now);
            setLastScannedCode(clean);

            // 2. VISUAL IMPACT (Inmediato)
            setIsFlash(true);
            SoundFX.play(qty > 0 ? 'success' : 'delete');
            setTimeout(() => setIsFlash(false), 80); // Impacto más corto para ráfaga rápida

            // 3. PERSISTENCIA ASÍNCRONA (Fire and Forget)
            massiveDb.blindScans.add({
                batchId,
                barcode: clean,
                quantity: qty,
                timestamp: now
            }).catch(err => {
                console.error("Fallo crítico de escritura en Martillo:", err);
                SoundFX.play('error');
            });

        } catch (e) {
            SoundFX.play('error');
        }
    }, [batchId]);

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
}, [batchId]);
