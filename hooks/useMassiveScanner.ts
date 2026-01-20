
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
    
    // Motor Anti-Spam (Debounce inteligente por SKU)
    const lastProcessedCode = useRef<string | null>(null);
    const lastProcessedTime = useRef<number>(0);
    const DEBOUNCE_SAME_SKU = 2500; // 2.5s de protección para el mismo ítem

    // Consulta consolidada con cruce de nombres del catálogo maestro
    const items = useLiveQuery(async () => {
        const rawScans = await massiveDb.blindScans
            .where('batchId')
            .equals(batchId)
            .toArray();

        // Carga ligera del catálogo para mapeo de nombres
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
                    name: prodMap.get(scan.barcode) || 'SKU NO EN MAESTRO',
                    totalQuantity: scan.quantity,
                    lastTimestamp: scan.timestamp
                });
            }
        }

        // Ordenar por el más reciente arriba
        return Array.from(aggregation.values()).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
    }, [batchId]);

    const registerScan = useCallback(async (code: string, qty: number = 1) => {
        const clean = sanitizeBarcode(code);
        if (!clean || clean.length < 3) return;

        const now = Date.now();
        
        // --- PROTECCIÓN ANTI-SPAM (Martillo Industrial) ---
        // Si es el mismo código que el anterior, aplicamos el bloqueo de tiempo.
        // Si el código cambia, permitimos el registro inmediato (ráfaga de distintos productos).
        if (clean === lastProcessedCode.current) {
            if ((now - lastProcessedTime.current) < DEBOUNCE_SAME_SKU) {
                console.log(`[Escudo] Spam bloqueado para: ${clean}`);
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

            // Actualizar rastro
            lastProcessedCode.current = clean;
            lastProcessedTime.current = now;

            // Feedback Visual y Beep de éxito
            setIsFlash(true);
            SoundFX.play(qty > 0 ? 'success' : 'delete');
            
            if (navigator.vibrate) navigator.vibrate(30);
            setTimeout(() => setIsFlash(false), 80);
        } catch (e) {
            SoundFX.play('error');
        }
    }, [batchId]);

    const updateItemQty = useCallback(async (barcode: string, delta: number) => {
        // En ajustes manuales (+/-) puenteamos el anti-spam para permitir ajustes rápidos
        lastProcessedCode.current = null; 
        await registerScan(barcode, delta);
    }, [registerScan]);

    // MOTOR HID: Escucha global de escáneres físicos (Pistolas Láser/BT)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // No capturar si el foco está en un input de texto (ajustes, etc)
            if ((e.target as HTMLElement).tagName === 'INPUT') return;
            
            const now = Date.now();
            // Los escáneres físicos disparan ráfagas con < 30ms de diferencia
            if (now - lastKeyTime.current > 50) {
                buffer.current = ''; 
            }
            lastKeyTime.current = now;

            if (e.key === 'Enter') {
                if (buffer.current.length >= 3) {
                    registerScan(buffer.current);
                }
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
