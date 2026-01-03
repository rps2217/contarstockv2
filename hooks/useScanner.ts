
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
import { predictNextSkus } from '../services/predictiveService';

export const useScanner = (
    session: CountingSession, 
    onCloseSession: () => void, 
    onDiscardSession?: () => void
) => {
    const [status, setStatus] = useState<ScannerStatus>('idle');
    const [feedback, setFeedback] = useState<'idle' | 'success' | 'error' | 'undo'>('idle');
    const [lastScanId, setLastScanId] = useState<string | null>(null);
    const [manualInput, setManualInput] = useState('');
    const [multiplier, setMultiplier] = useState(1);
    const [pendingScanCode, setPendingScanCode] = useState<string | null>(null);
    const [pendingProductName, setPendingProductName] = useState('Nuevo Producto');
    const [isWindowFocused, setIsWindowFocused] = useState(true);
    const [isIdle, setIsIdle] = useState(false);
    
    // Buffer para escáner físico (Hardware Keyboard Emulation)
    const keyBuffer = useRef('');
    const lastKeyTime = useRef(0);
    const hotProductCache = useRef<Map<string, Product>>(new Map());
    const scanHistory = useRef<string[]>([]);

    const recentScans = useLiveQuery(
        () => db.scans.where('[sessionId+timestamp]').between([session.id, Dexie.minKey], [session.id, Dexie.maxKey]).reverse().limit(20).toArray(), 
        [session.id]
    );

    const lastScan = useMemo(() => recentScans?.find(s => s.id === lastScanId) || recentScans?.[0], [recentScans, lastScanId]);

    const optimisticTotalQty = useMemo(() => 
        recentScans?.reduce((acc, s) => acc + s.quantity, 0) || 0, 
    [recentScans]);

    const optimisticUniqueSkus = useMemo(() => 
        new Set(recentScans?.map(s => s.barcode)).size, 
    [recentScans]);

    const activeProductStats = useMemo(() => {
        if (!lastScan) return { totalQty: 0, name: 'Esperando...', isUnknown: false };
        const qty = recentScans?.filter(s => s.barcode === lastScan.barcode)
                               .reduce((acc, s) => acc + s.quantity, 0) || 0;
        
        const cached = hotProductCache.current.get(lastScan.barcode);
        
        return { 
            totalQty: qty, 
            name: cached?.name || pendingProductName || lastScan.barcode, 
            isUnknown: status === 'product_form' 
        };
    }, [lastScan, recentScans, status, pendingProductName]);

    const optimisticActiveQty = activeProductStats.totalQty;

    const completeScan = useCallback(async (code: string, mm?: number, yyyy?: number) => {
        try {
            const qtyToAdd = multiplier;
            const newScan = await sessionService.addScan(session.id, code, qtyToAdd, mm, yyyy);
            
            setLastScanId(newScan.id);
            setFeedback('success');
            SoundFX.play(multiplier > 1 ? 'increment' : 'success');

            const settings = getSettings();
            if (settings.ttsEnabled) {
                const cachedProduct = hotProductCache.current.get(code) || await db.products.get(code);
                SoundFX.speak(cachedProduct?.name || "Registrado");
            }

            setMultiplier(1);
            setStatus('idle');
            setTimeout(() => setFeedback('idle'), 800);
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
            const masterProduct = hotProductCache.current.get(cleanCode) || await db.products.get(cleanCode);
            if (masterProduct) hotProductCache.current.set(cleanCode, masterProduct);

            if (!masterProduct) {
                setPendingScanCode(cleanCode);
                setPendingProductName("Producto Desconocido");
                setStatus('product_form');
            } else {
                setPendingScanCode(cleanCode);
                setPendingProductName(masterProduct.name);
                setStatus('expiring');
            }
        } catch (err) { 
            setFeedback('error'); 
        }
    }, []);

    // --- LISTENER GLOBAL PARA HARDWARE EXTERNO (SCANNER PISTOLA) ---
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Ignorar si estamos en un formulario o modal que no sea IDLE
            if (status !== 'idle' && status !== 'manual') return;
            
            // No capturar si el foco está en un input real (excepto el de manual)
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' && status !== 'manual') return;

            const now = Date.now();
            const char = e.key;

            // Detección de ráfaga (Escáner físico es ultra rápido < 50ms)
            if (now - lastKeyTime.current > 50) {
                // Si el tiempo es largo, es una nueva lectura
                if (char.length === 1) keyBuffer.current = char;
            } else {
                // Es parte de la ráfaga actual
                if (char.length === 1) keyBuffer.current += char;
            }
            lastKeyTime.current = now;

            // Procesar al recibir ENTER (Fin de ráfaga del escáner)
            if (char === 'Enter') {
                e.preventDefault();
                if (keyBuffer.current.length >= 2) {
                    processScan(keyBuffer.current);
                    keyBuffer.current = '';
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [status, processScan]);

    // Inteligencia Predictiva
    useEffect(() => {
        if (lastScan) {
            scanHistory.current = [lastScan.barcode, ...scanHistory.current].slice(0, 10);
            if (scanHistory.current.length >= 5) {
                predictNextSkus(scanHistory.current).then(predictions => {
                    predictions.forEach(async sku => {
                        if (!hotProductCache.current.has(sku)) {
                            const p = await db.products.get(sku);
                            if (p) hotProductCache.current.set(sku, p);
                        }
                    });
                });
            }
        }
    }, [lastScan?.barcode]);

    return {
        state: { 
            status, setStatus, feedback, setFeedback, manualInput, setManualInput, 
            multiplier, setMultiplier, isWindowFocused, isIdle, pendingScanCode, 
            pendingProductName,
            optimisticActiveQty, optimisticTotalQty, optimisticUniqueSkus
        },
        data: { lastScan, recentScans, activeProductStats },
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
