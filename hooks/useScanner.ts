
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Dexie from 'dexie';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import * as productService from '../services/productService';
import { sanitizeBarcode } from '../services/utils';
import { getSettings } from '../services/settings';
import { SoundFX } from '../services/audio';
import { CountingSession, Product, ScannerStatus } from '../types';

/**
 * REGLAS DE OPTIMIZACIÓN v2.6:
 * 1. LIMIT: Solo cargar los últimos 20 escaneos para la UI (Evita lag en sesiones de 1000+ items).
 * 2. DECOUPLE: Los totales de sesión se leen del objeto session, no se calculan por reducción de array.
 * 3. FAST-PATH: El cache de productos evita hits innecesarios a IndexedDB.
 */

export const useScanner = (
    session: CountingSession, 
    onCloseSession: () => void, 
    onDiscardSession?: () => void
) => {
    // --- ESTADOS DE UI ---
    const [status, setStatus] = useState<ScannerStatus>('idle');
    const [feedback, setFeedback] = useState<'idle' | 'success' | 'error' | 'undo'>('idle');
    const [lastScanId, setLastScanId] = useState<string | null>(null);
    const [manualInput, setManualInput] = useState('');
    const [multiplier, setMultiplier] = useState(1);
    const [pendingScanCode, setPendingScanCode] = useState<string | null>(null);
    const [pendingProductName, setPendingProductName] = useState('PENDIENTE');
    
    // --- ESTADOS DE SISTEMA ---
    const [isWindowFocused, setIsWindowFocused] = useState(true);
    const [isIdle, setIsIdle] = useState(false);
    const keyBuffer = useRef('');
    const lastKeyTime = useRef(0);
    const hotProductCache = useRef<Map<string, Product>>(new Map());

    // --- CONSULTAS VIVAS OPTIMIZADAS ---
    
    // 1. Solo los últimos 20 registros para la lista lateral/inferior (Mejora brutal de FPS)
    const recentScans = useLiveQuery(
        () => db.scans
            .where('sessionId').equals(session.id)
            .reverse()
            .limit(20)
            .toArray(), 
        [session.id]
    );

    // 2. Metadatos de la sesión para estadísticas globales (Leídos de la tabla sessions, no calculados de scans)
    const sessionMetadata = useLiveQuery(
        () => db.sessions.get(session.id),
        [session.id]
    );

    const lastScan = useMemo(() => {
        if (lastScanId) return recentScans?.find(s => s.id === lastScanId);
        return recentScans?.[0];
    }, [recentScans, lastScanId]);

    // Estadísticas rápidas usando metadatos pre-calculados en DB
    const optimisticTotalQty = sessionMetadata?.totalUnits || 0;
    const optimisticUniqueSkus = sessionMetadata?.totalSKUs || 0;

    // Cálculo específico para el producto activo (Este sí requiere una consulta pequeña)
    const activeProductStats = useLiveQuery(async () => {
        if (!lastScan) return { totalQty: 0, name: 'Listo', isUnknown: false };
        
        // Sumar solo para este SKU específico en esta sesión
        const scans = await db.scans
            .where('[sessionId+barcode]')
            .equals([session.id, lastScan.barcode])
            .toArray();
            
        const qty = scans.reduce((acc, s) => acc + s.quantity, 0);
        const cached = hotProductCache.current.get(lastScan.barcode);
        
        return { 
            totalQty: qty, 
            name: cached?.name || lastScan.barcode, 
            isUnknown: false 
        };
    }, [lastScan, session.id]);

    // --- LÓGICA DE NEGOCIO ---

    const completeScan = useCallback(async (code: string, mm?: number, yyyy?: number) => {
        try {
            const qtyToAdd = multiplier;
            let finalMm = mm;
            let finalYyyy = yyyy;

            // Recuperación de fecha inteligente
            if (mm === undefined && yyyy === undefined) {
                const prev = await db.scans
                    .where('[sessionId+barcode]')
                    .equals([session.id, code])
                    .filter(s => s.mm !== undefined)
                    .first();
                if (prev) {
                    finalMm = prev.mm;
                    finalYyyy = prev.yyyy;
                }
            }

            const newScan = await sessionService.addScan(session.id, code, qtyToAdd, finalMm, finalYyyy);
            
            setLastScanId(newScan.id);
            setFeedback('success');
            SoundFX.play(qtyToAdd > 1 ? 'increment' : 'success');

            const settings = getSettings();
            if (settings.ttsEnabled) {
                const cachedProduct = hotProductCache.current.get(code) || await db.products.get(code);
                SoundFX.speak(cachedProduct?.name || "Registrado");
            }

            setMultiplier(1);
            setStatus('idle');
            setTimeout(() => setFeedback('idle'), 500); // Reducido tiempo de feedback
        } catch (err: any) { 
            setFeedback('error'); 
            SoundFX.play('error'); 
            setStatus('idle');
        }
    }, [session.id, multiplier]);

    const processScan = useCallback(async (code: string) => {
        const cleanCode = sanitizeBarcode(code);
        if (!cleanCode || cleanCode.length < 2) return;
        
        try {
            let masterProduct = hotProductCache.current.get(cleanCode);
            if (!masterProduct) {
                masterProduct = await db.products.get(cleanCode);
                if (masterProduct) hotProductCache.current.set(cleanCode, masterProduct);
            }
            
            if (!masterProduct) {
                const newProd: Product = {
                    barcode: cleanCode,
                    name: 'PENDIENTE',
                    category: 'AUTO_REGISTRO',
                    syncStatus: 'add'
                };
                await productService.saveProduct(newProd);
                masterProduct = newProd;
                hotProductCache.current.set(cleanCode, newProd);
            }

            // ¿Ya está en la sesión?
            const alreadyInSession = await db.scans
                .where('[sessionId+barcode]')
                .equals([session.id, cleanCode])
                .first();

            if (alreadyInSession) {
                completeScan(cleanCode);
            } else {
                setPendingScanCode(cleanCode);
                setPendingProductName(masterProduct.name);
                setStatus('expiring');
            }
        } catch (err) { 
            setFeedback('error'); 
        }
    }, [session.id, completeScan]);

    // --- GESTIÓN DE ENTRADA HARDWARE ---
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (status !== 'idle' && status !== 'manual') return;
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' && status !== 'manual') return;

            const now = Date.now();
            const char = e.key;

            if (now - lastKeyTime.current > 40) { // Umbral de ráfaga más estricto
                keyBuffer.current = char.length === 1 ? char : '';
            } else {
                if (char.length === 1) keyBuffer.current += char;
            }
            lastKeyTime.current = now;

            if (char === 'Enter') {
                e.preventDefault();
                const codeToProcess = keyBuffer.current.trim();
                if (codeToProcess.length >= 2) {
                    processScan(codeToProcess);
                    keyBuffer.current = '';
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [status, processScan]);

    return {
        state: { 
            status, setStatus, feedback, setFeedback, manualInput, setManualInput, 
            multiplier, setMultiplier, isWindowFocused, isIdle, pendingScanCode, 
            pendingProductName,
            optimisticActiveQty: activeProductStats?.totalQty || 0, 
            optimisticTotalQty, 
            optimisticUniqueSkus
        },
        data: { 
            lastScan, 
            recentScans, 
            activeProductStats: activeProductStats || { totalQty: 0, name: 'Cargando...', isUnknown: false }
        },
        actions: { 
            handleExternalScan: processScan,
            handleManualSubmit: (e: any) => {
                e.preventDefault();
                if (manualInput.trim()) processScan(manualInput);
                setManualInput('');
            }, 
            handleDeleteScan: async (e: any, id: string) => {
                e.stopPropagation();
                await sessionService.deleteScan(id);
                SoundFX.play('delete');
            }, 
            handleQuantityChange: async (id: string, currentQty: number, delta: number) => {
                const newQty = Math.max(0, currentQty + delta);
                await sessionService.updateScanQuantity(id, newQty);
            },
            handleExpirationComplete: (mm?: number, yyyy?: number) => {
                if (pendingScanCode) completeScan(pendingScanCode, mm, yyyy);
            }, 
            handleToggleIncident: async (e: any, id: string, status: boolean) => {
                e.stopPropagation();
                await sessionService.updateScanIncident(id, !status);
            }, 
            handleDiscard: () => { if (confirm("¿Descartar sesión?")) onDiscardSession?.(); }
        }
    };
};
