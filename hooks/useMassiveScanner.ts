
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

/**
 * HOOK ULTRA-SENSITIVO PARA MODO MARTILLO INDUSTRIAL
 * Minimiza latencia y resiste ciclos de suspensión del SO.
 */
export const useMassiveScanner = (batchId: string) => {
    const [isFlash, setIsFlash] = useState(false);
    const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
    const [optimisticQty, setOptimisticQty] = useState<number | null>(null);
    
    const buffer = useRef('');
    const lastKeyTime = useRef(0);
    const writeQueue = useRef<{barcode: string, qty: number, ts: number}[]>([]);
    
    // Referencia de sombra para evitar cierres obsoletos (stale closures) en el manejador de eventos
    const itemsRef = useRef<ConsolidatedBlindItem[]>([]);

    // Consulta reactiva
    const dbItems = useLiveQuery(async () => {
        if (!batchId) return [];
        
        const [rawScans, manifests] = await Promise.all([
            massiveDb.blindScans.where('batchId').equals(batchId).toArray(),
            massiveDb.blindManifests.where('batchId').equals(batchId).toArray()
        ]);
        
        const uniqueBarcodes = Array.from(new Set([...rawScans.map(s => s.barcode), ...manifests.map(m => m.barcode)]));
        const products = await masterDb.products.where('barcode').anyOf(uniqueBarcodes).toArray();
        const prodMap = new Map<string, string>(products.map(p => [p.barcode, p.name]));
        
        const aggregation = new Map<string, ConsolidatedBlindItem>();

        for (const m of manifests) {
            aggregation.set(m.barcode, {
                barcode: m.barcode,
                name: m.name || prodMap.get(m.barcode) || 'CARGANDO...',
                loc: m.loc,
                totalQuantity: 0,
                expectedQty: m.expectedQty,
                lastTimestamp: 0
            });
        }

        for (const scan of rawScans) {
            const existing = aggregation.get(scan.barcode);
            if (existing) {
                existing.totalQuantity += scan.quantity;
                existing.lastTimestamp = Math.max(existing.lastTimestamp, scan.timestamp);
            } else {
                aggregation.set(scan.barcode, {
                    barcode: scan.barcode,
                    name: prodMap.get(scan.barcode) || 'SKU_DESCONOCIDO',
                    totalQuantity: scan.quantity,
                    lastTimestamp: scan.timestamp
                });
            }
        }

        const sorted = Array.from(aggregation.values()).sort((a, b) => {
            if (a.barcode === activeBarcode) return -1;
            if (b.barcode === activeBarcode) return 1;
            return b.lastTimestamp - a.lastTimestamp;
        });

        itemsRef.current = sorted;
        return sorted;
    }, [batchId, activeBarcode]);

    // Sincronización de seguridad al recuperar el foco del navegador (post-bloqueo)
    useEffect(() => {
        const handleFocus = () => {
            buffer.current = ''; // Limpiar buffer corrupto
            console.log("[Martillo] Motor reactivado post-suspensión");
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    const flushToDb = useCallback(async () => {
        if (writeQueue.current.length === 0) return;
        const batch = [...writeQueue.current];
        writeQueue.current = [];
        try {
            await massiveDb.blindScans.bulkAdd(batch.map(b => ({
                batchId, barcode: b.barcode, quantity: b.qty, timestamp: b.ts
            })));
        } catch (e) {
            console.error("Fallo persistencia Martillo", e);
            writeQueue.current = [...batch, ...writeQueue.current];
        }
    }, [batchId]);

    useEffect(() => {
        const timer = setInterval(flushToDb, 300);
        return () => clearInterval(timer);
    }, [flushToDb]);

    /**
     * REGISTRO ULTRA-RÁPIDO (Optimismo Total)
     */
    const registerScan = useCallback(async (code: string, qty: number = 1) => {
        const clean = sanitizeBarcode(code);
        if (!clean || clean.length < 2) return;

        const now = Date.now();
        const isSame = clean === activeBarcode;
        
        // 1. Feedback sensorial inmediato (0ms latencia)
        SoundFX.play(qty > 0 ? (qty > 1 ? 'increment' : 'success') : 'delete');
        setIsFlash(true);
        if (navigator.vibrate) navigator.vibrate(qty > 0 ? 25 : [40, 20]);
        setTimeout(() => setIsFlash(false), 50);

        // 2. Actualización de estado local (UI) instantánea
        if (!isSame) setActiveBarcode(clean);
        
        setOptimisticQty(prev => {
            // Buscamos el valor base real en la Ref (que es síncrona), no en el estado asíncrono
            const baseReal = itemsRef.current.find(i => i.barcode === clean)?.totalQuantity ?? 0;
            const currentUI = isSame ? (prev ?? baseReal) : baseReal;
            return Math.max(0, currentUI + qty);
        });

        // 3. Encolar para disco (Background)
        writeQueue.current.push({ barcode: clean, qty, ts: now });
    }, [activeBarcode]);

    const selectItem = useCallback((barcode: string) => {
        const clean = sanitizeBarcode(barcode);
        if (activeBarcode === clean) return;
        
        setActiveBarcode(clean);
        // Al seleccionar manualmente, reseteamos el optimismo para leer el valor real del disco
        const realVal = itemsRef.current.find(i => i.barcode === clean)?.totalQuantity ?? 0;
        setOptimisticQty(realVal); 
        if (navigator.vibrate) navigator.vibrate(10);
    }, [activeBarcode]);

    const removeItemCompletely = useCallback(async (barcode: string) => {
        await massiveDb.blindScans.where('batchId').equals(batchId).and(s => s.barcode === barcode).delete();
        if (activeBarcode === barcode) {
            setActiveBarcode(null);
            setOptimisticQty(null);
        }
        SoundFX.play('delete');
    }, [batchId, activeBarcode]);

    const resetBatch = useCallback(async () => {
        await Promise.all([
            massiveDb.blindScans.where('batchId').equals(batchId).delete(),
            massiveDb.blindManifests.where('batchId').equals(batchId).delete()
        ]);
        setActiveBarcode(null);
        setOptimisticQty(null);
        writeQueue.current = [];
        SoundFX.play('delete');
    }, [batchId]);

    // Motor HID Inmortal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
            
            const now = Date.now();
            if (now - lastKeyTime.current > 50) buffer.current = ''; 
            lastKeyTime.current = now;

            if (e.key === 'Enter') {
                if (buffer.current.length >= 2) {
                    registerScan(buffer.current);
                }
                buffer.current = '';
                e.preventDefault();
            } else if (e.key.length === 1) {
                buffer.current += e.key;
            }
        };
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [registerScan]);

    // Priorización de visualización: Optimista > Real
    const lastScannedItem = useMemo(() => {
        if (!activeBarcode) return null;
        const realItem = dbItems?.find(i => i.barcode === activeBarcode);
        
        // Si no hay item real aún, creamos un placeholder para que la UI no parpadee
        if (!realItem) {
            return {
                barcode: activeBarcode,
                name: 'PROCESANDO...',
                totalQuantity: optimisticQty || 0,
                lastTimestamp: Date.now()
            };
        }

        return { 
            ...realItem, 
            totalQuantity: optimisticQty !== null ? optimisticQty : realItem.totalQuantity 
        };
    }, [dbItems, activeBarcode, optimisticQty]);

    return { 
        items: dbItems || [], 
        lastScannedItem,
        isFlash, 
        registerScan, 
        selectItem,
        removeItemCompletely,
        resetBatch
    };
};
