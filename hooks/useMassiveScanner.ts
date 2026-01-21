
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
    
    // Motor Anti-Spam Industrial: Evita lecturas accidentales repetitivas
    const lastProcessedCode = useRef<string | null>(null);
    const lastProcessedTime = useRef<number>(0);
    const DEBOUNCE_SAME_SKU = 2200; // 2.2s de bloqueo para el MISMO SKU

    // Consulta consolidada con cruce de nombres en tiempo real
    const items = useLiveQuery(async () => {
        const rawScans = await massiveDb.blindScans
            .where('batchId')
            .equals(batchId)
            .toArray();

        // Mapeo optimizado de nombres desde catálogo maestro
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
                    name: prodMap.get(scan.barcode) || 'SKU SIN DESCRIPCIÓN',
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
        
        // --- FILTRO DE SENSIBILIDAD ---
        // Si escaneas el mismo producto dos veces seguidas muy rápido, lo ignoramos.
        // Si escaneas un producto DIFERENTE, el bloqueo se resetea al instante.
        if (clean === lastProcessedCode.current) {
            if ((now - lastProcessedTime.current) < DEBOUNCE_SAME_SKU) {
                console.log(`[Escudo] Intento de duplicado bloqueado por sensibilidad: ${clean}`);
                return;
            }
        }

        try {
            await massiveDb.blindScans.add({
                batchId,
                barcode: clean,
                quantity: qty,
                timestamp: now
            });

            // Actualizamos rastro
            lastProcessedCode.current = clean;
            lastProcessedTime.current = now;

            // Feedback Visual y Auditivo instantáneo
            setIsFlash(true);
            SoundFX.play(qty > 0 ? 'success' : 'delete');
            
            if (navigator.vibrate) navigator.vibrate(qty > 0 ? 30 : 60);
            setTimeout(() => setIsFlash(false), 80);
        } catch (e) {
            SoundFX.play('error');
        }
    }, [batchId]);

    const updateItemQty = useCallback(async (barcode: string, delta: number) => {
        // En ajustes manuales (+/-) puenteamos el anti-spam para permitir fluidez táctil
        lastProcessedCode.current = null; 
        await registerScan(barcode, delta);
    }, [registerScan]);

    // Escucha global de escáneres de hardware (Pistolas HID)
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
