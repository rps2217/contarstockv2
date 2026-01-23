
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

export const useMassiveScanner = (batchId: string) => {
    const [isFlash, setIsFlash] = useState(false);
    const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
    const buffer = useRef('');
    const lastKeyTime = useRef(0);
    const collisionGuard = useRef<Map<string, number>>(new Map());
    const REBOUNCE_MS = 250; 

    const items = useLiveQuery(async () => {
        try {
            const rawScans = await massiveDb.blindScans.where('batchId').equals(batchId).toArray();
            const manifests = await massiveDb.blindManifests.where('batchId').equals(batchId).toArray();
            const products = await masterDb.products.toArray();
            
            const prodMap = new Map<string, string>(products.map(p => [p.barcode, p.name]));
            
            // Mapa avanzado del manifiesto (Incluye Qty, Nombre y Loc)
            const manifestMap = new Map<string, { qty: number, name?: string, loc?: string }>(
                manifests.map(m => [m.barcode, { qty: m.expectedQty, name: m.name, loc: m.loc }])
            );
            
            const aggregation = new Map<string, ConsolidatedBlindItem>();

            // 1. Procesar registros escaneados
            for (const scan of rawScans) {
                const manInfo = manifestMap.get(scan.barcode);
                const existing = aggregation.get(scan.barcode);
                
                if (existing) {
                    existing.totalQuantity += scan.quantity;
                    existing.lastTimestamp = Math.max(existing.lastTimestamp, scan.timestamp);
                } else {
                    aggregation.set(scan.barcode, {
                        barcode: scan.barcode,
                        // Prioridad: Manifiesto > DB Maestra > Default
                        name: manInfo?.name || prodMap.get(scan.barcode) || 'SKU_NO_IDENTIFICADO',
                        loc: manInfo?.loc,
                        totalQuantity: scan.quantity,
                        expectedQty: manInfo?.qty,
                        lastTimestamp: scan.timestamp
                    });
                }
            }

            // 2. Incluir items del manifiesto aún no escaneados (Feedback de "Faltantes")
            for (const m of manifests) {
                if (!aggregation.has(m.barcode)) {
                    aggregation.set(m.barcode, {
                        barcode: m.barcode,
                        name: m.name || prodMap.get(m.barcode) || 'PENDIENTE_POR_ESCANEAR',
                        loc: m.loc,
                        totalQuantity: 0,
                        expectedQty: m.expectedQty,
                        lastTimestamp: 0
                    });
                }
            }

            // Ordenar por Ubicación (LOC) y luego por Fecha para flujo logístico lógico
            return Array.from(aggregation.values()).sort((a, b) => {
                if (a.loc && b.loc) return a.loc.localeCompare(b.loc);
                return b.lastTimestamp - a.lastTimestamp;
            });
        } catch (e) {
            return [];
        }
    }, [batchId]);

    const registerScan = useCallback(async (code: string, qty: number = 1) => {
        const clean = sanitizeBarcode(code);
        if (!clean || clean.length < 3) return;

        const now = Date.now();
        const lastTime = collisionGuard.current.get(clean) || 0;
        if (qty > 0 && (now - lastTime) < REBOUNCE_MS) return;
        collisionGuard.current.set(clean, now);
        
        setLastScannedCode(clean);
        setIsFlash(true);
        SoundFX.play(qty > 0 ? 'success' : 'delete');
        if (navigator.vibrate) navigator.vibrate(30);

        setTimeout(() => setIsFlash(false), 100);

        await massiveDb.blindScans.add({
            batchId, barcode: clean, quantity: qty, timestamp: now
        });
    }, [batchId]);

    const removeItemCompletely = useCallback(async (barcode: string) => {
        await massiveDb.blindScans.where('batchId').equals(batchId).and(s => s.barcode === barcode).delete();
        SoundFX.play('delete');
    }, [batchId]);

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

    const totalUnits = items?.reduce((acc, curr) => acc + curr.totalQuantity, 0) || 0;

    return { items: items || [], totalUnits, isFlash, lastScannedCode, registerScan, removeItemCompletely };
};
